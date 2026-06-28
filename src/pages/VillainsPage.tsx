/**
 * Villain Tracker page — opponent stats and notes.
 *
 * Collects stats from all parsed hands for every non-hero player.
 *
 * Auto-archetypes (Fish/Nit/TAG/…) and their exploit advice were parked
 * 2026-06-23 — see docs/product/ROADMAP.md "Parked" and
 * src/analysis/villainClassifier.ts. The classifier still exists, dormant; this
 * page intentionally shows only observed stats + manual notes (no guessed label).
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { Search, Users, Tag, MessageSquare, X, Plus } from 'lucide-react';
import { db, saveVillainNote, getAllVillainNotes } from '../data/store';
import { pct } from '../utils/format';
import type { VillainStats } from '../types/villain';

interface VillainRow {
  name: string;
  totalHands: number;
  stats: VillainStats;
  notes: string;
  tags: string[];
}

const PREDEFINED_TAGS = [
  'overfolds turn',
  'never 3-bets light',
  'always c-bets',
  'wide opener',
  'tight opener',
  'stations river',
  'bluffs too much',
  'passive postflop',
  'aggressive postflop',
  'limp-calls',
];

export function VillainsPage() {
  const [villains, setVillains] = useState<VillainRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVillain, setSelectedVillain] = useState<VillainRow | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Load pre-aggregated villain profiles and saved notes directly from DB
      const profiles = await db.villains.toArray();
      const savedNotes = await getAllVillainNotes();

      // Build rows directly matching VillainRow interface
      const rows: VillainRow[] = profiles
        .filter((v) => v.totalHands >= 5) // Skip players with very few hands
        .map((v) => {
          const note = savedNotes.get(v.playerName);
          return {
            name: v.playerName,
            totalHands: v.totalHands,
            stats: v.stats,
            notes: note?.notes ?? '',
            tags: note?.tags ?? [],
          };
        });

      // Sort by total hands descending
      rows.sort((a, b) => b.totalHands - a.totalHands);
      setVillains(rows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return villains;
    const q = search.toLowerCase();
    return villains.filter((v) => v.name.toLowerCase().includes(q));
  }, [villains, search]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Users size={20} />
        Villain Tracker
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--fg-muted)]" />
          <input
            type="text"
            placeholder="Search player..."
            aria-label="Search player by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm bg-[var(--ink-1)] border border-[var(--hairline)] rounded-lg text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <span className="text-xs text-[var(--fg-muted)] self-center">
          {filtered.length} players
        </span>
      </div>

      {loading ? (
        <div className="text-[var(--fg-dim)] flex items-center gap-2" role="status" aria-label="Loading villains">
          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : villains.length === 0 ? (
        <div className="compartment p-8 text-center">
          <p className="text-[var(--fg-dim)]">Import hands to track villains.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="compartment p-0 border-[var(--hairline)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left">
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">Player</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">Hands</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">VPIP</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">PFR</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">AF</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">Limp%</th>
                    <th className="px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((v) => (
                    <tr
                      key={v.name}
                      onClick={() => setSelectedVillain(v)}
                      className="border-b border-[var(--hairline)]/50 hover:bg-[var(--ink-3)] transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-data text-xs">{v.name}</span>
                          {v.notes && (
                            <MessageSquare size={10} className="text-[var(--fg-muted)]" />
                          )}
                          {v.tags.length > 0 && (
                            <Tag size={10} className="text-[var(--fg-muted)]" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-data text-xs">{v.totalHands}</td>
                      <td className="px-3 py-2 font-data text-xs">{pct(v.stats.vpip)}</td>
                      <td className="px-3 py-2 font-data text-xs">{pct(v.stats.pfr)}</td>
                      <td className="px-3 py-2 font-data text-xs">{v.stats.af.toFixed(1)}</td>
                      <td className="px-3 py-2 font-data text-xs">{pct(v.stats.limpPct)}</td>
                      <td className="px-3 py-2 font-data text-xs">
                        <span className={(v.stats.vpip - v.stats.pfr) > 15 ? 'text-[var(--loss)]' : ''}>
                          {(v.stats.vpip - v.stats.pfr).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* The detail panel renders as a fixed overlay via its own inner wrapper now */}
          {selectedVillain && (
            <VillainDetailPanel
              villain={selectedVillain}
              onClose={() => setSelectedVillain(null)}
              onUpdate={(updated) => {
                setSelectedVillain(updated);
                setVillains((prev) =>
                  prev.map((v) => (v.name === updated.name ? updated : v)),
                );
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

// --- Villain Detail Panel with Notes & Tags ---

function VillainDetailPanel({
  villain,
  onClose,
  onUpdate,
}: {
  villain: VillainRow;
  onClose: () => void;
  onUpdate: (updated: VillainRow) => void;
}) {
  const [notes, setNotes] = useState(villain.notes);
  const [tags, setTags] = useState<string[]>(villain.tags);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const saveNotesAndTags = useCallback(
    async (newNotes: string, newTags: string[]) => {
      await saveVillainNote(villain.name, newNotes, newTags);
      onUpdate({ ...villain, notes: newNotes, tags: newTags });
    },
    [villain, onUpdate],
  );

  const handleNotesBlur = () => {
    if (notes !== villain.notes) {
      saveNotesAndTags(notes, tags);
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      saveNotesAndTags(notes, newTags);
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    saveNotesAndTags(notes, newTags);
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      addTag(trimmed);
    }
    setCustomTag('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="compartment p-6 w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200 mt-0">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-3">
          <h3 className="font-data font-bold text-lg">{villain.name}</h3>
          <span className="text-xs text-[var(--fg-muted)]">
            {villain.totalHands} hands
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          &times;
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center p-2 bg-[var(--bg-2)] rounded">
          <p className="text-xs text-[var(--fg-dim)]">VPIP</p>
          <p className="font-data font-bold">{pct(villain.stats.vpip)}</p>
        </div>
        <div className="text-center p-2 bg-[var(--bg-2)] rounded">
          <p className="text-xs text-[var(--fg-dim)]">PFR</p>
          <p className="font-data font-bold">{pct(villain.stats.pfr)}</p>
        </div>
        <div className="text-center p-2 bg-[var(--bg-2)] rounded">
          <p className="text-xs text-[var(--fg-dim)]">AF</p>
          <p className="font-data font-bold">{villain.stats.af.toFixed(1)}</p>
        </div>
        <div className="text-center p-2 bg-[var(--bg-2)] rounded">
          <p className="text-xs text-[var(--fg-dim)]">Gap</p>
          <p className={clsx('font-data font-bold', (villain.stats.vpip - villain.stats.pfr) > 15 && 'text-[var(--loss)]')}>
            {(villain.stats.vpip - villain.stats.pfr).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Tag size={14} className="text-[var(--fg-dim)]" />
          <span className="text-xs text-[var(--fg-dim)] uppercase tracking-wide">Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center gap-1"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-[var(--loss)]">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={() => setShowTagPicker(!showTagPicker)}
            className="text-[10px] px-2 py-1 rounded-full border border-dashed border-[var(--hairline)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--accent)] flex items-center gap-1"
          >
            <Plus size={10} /> Add
          </button>
        </div>

        {showTagPicker && (
          <div className="bg-[var(--bg-2)] border border-[var(--hairline)] rounded-lg p-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {PREDEFINED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="text-[10px] px-2 py-1 rounded compartment p-1 border-[var(--hairline)] text-[var(--fg-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                placeholder="Custom tag..."
                aria-label="Add custom tag"
                className="flex-1 px-2 py-1 text-[10px] bg-[var(--ink-1)] border border-[var(--hairline)] rounded text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={addCustomTag}
                className="px-2 py-1 text-[10px] rounded bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={14} className="text-[var(--fg-dim)]" />
          <span className="text-xs text-[var(--fg-dim)] uppercase tracking-wide">Notes</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Observations about the player..."
          aria-label="Player notes"
          rows={3}
          className="w-full px-3 py-2 text-sm bg-[var(--ink-1)] border border-[var(--hairline)] rounded-lg text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] resize-y"
        />
      </div>
    </div>
    </div>
  );
}
