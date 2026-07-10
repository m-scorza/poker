import { Sidebar } from './Sidebar';
import { CommandPalette } from '../shared/CommandPalette';
import { useEffect } from 'react';
import { getHeroName } from '../../data/store';
import { useAppStore } from '../../data/appStore';
import { Loader2 } from 'lucide-react';
import { PageTransition } from '../blackout/PageTransition';

/* The presence halo (D3 made physical, D15/D14 spec): a 22px violet ring with
   a soft radial glow that swells to 44px over interactive targets. Lerped so
   it trails the cursor; mix-blend screen so it reads as light, not paint.
   Disabled on touch and reduced-motion; the cursor itself always stays. */
const HALO_CSS = `
.bk-halo {
  position: fixed;
  top: 0;
  left: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--sig);
  pointer-events: none;
  z-index: 9000;
  mix-blend-mode: screen;
  opacity: 0;
  transition: width 0.25s, height 0.25s, opacity 0.25s;
}
.bk-halo::after {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--sig-soft), transparent 70%);
}
@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  .bk-halo { display: none; }
}
`;

const HALO_TARGETS =
  'a, button, [role="button"], input, select, textarea, label, .stat-trigger, .seat-btn, .mc, .card.lift, .tab-menu button, .sw';

function CursorHalo() {
  useEffect(() => {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.getElementById('cursor-halo');
    if (!c) return;
    let x = 0, y = 0, tx = 0, ty = 0, shown = false;

    const onMouseMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        c.style.opacity = '1';
        shown = true;
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    let rafId: number;
    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      c.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(HALO_TARGETS)) {
        c.style.width = '44px';
        c.style.height = '44px';
      } else {
        c.style.width = '22px';
        c.style.height = '22px';
      }
    };
    document.addEventListener('mouseover', onMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <style>{HALO_CSS}</style>
      <div id="cursor-halo" className="bk-halo" />
    </>
  );
}

export function Layout() {
  const { setHeroName, isSeedingDemo, demoProgressMessage } = useAppStore();

  useEffect(() => {
    getHeroName().then(setHeroName);
  }, [setHeroName]);

  return (
    <>
      <div className="dots" />
      <CursorHalo />
      <CommandPalette />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-6 md:ml-56 p-4 md:p-6 md:pt-16 transition-all">
          <div className="max-w-[1060px] mx-auto">
            <PageTransition />
          </div>
        </main>

        {/* Global Demo Seed Progress Overlay */}
        {isSeedingDemo && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="jewel rounded-xl p-4 flex items-center gap-4">
              <Loader2 className="animate-spin text-[var(--color-money)]" size={24} />
              <div>
                <p className="kicker mb-1">Demo Loading</p>
                <p className="text-sm font-semibold text-[var(--color-fg)]">{demoProgressMessage || 'Working...'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
