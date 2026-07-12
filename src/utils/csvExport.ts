/**
 * CSV export utility for session reports.
 *
 * Generates a CSV string from session data and triggers a browser download.
 */

import { format } from 'date-fns';
import type { Session } from '../data/sessions';
import { buildSessionRow } from './sessionRows';

function pct(n: number, d: number): string {
  return d === 0 ? '0.0' : ((n / d) * 100).toFixed(1);
}

/**
 * Export sessions as a CSV file download.
 */
export function exportSessionsCSV(sessions: Session[]): void {
  const headers = [
    'Session',
    'Start Time',
    'End Time',
    'Hands',
    'Tournaments',
    'VPIP %',
    'PFR %',
    'C-bet Total %',
    'C-bet HU %',
    'WTSD %',
    'Won at SD %',
    'Compliance %',
    'BB/100',
    'Total BB',
    'BB Sample Hands',
    'Limps',
    '3-bet %',
    'Double Barrel %',
  ];

  const rows = sessions.map((s) =>
    buildSessionRow(s, { dateFormat: 'yyyy-MM-dd HH:mm', pct, emptyBb: '', includeBbHands: true }),
  );

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `poker-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
