import { useState } from 'react';
import type { Position } from '../../contracts/v1/positions';
import { closePosition } from '../../lib/api/positions';

interface PositionCardProps {
  position: Position;
  onClosed: (id: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n || 0));
}

export default function PositionCard({ position, onClosed }: PositionCardProps) {
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const profit = (position.pnl ?? 0) >= 0;

  const handleClose = async () => {
    setClosing(true);
    setCloseError('');
    try {
      const res = await closePosition({ positionId: position.id });
      if (res.success) onClosed(position.id);
    } catch (err: any) {
      setCloseError(err?.message || 'Failed to close position. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  const closeLabel = position.side === 'LONG' ? 'Market Sell' : 'Market Buy';

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
      {/* Top row: symbol + P&L */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[color:var(--foreground)] tracking-wide">
              {position.symbol}
            </span>
            <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-[color:var(--border-strong)] text-[color:var(--foreground-secondary)]">
              {position.side}
            </span>
          </div>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
            {position.quantity ?? 0} shares
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold tabular-nums leading-none ${profit ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}
            aria-label={`Unrealized P&L: ${profit ? 'gain' : 'loss'} ₹${fmt(position.pnl ?? 0)}`}
          >
            {profit ? '+' : '−'}₹{fmt(position.pnl ?? 0)}
          </p>
          <p className={`text-xs tabular-nums mt-0.5 ${profit ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
            {profit ? '+' : '−'}{Math.abs(position.pnlPct ?? 0).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Price rows */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Avg Price</p>
          <p className="text-xs font-medium tabular-nums text-[color:var(--foreground-secondary)] mt-0.5">₹{fmt(position.avgPrice ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Current</p>
          <p className="text-xs font-medium tabular-nums text-[color:var(--foreground-secondary)] mt-0.5">₹{fmt(position.ltp ?? 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Unr. P&L</p>
          <p className={`text-xs font-semibold tabular-nums mt-0.5 ${profit ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
            {profit ? '+' : '−'}₹{fmt(position.pnl ?? 0)}
          </p>
        </div>
      </div>

      {/* Error */}
      {closeError && (
        <p className="text-xs text-[color:var(--danger)] mb-2 text-center">{closeError}</p>
      )}

      {/* Close */}
      <button
        onClick={handleClose}
        disabled={closing}
        aria-label={`Close ${position.symbol} ${position.side} position (${closeLabel})`}
        className="w-full h-8 text-[11px] font-semibold tracking-wider uppercase rounded-lg border border-[color:var(--border-strong)] text-[color:var(--foreground-secondary)] hover:border-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors disabled:opacity-40"
      >
        {closing ? 'Closing…' : `Close · ${closeLabel}`}
      </button>
    </div>
  );
}
