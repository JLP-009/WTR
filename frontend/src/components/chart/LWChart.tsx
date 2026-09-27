import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type { Candle } from '../../contracts/v1/market';

export interface PositionLineData {
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
}

interface LWChartProps {
  candles: Candle[];
  isDark: boolean;
  position?: PositionLineData | null;
}

function toChartTheme(isDark: boolean) {
  return {
    layout: {
      background: { color: isDark ? '#101216' : '#FFFFFF' },
      textColor: isDark ? '#777A82' : '#8A8A84',
    },
    grid: {
      vertLines: { color: isDark ? '#1D2026' : '#F0F0EC' },
      horzLines: { color: isDark ? '#1D2026' : '#F0F0EC' },
    },
    crosshair: {
      vertLine: { color: isDark ? '#30333A' : '#D9D9D2', labelBackgroundColor: isDark ? '#24262C' : '#E5E5DF' },
      horzLine: { color: isDark ? '#30333A' : '#D9D9D2', labelBackgroundColor: isDark ? '#24262C' : '#E5E5DF' },
    },
    timeScale: {
      borderColor: isDark ? '#24262C' : '#E5E5DF',
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: isDark ? '#24262C' : '#E5E5DF',
    },
  };
}

export default function LWChart({ candles, isDark, position }: LWChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const isInitialRef = useRef<boolean>(true);

  // Reset initial zoom flag when symbol changes or candles array reset
  useEffect(() => {
    isInitialRef.current = true;
  }, [candles?.length === 0]);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth || 300,
        height: containerRef.current.clientHeight || 260,
        ...toChartTheme(isDark),
        handleScroll: true,
        handleScale: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#36C98F',
        downColor: '#E36B6B',
        borderUpColor: '#36C98F',
        borderDownColor: '#E36B6B',
        wickUpColor: '#36C98F',
        wickDownColor: '#E36B6B',
        priceScaleId: 'right',
      });

      const volSeries = chart.addSeries(HistogramSeries, {
        color: '#30333A',
        priceScaleId: 'volume',
        priceFormat: { type: 'volume' },
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      });

      candleSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.05, bottom: 0.3 },
      });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volSeriesRef.current = volSeries;

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.resize(
            containerRef.current.clientWidth || 300,
            containerRef.current.clientHeight || 260
          );
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volSeriesRef.current = null;
      };
    } catch (e) {
      console.error('Failed to create chart:', e);
    }
  }, []);

  // Update theme
  useEffect(() => {
    chartRef.current?.applyOptions(toChartTheme(isDark));
  }, [isDark]);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current) return;
    if (!candles || candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volSeriesRef.current.setData([]);
      isInitialRef.current = true;
      return;
    }

    try {
      // Deduplicate by integer seconds timestamp and ensure strict ascending order
      const candleMap = new Map<number, CandlestickData>();
      const volMap = new Map<number, HistogramData>();

      for (const c of candles) {
        if (!c || isNaN(c.time) || isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close)) {
          continue;
        }
        const timeSec = Math.floor(Number(c.time)) as UTCTimestamp;
        candleMap.set(timeSec, {
          time: timeSec,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        });
        volMap.set(timeSec, {
          time: timeSec,
          value: Number(c.volume || 0),
          color: Number(c.close) >= Number(c.open)
            ? (isDark ? 'rgba(54,201,143,0.35)' : 'rgba(46,173,122,0.35)')
            : (isDark ? 'rgba(227,107,107,0.35)' : 'rgba(217,95,99,0.35)'),
        });
      }

      const sortedCandles = Array.from(candleMap.values()).sort(
        (a, b) => (a.time as number) - (b.time as number)
      );
      const sortedVol = Array.from(volMap.values()).sort(
        (a, b) => (a.time as number) - (b.time as number)
      );

      if (sortedCandles.length > 0) {
        if (isInitialRef.current) {
          candleSeriesRef.current.setData(sortedCandles);
          volSeriesRef.current.setData(sortedVol);
          chartRef.current?.timeScale().fitContent();
          isInitialRef.current = false;
        } else {
          const lastCandle = sortedCandles[sortedCandles.length - 1];
          const lastVol = sortedVol[sortedVol.length - 1];
          if (lastCandle) {
            candleSeriesRef.current.update(lastCandle);
            if (lastVol) volSeriesRef.current.update(lastVol);
          }
        }
      }
    } catch (err) {
      console.error('Error updating chart data:', err);
    }
  }, [candles, isDark]);

  // Update position entry price line
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    if (priceLineRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(priceLineRef.current);
      } catch {}
      priceLineRef.current = null;
    }

    if (position && position.entryPrice > 0 && position.quantity > 0) {
      const isLong = position.side === 'LONG';
      const color = isLong ? '#10B981' : '#EF4444';
      const formattedPrice = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(position.entryPrice);

      try {
        priceLineRef.current = candleSeriesRef.current.createPriceLine({
          price: position.entryPrice,
          color: color,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${position.side} ${position.quantity}x @ ₹${formattedPrice}`,
          axisLabelColor: color,
          axisLabelTextColor: '#FFFFFF',
        });
      } catch (err) {
        console.error('Failed to create position price line:', err);
      }
    }
  }, [position?.side, position?.entryPrice, position?.quantity, candles?.length]);

  return <div ref={containerRef} className="w-full h-full min-h-[260px]" />;
}
