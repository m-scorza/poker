import { motion } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface DrillCardProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function DrillCard({ title, desc, icon: Icon, onClick }: DrillCardProps) {
  return (
    <motion.button
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="cursor-pointer compartment transition-all hover:border-[var(--accent-line)] group text-left"
      type="button"
    >
      <div className="mb-4 text-[var(--accent)] group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-[var(--fg)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{desc}</p>
      <div className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-2">
         Start Drill <ChevronRight size={14} />
      </div>
    </motion.button>
  );
}
