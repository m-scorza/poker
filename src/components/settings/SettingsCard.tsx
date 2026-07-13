/**
 * Settings card — edit the two pieces of local configuration the app relies on:
 * the hero name (whose parser match drives every "Dealt to <name>" lookup) and
 * the strategy profile (Baseline vs Advanced analysis rules).
 *
 * Hero name persists to the Dexie `settings` table via `saveHeroName`; that is
 * the row `Layout` re-reads on boot, so writing it there is what makes the name
 * survive a reload (the Zustand store is re-hydrated from it at startup). The
 * strategy profile persists through the Zustand persist middleware like every
 * other app setting.
 */

import { useEffect, useState } from 'react';
import { Settings, Check, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../data/appStore';
import { saveHeroName } from '../../data/store';
import type { StrategyProfile } from '../../data/strategyProfiles';

const PROFILE_OPTIONS: { value: StrategyProfile; label: string; blurb: string }[] = [
  {
    value: 'game_plan',
    label: 'Baseline (Game Plan)',
    blurb: 'Binary, beginner-friendly rules from the standard SNG game plan.',
  },
  {
    value: 'advanced',
    label: 'Advanced Theory',
    blurb: 'Context-dependent rules from the full knowledge base.',
  },
];

export function SettingsCard() {
  const heroName = useAppStore((s) => s.heroName);
  const setHeroName = useAppStore((s) => s.setHeroName);
  const strategyProfile = useAppStore((s) => s.strategyProfile);
  const setStrategyProfile = useAppStore((s) => s.setStrategyProfile);

  const [draftName, setDraftName] = useState(heroName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState(false);

  // Re-seed the input whenever the persisted name changes — covers the async
  // boot-read (Layout → getHeroName → setHeroName) and normalizes the field to
  // the trimmed value after a successful save.
  useEffect(() => {
    setDraftName(heroName);
  }, [heroName]);

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) {
      setNameError('Hero name cannot be blank.');
      setSavedName(false);
      return;
    }
    setNameError(null);
    setHeroName(trimmed);
    await saveHeroName(trimmed);
    setSavedName(true);
  };

  return (
    <section className="compartment p-6 space-y-6">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">
        <Settings size={14} className="text-[var(--accent)]" /> Settings
      </div>

      <div>
        <label htmlFor="hero-name" className="block text-sm font-semibold text-[var(--fg)]">
          Hero name
        </label>
        <p className="mt-1 text-xs text-[var(--fg-dim)]">
          The screen name the parser reads your hole cards from. It must match your name in the hand histories exactly.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id="hero-name"
            type="text"
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              setSavedName(false);
              setNameError(null);
            }}
            className="min-w-0 flex-1 rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 font-mono text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]/50"
          />
          <button
            onClick={() => void handleSaveName()}
            className="inline-flex items-center gap-2 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)]"
          >
            Save
          </button>
        </div>
        {nameError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--loss)]">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{nameError}</span>
          </div>
        )}
        {savedName && !nameError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--money)]">
            <Check size={14} className="shrink-0" />
            <span>Saved.</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-semibold text-[var(--fg)]">Strategy profile</div>
        <p className="mt-1 text-xs text-[var(--fg-dim)]">
          Which rule set the analysis grades your play against.
        </p>
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Strategy profile">
          {PROFILE_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={strategyProfile === option.value}
              onClick={() => setStrategyProfile(option.value)}
              className={clsx(
                'rounded border px-3 py-2 text-left',
                strategyProfile === option.value
                  ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15'
                  : 'border-[var(--hairline)]',
              )}
            >
              <div
                className={clsx(
                  'text-sm font-semibold',
                  strategyProfile === option.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]',
                )}
              >
                {option.label}
              </div>
              <div className="mt-0.5 text-xs text-[var(--fg-dim)]">{option.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
