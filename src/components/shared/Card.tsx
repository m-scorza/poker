import { clsx } from 'clsx';

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  h: 'text-heart',
  d: 'text-diamond',
  c: 'text-club',
  s: 'text-spade',
};

interface CardProps {
  card: string; // e.g. "Ah", "Kd", "Tc", or "back"
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PokerCard({ card, size = 'md', className }: CardProps) {
  const sizeClasses = {
    sm: 'w-7 h-10 text-[10px] rounded',
    md: 'w-10 h-14 text-xs rounded',
    lg: 'w-14 h-20 text-sm rounded-md',
    xl: 'w-20 h-28 text-xl rounded-md',
  };

  if (card === 'back' || card.toLowerCase() === 'xx') {
    return (
      <div className={clsx('bg-slate-800 border-2 border-slate-700 shadow-md flex items-center justify-center overflow-hidden', sizeClasses[size])}>
        <div className="w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-500 to-transparent patterned-bg"></div>
      </div>
    );
  }

  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  const symbol = SUIT_SYMBOLS[suit] ?? suit;
  const color = SUIT_COLORS[suit] ?? '';

  return (
    <div
      className={clsx(
        'relative bg-card-surface border border-hairline-strong shadow-[2px_2px_8px_rgba(0,0,0,0.4)] flex flex-col p-1 select-none font-bold',
        color,
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col items-center leading-[1.1] w-3">
        <span>{rank}</span>
        <span className="text-[1.2em]">{symbol}</span>
      </div>
      {(size === 'lg' || size === 'xl') && (
        <div className="absolute right-1 bottom-1 flex flex-col items-center leading-[1.1] w-3 rotate-180">
          <span>{rank}</span>
          <span className="text-[1.2em]">{symbol}</span>
        </div>
      )}
    </div>
  );
}
