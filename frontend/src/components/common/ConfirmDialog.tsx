import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  variant?: 'accent' | 'danger' | 'success';
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  variant,
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedVariant = variant || (destructive ? 'danger' : 'accent');

  const btnStyle =
    resolvedVariant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : resolvedVariant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
      : 'bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)] transition-colors"
        >
          <X size={15} />
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-9 h-9 rounded-xl bg-[color:var(--danger)]/12 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-[color:var(--danger)]" />
            </div>
          )}
          <div>
            <h2 id="confirm-title" className="text-sm font-semibold text-[color:var(--foreground)]">
              {title}
            </h2>
            <p className="text-xs text-[color:var(--foreground-secondary)] mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm ${btnStyle}`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
