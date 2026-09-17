import { useEffect, useState } from 'react';
import { RefreshCw, Newspaper, Send, X } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminNews, createAdminNews, generateIdempotencyKey, AdminApiError } from '../../../lib/api/admin';
import type { AdminNewsItem, NewsType } from '../../../types/admin';

const TYPE_LABELS: Record<NewsType, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
  MARKET_UPDATE: 'Market Update',
  EVENT_UPDATE: 'Event Update',
};

const TYPE_COLORS: Record<NewsType, string> = {
  INFO:          'text-[color:var(--foreground-secondary)] bg-[color:var(--surface-muted)]',
  WARNING:       'text-[color:var(--warning)] bg-[color:var(--warning)]/12',
  CRITICAL:      'text-[color:var(--danger)] bg-[color:var(--danger)]/12',
  MARKET_UPDATE: 'text-[color:var(--accent)] bg-[color:var(--accent)]/12',
  EVENT_UPDATE:  'text-[color:var(--success)] bg-[color:var(--success)]/12',
};

const INITIAL_FORM = { type: 'INFO' as NewsType, title: '', body: '', audience: 'ALL_PARTICIPANTS' as const };

function rel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsPage() {
  const [items, setItems] = useState<AdminNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getAdminNews(); setItems(r.data); }
    catch { setError('Unable to load news'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) { setSubmitError('Title and body are required.'); return; }
    setSubmitting(true); setSubmitError('');
    try {
      const item = await createAdminNews(form, generateIdempotencyKey());
      setItems(prev => [item, ...prev]);
      setForm(INITIAL_FORM);
      setShowForm(false);
    } catch (e) {
      setSubmitError(e instanceof AdminApiError ? e.userMessage : 'Failed to publish news.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">News</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Broadcast announcements to all participants</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => { setShowForm(true); setSubmitError(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)] transition-colors"
          >
            <Send size={13} /> New Announcement
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">New Announcement</p>
            <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-muted)] transition-colors">
              <X size={14} />
            </button>
          </div>

          {submitError && (
            <p className="text-xs text-[color:var(--danger)] px-1">{submitError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as NewsType }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Audience</label>
              <select
                value={form.audience}
                disabled
                className="w-full px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)] focus:outline-none cursor-not-allowed"
              >
                <option value="ALL_PARTICIPANTS">All Participants (v1)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Title <span className="text-[color:var(--danger)]">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={200}
              placeholder="Announcement title…"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Body <span className="text-[color:var(--danger)]">*</span></label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              maxLength={2000}
              rows={4}
              placeholder="Announcement body…"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] resize-y"
            />
            <p className="text-[10px] text-[color:var(--foreground-muted)] text-right">{form.body.length}/2000</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2.5 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim() || !form.body.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={12} />
              {submitting ? 'Publishing…' : 'Publish Now'}
            </button>
          </div>
          <p className="text-[10px] text-[color:var(--foreground-muted)]">
            Published news is broadcast immediately via WebSocket to all authenticated participants and is durable. Publication cannot be undone.
          </p>
        </div>
      )}

      {/* News list */}
      {items.length === 0 ? (
        <EmptyState title="No announcements yet" description="Publish an announcement to reach all participants." icon={<Newspaper size={28} />} />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.news_id} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_COLORS[item.type]}`}>
                    {TYPE_LABELS[item.type]}
                  </span>
                  <span className="text-[10px] text-[color:var(--foreground-muted)]">{rel(item.created_at)}</span>
                </div>
                <span className="text-[10px] font-mono text-[color:var(--foreground-muted)]">{item.news_id}</span>
              </div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.title}</p>
              <p className="text-xs text-[color:var(--foreground-secondary)] leading-relaxed">{item.body}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[color:var(--foreground-muted)]">
                  Audience: {item.audience} · By: {item.created_by}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
