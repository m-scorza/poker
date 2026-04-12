/**
 * Hand Replay — street-by-street visual replay of a single hand.
 * Shows board cards, player actions, pot progression, and hero cards.
 */

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { PokerCard } from '../shared/Card';
import { getPlayersForHand, getActionsForHand } from '../../data/store';
import { classifyBoardTexture, analyzePostflop } from '../../analysis/postflopAnalyzer';
import { icmStageLabel, icmStageColor } from '../../analysis/icmDetector';
import type { Hand, PlayerInHand, Action } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import type { PostflopAction } from '../../analysis/postflopAnalyzer';

interface HandReplayProps {
  hand: Hand;
  heroDecision: HeroDecision | null;
  onClose: () => void;
}

type Street = 'preflop' | 'flop' | 'turn' | 'river';

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pré-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

const ACTION_COLORS: Record<string, string> = {
  fold: 'text-[var(--color-text-muted)]',
  check: 'text-[var(--color-text-dim)]',
  call: 'text-[var(--color-info)]',
  raise: 'text-[var(--color-accent)]',
  bet: 'text-[var(--color-warning)]',
  post_sb: 'text-[var(--color-text-muted)]',
  post_bb: 'text-[var(--color-text-muted)]',
  post_ante: 'text-[var(--color-text-muted)]',
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

export function HandReplay({ hand, heroDecision, onClose }: HandReplayProps) {
  const [players, setPlayers] = useState<PlayerInHand[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [postflopSpots, setPostflopSpots] = useState<PostflopAction[]>([]);
  const [activeStreet, setActiveStreet] = useState<Street>('preflop');

  useEffect(() => {
    async function load() {
      const [p, a] = await Promise.all([
        getPlayersForHand(hand.id),
        getActionsForHand(hand.id),
      ]);
      setPlayers(p);
      setActions(a);

      // Compute postflop spots
      if (heroDecision && hand.boardFlop) {
        const preflopFolders = new Set(
          a.filter((act) => act.street === 'preflop' && act.actionType === 'fold')
            .map((act) => act.playerName),
        );
        const flopPlayerCount = p.length - preflopFolders.size;
        const spots = analyzePostflop(
          a,
          heroDecision.handId ? players.find((pl) => pl.isHero)?.playerName ?? 'scorza23' : 'scorza23',
          heroDecision.wasPreFlopRaiser,
          hand.boardFlop,
          flopPlayerCount,
          hand.totalPot,
        );
        setPostflopSpots(spots);
      }
    }
    load();
  }, [hand, heroDecision, players.length]);

  const hero = players.find((p) => p.isHero);
  const streetActions = actions.filter((a) => a.street === activeStreet);

  const boardTexture = hand.boardFlop
    ? classifyBoardTexture(hand.boardFlop)
    : null;

  const streets: Street[] = ['preflop'];
  if (hand.boardFlop) streets.push('flop');
  if (hand.boardTurn) streets.push('turn');
  if (hand.boardRiver) streets.push('river');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-data font-bold text-lg">
              Hand #{hand.id.slice(-8)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-[var(--color-text-muted)]">
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
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl px-2"
          >
            &times;
          </button>
        </div>

        {/* Hero info */}
        {hero && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)]">
            <div>
              <span className="text-xs text-[var(--color-text-dim)]">Hero</span>
              <span className="font-data font-bold ml-2">{hero.playerName}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                {heroDecision?.position}
              </span>
              <span className="ml-2 font-data text-xs text-[var(--color-text-dim)]">
                {(hero.chipsBefore / hand.bigBlind).toFixed(0)}bb
              </span>
            </div>
            <div className="ml-auto flex gap-1">
              {hero.holeCards?.map((c, i) => (
                <PokerCard key={i} card={c} size="lg" />
              ))}
            </div>
            {heroDecision && (
              <span className="font-data text-sm font-bold ml-2">
                {heroDecision.handKey}
              </span>
            )}
          </div>
        )}

        {/* Board */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-dim)] mr-2">Board:</span>
          {hand.boardFlop ? (
            <>
              {hand.boardFlop.map((c, i) => (
                <PokerCard key={`f${i}`} card={c} size="lg" />
              ))}
              {hand.boardTurn && (
                <>
                  <span className="mx-1 text-[var(--color-border)]">|</span>
                  <PokerCard card={hand.boardTurn} size="lg" />
                </>
              )}
              {hand.boardRiver && (
                <>
                  <span className="mx-1 text-[var(--color-border)]">|</span>
                  <PokerCard card={hand.boardRiver} size="lg" />
                </>
              )}
              {boardTexture && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-dim)]">
                  {boardTexture.texture.replace('_', ' ')}
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--color-text-muted)] text-xs">Sem board (fold pré-flop)</span>
          )}
        </div>

        {/* Street tabs */}
        <div className="flex gap-1 mb-3">
          {streets.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStreet(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-data transition-colors',
                activeStreet === s
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-dim)] border border-[var(--color-border)] hover:border-[var(--color-border-active)]',
              )}
            >
              {STREET_LABELS[s]}
            </button>
          ))}
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
                  isHero && 'bg-[var(--color-accent)]/5 border-l-2 border-[var(--color-accent)]',
                )}
              >
                <span className={clsx('font-data text-xs w-24 truncate', isHero && 'font-bold text-[var(--color-accent)]')}>
                  {a.playerName}
                </span>
                <span className={clsx('font-data font-medium', ACTION_COLORS[a.actionType])}>
                  {ACTION_LABELS[a.actionType] ?? a.actionType}
                </span>
                {a.amount !== null && a.amount > 0 && (
                  <span className="font-data text-xs text-[var(--color-text-dim)]">{a.amount}</span>
                )}
                {a.isAllIn && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-danger)]/20 text-[var(--color-danger)] font-bold">
                    ALL-IN
                  </span>
                )}
              </div>
            );
          })}
          {streetActions.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] px-3 py-2">Sem ações nesta rua.</p>
          )}
        </div>

        {/* Postflop spots */}
        {postflopSpots.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <h4 className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-2">Análise Pós-Flop</h4>
            <div className="space-y-1">
              {postflopSpots.map((spot, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded text-xs',
                    spot.isCorrect === true && 'bg-emerald-900/15',
                    spot.isCorrect === false && 'bg-red-900/15',
                    spot.isCorrect === null && 'bg-[var(--color-bg-card)]',
                  )}
                >
                  <span className={clsx(
                    'font-data font-bold',
                    spot.isCorrect === true && 'text-[var(--color-accent)]',
                    spot.isCorrect === false && 'text-[var(--color-danger)]',
                    spot.isCorrect === null && 'text-[var(--color-text-dim)]',
                  )}>
                    {spot.spot.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[var(--color-text-muted)]">({spot.street})</span>
                  <span className="text-[var(--color-text-dim)] ml-auto">{spot.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision summary */}
        {heroDecision && (
          <div className="border-t border-[var(--color-border)] pt-3 mt-3 flex items-center gap-3 text-xs">
            <span className="text-[var(--color-text-dim)]">Cenário:</span>
            <span className="font-data">{heroDecision.scenario}</span>
            <span className="text-[var(--color-text-dim)] ml-2">Ação:</span>
            <span className="font-data font-bold">{heroDecision.action}</span>
            {heroDecision.deviationType ? (
              <span className="ml-auto px-2 py-0.5 rounded bg-red-900/30 text-[var(--color-danger)]">
                {heroDecision.deviationType}
              </span>
            ) : heroDecision.isCompliant ? (
              <span className="ml-auto px-2 py-0.5 rounded bg-emerald-900/30 text-[var(--color-accent)]">
                Correto
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
