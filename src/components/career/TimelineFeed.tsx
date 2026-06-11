import { motion } from 'framer-motion';
import { Trophy, Play, Star } from 'lucide-react';
import { clsx } from 'clsx';

export interface TimelineEvent {
  id: string;
  type: 'tournament_result' | 'session_start' | 'milestone';
  date: Date;
  title: string;
  description: string;
  value?: string;
  isPositive?: boolean;
}

interface TimelineFeedProps {
  events: TimelineEvent[];
}

export function TimelineFeed({ events }: TimelineFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--fg-dim)]">
        <Play size={48} className="opacity-20 mb-4" />
        <p>No history recorded yet. Import some hands to see your career timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[var(--accent)]/50 before:via-[var(--hairline)] before:to-transparent">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className="relative"
        >
          {/* Timeline Dot */}
          <div className={clsx(
            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-[var(--bg)] z-10 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]",
            event.type === 'tournament_result' && "border-[var(--warn)] text-[var(--warn)]",
            event.type === 'session_start' && "border-[var(--sig)] text-[var(--sig)]",
            event.type === 'milestone' && "border-[var(--accent)] text-[var(--accent)]"
          )}>
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full",
              event.type === 'tournament_result' && "bg-[var(--warn)]",
              event.type === 'session_start' && "bg-[var(--sig)]",
              event.type === 'milestone' && "bg-[var(--accent)]"
            )} />
          </div>

          <div className="compartment p-4 group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2 rounded-lg",
                  event.type === 'tournament_result' && "bg-[var(--warn-soft)] text-[var(--warn)]",
                  event.type === 'session_start' && "bg-[var(--sig-soft)] text-[var(--sig)]",
                  event.type === 'milestone' && "bg-[var(--accent)]/10 text-[var(--accent)]"
                )}>
                  {event.type === 'tournament_result' && <Trophy size={16} />}
                  {event.type === 'session_start' && <Play size={16} />}
                  {event.type === 'milestone' && <Star size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-[10px] text-[var(--fg-muted)] font-mono uppercase tracking-wider">
                    {event.date.toLocaleDateString()} • {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {event.value && (
                <div className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold font-mono ring-1",
                  event.isPositive 
                    ? "bg-[var(--money-soft)] text-[var(--money)] ring-[var(--money-line)]" 
                    : "bg-[var(--loss-soft)] text-[var(--loss)] ring-[var(--loss-line)]"
                )}>
                  {event.value}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
              {event.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
