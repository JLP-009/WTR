import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { getPositions } from '../../lib/api/positions';
import type { Position } from '../../contracts/v1/positions';
import PositionCard from './PositionCard';
import { SkeletonCard } from '../common/LoadingState';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPositions();
      setPositions(data);
    } catch {
      setError('Unable to load positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClosed = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Positions</h2>
        {!loading && !error && (
          <span className="text-xs text-[color:var(--foreground-muted)]">
            {positions.length} open
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : positions.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={28} />}
          title="No open positions"
          description="Your positions will appear here once you enter the market."
        />
      ) : (
        <div className="space-y-3">
          {positions.map((p) => (
            <PositionCard key={p.id} position={p} onClosed={handleClosed} />
          ))}
        </div>
      )}
    </div>
  );
}
