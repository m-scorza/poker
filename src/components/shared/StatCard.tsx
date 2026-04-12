import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: 'green' | 'red' | 'warning' | 'info' | 'default';
}

const ACCENT_COLORS = {
  green: 'text-[var(--color-accent)]',
  red: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
  default: 'text-[var(--color-text)]',
};

export function StatCard({ label, value, subtext, accent = 'default' }: StatCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={clsx('text-2xl font-bold font-data', ACCENT_COLORS[accent])}>
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtext}</p>
      )}
    </div>
  );
}
