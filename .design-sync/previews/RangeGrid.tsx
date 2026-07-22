import { RangeGrid } from 'poker-analyzer';

// UTG opening range (~13%): pairs 66+, AKs-ATs, KQs, AKo-AJo in range.
const IN_RANGE = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
  'AKs', 'AQs', 'AJs', 'ATs', 'KQs',
  'AKo', 'AQo', 'AJo',
]);
const PLAYED_CORRECT = new Set(['AA', 'KK', 'QQ', 'AKs', 'AJo']);
const PLAYED_DEVIATION = new Set(['A5s', 'KJo', '98s']); // opened out of range
const NOT_DEALT = new Set(['72o', '82o', '32o']);

const utgStatus = (handKey: string) => {
  if (PLAYED_DEVIATION.has(handKey)) return 'played-deviation' as const;
  if (PLAYED_CORRECT.has(handKey)) return 'played-correct' as const;
  if (IN_RANGE.has(handKey)) return 'in-range' as const;
  if (NOT_DEALT.has(handKey)) return 'not-dealt' as const;
  return 'out-of-range' as const;
};

// Button steal range — much wider, clean compliance (no deviations logged).
const BTN_IN_RANGE = new Set([
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s',
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'KQo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo',
]);
const BTN_PLAYED = new Set(['AA', 'KK', 'AKs', 'KQs', 'A5s', '76s', 'ATo']);

const btnStatus = (handKey: string) => {
  if (BTN_PLAYED.has(handKey)) return 'played-correct' as const;
  if (BTN_IN_RANGE.has(handKey)) return 'in-range' as const;
  return 'out-of-range' as const;
};

// Dark app-canvas backdrop so out-of-range cells (near-transparent by design,
// meant to sit on the dark app bg) read correctly instead of blending into the
// harness white.
const board: React.CSSProperties = {
  display: 'inline-block',
  padding: 16,
  borderRadius: 12,
  background: 'var(--ink)',
  border: '1px solid var(--hairline)',
};

export const UtgOpeningRange = () => (
  <div style={board}>
    <RangeGrid getCellStatus={utgStatus} />
  </div>
);

export const ButtonStealCompliance = () => (
  <div style={board}>
    <RangeGrid getCellStatus={btnStatus} />
  </div>
);
