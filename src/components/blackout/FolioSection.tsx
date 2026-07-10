/**
 * FolioSection — a dossier section that reveals once as it scrolls into view
 * (never scrubbed). Metadata fades up; reduced-motion collapses to a fade.
 * See docs/design/BLACKOUT_ROLLOUT.md (Motion language · Scroll) + DECISIONS.md
 * (D15: framer-motion only).
 */

import { type ReactNode, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { folioReveal, folioRevealReduced, useMotionDisabled } from './motion';

interface FolioSectionProps {
  children: ReactNode;
  className?: string;
}

export function FolioSection({ children, className }: FolioSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const still = useMotionDisabled();

  return (
    <motion.section
      ref={ref}
      className={className}
      variants={still ? folioRevealReduced : folioReveal}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
    >
      {children}
    </motion.section>
  );
}
