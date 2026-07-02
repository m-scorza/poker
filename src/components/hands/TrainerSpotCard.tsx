import { clsx } from 'clsx';
import { ListChecks, ShieldCheck, UsersRound } from 'lucide-react';
import type {
  SpotPacket,
  SpotPacketAction,
  SpotPacketLegalAction,
  SpotPacketPlayer,
} from '../../analysis/spotPacket';

interface TrainerSpotCardProps {
  packet: SpotPacket;
  maxActionPathItems?: number;
}

const ACTION_CLASS: Record<SpotPacketLegalAction['action'], string> = {
  fold: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
  check: 'border-white/15 bg-white/5 text-white/75',
  call: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  bet: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  raise: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  all_in: 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100',
};

function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatBb(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1).replace(/\.0$/, '')}bb`;
}

function formatActionAmount(action: SpotPacketAction): string {
  if (action.amountBb === null) return action.isAllIn ? 'all-in' : '';
  return action.isAllIn ? `${formatBb(action.amountBb)} all-in` : formatBb(action.amountBb);
}

function actorLabel(action: SpotPacketAction): string {
  if (action.playerId === 'hero') return `Hero ${action.playerPosition ?? packetlessPositionFallback(action)}`.trim();
  return action.playerPosition ?? action.playerId.replace('seat-', 'Seat ');
}

function packetlessPositionFallback(action: SpotPacketAction): string {
  return action.playerId === 'hero' ? '' : action.playerId.replace('seat-', 'Seat ');
}

function formatAction(action: SpotPacketAction): string {
  const amount = formatActionAmount(action);
  return [actorLabel(action), action.action.replace(/_/g, ' '), amount].filter(Boolean).join(' ');
}

function sortedPlayers(players: SpotPacketPlayer[]): SpotPacketPlayer[] {
  return [...players].sort((left, right) => left.seatNumber - right.seatNumber);
}

function actionPath(packet: SpotPacket, maxItems: number): SpotPacketAction[] {
  return [...packet.actionPath]
    .filter((action) => action.street === 'preflop')
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, maxItems);
}

export function TrainerSpotCard({ packet, maxActionPathItems = 8 }: TrainerSpotCardProps) {
  const preflopActions = actionPath(packet, maxActionPathItems);
  const hiddenActionCount = packet.actionPath.filter((action) => action.street === 'preflop').length - preflopActions.length;
  const activePlayers = sortedPlayers(packet.players);

  return (
    <section
      aria-label="Trainer spot card"
      data-testid="trainer-spot-card"
      className="mb-4 overflow-hidden rounded-xl border border-sky-500/20 bg-sky-500/5 shadow-sm"
    >
      <div className="border-b border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-100">
                <ShieldCheck size={12} /> Local drill prompt
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
                No trainer scoring
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/55">
                {formatSourceValue(packet.evidenceLabel)}
              </span>
            </div>
            <h4 className="mt-2 font-data text-sm font-black uppercase tracking-tight text-white">Trainer Spot Card</h4>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[var(--fg-dim)]">
              A replayable study prompt generated from the sanitized SpotPacket. It shows the complete decision state, legal menu, and source caveats without submitting answers or claiming solver EV.
            </p>
          </div>
          <div data-testid="trainer-spot-card-source" className="text-right font-data text-[10px] uppercase tracking-wider text-white/45">
            <div>{formatSourceValue(packet.source.site)} / {formatSourceValue(packet.source.parserConfidence)}</div>
            <div>{formatSourceValue(packet.trainerPrompt.source)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-testid="trainer-spot-card-state-grid" className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
            <UsersRound size={13} /> Decision state
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <span className="text-[var(--fg-dim)]">Hero</span>
            <span className="text-right font-data font-bold text-white">
              {packet.hero.handKey} · {packet.hero.position} · {formatBb(packet.hero.stackBb)}
            </span>
            <span className="text-[var(--fg-dim)]">Scenario</span>
            <span className="text-right font-data font-bold text-white">{formatSourceValue(packet.hero.scenario)}</span>
            <span className="text-[var(--fg-dim)]">Pot</span>
            <span className="text-right font-data font-bold text-white">{formatBb(packet.pot.totalBb)}</span>
            <span className="text-[var(--fg-dim)]">Table</span>
            <span className="text-right font-data font-bold text-white">
              {packet.game.activePlayers}/{packet.game.maxSeats} active · ante {packet.game.ante > 0 ? 'yes' : 'no'}
            </span>
          </div>

          <div data-testid="trainer-spot-card-seat-map" className="mt-3 flex flex-wrap gap-1.5">
            {activePlayers.map((player) => (
              <span
                key={player.playerId}
                className={clsx(
                  'rounded-lg border px-2 py-1 text-[10px] font-bold',
                  player.isHero
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-white/55',
                )}
              >
                {player.isHero ? 'Hero' : `Seat ${player.seatNumber}`} · {player.position} · {formatBb(player.stackBb)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div data-testid="trainer-spot-card-action-path" className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
              <ListChecks size={13} /> Prior action path
            </div>
            <ol className="space-y-1 text-[11px] text-white/80">
              {preflopActions.length > 0 ? preflopActions.map((action) => (
                <li key={`${action.sequence}-${action.playerId}`} className="flex justify-between gap-2 rounded border border-white/5 bg-white/[0.03] px-2 py-1">
                  <span className="font-data text-white/35">#{action.sequence}</span>
                  <span className="text-right font-bold capitalize">{formatAction(action)}</span>
                </li>
              )) : (
                <li className="rounded border border-white/5 bg-white/[0.03] px-2 py-1 text-white/45">No preflop action path captured.</li>
              )}
              {hiddenActionCount > 0 && (
                <li className="text-right text-[10px] font-bold uppercase tracking-wide text-white/35">+{hiddenActionCount} more</li>
              )}
            </ol>
          </div>

          <div data-testid="trainer-spot-card-legal-actions" className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
              <ListChecks size={13} /> Legal action menu
            </div>
            <div className="flex flex-wrap gap-2">
              {packet.trainerPrompt.legalActions.map((action) => (
                <span
                  key={action.id}
                  data-testid={`trainer-spot-action-${action.id}`}
                  className={clsx('rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide', ACTION_CLASS[action.action])}
                  title={action.amountBb !== null ? formatBb(action.amountBb) : undefined}
                >
                  {action.label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-muted)]">
              Actions are shown for review only. No answer button is wired, scoring is intentionally absent, and mixed-action trainer policies can be modeled later without changing the packet boundary.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
