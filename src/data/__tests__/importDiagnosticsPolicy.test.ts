import { describe, it, expect } from 'vitest';
import {
  sanitizeDiagnosticText,
  sanitizeDiagnosticSourceFile,
  buildImportDiagnosticsSnapshot,
  MAX_DIAGNOSTIC_TEXT_LENGTH,
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
} from '../importDiagnosticsPolicy';

describe('importDiagnosticsPolicy', () => {
  describe('sanitizeDiagnosticText()', () => {
    it('returns clean text unmodified', () => {
      expect(sanitizeDiagnosticText('Normal diagnostic message')).toBe('Normal diagnostic message');
    });

    it('replaces control characters and newlines with spaces and collapses whitespace', () => {
      expect(sanitizeDiagnosticText('Line 1\nLine 2\r\nLine 3\tTabbed\u0000End')).toBe(
        'Line 1 Line 2 Line 3 Tabbed End'
      );
    });

    it('returns "(blank)" for empty or whitespace-only inputs', () => {
      expect(sanitizeDiagnosticText('')).toBe('(blank)');
      expect(sanitizeDiagnosticText('   \n\t\r   ')).toBe('(blank)');
    });

    it('caps text length at MAX_DIAGNOSTIC_TEXT_LENGTH (240 chars)', () => {
      const exact240 = 'a'.repeat(MAX_DIAGNOSTIC_TEXT_LENGTH);
      expect(sanitizeDiagnosticText(exact240)).toBe(exact240);
      expect(sanitizeDiagnosticText(exact240).length).toBe(MAX_DIAGNOSTIC_TEXT_LENGTH);

      const over240 = 'a'.repeat(300);
      const result = sanitizeDiagnosticText(over240);
      expect(result).toBe(`${'a'.repeat(MAX_DIAGNOSTIC_TEXT_LENGTH - 3)}...`);
      expect(result.length).toBe(MAX_DIAGNOSTIC_TEXT_LENGTH);
    });
  });

  describe('sanitizeDiagnosticSourceFile()', () => {
    it('returns "(blank)" for empty or whitespace-only paths', () => {
      expect(sanitizeDiagnosticSourceFile('')).toBe('(blank)');
      expect(sanitizeDiagnosticSourceFile('   ')).toBe('(blank)');
    });

    it('strips directory paths and retains only filename basename', () => {
      expect(sanitizeDiagnosticSourceFile('C:\\Users\\Player\\Documents\\poker\\history.txt')).toBe(
        'history.txt'
      );
      expect(sanitizeDiagnosticSourceFile('/home/user/poker/history.txt')).toBe('history.txt');
      expect(sanitizeDiagnosticSourceFile('history.txt')).toBe('history.txt');
    });

    it('retains zip archive name combined with inner file name', () => {
      expect(
        sanitizeDiagnosticSourceFile('C:\\Downloads\\hands.ZIP/tournament_12345.txt')
      ).toBe('hands.ZIP/tournament_12345.txt');
      expect(
        sanitizeDiagnosticSourceFile('/home/user/archive.zip\\subfolder\\hand.txt')
      ).toBe('archive.zip/hand.txt');
    });
  });

  describe('buildImportDiagnosticsSnapshot()', () => {
    it('builds expected snapshot shape without environment when none provided or all blank', () => {
      const expectedBase = {
        schemaVersion: 1,
        collectedAutomatically: true,
        storage: 'local-only',
        sourceFilePolicy: 'basename-only',
        warningPolicy: 'single-line-truncated',
        excludes: [
          'raw hand histories',
          'hole cards',
          'board cards',
          'actions',
          'player-level hand data',
          'local paths',
        ],
        retentionRuns: IMPORT_DIAGNOSTICS_RETENTION_RUNS,
      };

      expect(buildImportDiagnosticsSnapshot()).toEqual(expectedBase);
      expect(buildImportDiagnosticsSnapshot({ appVersion: '   ' })).toEqual(expectedBase);
    });

    it('builds snapshot propagating sanitized minimal environment object', () => {
      const snapshot = buildImportDiagnosticsSnapshot({
        appVersion: '1.0.0-beta\n1',
        browserFamily: 'Chrome',
        language: 'en-US',
        platform: 'Windows\r\n11',
      });

      expect(snapshot).toEqual({
        schemaVersion: 1,
        collectedAutomatically: true,
        storage: 'local-only',
        sourceFilePolicy: 'basename-only',
        warningPolicy: 'single-line-truncated',
        excludes: [
          'raw hand histories',
          'hole cards',
          'board cards',
          'actions',
          'player-level hand data',
          'local paths',
        ],
        retentionRuns: 50,
        environment: {
          appVersion: '1.0.0-beta 1',
          browserFamily: 'Chrome',
          language: 'en-US',
          platform: 'Windows 11',
        },
      });
    });
  });
});
