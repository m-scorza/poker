import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the Content-Security-Policy shipped in index.html. It's a security
 * control for a PWA that ingests user-supplied hand-history files, so an
 * accidental deletion or a weakening edit (e.g. adding `unsafe-inline` to
 * script-src) should fail loudly. Verified against the real app — including
 * the parser web worker — with a browser smoke test when introduced.
 */
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const cspMatch = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
const csp = cspMatch?.[1] ?? '';

describe('Content-Security-Policy meta tag', () => {
  it('is present in index.html', () => {
    expect(csp).not.toBe('');
  });

  it('locks the origin down by default and blocks plugins/base hijacking', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('keeps scripts first-party only (no inline/eval escape hatch)', () => {
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it('allows the same-origin parser web worker', () => {
    expect(csp).toMatch(/worker-src[^;]*'self'/);
  });

  it('restricts network connections to first-party', () => {
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toMatch(/img-src[^;]*'self'/);
  });
});
