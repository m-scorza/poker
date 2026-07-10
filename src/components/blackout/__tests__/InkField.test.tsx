import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { InkField } from '../InkField';
import '@testing-library/jest-dom';

// jsdom has no WebGL, so every path here exercises the static-grain fallback —
// which is exactly the branch the spec asks us to prove renders. The WebGL
// path is guarded by getContext() returning null and by the motion checks.

afterEach(() => {
  cleanup();
  document.body.removeAttribute('data-motion');
});

describe('InkField', () => {
  it('renders the static grain fallback when body[data-motion="off"]', () => {
    document.body.setAttribute('data-motion', 'off');
    const { container } = render(<InkField />);
    const el = container.querySelector('[data-inkfield]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-inkfield', 'static');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('bk-inkfield--static');
    // grain SVG turbulence data-URI is present as a background
    expect((el as HTMLElement).style.backgroundImage).toContain('feTurbulence');
  });

  it('falls back to static grain when WebGL is unavailable (jsdom)', () => {
    const { container } = render(<InkField />);
    const el = container.querySelector('[data-inkfield="static"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('bk-inkfield');
  });

  it('tints the fallback toward loss for negative bias and money for positive', () => {
    document.body.setAttribute('data-motion', 'off');
    const neg = render(<InkField bias={-1} intensity={1} />);
    const negEl = neg.container.querySelector('[data-inkfield="static"]') as HTMLElement;
    expect(negEl.style.backgroundImage).toContain('255, 84, 104'); // --loss
    cleanup();

    const pos = render(<InkField bias={1} intensity={1} />);
    const posEl = pos.container.querySelector('[data-inkfield="static"]') as HTMLElement;
    expect(posEl.style.backgroundImage).toContain('52, 217, 140'); // --money
  });

  it('forwards className and stays pointer-events-none / aria-hidden', () => {
    document.body.setAttribute('data-motion', 'off');
    const { container } = render(<InkField className="hero-ink" />);
    const el = container.querySelector('[data-inkfield]') as HTMLElement;
    expect(el).toHaveClass('hero-ink');
    expect(el.style.pointerEvents).toBe('none');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
});
