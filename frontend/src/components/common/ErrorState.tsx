import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Unable to load data', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <AlertCircle size={24} className="text-[color:var(--danger)]" />
      <p className="text-sm font-medium text-[color:var(--foreground-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] font-medium transition-colors underline-offset-2 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
