import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  /** Optional "good range" display, e.g. "20-30%" */
  target?: string;
}

/**
 * ℹ️ hover tooltip for stat cards.
 * Shows an info icon that reveals a tooltip with explanation + target range on hover.
 */
export function InfoTooltip({ text, target }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        className="text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] transition-colors p-0.5"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        aria-label="Info"
      >
        <Info size={13} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[var(--color-border)] shadow-xl text-xs text-[var(--color-text-muted)] leading-relaxed pointer-events-none">
          <p>{text}</p>
          {target && (
            <p className="mt-1 text-emerald-400 font-data font-bold">
              Alvo: {target}
            </p>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[var(--color-border)]" />
        </div>
      )}
    </div>
  );
}
