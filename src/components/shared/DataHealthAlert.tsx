import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export function dataHealthAlertToneClass(isDanger: boolean): string {
  return isDanger
    ? 'border-[var(--loss)]/30 bg-red-950/20 text-red-100/90 shadow-red-950/10'
    : 'border-warn/30 bg-warn/10 text-[var(--fg-dim)]';
}

export function DataHealthAlertIcon({ isDanger }: { isDanger: boolean }) {
  return (
    <AlertTriangle
      className={clsx('mt-0.5 h-[18px] w-[18px] shrink-0', isDanger ? 'text-[var(--loss)]' : 'text-warn')}
    />
  );
}
