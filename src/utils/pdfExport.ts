/**
 * PDF report export for session data.
 *
 * Generates a styled PDF with session summary table, aggregate stats,
 * and leak alerts. Uses jsPDF + jspdf-autotable.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Session } from '../data/sessions';
import type { Leak } from '../analysis/leakDetector';

function pct(n: number, d: number): string {
  return d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`;
}

/**
 * Export a PDF report with session stats, aggregate overview, and active leaks.
 */
export function exportSessionsPDF(
  sessions: Session[],
  leaks: Leak[] = [],
  heroName: string = 'scorza23',
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = format(new Date(), 'yyyy-MM-dd HH:mm');

  // ── Header ──────────────────────────────────────────────
  doc.setFontSize(18);
  doc.text(`Session Report — ${heroName}`, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${now}`, 14, 24);
  doc.text(`${sessions.length} session${sessions.length === 1 ? '' : 's'}`, pageWidth - 14, 24, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // ── Aggregate Stats ─────────────────────────────────────
  if (sessions.length > 0) {
    const totals = sessions.reduce(
      (acc, s) => {
        const st = s.stats;
        acc.hands += st.totalHands;
        acc.vpip += st.vpipHands;
        acc.pfr += st.pfrHands;
        acc.cbetOpps += st.cbetOpps;
        acc.cbetMade += st.cbetMade;
        acc.cbetHUOpps += st.cbetHUOpps;
        acc.cbetHUMade += st.cbetHUMade;
        acc.wtsd += st.wtsdHands;
        acc.wonSD += st.wonSDHands;
        acc.limps += st.limpHands;
        acc.compEligible += st.complianceEligible;
        acc.compCompliant += st.complianceCompliant;
        acc.threeBetOpps += st.threeBetOpps;
        acc.threeBetMade += st.threeBetMade;
        acc.dbOpps += st.doubleBarrelOpps;
        acc.dbMade += st.doubleBarrelMade;
        acc.totalBb += s.totalBb;
        acc.bbHands += s.bb100Hands;
        return acc;
      },
      {
        hands: 0, vpip: 0, pfr: 0, cbetOpps: 0, cbetMade: 0,
        cbetHUOpps: 0, cbetHUMade: 0, wtsd: 0, wonSD: 0, limps: 0,
        compEligible: 0, compCompliant: 0, threeBetOpps: 0,
        threeBetMade: 0, dbOpps: 0, dbMade: 0, totalBb: 0, bbHands: 0,
      },
    );

    doc.setFontSize(11);
    doc.text('Overview', 14, 32);

    const summaryData = [
      ['Hands', totals.hands.toString()],
      ['BB/100', totals.bbHands > 0 ? `${((totals.totalBb / totals.bbHands) * 100).toFixed(1)}` : '—'],
      ['Total BB', totals.bbHands > 0 ? totals.totalBb.toFixed(1) : '—'],
      ['VPIP', pct(totals.vpip, totals.hands)],
      ['PFR', pct(totals.pfr, totals.hands)],
      ['C-bet Total', pct(totals.cbetMade, totals.cbetOpps)],
      ['C-bet HU', pct(totals.cbetHUMade, totals.cbetHUOpps)],
      ['Double Barrel', pct(totals.dbMade, totals.dbOpps)],
      ['3-bet', pct(totals.threeBetMade, totals.threeBetOpps)],
      ['WTSD', pct(totals.wtsd, totals.vpip)],
      ['Won at SD', pct(totals.wonSD, totals.wtsd)],
      ['Compliance', pct(totals.compCompliant, totals.compEligible)],
      ['Limps', totals.limps.toString()],
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Stat', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: [200, 200, 200], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25, halign: 'right' } },
      margin: { left: 14 },
      tableWidth: 60,
    });
  }

  // ── Active Leaks ────────────────────────────────────────
  if (leaks.length > 0) {
    const leakStartY = sessions.length > 0 ? 35 : 32;

    doc.setFontSize(11);
    doc.text('Active Leaks', 90, 32);

    const severityLabel = (s: string) =>
      s === 'critical' ? 'CRITICAL' : s === 'high' ? 'HIGH' : s === 'medium' ? 'MEDIUM' : 'LOW';

    const leakRows = leaks.map((l) => [
      l.name,
      severityLabel(l.severity),
      l.value.toFixed(1),
      `${l.target[0]}–${l.target[1]}`,
      `${l.deviation > 0 ? '+' : ''}${l.deviation.toFixed(1)}`,
    ]);

    autoTable(doc, {
      startY: leakStartY,
      head: [['Leak', 'Severity', 'Current', 'Target', 'Deviation']],
      body: leakRows,
      theme: 'grid',
      headStyles: { fillColor: [80, 30, 30], textColor: [200, 200, 200], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 90 },
      tableWidth: 120,
    });
  }

  // ── Session Table (new page) ────────────────────────────
  if (sessions.length > 0) {
    doc.addPage('landscape');

    doc.setFontSize(11);
    doc.text('Per-Session Breakdown', 14, 14);

    const headers = [
      'Session', 'Start', 'End', 'Hands', 'Tourneys',
      'VPIP', 'PFR', 'C-bet', 'C-bet HU', 'WTSD',
      'Won SD', 'Compliance', 'BB/100', 'Total BB', 'Limps', '3-bet', 'Dbl Barrel',
    ];

    const rows = sessions.map((s) => {
      const st = s.stats;
      return [
        s.id,
        format(s.startTime, 'MM-dd HH:mm'),
        format(s.endTime, 'MM-dd HH:mm'),
        s.totalHands.toString(),
        s.tournamentIds.length.toString(),
        pct(st.vpipHands, st.totalHands),
        pct(st.pfrHands, st.totalHands),
        pct(st.cbetMade, st.cbetOpps),
        pct(st.cbetHUMade, st.cbetHUOpps),
        pct(st.wtsdHands, st.vpipHands),
        pct(st.wonSDHands, st.wtsdHands),
        pct(st.complianceCompliant, st.complianceEligible),
        s.bb100Hands > 0 ? s.bb100.toFixed(1) : '—',
        s.bb100Hands > 0 ? s.totalBb.toFixed(1) : '—',
        st.limpHands.toString(),
        pct(st.threeBetMade, st.threeBetOpps),
        pct(st.doubleBarrelMade, st.doubleBarrelOpps),
      ];
    });

    autoTable(doc, {
      startY: 18,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 50], textColor: [200, 200, 200], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 1.5 },
    });
  }

  // ── Footer on all pages ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Poker Hand Analyzer — ${heroName} — Page ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    );
  }

  doc.save(`poker-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
