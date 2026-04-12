import { clsx } from 'clsx';

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  h: 'text-[var(--color-suit-heart)]',
  d: 'text-[var(--color-suit-diamond)]',
  c: 'text-[var(--color-suit-club)]',
  s: 'text-[var(--color-suit-spade)]',
};

interface CardProps {
  card: string; // e.g. "Ah", "Kd", "Tc"
  size?: 'sm' | 'md' | 'lg';
}

export function PokerCard({ card, size = 'md' }: CardProps) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1).toLowerCase();
  const symbol = SUIT_SYMBOLS[suit] ?? suit;
  const color = SUIT_COLORS[suit] ?? '';

  const sizeClasses = {
    sm: 'text-xs px-1 py-0.5 min-w-[28px]',
    md: 'text-sm px-1.5 py-1 min-w-[36px]',
    lg: 'text-base px-2 py-1.5 min-w-[44px]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-data font-bold',
        'bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded',
        color,
        sizeClasses[size],
      )}
    >
      {rank}{symbol}
    </span>
  );
}
