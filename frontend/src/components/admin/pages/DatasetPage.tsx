import { useEffect, useState } from 'react';
import { Database, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import EmptyState from '../../common/EmptyState';
import { getAdminDatasets } from '../../../lib/api/admin';
import type { AdminDataset } from '../../../types/admin';

// NOTE: Dataset upload/delete endpoints are not yet defined in the API contract (DRAFT).
// This page uses mock data only. A pending backend integration note is displayed.

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

function ValidationIcon({ status }: { status: string }) {
  if (status === 'VALID') return <CheckCircle size={14} className="text-[color:var(--success)]" />;
  if (status === 'INVALID') return <XCircle size={14} className="text-[color:var(--danger)]" />;
  return <Clock size={14} className="text-[color:var(--warning)]" />;
}

export default function DatasetPage() {
  const [datasets, setDatasets] = useState<AdminDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setDatasets(await getAdminDatasets()); }
    catch { setError('Unable to load datasets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Dataset</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Manage market data datasets</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Draft notice */}
      <div className="px-4 py-3 rounded-xl bg-[color:var(--warning)]/8 border border-[color:var(--warning)]/20 text-xs text-[color:var(--warning)]">
        <strong>Backend integration pending:</strong> Dataset upload, delete, and activation endpoints are not yet defined in the API contract (v1 DRAFT). The table below is read-only mock data. Upload UI will be enabled once the contract is finalized.
      </div>

      {datasets.length === 0 ? (
        <EmptyState title="No datasets" description="No datasets have been uploaded yet." icon={<Database size={28} />} />
      ) : (
        <div className="space-y-4">
          {datasets.map((ds) => (
            <div
              key={ds.dataset_id}
              className={`bg-[color:var(--surface)] border rounded-2xl p-5 space-y-4 ${ds.active ? 'border-[color:var(--accent)]/40' : 'border-[color:var(--border)]'}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ds.active ? 'bg-[color:var(--accent)]/12' : 'bg-[color:var(--surface-muted)]'}`}>
                    <Database size={16} className={ds.active ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground-muted)]'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">{ds.name}</p>
                    <p className="text-xs text-[color:var(--foreground-muted)] font-mono">{ds.dataset_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ds.active && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[color:var(--accent)]/15 text-[color:var(--accent)]">
                      ACTIVE
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ValidationIcon status={ds.validation_status} />
                    <StatusBadge status={ds.validation_status} showDot={false} />
                  </div>
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-[color:var(--border)]">
                {[
                  { label: 'Source',       value: ds.source },
                  { label: 'Date Range',   value: `${ds.start_date} → ${ds.end_date}` },
                  { label: 'Trading Days', value: ds.total_days },
                  { label: 'Symbols',      value: ds.symbol_count },
                  { label: 'Interval',     value: `${ds.interval_seconds}s` },
                  { label: 'Total Candles',value: fmt(ds.total_candles) },
                  { label: 'Version',      value: ds.version },
                  { label: 'Added',        value: new Date(ds.created_at).toLocaleDateString('en-IN') },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                    <p className="text-xs font-medium text-[color:var(--foreground-secondary)]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Checksum */}
              <div className="pt-3 border-t border-[color:var(--border)]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-1">Checksum</p>
                <p className="text-[11px] font-mono text-[color:var(--foreground-muted)] break-all">{ds.checksum}</p>
              </div>

              {/* Actions placeholder */}
              {!ds.active && (
                <div className="pt-3 border-t border-[color:var(--border)] flex gap-2">
                  <button
                    disabled
                    title="Pending: POST /api/v1/admin/dataset/{id}/activate — not yet in contract"
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-muted)] opacity-50 cursor-not-allowed"
                  >
                    Activate (pending API)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload placeholder */}
      <div className="border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 text-center space-y-3">
        <Database size={28} className="mx-auto text-[color:var(--foreground-muted)]" />
        <div>
          <p className="text-sm font-medium text-[color:var(--foreground-secondary)]">Upload Dataset</p>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
            Upload endpoint not yet defined in API contract (DRAFT).
          </p>
        </div>
        <button
          disabled
          className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[color:var(--accent)] text-white opacity-40 cursor-not-allowed"
        >
          Upload Dataset (pending)
        </button>
      </div>
    </div>
  );
}
