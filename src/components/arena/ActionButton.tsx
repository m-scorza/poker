import { clsx } from 'clsx';
import type { ActionColor } from '../../pages/arena/actionOptions';

interface ActionButtonProps {
  label: string;
  color: ActionColor;
  meta?: string;
  onClick: () => void;
  disabled: boolean;
  testId?: string;
}

export function ActionButton({ label, color, meta, onClick, disabled, testId }: ActionButtonProps) {
  const colorMap = {
    gray: 'btn outline',
    blue: 'btn',
    emerald: 'btn sig',
    amber: 'btn border-amber-300/40 bg-amber-300/10 text-amber-100 hover:border-amber-200/60',
    rose: 'btn border-rose-300/40 bg-rose-300/10 text-rose-100 hover:border-rose-200/60',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "px-10 py-4 font-bold text-sm",
        colorMap[color]
      )}
      type="button"
      data-testid={testId}
      aria-label={meta ? `${label} ${meta}` : label}
    >
      <span>{label}</span>
      {meta && <span className="ml-2 text-[9px] opacity-60">{meta}</span>}
    </button>
  );
}
