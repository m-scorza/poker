import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useEffect } from 'react';
import { getHeroName } from '../../data/store';
import { useAppStore } from '../../data/appStore';

export function Layout() {
  const { setHeroName } = useAppStore();

  useEffect(() => {
    getHeroName().then(setHeroName);
  }, [setHeroName]);
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Sidebar />
      <main className="pb-20 md:pb-6 md:ml-56 p-4 md:p-6 transition-all animate-in fade-in slide-up">
        <Outlet />
      </main>
    </div>
  );
}
