import { eq, and, desc, asc, lte } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Decimal } from 'decimal.js';
import type { Database } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import type { SubmitOrderRequest, OrderResponse } from './order.types.js';
import { livePriceCache } from '../market/price-cache.js';

export class OrderService {
  public constructor(private readonly db: Database) {}

  public async submitOrder(
    userId: string,
    req: SubmitOrderRequest,
    idempotencyKey?: string
  ): Promise<OrderResponse> {
    // 1. Idempotency Check
    const effectiveKey = idempotencyKey || req.client_order_id;
    const [existingRecord] = await this.db
      .select()
      .from(schema.idempotencyRecords)
      .where(
        and(
          eq(schema.idempotencyRecords.userId, userId),
          eq(schema.idempotencyRecords.key, effectiveKey)
        )
      )
      .limit(1);

    if (existingRecord) {
      return existingRecord.responseBody as OrderResponse;
    }

    // 2. Instrument Verification
    const [instrument] = await this.db
      .select()
      .from(schema.instruments)
      .where(eq(schema.instruments.symbol, req.symbol.toUpperCase()))
      .limit(1);

    if (!instrument || instrument.status !== 'ACTIVE') {
      throw new AppError('INVALID_ORDER', 400, `Instrument '${req.symbol}' is not active or tradeable.`);
    }

    // 3. Active Event & Simulation State Check
    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!activeEvent || activeEvent.status !== 'RUNNING') {
      throw new AppError('SYSTEM_UNAVAILABLE', 503, `Trading event is ${activeEvent?.status || 'UNAVAILABLE'}. Orders cannot be placed.`, {
        event_status: activeEvent?.status || 'NOT_FOUND',
      });
    }

    const [simState] = await this.db
      .select()
      .from(schema.simulationStates)
      .where(eq(schema.simulationStates.eventId, activeEvent.id))
      .limit(1);

    if (!simState || simState.marketStatus !== 'OPEN') {
      throw new AppError('MARKET_NOT_OPEN', 400, `Market is currently ${simState?.marketStatus || 'CLOSED'}. Order execution rejected.`, {
        market_status: simState?.marketStatus || 'CLOSED',
      });
    }

    const currentDay = simState?.simulationDay || 1;
    const currentInterval = simState?.intervalIndex || 0;

    // 4. Authoritative Price Fetch (Instant in-memory cache with DB fallback)
    let executionPrice: Decimal;
    const cached = livePriceCache.getBySymbol(req.symbol) || livePriceCache.getByInstrumentId(instrument.id);
    if (cached) {
      executionPrice = cached.price;
    } else {
      const [latestCandle] = await this.db
        .select()
        .from(schema.datasetCandles)
        .where(
          and(
            eq(schema.datasetCandles.instrumentId, instrument.id),
            eq(schema.datasetCandles.tradingDay, currentDay),
            lte(schema.datasetCandles.intervalIndex, currentInterval)
          )
        )
        .orderBy(desc(schema.datasetCandles.intervalIndex))
        .limit(1);

      const candle = latestCandle || (await this.db
        .select()
        .from(schema.datasetCandles)
        .where(eq(schema.datasetCandles.instrumentId, instrument.id))
        .orderBy(asc(schema.datasetCandles.tradingDay), asc(schema.datasetCandles.intervalIndex))
        .limit(1))[0];

      if (!candle) {
        throw new AppError('NO_AUTHORITATIVE_PRICE', 400, 'No authoritative market price available for execution.');
      }

      executionPrice = new Decimal(candle.close);
    }

    // 5. Execute Order in Atomic Transaction
    const result = await this.db.transaction(async (tx) => {
      // Fetch or Create Portfolio with Row-Level Lock
      let [portfolio] = await tx
        .select()
        .from(schema.portfolios)
        .where(
          and(
            eq(schema.portfolios.eventId, activeEvent.id),
            eq(schema.portfolios.userId, userId)
          )
        )
        .for('update')
        .limit(1);

      if (!portfolio) {
        const defaultCapital = '1000000.00000000';
        [portfolio] = await tx
          .insert(schema.portfolios)
          .values({
            eventId: activeEvent.id,
            userId,
            startingCapital: defaultCapital,
            availableCash: defaultCapital,
            reservedCash: '0',
            realizedPnl: '0',
            dailyPnl: '0',
          })
          .returning();
      }

      // Fetch Position for Instrument with Row-Level Lock
      let [position] = await tx
        .select()
        .from(schema.positions)
        .where(
          and(
            eq(schema.positions.eventId, activeEvent.id),
            eq(schema.positions.userId, userId),
            eq(schema.positions.instrumentId, instrument.id)
          )
        )
        .for('update')
        .limit(1);

      // Resolve Quantity
      let targetQuantity = req.quantity || 0;
      let effectiveSide = req.side;

      if (req.side === 'CLOSE') {
        if (!position || position.quantity <= 0 || !position.side) {
          throw new AppError('NO_OPEN_POSITION', 400, `No open position to close for symbol '${req.symbol}'.`);
        }
        targetQuantity = position.quantity;
        effectiveSide = position.side === 'LONG' ? 'SELL' : 'BUY';
      } else {
        if (targetQuantity <= 0) {
          throw new AppError('VALIDATION_ERROR', 400, 'Order quantity must be greater than zero.');
        }
        if (targetQuantity % instrument.lotSize !== 0) {
          throw new AppError('VALIDATION_ERROR', 400, `Order quantity must be a multiple of lot size (${instrument.lotSize}).`);
        }
      }

      let availableCash = new Decimal(portfolio.availableCash);
      let realizedPnl = new Decimal(portfolio.realizedPnl);
      let positionRealizedPnl = new Decimal(position?.realizedPnl || '0');

      let currentPosQty = position?.quantity || 0;
      let currentPosSide = position?.side || null;
      let currentAvgPrice = position?.averageEntryPrice ? new Decimal(position.averageEntryPrice) : new Decimal(0);

      let newPosQty = currentPosQty;
      let newPosSide: 'LONG' | 'SHORT' | null = currentPosSide;
      let newAvgPrice: Decimal | null = currentAvgPrice.isZero() ? null : currentAvgPrice;

      if (effectiveSide === 'BUY') {
        if (!currentPosSide || currentPosQty === 0) {
          // Open Long
          const totalCost = executionPrice.times(targetQuantity);
          if (availableCash.lessThan(totalCost)) {
            throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds for this BUY order.');
          }
          availableCash = availableCash.minus(totalCost);
          newPosQty = targetQuantity;
          newPosSide = 'LONG';
          newAvgPrice = executionPrice;
        } else if (currentPosSide === 'LONG') {
          // Increase Long
          const totalCost = executionPrice.times(targetQuantity);
          if (availableCash.lessThan(totalCost)) {
            throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds for this BUY order.');
          }
          availableCash = availableCash.minus(totalCost);
          const oldTotal = currentAvgPrice.times(currentPosQty);
          const newTotal = oldTotal.plus(totalCost);
          newPosQty = currentPosQty + targetQuantity;
          newAvgPrice = newTotal.dividedBy(newPosQty);
        } else if (currentPosSide === 'SHORT') {
          // Covering Short
          if (targetQuantity <= currentPosQty) {
            const pnl = currentAvgPrice.minus(executionPrice).times(targetQuantity);
            realizedPnl = realizedPnl.plus(pnl);
            positionRealizedPnl = positionRealizedPnl.plus(pnl);
            // Cash credited with return of margin + P&L
            availableCash = availableCash.plus(executionPrice.times(targetQuantity)).plus(pnl);
            newPosQty = currentPosQty - targetQuantity;
            if (newPosQty === 0) {
              newPosSide = null;
              newAvgPrice = null;
            }
          } else {
            // Short closed and flipped to Long
            const closeQty = currentPosQty;
            const longQty = targetQuantity - closeQty;
            const pnl = currentAvgPrice.minus(executionPrice).times(closeQty);
            realizedPnl = realizedPnl.plus(pnl);
            positionRealizedPnl = positionRealizedPnl.plus(pnl);
            availableCash = availableCash.plus(executionPrice.times(closeQty)).plus(pnl);

            const longCost = executionPrice.times(longQty);
            if (availableCash.lessThan(longCost)) {
              throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds to flip position to LONG.');
            }
            availableCash = availableCash.minus(longCost);
            newPosQty = longQty;
            newPosSide = 'LONG';
            newAvgPrice = executionPrice;
          }
        }
      } else if (effectiveSide === 'SELL') {
        if (!currentPosSide || currentPosQty === 0) {
          // Open Short
          const marginRequired = executionPrice.times(targetQuantity);
          if (availableCash.lessThan(marginRequired)) {
            throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds to open SHORT position.');
          }
          availableCash = availableCash.minus(marginRequired);
          newPosQty = targetQuantity;
          newPosSide = 'SHORT';
          newAvgPrice = executionPrice;
        } else if (currentPosSide === 'SHORT') {
          // Increase Short
          const marginRequired = executionPrice.times(targetQuantity);
          if (availableCash.lessThan(marginRequired)) {
            throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds to increase SHORT position.');
          }
          availableCash = availableCash.minus(marginRequired);
          const oldTotal = currentAvgPrice.times(currentPosQty);
          const newTotal = oldTotal.plus(marginRequired);
          newPosQty = currentPosQty + targetQuantity;
          newAvgPrice = newTotal.dividedBy(newPosQty);
        } else if (currentPosSide === 'LONG') {
          // Selling Long
          if (targetQuantity <= currentPosQty) {
            const pnl = executionPrice.minus(currentAvgPrice).times(targetQuantity);
            realizedPnl = realizedPnl.plus(pnl);
            positionRealizedPnl = positionRealizedPnl.plus(pnl);
            const proceeds = executionPrice.times(targetQuantity);
            availableCash = availableCash.plus(proceeds);
            newPosQty = currentPosQty - targetQuantity;
            if (newPosQty === 0) {
              newPosSide = null;
              newAvgPrice = null;
            }
          } else {
            // Long closed and flipped to Short
            const closeQty = currentPosQty;
            const shortQty = targetQuantity - closeQty;
            const pnl = executionPrice.minus(currentAvgPrice).times(closeQty);
            realizedPnl = realizedPnl.plus(pnl);
            positionRealizedPnl = positionRealizedPnl.plus(pnl);
            availableCash = availableCash.plus(executionPrice.times(closeQty));

            const shortMargin = executionPrice.times(shortQty);
            if (availableCash.lessThan(shortMargin)) {
              throw new AppError('INSUFFICIENT_FUNDS', 400, 'Insufficient available funds to flip position to SHORT.');
            }
            availableCash = availableCash.minus(shortMargin);
            newPosQty = shortQty;
            newPosSide = 'SHORT';
            newAvgPrice = executionPrice;
          }
        }
      }

      // Create Order
      const orderPublicId = `ord_${randomUUID()}`;
      const [order] = await tx
        .insert(schema.orders)
        .values({
          publicId: orderPublicId,
          eventId: activeEvent.id,
          userId,
          instrumentId: instrument.id,
          clientOrderId: req.client_order_id,
          side: req.side,
          quantity: targetQuantity,
          filledQuantity: targetQuantity,
          orderType: 'MARKET',
          status: 'FILLED',
          averagePrice: executionPrice.toFixed(8),
          idempotencyKey: effectiveKey,
        })
        .returning();

      // Create Execution
      const executionPublicId = `exe_${randomUUID()}`;
      const [execution] = await tx
        .insert(schema.executions)
        .values({
          publicId: executionPublicId,
          orderId: order.id,
          quantity: targetQuantity,
          price: executionPrice.toFixed(8),
        })
        .returning();

      // Update Portfolio
      await tx
        .update(schema.portfolios)
        .set({
          availableCash: availableCash.toFixed(8),
          realizedPnl: realizedPnl.toFixed(8),
          dailyPnl: realizedPnl.toFixed(8),
        })
        .where(eq(schema.portfolios.id, portfolio.id));

      // Record Ledger Entry
      await tx.insert(schema.portfolioLedgerEntries).values({
        portfolioId: portfolio.id,
        orderId: order.id,
        reason: 'ORDER_EXECUTION',
        amount: executionPrice.times(targetQuantity).toFixed(8),
        balanceAfter: availableCash.toFixed(8),
        metadata: {
          symbol: instrument.symbol,
          side: req.side,
          quantity: targetQuantity,
          price: executionPrice.toFixed(8),
        },
      });

      // Update Position
      if (position) {
        await tx
          .update(schema.positions)
          .set({
            side: newPosSide,
            quantity: newPosQty,
            averageEntryPrice: newAvgPrice ? newAvgPrice.toFixed(8) : null,
            realizedPnl: positionRealizedPnl.toFixed(8),
            openedAt: newPosQty > 0 ? (position.openedAt || new Date()) : null,
          })
          .where(eq(schema.positions.id, position.id));
      } else {
        await tx.insert(schema.positions).values({
          eventId: activeEvent.id,
          userId,
          instrumentId: instrument.id,
          side: newPosSide,
          quantity: newPosQty,
          averageEntryPrice: newAvgPrice ? newAvgPrice.toFixed(8) : null,
          realizedPnl: positionRealizedPnl.toFixed(8),
          openedAt: newPosQty > 0 ? new Date() : null,
        });
      }

      const orderResponse: OrderResponse = {
        order_id: order.publicId,
        client_order_id: order.clientOrderId,
        symbol: instrument.symbol,
        side: req.side,
        quantity: order.quantity,
        filled_quantity: order.filledQuantity,
        remaining_quantity: 0,
        order_type: order.orderType,
        status: order.status,
        average_price: new Decimal(order.averagePrice!).toFixed(2),
        executions: [
          {
            execution_id: execution.publicId,
            quantity: execution.quantity,
            price: new Decimal(execution.price).toFixed(2),
            executed_at: execution.executedAt.toISOString(),
          },
        ],
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
      };

      // Save Idempotency Record
      await tx.insert(schema.idempotencyRecords).values({
        userId,
        key: effectiveKey,
        requestFingerprint: JSON.stringify(req),
        responseStatus: 201,
        responseBody: orderResponse,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return orderResponse;
    });

    return result;
  }

  public async getOrders(userId: string, limit: number = 50): Promise<OrderResponse[]> {
    const rows = await this.db
      .select({
        order: schema.orders,
        instrument: schema.instruments,
      })
      .from(schema.orders)
      .innerJoin(schema.instruments, eq(schema.orders.instrumentId, schema.instruments.id))
      .where(eq(schema.orders.userId, userId))
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit);

    return rows.map(({ order, instrument }) => ({
      order_id: order.publicId,
      client_order_id: order.clientOrderId,
      symbol: instrument.symbol,
      side: order.side as 'BUY' | 'SELL' | 'CLOSE',
      quantity: order.quantity,
      filled_quantity: order.filledQuantity,
      remaining_quantity: order.quantity - order.filledQuantity,
      order_type: order.orderType,
      status: order.status,
      average_price: order.averagePrice ? new Decimal(order.averagePrice).toFixed(2) : null,
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
    }));
  }

  public async getOrderById(userId: string, orderId: string): Promise<OrderResponse> {
    const [row] = await this.db
      .select({
        order: schema.orders,
        instrument: schema.instruments,
      })
      .from(schema.orders)
      .innerJoin(schema.instruments, eq(schema.orders.instrumentId, schema.instruments.id))
      .where(
        and(
          eq(schema.orders.userId, userId),
          eq(schema.orders.publicId, orderId)
        )
      )
      .limit(1);

    if (!row) {
      throw new AppError('NOT_FOUND', 404, `Order '${orderId}' not found.`);
    }

    const executionRows = await this.db
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.orderId, row.order.id));

    return {
      order_id: row.order.publicId,
      client_order_id: row.order.clientOrderId,
      symbol: row.instrument.symbol,
      side: row.order.side as 'BUY' | 'SELL' | 'CLOSE',
      quantity: row.order.quantity,
      filled_quantity: row.order.filledQuantity,
      remaining_quantity: row.order.quantity - row.order.filledQuantity,
      order_type: row.order.orderType,
      status: row.order.status,
      average_price: row.order.averagePrice ? new Decimal(row.order.averagePrice).toFixed(2) : null,
      executions: executionRows.map((e) => ({
        execution_id: e.publicId,
        quantity: e.quantity,
        price: new Decimal(e.price).toFixed(2),
        executed_at: e.executedAt.toISOString(),
      })),
      created_at: row.order.createdAt.toISOString(),
      updated_at: row.order.updatedAt.toISOString(),
    };
  }

  public async cancelOrder(userId: string, orderId: string): Promise<void> {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.userId, userId),
          eq(schema.orders.publicId, orderId)
        )
      )
      .limit(1);

    if (!order) {
      throw new AppError('NOT_FOUND', 404, `Order '${orderId}' not found.`);
    }

    if (order.status === 'FILLED') {
      throw new AppError('CONFLICT', 409, 'Cannot cancel an order that is already FILLED.');
    }
  }
}
