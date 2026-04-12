import type { Position } from '../types/analysis';

/**
 * Position labels by player count, ordered clockwise from BTN.
 * From CLAUDE.md position mapping table.
 */
const POSITION_LABELS: Record<number, Position[]> = {
  2: ['BTN/SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'SB', 'BB', 'CO'],
  5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
  7: ['BTN', 'SB', 'BB', 'UTG', 'MP', 'HJ', 'CO'],
  8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP1', 'MP2', 'HJ', 'CO'],
};

export interface SeatInfo {
  seatNumber: number;
  playerName: string;
}

/**
 * Assign positions to active seats based on button location.
 *
 * Handles non-contiguous seats (Bug #4) by sorting and rotating,
 * and HU (Bug #3) by using BTN/SB for 2-player tables.
 */
export function assignPositions(
  activeSeats: SeatInfo[],
  buttonSeat: number,
): Map<number, Position> {
  const count = activeSeats.length;

  // Handle unsupported counts gracefully
  if (count === 0) return new Map();
  if (count === 1) {
    const result = new Map<number, Position>();
    result.set(activeSeats[0]!.seatNumber, 'BTN' as Position);
    return result;
  }

  // For >9 players, generate dynamic position labels (UTG+N)
  let labels = POSITION_LABELS[count];
  if (!labels) {
    labels = generateDynamicLabels(count);
  }

  // Sort by seat number
  const sorted = [...activeSeats].sort((a, b) => a.seatNumber - b.seatNumber);

  // Find button index in sorted array — fall back to seat 0 if button not found
  let btnIdx = sorted.findIndex((s) => s.seatNumber === buttonSeat);
  if (btnIdx === -1) {
    // Button seat may have been eliminated; use first seat as fallback
    btnIdx = 0;
  }

  // Rotate so BTN is first (clockwise from BTN)
  const rotated = [...sorted.slice(btnIdx), ...sorted.slice(0, btnIdx)];

  // Assign position labels
  const result = new Map<number, Position>();
  for (let i = 0; i < rotated.length; i++) {
    result.set(rotated[i]!.seatNumber, labels[i]!);
  }

  return result;
}

/**
 * Generate position labels for tables with more than 9 players.
 * Uses UTG, UTG+1, UTG+2, ... for early positions.
 */
function generateDynamicLabels(count: number): Position[] {
  // BTN, SB, BB are always present; remaining are early/middle/late positions
  const labels: Position[] = ['BTN', 'SB', 'BB'];
  const remaining = count - 3;
  if (remaining <= 0) return labels;

  // Last two positions before BTN are always CO and HJ
  // Everything before that is UTG, UTG+1, MP, etc.
  for (let i = 0; i < remaining; i++) {
    if (i === remaining - 1) {
      labels.push('CO');
    } else if (i === remaining - 2) {
      labels.push('HJ');
    } else if (i === 0) {
      labels.push('UTG');
    } else {
      labels.push(`UTG+${i}` as Position);
    }
  }
  return labels;
}
