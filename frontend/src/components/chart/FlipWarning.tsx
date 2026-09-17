import type { Position } from '../../contracts/v1/positions';

interface FlipWarningProps {
  side: 'BUY' | 'SELL';
  qty: number;
  currentPos: Position | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FlipWarning({ side, qty, currentPos, onConfirm, onCancel }: FlipWarningProps) {
  if (!currentPos) return null;

  const remainingQty = qty - currentPos.quantity;
  const newSide = side === 'SELL' ? 'SHORT' : 'LONG';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Position flip warning"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative w-full sm:max-w-sm mx-4 mb-4 sm:mb-0 bg-[color:var(--surface-elevated)] border border-[color:var(--border-strong)] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--warning)] mb-2">
            Position Flip
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--foreground-muted)]">Current</span>
              <span className="font-medium text-[color:var(--foreground)] tabular-nums">
                {currentPos.side} {currentPos.quantity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--foreground-muted)]">Order</span>
              <span className="font-medium text-[color:var(--foreground)] tabular-nums">
                {side} {qty}
              </span>
            </div>
            <div className="flex justify-between border-t border-[color:var(--border)] pt-1.5 mt-1">
              <span className="text-[color:var(--foreground-muted)]">Result</span>
              <span className="font-semibold text-[color:var(--foreground)] tabular-nums">
                {newSide} {remainingQty}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-[color:var(--border-strong)] text-sm font-medium text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-[color:var(--background)] text-sm font-semibold transition-colors"
          >
            Confirm {side}
          </button>
        </div>
      </div>
    </div>
  );
}
