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
  metadata?: any;
}

interface TimelineFeedProps {
  events: TimelineEvent[];
}

export function TimelineFeed({ events }: TimelineFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-dim)]">
        <Play size={48} className="opacity-20 mb-4" />
        <p>No history recorded yet. Import some hands to see your career timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[var(--color-accent)]/50 before:via-white/5 before:to-transparent">
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
            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-[var(--color-bg-base)] z-10 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]",
            event.type === 'tournament_result' && "border-amber-400 text-amber-400",
            event.type === 'session_start' && "border-blue-400 text-blue-400",
            event.type === 'milestone' && "border-[var(--color-accent)] text-[var(--color-accent)]"
          )}>
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full",
              event.type === 'tournament_result' && "bg-amber-400",
              event.type === 'session_start' && "bg-blue-400",
              event.type === 'milestone' && "bg-[var(--color-accent)]"
            )} />
          </div>

          <div className="bg-[var(--color-bg-card)] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2 rounded-lg",
                  event.type === 'tournament_result' && "bg-amber-500/10 text-amber-500",
                  event.type === 'session_start' && "bg-blue-500/10 text-blue-500",
                  event.type === 'milestone' && "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                )}>
                  {event.type === 'tournament_result' && <Trophy size={16} />}
                  {event.type === 'session_start' && <Play size={16} />}
                  {event.type === 'milestone' && <Star size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[var(--color-accent)] transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-dim)] font-data uppercase tracking-wider">
                    {event.date.toLocaleDateString()} • {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {event.value && (
                <div className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold font-data ring-1",
                  event.isPositive 
                    ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" 
                    : "bg-red-500/10 text-red-400 ring-red-500/20"
                )}>
                  {event.value}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-dim)] leading-relaxed">
              {event.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
