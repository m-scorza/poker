/**
 * Coach's Note — the atomic "what should I study right now, and why?" page.
 *
 * Renders the discriminated `CoachsNote`: not enough data, genuinely clean, or a
 * focus leak with its receipt hands and a drill. It operates on the current
 * dataset (no week/date windowing) and never invents a signal it doesn't have —
 * the empty-receipts case says so plainly.
 */

import { Link } from 'react-router-dom';
import { Crosshair, Zap, ArrowRight, CheckCircle, Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { useAppStore } from '../data/appStore';
import { computeAggregateStats, detectLeaks, type LeakSeverity } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { buildCoachsNote, type CoachStudyPacketFocus } from '../analysis/coachsNote';
import { buildStudyQueue } from '../analysis/studyPlan';
import { buildStudyQueueSpotPacketBundle, type SpotPacket } from '../analysis/spotPacket';
import {
  buildStudyPacketArenaPathFromIds,
  buildStudyPacketArenaSession,
  readStudyPacketProgress,
  selectNextActionableStudyPacket,
  studyPacketProgressKey,
  studyPacketSrsStatusLabel,
} from '../analysis/studyPacketProgress';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import type { ParsedHand } from '../parser/pokerstars';

const SEVERITY_BADGE: Record<LeakSeverity, { cls: string; label: string }> = {
  critical: { cls: 'bg-[var(--loss-soft)] text-[var(--loss)]', label: 'CRITICAL' },
  high: { cls: 'bg-[var(--loss-soft)] text-[var(--loss)]', label: 'HIGH' },
  medium: { cls: 'bg-warn/15 text-warn', label: 'MEDIUM' },
  low: { cls: 'bg-white/5 text-[var(--fg-dim)]', label: 'LOW' },
};

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'low confidence — directional',
  medium: 'medium confidence',
  high: 'high confidence',
};

function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function packetReviewPath(packet: SpotPacket): string {
  return `/hands?panel=spot-packet&reviewHand=${encodeURIComponent(packet.source.handId)}#spot-packet`;
}

function packetArenaPath(focus: CoachStudyPacketFocus): string {
  const handIds = focus.arenaSessionHandIds?.length ? focus.arenaSessionHandIds : [focus.packet.source.handId];
  return buildStudyPacketArenaPathFromIds(handIds, focus.arenaSessionPacketIds ?? []) ?? '/arena';
}

export function CoachsNotePage() {
  const { strategyProfile } = useAppStore();
  const note = useLiveQuery(async () => {
    const [decisionsRaw, hands, tournaments, players, actions] = await Promise.all([
      db.heroDecisions.toArray(),
      db.hands.toArray(),
      db.tournaments.toArray(),
      db.players.toArray(),
      db.actions.toArray(),
    ]);
    const checked = batchCheckCompliance(decisionsRaw, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    const studyQueue = buildStudyQueue(leaks, checked, hands, 5);

    const tournamentById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
    const playersByHandId = new Map<string, typeof players>();
    for (const player of players) {
      const group = playersByHandId.get(player.handId) ?? [];
      group.push(player);
      playersByHandId.set(player.handId, group);
    }
    const actionsByHandId = new Map<string, typeof actions>();
    for (const action of actions) {
      const group = actionsByHandId.get(action.handId) ?? [];
      group.push(action);
      actionsByHandId.set(action.handId, group);
    }

    const parsedHands: ParsedHand[] = hands.map((hand) => ({
      hand,
      players: playersByHandId.get(hand.id) ?? [],
      actions: actionsByHandId.get(hand.id) ?? [],
      tournament: tournamentById.get(hand.tournamentId) ?? { id: hand.tournamentId, handsPlayed: 0 },
      collectedAmounts: new Map(),
      showdownWinners: new Set(),
    }));
    const bundle = buildStudyQueueSpotPacketBundle(studyQueue, parsedHands, checked, { maxPackets: 12 });
    const progress = readStudyPacketProgress();
    const packet = selectNextActionableStudyPacket(bundle.packets, progress);
    const arenaSessionPackets = buildStudyPacketArenaSession(bundle.packets, packet, progress);
    const studyPacketFocus = packet
      ? {
        packet,
        srsStatus: studyPacketSrsStatusLabel(progress[studyPacketProgressKey(packet)]),
        ...(arenaSessionPackets.length > 1 ? {
          arenaSessionHandIds: arenaSessionPackets.map((entry) => entry.source.handId),
          arenaSessionPacketIds: arenaSessionPackets.map((entry) => entry.packetId),
        } : {}),
      }
      : undefined;

    return buildCoachsNote({
      leaks,
      decisions: checked,
      hands,
      ...(studyPacketFocus ? { studyPacketFocus } : {}),
    });
  }, [strategyProfile], undefined);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--fg)]">
            <Crosshair size={22} className="text-[var(--accent)]" /> Coach&apos;s Note
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Your single most important thing to study — and why.</p>
        </div>
        <DemoDataButton />
      </header>

      {note === undefined ? (
        <div className="compartment p-6 text-[var(--fg-muted)]">Reading your hands…</div>
      ) : note.kind === 'insufficient_data' ? (
        <div className="compartment flex items-start gap-3 p-6">
          <Inbox size={20} className="mt-0.5 text-[var(--fg-dim)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">Not enough hands yet</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{note.message}</p>
            <Link to="/hands" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
              Import hands <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : note.kind === 'all_clear' ? (
        <div className="compartment flex items-start gap-3 border-[var(--money-line)] p-6">
          <CheckCircle size={20} className="mt-0.5 text-[var(--money)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">No single leak stands out</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{note.message}</p>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">{note.handsAnalyzed} decisions analysed.</p>
          </div>
        </div>
      ) : (
        <>
          <section className="compartment p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">Your focus</span>
              <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_BADGE[note.focus.severity].cls)}>
                {SEVERITY_BADGE[note.focus.severity].label}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-[var(--fg)]">{note.focus.leakTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">{note.focus.explanation}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
              <span>{CONFIDENCE_LABEL[note.focus.confidence]}</span>
              {note.focus.estimatedBbLoss !== null && (
                <span>· est. cost <span className="font-mono text-[var(--loss)]">~{note.focus.estimatedBbLoss.toFixed(1)} bb</span></span>
              )}
              <span>· {note.handsAnalyzed} decisions analysed</span>
            </div>
          </section>

          {note.studyPacketFocus && (
            <section className="compartment p-6" data-testid="coachs-note-study-packet">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">Next Study Queue packet</span>
                <span className="rounded border border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-100">
                  Study-only · no EV
                </span>
              </div>
              <h3 className="mt-2 font-data text-lg font-black text-[var(--fg)]">
                {note.studyPacketFocus.packet.hero.handKey} · {note.studyPacketFocus.packet.hero.position} · {formatSourceValue(note.studyPacketFocus.packet.hero.scenario)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">
                {note.studyPacketFocus.srsStatus}. This is the same sanitized local SpotPacket selected by the dashboard Study Queue router, with {note.studyPacketFocus.packet.trainerPrompt.legalActions.length} legal action{note.studyPacketFocus.packet.trainerPrompt.legalActions.length === 1 ? '' : 's'} and {note.studyPacketFocus.packet.warnings.length} caveat{note.studyPacketFocus.packet.warnings.length === 1 ? '' : 's'}.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">
                Source: {formatSourceValue(note.studyPacketFocus.packet.source.site)} / {formatSourceValue(note.studyPacketFocus.packet.source.parserConfidence)}. Browser-local study progress only; no solver EV, trainer answer, trainer score, raw hand text, local path, or villain name is stored.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={packetReviewPath(note.studyPacketFocus.packet)}
                  className="inline-flex items-center gap-1 rounded border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sm font-semibold text-sky-100"
                  data-testid="coachs-note-study-packet-review-link"
                >
                  Open packet <ArrowRight size={14} />
                </Link>
                <Link
                  to={packetArenaPath(note.studyPacketFocus)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)]"
                  data-testid="coachs-note-study-packet-arena-link"
                >
                  Drill packet <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          )}

          <section className="compartment p-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">The receipts</div>
            {note.noDecisiveHand ? (
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                This is a frequency pattern — no single hand is decisive. Review the spot across your hands rather than one cooler.
              </p>
            ) : (
              <>
                <p className="mb-3 mt-2 text-sm text-[var(--fg-muted)]">Your costliest hands in this pattern — start here:</p>
                <ul className="space-y-2">
                  {note.receipts.map((r) => (
                    <li
                      key={r.handId}
                      className="flex items-center justify-between rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-[var(--fg-dim)]">#{r.handId}</span>
                      {r.reasons.length > 0 && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{r.reasons.join(' · ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link to="/hands" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                  Open in the Hands explorer <ArrowRight size={14} />
                </Link>
              </>
            )}
          </section>

          <section className="compartment flex items-center justify-between gap-3 p-6">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-[var(--accent)]" />
              <div>
                <div className="font-semibold text-[var(--fg)]">Drill it</div>
                <p className="text-sm text-[var(--fg-muted)]">{note.drillCta}</p>
              </div>
            </div>
            <Link
              to={note.studyPacketFocus ? packetArenaPath(note.studyPacketFocus) : '/arena'}
              className="inline-flex items-center gap-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)]"
              data-testid="coachs-note-final-drill-link"
            >
              {note.studyPacketFocus ? 'Drill packet' : 'The Arena'} <ArrowRight size={14} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
