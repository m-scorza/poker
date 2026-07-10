/**
 * Motion core — the single source of BLACKOUT's motion language. Every page
 * pulls easings, durations, and shared variants from here so no surface
 * improvises its own timing. See docs/design/BLACKOUT_ROLLOUT.md (Motion
 * language) + DECISIONS.md (D15: framer-motion is the only animation library).
 */

import { useEffect, useState } from 'react';
import { useReducedMotion, type Variants } from 'framer-motion';

/** Reveals — content rising into place. */
export const easeRise: [number, number, number, number] = [0.2, 0.9, 0.24, 1];
/** Ink fills and inversions — CTAs, backdrops. */
export const easeInk: [number, number, number, number] = [0.6, 0, 0.2, 1];

export const durations = {
  micro: 0.2,
  move: 0.3,
  reveal: 0.9,
  staggerStep: 0.09,
} as const;

/** The route wrapper: outgoing fades to 0 with a hair of scale, incoming
 *  rises from below. One orchestrated moment, never scattered. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 26 },
  enter: { opacity: 1, y: 0, transition: { duration: durations.move, ease: easeRise } },
  exit: { opacity: 0, scale: 0.99, transition: { duration: durations.micro, ease: easeInk } },
};

/** Reduced-motion route wrapper: fade only, no transform. */
export const pageVariantsReduced: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: durations.micro } },
  exit: { opacity: 0, transition: { duration: durations.micro } },
};

/** Staggered container for the monumental row-rise title. */
export const titleContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: durations.staggerStep } },
};

/** A single title row: rises the full line height behind an overflow-hidden mask. */
export const titleRow: Variants = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: durations.reveal, ease: easeRise } },
};

/** Reduced-motion title row: fade in place, no vertical travel. */
export const titleRowReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: durations.micro } },
};

/** Scroll-linked folio reveal: metadata fades up as the section enters view. */
export const folioReveal: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: durations.move, ease: easeRise } },
};

export const folioRevealReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: durations.micro } },
};

/**
 * True when motion should collapse to fades / stillness: the OS
 * `prefers-reduced-motion` signal OR the app's `body[data-motion="off"]` toggle.
 */
export function useMotionDisabled(): boolean {
  const reduce = useReducedMotion();
  const [off, setOff] = useState(
    () => typeof document !== 'undefined' && document.body.dataset.motion === 'off',
  );

  useEffect(() => {
    const body = document.body;
    const sync = () => setOff(body.dataset.motion === 'off');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(body, { attributes: true, attributeFilter: ['data-motion'] });
    return () => observer.disconnect();
  }, []);

  return Boolean(reduce) || off;
}
