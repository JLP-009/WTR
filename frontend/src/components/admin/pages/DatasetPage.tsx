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

      {/* Active dataset info notice */}
      <div className="px-4 py-3 rounded-xl bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20 text-xs text-[color:var(--accent)] flex items-center justify-between">
        <span><strong>Active Dataset:</strong> 12 symbols across 20 trading days (17,280 candles) loaded into PostgreSQL.</span>
        <span className="font-semibold text-[10px] px-2 py-0.5 rounded bg-[color:var(--accent)]/20">LIVE IN-DB</span>
      </div>

      {datasets.length === 0 ? (
        <EmptyState title="No datasets" description="No datasets have been uploaded yet." icon={<Database size={28} />} />
      ) : (
        <div className="space-y-4">
          {datasets.map((ds) => (
            <div
              key={ds.dataset_id}
              className={`bg-[color:var(--surface)] border rounded-2xl p-5 space-y-4 ${ds.active ? 'border-[color:var(--accent)]/40 shadow-sm' : 'border-[color:var(--border)]'}`}
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
            </div>
          ))}
        </div>
      )}

      {/* Dataset import guide */}
      <div className="border border-[color:var(--border)] bg-[color:var(--surface)] rounded-2xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[color:var(--accent)]" />
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Adding / Importing Datasets</p>
        </div>
        <p className="text-xs text-[color:var(--foreground-muted)] leading-relaxed">
          Datasets are automatically processed and loaded into PostgreSQL via the CSV batch engine. To ingest new CSV files or replacement datasets, place the extracted symbol folders in <code className="font-mono text-[color:var(--accent)] bg-[color:var(--surface-muted)] px-1.5 py-0.5 rounded">backend/data/datasets/</code> and run <code className="font-mono text-[color:var(--accent)] bg-[color:var(--surface-muted)] px-1.5 py-0.5 rounded">npm run import:csv &lt;folder-path&gt;</code>.
        </p>
      </div>
    </div>
  );
}
