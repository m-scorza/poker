import { useState } from 'react';
import { DatabaseZap, Loader2 } from 'lucide-react';
import { seedDemoDataset, type DemoSeedResult } from '../../data/demoDataset';

interface DemoDataButtonProps {
  onLoaded?: (result: DemoSeedResult) => void;
  label?: string;
  className?: string;
}

export function DemoDataButton({ onLoaded, label = 'Load demo dataset', className = '' }: DemoDataButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await seedDemoDataset();
      if (result.alreadyLoaded) {
        setMessage('Demo dataset is already loaded.');
      } else {
        setMessage(`Loaded ${result.importedHands} demo hands across 40 tournaments.`);
      }
      onLoaded?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load demo data.');
    } finally {
      setLoading(false);
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
        {loading ? 'Loading demo...' : label}
      </button>
      {message && <p className="text-xs font-semibold text-emerald-300">{message}</p>}
      {error && <p className="text-xs font-semibold text-red-300">{error}</p>}
    </div>
  );
}
