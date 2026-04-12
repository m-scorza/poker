import type { Position } from './analysis';

/** A set of canonical hand keys (e.g. "AKs", "JJ", "T9o") representing a range. */
export type RangeSet = Set<string>;

/** Map from position to its opening range. */
export type PositionRanges = Partial<Record<Position, RangeSet>>;
