/**
 * PageTransition — the route wrapper that killed the spinner. Outgoing pages
 * fade to 0 with a hair of scale; incoming pages enter as the page-load rise.
 * Lazy-chunk waits hide inside the exit phase behind an invisible Suspense
 * placeholder, so navigation never flashes a loader. See
 * docs/design/BLACKOUT_ROLLOUT.md (Motion language · Route change) +
 * DECISIONS.md (D15: AnimatePresence transitions, framer-motion only).
 */

import { Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { pageVariants, pageVariantsReduced, useMotionDisabled } from './motion';

/** Freezes the outlet element it saw on mount, so the exiting copy keeps
 *  rendering the old page while the new one animates in. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

export function PageTransition() {
  const location = useLocation();
  const still = useMotionDisabled();
  const variants = still ? pageVariantsReduced : pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <Suspense fallback={<div aria-hidden="true" />}>
          <FrozenOutlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
