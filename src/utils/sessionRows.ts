import { format } from 'date-fns';
import type { Session } from '../data/sessions';

export interface SessionRowOptions {
  dateFormat: string;
  pct: (n: number, d: number) => string;
  emptyBb: string;
  includeBbHands: boolean;
}

export function buildSessionRow(s: Session, opts: SessionRowOptions): string[] {
  const st = s.stats;
  const row = [
    s.id,
    format(s.startTime, opts.dateFormat),
    format(s.endTime, opts.dateFormat),
    s.totalHands.toString(),
    s.tournamentIds.length.toString(),
    opts.pct(st.vpipHands, st.totalHands),
    opts.pct(st.pfrHands, st.totalHands),
    opts.pct(st.cbetMade, st.cbetOpps),
    opts.pct(st.cbetHUMade, st.cbetHUOpps),
    opts.pct(st.wtsdHands, st.vpipHands),
    opts.pct(st.wonSDHands, st.wtsdHands),
    opts.pct(st.complianceCompliant, st.complianceEligible),
    s.bb100Hands > 0 ? s.bb100.toFixed(1) : opts.emptyBb,
    s.bb100Hands > 0 ? s.totalBb.toFixed(1) : opts.emptyBb,
  ];

  if (opts.includeBbHands) {
    row.push(s.bb100Hands.toString());
  }

  row.push(
    st.limpHands.toString(),
    opts.pct(st.threeBetMade, st.threeBetOpps),
    opts.pct(st.doubleBarrelMade, st.doubleBarrelOpps),
  );

  return row;
}
