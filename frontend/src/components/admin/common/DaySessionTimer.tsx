import { useEffect, useState } from 'react';
import { Clock, Play, Radio, AlertTriangle, CheckCircle2, Megaphone } from 'lucide-react';
import { wsClient } from '../../../lib/websocket';

interface DaySessionTimerProps {
  simulationDay?: number | null;
  totalSimulationDays?: number | null;
  intervalIndex?: number;
  marketStatus?: string;
  dayStatus?: string;
  simulationTime?: string | null;
  onStartNextDay?: () => void;
  onOpenNews?: () => void;
  actionLoading?: boolean;
}

export default function DaySessionTimer({
  simulationDay = 1,
  totalSimulationDays = 20,
  intervalIndex = 0,
  marketStatus = 'PRE_OPEN',
  dayStatus = 'PRE_OPEN',
  simulationTime = '09:15:00',
  onStartNextDay,
  onOpenNews,
  actionLoading = false,
}: DaySessionTimerProps) {
  const [currentInterval, setCurrentInterval] = useState(intervalIndex);
  const [subTick, setSubTick] = useState(0);
  const [currentMarketStatus, setCurrentMarketStatus] = useState(marketStatus);
  const [currentDayStatus, setCurrentDayStatus] = useState(dayStatus);
  const [currentDay, setCurrentDay] = useState(simulationDay || 1);
  const [currentSimTime, setCurrentSimTime] = useState(simulationTime || '09:15:00');

  useEffect(() => {
    setCurrentInterval(intervalIndex);
    setCurrentMarketStatus(marketStatus);
    setCurrentDayStatus(dayStatus);
    if (simulationDay) setCurrentDay(simulationDay);
    if (simulationTime) setCurrentSimTime(simulationTime);
  }, [intervalIndex, marketStatus, dayStatus, simulationDay, simulationTime]);

  useEffect(() => {
    const unsubMarket = wsClient.subscribe('market', (data) => {
      if (data && typeof data.interval_index === 'number') {
        setCurrentInterval(data.interval_index);
      }
      if (data && typeof data.sub_tick === 'number') {
        setSubTick(data.sub_tick);
      }
      if (data && typeof data.trading_day === 'number') {
        setCurrentDay(data.trading_day);
      }
    });

    const unsubStatus = wsClient.subscribe('market_status', (data) => {
      if (data?.status) setCurrentMarketStatus(data.status);
      if (data?.day_status) setCurrentDayStatus(data.day_status);
      if (data?.simulation_day) setCurrentDay(data.simulation_day);
    });

    return () => {
      unsubMarket();
      unsubStatus();
    };
  }, []);

  const totalDaySeconds = 720; // 12 minutes = 72 intervals * 10 seconds
  const isDayClosed = currentDayStatus === 'CLOSED' || currentMarketStatus === 'CLOSED' || currentInterval >= 71;
  const isMarketOpen = currentMarketStatus === 'OPEN' && currentDayStatus === 'OPEN' && !isDayClosed;

  // Calculate elapsed & remaining seconds
  const rawElapsed = isDayClosed ? totalDaySeconds : currentInterval * 10 + subTick * 2;
  const elapsedSeconds = Math.min(totalDaySeconds, Math.max(0, rawElapsed));
  const remainingSeconds = Math.max(0, totalDaySeconds - elapsedSeconds);

  const elapsedM = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const elapsedS = (elapsedSeconds % 60).toString().padStart(2, '0');
  const remainingM = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const remainingS = (remainingSeconds % 60).toString().padStart(2, '0');

  const progressPct = Math.min(100, (elapsedSeconds / totalDaySeconds) * 100);
  const isWarningTime = isMarketOpen && remainingSeconds <= 120 && remainingSeconds > 0;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isDayClosed
        ? 'bg-rose-500/5 border-rose-500/20'
        : isWarningTime
        ? 'bg-amber-500/5 border-amber-500/25'
        : 'bg-[color:var(--surface)] border-[color:var(--border)]'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Day Title and Live Status Indicator */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock size={16} className={isMarketOpen ? 'text-emerald-500' : isDayClosed ? 'text-rose-500' : 'text-[color:var(--foreground-muted)]'} />
            <h2 className="text-sm font-bold tracking-wide uppercase text-[color:var(--foreground)]">
              Trading Day {currentDay} Session Clock
            </h2>
            <span className="text-xs text-[color:var(--foreground-muted)] font-medium">
              (Total {totalSimulationDays} Days)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isMarketOpen ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                DAY {currentDay} LIVE IN PROGRESS
              </span>
            ) : isDayClosed ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <CheckCircle2 size={13} />
                DAY {currentDay} COMPLETED (MARKET CLOSED)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[color:var(--surface-muted)] text-[color:var(--foreground-muted)] border border-[color:var(--border)]">
                <Radio size={12} />
                MARKET {currentMarketStatus}
              </span>
            )}

            {isWarningTime && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 animate-pulse">
                <AlertTriangle size={11} />
                FINAL 2 MINUTES
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenNews && (
            <button
              onClick={onOpenNews}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface)] text-[color:var(--foreground-secondary)] border border-[color:var(--border)] transition-colors shadow-sm"
            >
              <Megaphone size={14} className="text-[color:var(--accent)]" />
              <span>Broadcast News</span>
            </button>
          )}

          {isDayClosed && onStartNextDay && (
            <button
              onClick={onStartNextDay}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white transition-all shadow-md shadow-[color:var(--accent)]/20 disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" />
              <span>{actionLoading ? 'Starting…' : `Start Day ${currentDay + 1}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Center: Real-Time Progress Bar */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Elapsed:</span>
            <span className="font-mono font-bold text-[color:var(--foreground)] tabular-nums">{elapsedM}:{elapsedS} / 12:00</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Remaining:</span>
            <span className={`font-mono font-bold tabular-nums ${
              isWarningTime ? 'text-amber-500 animate-pulse' : isDayClosed ? 'text-rose-500' : 'text-[color:var(--foreground)]'
            }`}>
              {remainingM}:{remainingS}
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2.5 bg-[color:var(--surface-muted)] rounded-full overflow-hidden border border-[color:var(--border)] p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isDayClosed
                ? 'bg-rose-500'
                : isWarningTime
                ? 'bg-amber-500'
                : 'bg-[color:var(--accent)]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div className="mt-4 pt-3 border-t border-[color:var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold text-[color:var(--foreground-muted)] uppercase tracking-wider">Candle Interval</p>
          <p className="font-mono font-semibold text-[color:var(--foreground)] tabular-nums">
            {Math.min(72, currentInterval + 1)} / 72 <span className="text-[10px] text-[color:var(--foreground-muted)] font-normal">(10s)</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[color:var(--foreground-muted)] uppercase tracking-wider">Sim Market Clock</p>
          <p className="font-mono font-semibold text-[color:var(--foreground)] tabular-nums">
            {currentSimTime} <span className="text-[10px] text-[color:var(--foreground-muted)] font-normal">/ 15:30</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[color:var(--foreground-muted)] uppercase tracking-wider">Day Progress</p>
          <p className="font-semibold text-[color:var(--foreground)] tabular-nums">
            {progressPct.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[color:var(--foreground-muted)] uppercase tracking-wider">Sub-Tick</p>
          <p className="font-mono font-semibold text-[color:var(--foreground)] tabular-nums">
            {subTick + 1} / 5 <span className="text-[10px] text-[color:var(--foreground-muted)] font-normal">(2s micro)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
