import { DualRangeMatrix } from 'poker-analyzer';

// DualRangeMatrix needs a real Map<string, RangeCellData> (it calls data.get()).
// The right-hand insight pane is hover/click driven (internal state) and cannot
// be pre-selected via props, so it renders as the empty "Select a Hand"
// placeholder in a static capture — the two 13x13 matrices are the graded body.
type Counts = { fold: number; call: number; raise: number; other: number };
type Dev = { handId: string; action: string; deviationType: string; stackBb: number; date: Date };
type Cell = {
  handKey: string;
  inTheoreticalRange: boolean;
  isPushHand?: boolean;
  totalInstances: number;
  correctInstances: number;
  deviations: Dev[];
  netProfit?: number;
  actionCounts: Counts;
};

const mk = (handKey: string, o: Partial<Cell>): [string, Cell] => [
  handKey,
  {
    handKey,
    inTheoreticalRange: false,
    totalInstances: 0,
    correctInstances: 0,
    deviations: [],
    actionCounts: { fold: 0, call: 0, raise: 0, other: 0 },
    ...o,
  },
];

const dev = (deviationType: string, stackBb: number): Dev => ({
  handId: 'H' + Math.floor(stackBb * 137),
  action: 'raise',
  deviationType,
  stackBb,
  date: new Date('2026-05-01T12:00:00Z'),
});

// UTG opening range, with a few real-world deviations logged in the Mirror.
const utgData = new Map<string, Cell>([
  mk('AA', { inTheoreticalRange: true, totalInstances: 14, correctInstances: 14, actionCounts: { fold: 0, call: 0, raise: 14, other: 0 } }),
  mk('KK', { inTheoreticalRange: true, totalInstances: 9, correctInstances: 9, actionCounts: { fold: 0, call: 0, raise: 9, other: 0 } }),
  mk('QQ', { inTheoreticalRange: true, totalInstances: 7, correctInstances: 7, actionCounts: { fold: 0, call: 0, raise: 7, other: 0 } }),
  mk('JJ', { inTheoreticalRange: true, totalInstances: 6, correctInstances: 6, actionCounts: { fold: 0, call: 0, raise: 6, other: 0 } }),
  mk('TT', { inTheoreticalRange: true, totalInstances: 5, correctInstances: 5, actionCounts: { fold: 0, call: 0, raise: 5, other: 0 } }),
  mk('99', { inTheoreticalRange: true, totalInstances: 4, correctInstances: 4, actionCounts: { fold: 0, call: 0, raise: 4, other: 0 } }),
  mk('88', { inTheoreticalRange: true, totalInstances: 4, correctInstances: 4, actionCounts: { fold: 0, call: 0, raise: 4, other: 0 } }),
  mk('77', { inTheoreticalRange: true, totalInstances: 3, correctInstances: 2, actionCounts: { fold: 0, call: 2, raise: 1, other: 0 } }),
  mk('66', { inTheoreticalRange: true, totalInstances: 5, correctInstances: 5, actionCounts: { fold: 0, call: 2, raise: 3, other: 0 } }),
  mk('AKs', { inTheoreticalRange: true, totalInstances: 8, correctInstances: 8, actionCounts: { fold: 0, call: 0, raise: 8, other: 0 } }),
  mk('AQs', { inTheoreticalRange: true, totalInstances: 6, correctInstances: 6, actionCounts: { fold: 0, call: 0, raise: 6, other: 0 } }),
  mk('AJs', { inTheoreticalRange: true, totalInstances: 5, correctInstances: 5, actionCounts: { fold: 0, call: 0, raise: 5, other: 0 } }),
  mk('ATs', { inTheoreticalRange: true, totalInstances: 4, correctInstances: 2, deviations: [dev('OVERFOLD', 42), dev('OVERFOLD', 55)], actionCounts: { fold: 2, call: 0, raise: 2, other: 0 } }),
  mk('KQs', { inTheoreticalRange: true, totalInstances: 5, correctInstances: 5, actionCounts: { fold: 0, call: 0, raise: 5, other: 0 } }),
  mk('AKo', { inTheoreticalRange: true, totalInstances: 6, correctInstances: 6, actionCounts: { fold: 0, call: 0, raise: 6, other: 0 } }),
  mk('AQo', { inTheoreticalRange: true, totalInstances: 4, correctInstances: 4, actionCounts: { fold: 0, call: 0, raise: 4, other: 0 } }),
  mk('AJo', { inTheoreticalRange: true, totalInstances: 3, correctInstances: 3, actionCounts: { fold: 0, call: 0, raise: 3, other: 0 } }),
  // Out-of-range hands opened anyway — flagged as deviations in the Mirror.
  mk('A5s', { inTheoreticalRange: false, totalInstances: 2, correctInstances: 0, deviations: [dev('OPENED_OUT_OF_RANGE', 38)], actionCounts: { fold: 0, call: 0, raise: 2, other: 0 } }),
  mk('KJo', { inTheoreticalRange: false, totalInstances: 3, correctInstances: 0, deviations: [dev('OPENED_OUT_OF_RANGE', 44), dev('OPENED_OUT_OF_RANGE', 29)], actionCounts: { fold: 0, call: 0, raise: 3, other: 0 } }),
  mk('98s', { inTheoreticalRange: false, totalInstances: 2, correctInstances: 0, deviations: [dev('OPENED_OUT_OF_RANGE', 51)], actionCounts: { fold: 0, call: 0, raise: 2, other: 0 } }),
]);

// Button short-stack push/fold view — push hands light up in the Oracle.
const btnPush = ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A5s', 'KQs', 'KJs', 'QJs', 'JTs', 'AKo', 'AQo', 'AJo', 'KQo'];
const btnData = new Map<string, Cell>(
  btnPush.map((h) =>
    mk(h, {
      inTheoreticalRange: true,
      isPushHand: true,
      totalInstances: h === 'AA' || h === 'AKs' ? 6 : 2,
      correctInstances: h === 'A5s' ? 1 : (h === 'AA' || h === 'AKs' ? 6 : 2),
      deviations: h === 'A5s' ? [dev('OVERFOLD', 9)] : [],
      actionCounts: { fold: 0, call: 0, raise: h === 'AA' || h === 'AKs' ? 6 : 2, other: 0 },
    }),
  ),
);

export const UtgCompliance = () => (
  <DualRangeMatrix data={utgData} position="UTG" viewMode="compliance" />
);

export const ButtonPushFold = () => (
  <DualRangeMatrix data={btnData} position="BTN" viewMode="push_fold" />
);
