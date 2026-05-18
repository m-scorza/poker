import { clsx } from 'clsx';
import { InfoTooltip } from './InfoTooltip';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: 'green' | 'red' | 'warning' | 'info' | 'default';
  /** If provided, shows an ℹ️ tooltip with this explanation */
  info?: { text: string; target?: string };
}

const ACCENT_COLORS = {
  green: 'text-[var(--color-accent)]',
  red: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
  default: 'text-[var(--color-text)]',
};

export function StatCard({ label, value, subtext, accent = 'default', info }: StatCardProps) {
  return (
    <div className="glass-card border border-[var(--color-border)] rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-xl hover:bg-black/20 relative">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-1">
          {label}
        </p>
        {info && <InfoTooltip text={info.text} target={info.target} />}
      </div>
      <p className={clsx('text-2xl font-bold font-data', ACCENT_COLORS[accent])}>
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtext}</p>
      )}
    </div>
  );
}
