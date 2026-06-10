import { describe, it, expect } from 'vitest';
import { assignPositions } from '../position';

function seats(...nums: number[]) {
  return nums.map((n) => ({ seatNumber: n, playerName: `player${n}` }));
}

describe('assignPositions', () => {
  it('assigns 9-player table correctly', () => {
    const result = assignPositions(seats(1, 2, 3, 4, 5, 6, 7, 8, 9), 1);
    expect(result.get(1)).toBe('BTN');
    expect(result.get(2)).toBe('SB');
    expect(result.get(3)).toBe('BB');
    expect(result.get(4)).toBe('UTG');
    expect(result.get(5)).toBe('UTG+1');
    expect(result.get(6)).toBe('MP1');
    expect(result.get(7)).toBe('MP2');
    expect(result.get(8)).toBe('HJ');
    expect(result.get(9)).toBe('CO');
  });

  it('assigns 6-player table correctly', () => {
    const result = assignPositions(seats(1, 2, 3, 4, 5, 6), 3);
    expect(result.get(3)).toBe('BTN');
    expect(result.get(4)).toBe('SB');
    expect(result.get(5)).toBe('BB');
    expect(result.get(6)).toBe('UTG');
    expect(result.get(1)).toBe('HJ');
    expect(result.get(2)).toBe('CO');
  });

  it('handles non-contiguous seats (Bug #4)', () => {
    // Seats 1, 3, 6, 8 with BTN at 6
    const result = assignPositions(seats(1, 3, 6, 8), 6);
    expect(result.get(6)).toBe('BTN');
    expect(result.get(8)).toBe('SB');
    expect(result.get(1)).toBe('BB');
    expect(result.get(3)).toBe('CO');
  });

  it('handles heads-up (Bug #3): BTN = SB', () => {
    const result = assignPositions(seats(1, 5), 1);
    expect(result.get(1)).toBe('BTN/SB');
    expect(result.get(5)).toBe('BB');
  });

  it('handles 3-player table', () => {
    const result = assignPositions(seats(2, 5, 8), 5);
    expect(result.get(5)).toBe('BTN');
    expect(result.get(8)).toBe('SB');
    expect(result.get(2)).toBe('BB');
  });

  it('handles 5-player table', () => {
    const result = assignPositions(seats(1, 3, 5, 7, 9), 7);
    expect(result.get(7)).toBe('BTN');
    expect(result.get(9)).toBe('SB');
    expect(result.get(1)).toBe('BB');
    expect(result.get(3)).toBe('UTG');
    expect(result.get(5)).toBe('CO');
  });

  it('falls back clockwise-logically on invalid button seat (Bug A6)', () => {
    // When button seat (4) is not found, closest counter-clockwise seat is 3, which becomes BTN
    const result = assignPositions(seats(1, 2, 3), 4);
    expect(result.size).toBe(3);
    expect(result.get(3)).toBe('BTN');
    expect(result.get(1)).toBe('SB');
    expect(result.get(2)).toBe('BB');
  });

  it('falls back clockwise-logically with wrap-around on invalid button seat (Bug A6)', () => {
    // When button seat (1) is not found in active seats [3, 5, 7], we wrap around to highest seat 7
    const result = assignPositions(seats(3, 5, 7), 1);
    expect(result.size).toBe(3);
    expect(result.get(7)).toBe('BTN');
    expect(result.get(3)).toBe('SB');
    expect(result.get(5)).toBe('BB');
  });


  it('handles 0 active seats gracefully', () => {
    const result = assignPositions([], 1);
    expect(result.size).toBe(0);
  });

  it('handles 1 active seat gracefully', () => {
    const result = assignPositions(seats(3), 1);
    expect(result.size).toBe(1);
    expect(result.get(3)).toBe('BTN');
  });

  it('assigns >9 players table using dynamic labels', () => {
    const result = assignPositions(seats(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 1);
    expect(result.get(1)).toBe('BTN');
    expect(result.get(2)).toBe('SB');
    expect(result.get(3)).toBe('BB');
    expect(result.get(4)).toBe('UTG');
    expect(result.get(5)).toBe('UTG+1');
    expect(result.get(6)).toBe('UTG+2');
    expect(result.get(7)).toBe('UTG+3');
    expect(result.get(8)).toBe('UTG+4');
    expect(result.get(9)).toBe('HJ');
    expect(result.get(10)).toBe('CO');
  });
});
