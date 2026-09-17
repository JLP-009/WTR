import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type { Candle } from '../../contracts/v1/market';

interface LWChartProps {
  candles: Candle[];
  isDark: boolean;
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

export default function LWChart({ candles, isDark }: LWChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
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
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
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
  }, []);

  // Update theme
  useEffect(() => {
    chartRef.current?.applyOptions(toChartTheme(isDark));
  }, [isDark]);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current || candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData: HistogramData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open
        ? (isDark ? 'rgba(54,201,143,0.35)' : 'rgba(46,173,122,0.35)')
        : (isDark ? 'rgba(227,107,107,0.35)' : 'rgba(217,95,99,0.35)'),
    }));

    candleSeriesRef.current.setData(candleData);
    volSeriesRef.current.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [candles, isDark]);

  return <div ref={containerRef} className="w-full h-full" />;
}
