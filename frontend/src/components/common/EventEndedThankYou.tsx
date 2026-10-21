import { useEffect, useState } from 'react';
import { LogOut, CheckCircle2, RefreshCw } from 'lucide-react';
import ClubLogo from '../branding/ClubLogo';
import { getPortfolioSummary } from '../../lib/api/portfolio';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';
import type { Participant } from '../../contracts/v1/auth';

interface EventEndedThankYouProps {
  participant?: Participant | null;
  onLogout: () => void;
  onRefresh?: () => void;
}

export default function EventEndedThankYou({
  participant,
  onLogout,
  onRefresh,
}: EventEndedThankYouProps) {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    getPortfolioSummary()
      .then((p) => setPortfolio(p))
      .catch(() => {});
  }, []);

  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalPnlPct = portfolio?.totalPnlPct ?? 0;
  const isPositive = totalPnl > 0;
  const isNegative = totalPnl < 0;
  const pnlSign = isPositive ? '+' : isNegative ? '-' : '';
  const absPnl = Math.abs(totalPnl);
  const pnlFormatted = `${pnlSign}₹${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(absPnl)}`;
  const pnlPctFormatted = `${totalPnlPct > 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black text-white px-4 py-4 sm:py-8 select-none">
      {/* Subtle background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 animate-pulse" />
        <div className="w-[280px] h-[280px] rounded-full bg-blue-500/5 blur-2xl opacity-30" />
      </div>

      <div className="min-h-full flex flex-col items-center justify-center py-4">
        <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-3.5 sm:space-y-4 my-auto">
          {/* 1. FinWiz Emblem Logo (Single Instance) */}
          <div className="relative mt-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-amber-500/30 shadow-2xl flex items-center justify-center relative p-2 sm:p-3">
              <ClubLogo size={64} />
              <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center shadow">
                <CheckCircle2 size={13} className="text-black" />
              </div>
            </div>
            {/* Subtle golden ring accent */}
            <div className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-amber-400/20 blur-md -z-10" />
          </div>

          {/* 2. Warangal Trading Ring 2.0 & by FinWiz */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-white uppercase leading-tight">
              Warangal Trading Ring <span className="text-amber-400">2.0</span>
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-medium tracking-widest text-neutral-400 uppercase">
                Presented by
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                FINWIZ
              </span>
            </div>
          </div>

          {/* 3. Thank You Message */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent">
              Thank You for Participating!
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm px-2">
              The market simulation has officially concluded. All portfolios, including mark-to-market
              valuations of open positions, have been computed and final records preserved.
            </p>
          </div>

          {/* 4. Punchline */}
          <div className="relative px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-2 border-amber-400 max-w-sm sm:max-w-md w-full shadow-inner">
            <p className="text-xs italic font-medium text-amber-200/95 text-center tracking-wide">
              &ldquo;Where strategy meets volatility, and true champions master the ring.&rdquo;
            </p>
          </div>

          {/* 5. Trade Information Card (Standing part completely removed) */}
          {participant && (
            <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-neutral-950/90 border border-neutral-800 p-4 sm:p-5 shadow-2xl backdrop-blur-sm space-y-3 sm:space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5 sm:pb-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Participant Name
                  </p>
                  <p className="text-sm sm:text-base font-bold text-white">
                    {participant.displayName || participant.participantId}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    ID
                  </p>
                  <p className="font-mono text-xs sm:text-sm font-semibold text-neutral-300">
                    {participant.participantId}
                  </p>
                </div>
              </div>

              {portfolio && (
                <div className="grid grid-cols-2 gap-3 py-0.5 border-b border-neutral-800/80 pb-2.5 sm:pb-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Final Portfolio Value
                    </p>
                    <p className="text-xs sm:text-sm font-bold font-mono text-white">
                      ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(portfolio.portfolioValue)}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Net P&amp;L
                    </p>
                    <p className={`text-xs sm:text-sm font-bold font-mono ${isNegative ? 'text-rose-400' : isPositive ? 'text-emerald-400' : 'text-neutral-300'}`}>
                      {pnlFormatted}
                      <span className="text-[10px] ml-1">({pnlPctFormatted})</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">
                    Submission Finalized
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-neutral-500">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* 6. Action Controls */}
          <div className="pt-1 flex items-center justify-center gap-3 flex-wrap w-full">
            <button
              onClick={onLogout}
              className="flex-1 max-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs sm:text-sm font-semibold text-white transition-all shadow-lg hover:border-neutral-600 active:scale-95"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-transparent hover:bg-neutral-900 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Refresh event status"
              >
                <RefreshCw size={13} />
                <span>Refresh Status</span>
              </button>
            )}
          </div>

          {/* 7. Footer Branding */}
          <div className="pt-2 text-center text-[10px] font-mono text-neutral-600">
            Warangal Trading Ring 2.0 &bull; Powered by FinWiz &bull; NIT Warangal
          </div>
        </div>
      </div>
    </div>
  );
}
