import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { lazy, Suspense, useEffect, useState } from 'react';
import { getHeroName } from '../../data/store';
import { useAppStore } from '../../data/appStore';
import { Loader2 } from 'lucide-react';

const CommandPalette = lazy(() =>
  import('../shared/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);

function CursorHalo() {
  useEffect(() => {
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
      c.style.transform = `translate(${x - 5}px, ${y - 5}px)`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, .stat-trigger, .seat-btn, .mc, .card.lift, .tab-menu button, .sw')) {
        c.style.width = '46px';
        c.style.height = '46px';
      } else {
        c.style.width = '10px';
        c.style.height = '10px';
      }
    };
    document.addEventListener('mouseover', onMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <div id="cursor-halo" className="halo" />;
}

export function Layout() {
  const { setHeroName, isSeedingDemo, demoProgressMessage } = useAppStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);

  useEffect(() => {
    getHeroName().then(setHeroName);
  }, [setHeroName]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteMounted(true);
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className="dots" />
      <CursorHalo />
      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </Suspense>
      )}
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-6 md:ml-56 p-4 md:p-6 md:pt-16 transition-all">
          <div className="max-w-[1060px] mx-auto">
            <Outlet />
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
