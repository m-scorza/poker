import { useState } from 'react';
import { DatabaseZap, Loader2 } from 'lucide-react';
import { seedDemoDataset, DEMO_TOURNAMENT_COUNT, type DemoSeedResult } from '../../data/demoDataset';
import { useAppStore } from '../../data/appStore';

interface DemoDataButtonProps {
  onLoaded?: (result: DemoSeedResult) => void;
  label?: string;
  className?: string;
}

export function DemoDataButton({ onLoaded, label = 'Load demo dataset', className = '' }: DemoDataButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setDemoSeedProgress } = useAppStore();

  async function handleClick() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setDemoSeedProgress(true, 'Initializing...');

    try {
      const result = await seedDemoDataset((p) => {
        if (p.phase !== 'done') {
          setMessage(p.message);
          setDemoSeedProgress(true, p.message);
        }
      });

      if (result.alreadyLoaded) {
        setMessage('Demo dataset is already loaded.');
      } else {
        setMessage(`Loaded ${result.importedHands.toLocaleString()} synthetic hands across ${DEMO_TOURNAMENT_COUNT} tournaments with varied depths.`);
      }
      onLoaded?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load demo data.');
    } finally {
      setLoading(false);
      setDemoSeedProgress(false, null);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 px-5 py-3 text-sm font-black uppercase tracking-widest text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <DatabaseZap size={16} />}
        {loading ? 'Loading...' : label}
      </button>
      {message && <p className="text-xs font-semibold text-emerald-300">{message}</p>}
      {error && <p className="text-xs font-semibold text-red-300">{error}</p>}
    </div>
  );
}
