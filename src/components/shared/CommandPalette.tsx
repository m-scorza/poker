/**
 * Command palette — Cmd/Ctrl+K jump-anywhere for keyboard-first review.
 *
 * Filters the shared nav registry (plus palette-only destinations) and
 * navigates on Enter. Modal conventions mirror ConfirmDialog: backdrop click
 * and Escape close, focus lands in the input, previous focus is restored.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { NAV_ITEMS, PALETTE_EXTRA_ITEMS, type NavItem } from '../layout/navItems';

const ALL_ITEMS: NavItem[] = [...NAV_ITEMS, ...PALETTE_EXTRA_ITEMS];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return ALL_ITEMS;
    const matches = ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
    return matches.sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    });
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, []);

  const openPalette = useCallback(() => {
    previousActiveElement.current = document.activeElement;
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else openPalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close, openPalette]);

  const select = (item: NavItem) => {
    navigate(item.to);
    close();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) select(item);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-2)] shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-4 py-3">
              <Search size={16} className="text-[var(--color-fg-dim)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to…"
                aria-label="Search pages"
                className="w-full bg-transparent text-sm text-[var(--color-fg)] placeholder-[var(--color-fg-dim)] outline-none"
              />
              <kbd className="rounded border border-[var(--color-hairline)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-dim)]">esc</kbd>
            </div>
            <ul role="listbox" aria-label="Pages" className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-4 text-sm text-[var(--color-fg-muted)]">Nothing matches “{query}”.</li>
              ) : (
                results.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to} role="option" aria-selected={index === activeIndex}>
                      <button
                        type="button"
                        onClick={() => select(item)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                          index === activeIndex
                            ? 'bg-[rgba(255,255,255,0.06)] text-[var(--color-fg)]'
                            : 'text-[var(--color-fg-muted)]',
                        )}
                      >
                        <Icon size={15} className="opacity-70" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        <span className="font-mono text-[10px] text-[var(--color-fg-dim)]">{item.to}</span>
                        {index === activeIndex && <CornerDownLeft size={13} className="text-[var(--color-fg-dim)]" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-[var(--color-hairline)] px-4 py-2 font-mono text-[10px] text-[var(--color-fg-dim)]">
              ↑↓ navigate · ↵ open · esc close · ⌘K / Ctrl+K anywhere
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
