/**
 * Hand Replay — street-by-street visual replay of a single hand.
 * Shows board cards, player actions, pot progression, and hero cards.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { PokerCard } from '../shared/Card';
import { getPlayersForHand, getActionsForHand, toggleStarHand } from '../../data/store';
import { Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { classifyBoardTexture, analyzePostflop } from '../../analysis/postflopAnalyzer';
import { computePotBeforeStreet } from '../../analysis/scenarioDetector';
import { complianceExclusionReasonForDecision } from '../../analysis/rangeChecker';
import { icmStageLabel, icmStageColor } from '../../analysis/icmDetector';
import { CardGroup, OddsCalculator } from 'poker-odds-calculator';
import type { Hand, PlayerInHand, Action } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import type { PostflopAction } from '../../analysis/postflopAnalyzer';
import { calculateAlpha, calculateMDF, getRecommendedCbetSizing } from '../../analysis/math';

interface HandReplayProps {
  hand: Hand;
  heroDecision: HeroDecision | null;
  onClose: () => void;
}

type Street = 'preflop' | 'flop' | 'turn' | 'river';

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-[var(--fg-dim)]',
  check: 'text-[var(--fg)]',
  call: 'text-[var(--money)]',
  raise: 'text-[var(--accent)]',
  bet: 'text-[var(--sig)]',
  post_sb: 'text-[var(--fg-dim)]',
  post_bb: 'text-[var(--fg-dim)]',
  post_ante: 'text-[var(--fg-dim)]',
};

const ACTION_LABELS: Record<string, string> = {
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  raise: 'Raise',
  bet: 'Bet',
  post_sb: 'SB',
  post_bb: 'BB',
  post_ante: 'Ante',
};

function formatContextLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

function formatCompactNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function HandReplay({ hand, heroDecision, onClose }: HandReplayProps) {
  const [players, setPlayers] = useState<PlayerInHand[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [postflopSpots, setPostflopSpots] = useState<PostflopAction[]>([]);
  const [activeStreet, setActiveStreet] = useState<Street>('preflop');
  const [isStarred, setIsStarred] = useState(hand.isStarred || false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [handleKeyDown]);

  useEffect(() => {
    async function load() {
      const [p, a] = await Promise.all([
        getPlayersForHand(hand.id),
        getActionsForHand(hand.id),
      ]);
      setPlayers(p);
      setActions(a);

      // Only show postflop spots when hero actually saw the flop. Gating the
      // whole block on sawFlop stops the legacy recompute fallback from
      // producing postflop spots for hands hero folded preflop (B9).
      if (heroDecision && hand.boardFlop && heroDecision.sawFlop) {
        if (Array.isArray(heroDecision.postflopActions)) {
          setPostflopSpots(heroDecision.postflopActions);
        } else {
          const heroName = p.find(pl => pl.isHero)?.playerName || 'scorza23';
          const preflopFolders = new Set(
            a.filter((act) => act.street === 'preflop' && act.actionType === 'fold')
              .map((act) => act.playerName),
          );
          const preflopAllIns = new Set(
            a.filter((act) => act.street === 'preflop' && act.isAllIn)
              .map((act) => act.playerName),
          );
          const flopPlayerCount = p.length - preflopFolders.size - preflopAllIns.size;
          // Use the pot as of the start of the flop, not the final pot, so
          // legacy recomputes report correct c-bet sizing fractions (B9).
          const flopPot = computePotBeforeStreet(a, 'flop') || hand.totalPot;
          const spots = analyzePostflop(
            a,
            heroName,
            heroDecision.wasPreFlopRaiser,
            hand.boardFlop,
            flopPlayerCount,
            flopPot,
          );
          setPostflopSpots(spots);
        }
      } else {
        setPostflopSpots([]);
      }
    }
    load();
  }, [hand, heroDecision]);

  const hero = players.find((p) => p.isHero);
  const streetActions = actions.filter((a) => a.street === activeStreet);

  const boardTexture = hand.boardFlop
    ? classifyBoardTexture(hand.boardFlop)
    : null;
  const hasTournamentContext = Boolean(
    heroDecision?.bountyContext || heroDecision?.fakeShoveSpot || heroDecision?.restealSpot,
  );

  const streets: Street[] = ['preflop'];
  if (hand.boardFlop) streets.push('flop');
  if (hand.boardTurn) streets.push('turn');
  if (hand.boardRiver) streets.push('river');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close replay from backdrop"
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hand-replay-title"
        className="relative bg-[var(--ink-2)] border border-[var(--hairline)] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="hand-replay-title" className="font-mono font-bold text-lg text-[var(--fg)]">
              Hand #{hand.id.slice(-8)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-xs text-[var(--fg-dim)]">
                {hand.maxSeats}-max | Level {hand.level} ({hand.smallBlind}/{hand.bigBlind})
                {hand.ante > 0 && ` ante ${hand.ante}`}
                | Pot: {hand.totalPot}
              </p>
              {heroDecision?.icmStage && (
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-bold', icmStageColor(heroDecision.icmStage))}>
                  {icmStageLabel(heroDecision.icmStage)}
                </span>
              )}
              {hand.activePlayers <= 5 && hand.level >= 10 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-900/30 text-purple-400">
                  FT
                </span>
              )}
              {heroDecision?.squeezeSpot && heroDecision.squeezeSpot.callerCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-900/30 text-orange-400">
                  Squeeze Spot
                </span>
              )}
              {heroDecision?.bountyContext && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-900/30 text-amber-300">
                  Bounty
                </span>
              )}
              {heroDecision?.fakeShoveSpot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-sky-900/30 text-sky-300">
                  {heroDecision.fakeShoveSpot.isFakeShove ? 'Fake Shove' : 'Large Raise'}
                </span>
              )}
              {heroDecision?.restealSpot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-900/30 text-rose-300">
                  Resteal
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const newState = await toggleStarHand(hand.id);
                setIsStarred(newState);
              }}
              className={clsx(
                "p-2 rounded-lg transition-all",
                isStarred ? "text-amber-400 bg-amber-400/10" : "text-[var(--fg-muted)] hover:text-amber-400 hover:bg-amber-400/5"
              )}
              title={isStarred ? "Remove star" : "Star hand for review"}
              aria-label={isStarred ? "Remove star" : "Star hand for review"}
            >
              <Star size={20} fill={isStarred ? "currentColor" : "none"} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--fg-dim)] hover:text-[var(--fg)] rounded-lg transition-colors"
              aria-label="Close replay"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Hero info */}
        {hero && (
          <div className="compartment flex items-center gap-3 mb-4 p-3 border-[var(--accent-line)]">
            <div>
              <span className="text-xs text-[var(--fg-dim)]">Hero</span>
              <span className="font-mono font-bold ml-2 text-[var(--fg)]">{hero.playerName}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-line)]">
                {heroDecision?.position}
              </span>
              <span className="ml-2 font-mono text-xs text-[var(--fg-dim)]">
                {(hero.chipsBefore / hand.bigBlind).toFixed(0)}bb
              </span>
            </div>
            <div className="ml-auto flex gap-1">
              {hero.holeCards?.map((c, i) => (
                <PokerCard key={i} card={c} size="lg" />
              ))}
            </div>
            {heroDecision && (
              <span className="font-mono text-sm font-bold ml-2 text-[var(--fg)]">
                {heroDecision.handKey}
              </span>
            )}
          </div>
        )}

        {/* Villains info at showdown */}
        {players.filter((p) => !p.isHero && p.holeCards && p.holeCards.length === 2).length > 0 && (
          <div className="compartment flex flex-wrap items-center gap-3 mb-4 p-2 opacity-80 border-dashed">
             <span className="text-xs text-[var(--fg-dim)] mr-2">Opponents (Showdown):</span>
             {players.filter((p) => !p.isHero && p.holeCards && p.holeCards.length === 2).map(villain => (
                <div key={villain.playerName} className="flex items-center gap-2 px-3 border-l border-[var(--hairline)] first:border-0 first:pl-0">
                   <span className="font-mono font-bold text-xs text-[var(--fg)]">{villain.playerName}</span>
                   <div className="flex gap-1">
                     {villain.holeCards!.map((c, i) => (
                       <PokerCard key={i} card={c} size="md" />
                     ))}
                   </div>
                </div>
             ))}
          </div>
        )}

        {/* 2D Graphical Table Representation */}
        <div className="bg-[var(--ink)] border border-[var(--hairline)] rounded-xl mb-6 relative flex flex-col items-center justify-center p-8 overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--sig-soft)] to-transparent pointer-events-none"></div>

          <div className="absolute top-3 left-4">
             <span className="text-[10px] uppercase text-[var(--fg-dim)] font-bold tracking-widest">Pot: {hand.totalPot}</span>
          </div>

          {boardTexture && (
            <div className="absolute top-3 right-4">
               <span className="text-[10px] uppercase font-bold text-[var(--fg-dim)] tracking-widest">
                  {boardTexture.texture.replace(/_/g, ' ')}
               </span>
            </div>
          )}

          {/* Main Board Center */}
          <div className="flex items-center justify-center gap-2 z-10 my-4 perspective-1000">
            {hand.boardFlop ? (
              <>
                <div className="flex gap-2 mr-3 px-3 py-2 bg-black/30 rounded-xl backdrop-blur-sm border border-white/5">
                  {hand.boardFlop.map((c, i) => (
                    <div key={`f${i}`} className="animate-in zoom-in" style={{ animationDelay: `${i * 100}ms` }}>
                       <PokerCard card={c} size="xl" />
                    </div>
                  ))}
                </div>

                {['turn', 'river'].includes(activeStreet) && hand.boardTurn ? (
                  <div className="animate-in zoom-in px-2" style={{ animationDelay: '300ms' }}>
                    <PokerCard card={hand.boardTurn} size="xl" />
                  </div>
                ) : (
                  <div className="px-2 opacity-30"><PokerCard card="back" size="xl" /></div>
                )}

                {activeStreet === 'river' && hand.boardRiver ? (
                  <div className="animate-in zoom-in px-2" style={{ animationDelay: '400ms' }}>
                    <PokerCard card={hand.boardRiver} size="xl" />
                  </div>
                ) : (
                  <div className="px-2 opacity-30"><PokerCard card="back" size="xl" /></div>
                )}
              </>
            ) : (
              <div className="flex gap-2 opacity-30">
                 <PokerCard card="back" size="xl" />
                 <PokerCard card="back" size="xl" />
                 <PokerCard card="back" size="xl" />
              </div>
            )}
          </div>
        </div>

        {/* Street tabs with navigation */}
        <div className="flex items-center gap-2 mb-3 w-fit">
          <button
             onClick={() => {
               const idx = streets.indexOf(activeStreet);
               if (idx > 0) setActiveStreet(streets[idx - 1] as Street);
             }}
             disabled={streets.indexOf(activeStreet) === 0}
             className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 transition-colors"
             aria-label="Previous street"
          >
             <ChevronLeft size={20} />
          </button>

          <div className="tabs">
            {streets.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStreet(s)}
                className={activeStreet === s ? 'on' : ''}
              >
                {STREET_LABELS[s]}
              </button>
            ))}
          </div>

          <button
             onClick={() => {
               const idx = streets.indexOf(activeStreet);
               if (idx < streets.length - 1) setActiveStreet(streets[idx + 1] as Street);
             }}
             disabled={streets.indexOf(activeStreet) === streets.length - 1}
             className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 transition-colors"
             aria-label="Next street"
          >
             <ChevronRight size={20} />
          </button>
        </div>

        {/* Actions for selected street */}
        <div className="space-y-1 mb-4">
          {streetActions.map((a, i) => {
            const isHero = a.playerName === hero?.playerName;
            return (
              <div
                key={i}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded text-sm',
                  isHero && 'bg-[var(--accent-soft)] border-l-2 border-[var(--accent)]',
                )}
              >
                <span className={clsx('font-mono text-xs w-24 truncate', isHero ? 'font-bold text-[var(--fg)]' : 'text-[var(--fg-dim)]')}>
                  {a.playerName}
                </span>
                <span className={clsx('font-mono font-bold', ACTION_COLORS[a.actionType])}>
                  {ACTION_LABELS[a.actionType] ?? a.actionType}
                </span>
                {a.amount !== null && a.amount > 0 && (
                  <span className="font-mono text-xs text-[var(--fg-muted)]">{a.amount}</span>
                )}
                {a.isAllIn && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--loss-soft)] text-[var(--loss)] font-bold border border-[var(--loss-line)]">
                    ALL-IN
                  </span>
                )}
              </div>
            );
          })}
          {streetActions.length === 0 && (
            <p className="text-xs text-[var(--fg-dim)] px-3 py-2">No actions on this street.</p>
          )}
        </div>

        {/* Postflop spots */}
        {postflopSpots.length > 0 && (
          <div className="border-t border-[var(--hairline)] pt-3">
            <h4 className="kick mb-2">Post-flop Analysis</h4>
            <div className="space-y-1">
              {postflopSpots.map((spot, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex flex-col gap-1 px-3 py-2 rounded text-xs border border-[var(--hairline)]',
                    spot.isCorrect === true && 'bg-[var(--money-soft)] border-[var(--money-line)]',
                    spot.isCorrect === false && 'bg-[var(--loss-soft)] border-[var(--loss-line)]',
                    spot.isCorrect === null && 'bg-white/5',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'font-mono font-bold uppercase tracking-wider',
                      spot.isCorrect === true && 'text-[var(--money)]',
                      spot.isCorrect === false && 'text-[var(--loss)]',
                      spot.isCorrect === null && 'text-[var(--fg-dim)]',
                    )}>
                      {spot.spot === 'NONE' ? 'FACING BET' : spot.spot.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[var(--fg-muted)] opacity-50">({spot.street})</span>
                  </div>
                  <span className="text-[var(--fg)] font-medium leading-relaxed">{spot.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Coach & Math Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* Strategy Context Card */}
          {boardTexture && (
            <div className="border border-[var(--hairline)] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/10 to-[var(--ink-2)] rounded-xl overflow-hidden shadow-sm">
               <div className="px-3 py-2 bg-blue-900/20 border-b border-[var(--hairline)]">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">Strategic Context</span>
               </div>
               <div className="p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--fg-dim)]">Texture:</span>
                    <span className="font-bold text-white uppercase">{boardTexture.texture.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-[11px] text-[var(--fg-muted)] italic leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                    {(() => {
                        const rec = getRecommendedCbetSizing(boardTexture.texture);
                        return `Tip: ${rec.label}. Maintain range advantage with small bets or polarize on wet boards.`;
                    })()}
                  </div>
               </div>
            </div>
          )}

          {/* Tournament Context Card */}
          {heroDecision && hasTournamentContext && (
            <div className="border border-amber-500/20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-900/10 to-[var(--ink-2)] rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-amber-900/20 border-b border-[var(--hairline)]">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">Tournament Context</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                {heroDecision.bountyContext && (
                  <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-200">Bounty Context</span>
                      <span className="font-data text-[10px] uppercase text-[var(--fg-muted)]">
                        {formatContextLabel(heroDecision.bountyContext.tournamentType)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-[var(--fg-dim)]">Equity drop</span>
                      <span className="font-data font-bold text-white text-right">
                        {formatCompactNumber(heroDecision.bountyContext.equityDrop)}%
                      </span>
                      <span className="text-[var(--fg-dim)]">Coverage</span>
                      <span className="font-data font-bold text-white text-right">
                        {heroDecision.bountyContext.heroCoversVillain ? 'Hero covers target' : 'Target covers hero'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                      {heroDecision.bountyContext.note}
                    </p>
                  </div>
                )}

                {heroDecision.fakeShoveSpot && (
                  <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sky-200">
                        {heroDecision.fakeShoveSpot.isFakeShove ? 'Fake Shove Spot' : 'Large Raise Spot'}
                      </span>
                      <span className="font-data text-[10px] uppercase text-[var(--fg-muted)]">
                        {formatCompactNumber(heroDecision.fakeShoveSpot.heroStackBb)}bb
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-[var(--fg-dim)]">Raise size</span>
                      <span className="font-data font-bold text-white text-right">
                        {heroDecision.fakeShoveSpot.raiseSize}
                      </span>
                      <span className="text-[var(--fg-dim)]">Opponents behind</span>
                      <span className="font-data font-bold text-white text-right">
                        {heroDecision.fakeShoveSpot.opponentsRemaining}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                      {heroDecision.fakeShoveSpot.note}
                    </p>
                  </div>
                )}

                {heroDecision.restealSpot && (
                  <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-rose-200">Resteal Spot</span>
                      <span className="font-data text-[10px] uppercase text-[var(--fg-muted)]">
                        {formatCompactNumber(heroDecision.restealSpot.heroStackBb)}bb
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-[var(--fg-dim)]">Hero action</span>
                      <span className="font-data font-bold text-white text-right uppercase">
                        {heroDecision.restealSpot.heroAction}
                      </span>
                      <span className="text-[var(--fg-dim)]">Opener stack</span>
                      <span className="font-data font-bold text-white text-right">
                        {formatContextLabel(heroDecision.restealSpot.villainStackType)}
                      </span>
                      <span className="text-[var(--fg-dim)]">Risk premium</span>
                      <span className="font-data font-bold text-white text-right">
                        {formatCompactNumber(heroDecision.restealSpot.riskPremiumEstimate)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                      {heroDecision.restealSpot.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Equity & Math Card */}
          {(() => {
            const opponentsWithCards = players.filter(p => !p.isHero && p.holeCards && p.holeCards.length === 2);
            const boardCards: string[] = [];
            if (hand.boardFlop) boardCards.push(...hand.boardFlop);
            if (hand.boardTurn) boardCards.push(hand.boardTurn);
            if (hand.boardRiver) boardCards.push(hand.boardRiver);

            const canShowEquity = !!hero?.holeCards && hero.holeCards.length === 2 && opponentsWithCards.length > 0;
            // Equity enumeration cost explodes with unknown board cards (measured:
            // river ~0.3ms, turn ~8ms, flop ~144ms, preflop ~5.7s). At showdown the
            // board is always complete (the only case seen across the fixture
            // corpus), so cap at >=4 known cards — a sparse board with shown cards
            // would otherwise freeze the UI on every render. We refuse it honestly
            // below rather than run a multi-second enumeration.
            const equityTooSparse = canShowEquity && boardCards.length < 4;
            let heroEquity: number | null = null;

            if (canShowEquity && !equityTooSparse) {
              try {
                const heroGroup = CardGroup.fromString(hero!.holeCards!.join(''));
                const oppGroups = opponentsWithCards.map(p => CardGroup.fromString(p.holeCards!.join('')));
                const boardGroup = CardGroup.fromString(boardCards.join(''));
                const result = OddsCalculator.calculate([heroGroup, ...oppGroups], boardGroup);
                heroEquity = result.equities[0]?.getEquity() || 0;
              } catch (e) {
                console.warn('[HandReplay] Failed to calculate equity using poker-odds-calculator:', e);
              }
            }

            return (
              <div className="border border-[var(--accent-line)] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[var(--money-soft)] to-[var(--ink-2)] rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-emerald-900/20 border-b border-[var(--hairline)]">
                   <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Equity & Math</span>
                </div>
                <div className="p-3 space-y-2">
                   {heroEquity !== null && (
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--fg-dim)] text-xs">Your Equity:</span>
                        <span className="font-data font-bold text-[var(--accent)] text-xs">{heroEquity}%</span>
                     </div>
                   )}
                   {equityTooSparse && (
                     <p className="text-[10px] text-[var(--fg-muted)] leading-snug">
                        Equity not shown — the board was incomplete when cards were revealed, and a full run-out enumeration is too costly to run here.
                     </p>
                   )}
                   {(() => {
                      const lastBet = [...streetActions].reverse().find(a => a.actionType === 'bet' || a.actionType === 'raise');
                      if (!lastBet || !lastBet.amount || hand.totalPot === 0) return null;
                      const mdf = calculateMDF(hand.totalPot, lastBet.amount);
                      const alpha = calculateAlpha(hand.totalPot, lastBet.amount);
                      return (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="bg-black/30 p-2 rounded text-center">
                            <p className="text-[9px] text-[var(--fg-muted)] uppercase">MDF</p>
                            <p className="font-data font-bold text-white text-xs">{(mdf * 100).toFixed(0)}%</p>
                          </div>
                          <div className="bg-black/30 p-2 rounded text-center">
                            <p className="text-[9px] text-[var(--fg-muted)] uppercase">Alpha</p>
                            <p className="font-data font-bold text-white text-xs">{(alpha * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      );
                   })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Decision summary */}
        {heroDecision && (() => {
          // Refusal-as-UI: a scenario the engine declines to grade (e.g. facing a
          // 3-bet or an all-in) gets an explicit "Not graded — here's why" instead
          // of a misleading badge or a red scenario label.
          const exclusionReason = complianceExclusionReasonForDecision(heroDecision);
          return (
            <div className="border-t border-[var(--hairline)] pt-4 mt-6">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--fg-dim)]">Scenario:</span>
                  <span className={clsx('font-bold', exclusionReason ? 'text-[var(--fg)]' : 'text-[var(--loss)]')}>
                    {heroDecision.scenario.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--fg-dim)]">Action:</span>
                  <span className="font-bold uppercase text-[var(--fg)]">{heroDecision.action}</span>
                </div>
                {exclusionReason ? (
                  <div className="ml-auto px-2 py-1 rounded bg-white/5 text-[var(--fg-muted)] font-bold border border-[var(--hairline)] uppercase text-[10px]">
                    Not graded
                  </div>
                ) : heroDecision.deviationType ? (
                  <div className="ml-auto px-2 py-1 rounded bg-[var(--loss-soft)] text-[var(--loss)] font-bold border border-[var(--loss-line)] uppercase">
                    {heroDecision.deviationType}
                  </div>
                ) : heroDecision.isCompliant ? (
                  <div className="ml-auto px-2 py-1 rounded bg-[var(--money-soft)] text-[var(--money)] font-bold border border-[var(--money-line)] uppercase text-[10px]">
                    Reference match
                  </div>
                ) : null}
              </div>
              {exclusionReason && (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">{exclusionReason}</p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
