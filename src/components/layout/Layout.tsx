import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useEffect } from 'react';
import { getHeroName } from '../../data/store';
import { useAppStore } from '../../data/appStore';
import { Loader2 } from 'lucide-react';

export function Layout() {
  const { setHeroName, isSeedingDemo, demoProgressMessage } = useAppStore();

  useEffect(() => {
    getHeroName().then(setHeroName);
  }, [setHeroName]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Sidebar />
      <main className="pb-20 md:pb-6 md:ml-56 p-4 md:p-6 transition-all animate-in fade-in slide-up">
        <Outlet />
      </main>

      {/* Global Demo Seed Progress Overlay */}
      {isSeedingDemo && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-accent)]/40 shadow-xl shadow-[var(--color-accent)]/10 rounded-xl p-4 flex items-center gap-4">
            <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-widest mb-1">Demo Loading</p>
              <p className="text-sm font-semibold text-white">{demoProgressMessage || 'Working...'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
