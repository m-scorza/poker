/**
 * TitleReveal — the monumental row-rise. A page title split into
 * overflow-hidden rows that rise on load (staggered ~90ms), one word carrying
 * the outline stroke (BLACKOUT signature 2). Motion-driven replacement for the
 * old CSS-delay approach; keeps the `.bk-hl` typography classes.
 *
 * Decorative — the accessible page heading is a sibling visually-hidden <h1>.
 * See docs/design/BLACKOUT_ROLLOUT.md (Motion language) + DECISIONS.md (D15).
 */

import { motion } from 'framer-motion';
import { titleContainer, titleRow, titleRowReduced, useMotionDisabled } from './motion';

export interface TitleSeg {
  t: string;
  stroke?: boolean;
}

interface TitleRevealProps {
  rows: TitleSeg[][];
}

export function TitleReveal({ rows }: TitleRevealProps) {
  const still = useMotionDisabled();
  const rowVariants = still ? titleRowReduced : titleRow;

  return (
    <motion.div
      className="bk-hl"
      aria-hidden="true"
      variants={titleContainer}
      initial="hidden"
      animate="show"
    >
      {rows.map((row, ri) => (
        <span className="row" key={ri}>
          <motion.i variants={rowVariants}>
            {row.map((seg, si) =>
              seg.stroke ? <em key={si}>{seg.t}</em> : <span key={si}>{seg.t}</span>,
            )}
          </motion.i>
        </span>
      ))}
    </motion.div>
  );
}
