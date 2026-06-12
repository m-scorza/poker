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
  green: 'text-[var(--money)]',
  red: 'text-[var(--loss)]',
  warning: 'text-[var(--warn)]',
  info: 'text-[var(--sig)]',
  default: 'text-[var(--fg)]',
};

export function StatCard({ label, value, subtext, accent = 'default', info }: StatCardProps) {
  return (
    <div className="compartment p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--hairline)] hover:shadow-xl hover:bg-[var(--ink-2)] relative">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs text-[var(--fg-dim)] uppercase tracking-wide mb-1">
          {label}
        </p>
        {info && <InfoTooltip text={info.text} target={info.target} />}
      </div>
      <p className={clsx('text-2xl font-bold font-mono', ACCENT_COLORS[accent])}>
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-[var(--fg-muted)] mt-1">{subtext}</p>
      )}
    </div>
  );
}
