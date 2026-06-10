import { describe, expect, it } from 'vitest';
import {
  formatFindings,
  scanPackageJsonText,
  scanSourceText,
  type PrivacyAllowlistEntry,
} from '../../scripts/privacy-boundary-check';

describe('privacy boundary check', () => {
  it('flags browser network and native share APIs', () => {
    const findings = scanSourceText('src/pages/Upload.tsx', [
      'await fetch("/api/upload", { method: "POST" });',
      'navigator.share({ title: "hand" });',
    ].join('\n'));

    expect(findings.map(finding => finding.patternId)).toEqual(['fetch', 'navigator-share']);
    expect(formatFindings(findings)).toContain('private/local');
  });

  it('flags remote assets but ignores SVG namespace URLs', () => {
    const findings = scanSourceText('src/index.css', [
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      '@import url("https://fonts.example.com/poker.css");',
    ].join('\n'));

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      line: 2,
      patternId: 'external-url',
      matched: 'https://fonts.example.com/poker.css',
    });
  });

  it('flags telemetry or cloud SDK dependencies', () => {
    const findings = scanPackageJsonText(JSON.stringify({
      dependencies: {
        '@sentry/react': '^9.0.0',
        react: '^19.0.0',
      },
    }));

    expect(findings).toEqual([
      expect.objectContaining({
        file: 'package.json',
        patternId: 'blocked-dependency',
        matched: '@sentry/react',
      }),
    ]);
  });

  it('allows intentional future exceptions only by exact file and pattern', () => {
    const allowlist: PrivacyAllowlistEntry[] = [
      {
        file: 'src/support/OptInExport.tsx',
        patternId: 'fetch',
        reason: 'Reviewed explicit opt-in support package upload flow.',
      },
    ];

    expect(scanSourceText('src/support/OptInExport.tsx', 'fetch("/support")', allowlist)).toEqual([]);
    expect(scanSourceText('src/support/Other.tsx', 'fetch("/support")', allowlist)).toHaveLength(1);
  });
});
