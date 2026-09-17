import type { Position, ClosePositionRequest, ClosePositionResponse } from '../contracts/v1/positions';

const POSITIONS: Position[] = [
  {
    id: 'pos1',
    symbol: 'TCS',
    side: 'LONG',
    quantity: 50,
    avgPrice: 3380.2,
    ltp: 3412.4,
    pnl: 1620,
    pnlPct: 0.96,
  },
  {
    id: 'pos2',
    symbol: 'INFY',
    side: 'SHORT',
    quantity: 25,
    avgPrice: 1560.0,
    ltp: 1542.2,
    pnl: 445,
    pnlPct: 1.14,
  },
  {
    id: 'pos3',
    symbol: 'RELIANCE',
    side: 'LONG',
    quantity: 10,
    avgPrice: 2845.0,
    ltp: 2798.5,
    pnl: -465,
    pnlPct: -1.63,
  },
  {
    id: 'pos4',
    symbol: 'SBIN',
    side: 'SHORT',
    quantity: 100,
    avgPrice: 820.0,
    ltp: 842.3,
    pnl: -2230,
    pnlPct: -2.72,
  },
];

let _positions = [...POSITIONS];

export async function mockGetPositions(): Promise<Position[]> {
  await delay(400);
  return [..._positions];
}

export async function mockClosePosition(
  req: ClosePositionRequest,
): Promise<ClosePositionResponse> {
  await delay(600);
  const idx = _positions.findIndex((p) => p.id === req.positionId);
  if (idx === -1) return { success: false, message: 'Position not found' };
  _positions = _positions.filter((p) => p.id !== req.positionId);
  return { success: true, message: 'Position closed successfully' };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
