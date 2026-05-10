import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Grid3X3,
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  Trophy,
  DollarSign,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../data/appStore';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/career', icon: Trophy, label: 'Career' },
  { to: '/pricing', icon: DollarSign, label: 'Pricing' },
  { to: '/hands', icon: Search, label: 'Hands' },
  { to: '/stats', icon: BarChart3, label: 'Statistics' },
  { to: '/ranges', icon: Grid3X3, label: 'Ranges' },
  { to: '/leaks', icon: AlertTriangle, label: 'Leaks' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/villains', icon: Users, label: 'Villains' },
  { to: '/arena', icon: Zap, label: 'The Arena' },
];

export function Sidebar() {
  const { strategyProfile, setStrategyProfile } = useAppStore();

  return (
    <aside className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-56 bg-[var(--color-bg-sidebar)] border-t md:border-t-0 md:border-r border-[var(--color-border)] flex flex-row md:flex-col z-50 overflow-x-auto md:overflow-visible shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:shadow-none">
      <div className="hidden md:block px-4 py-5 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-bold text-[var(--color-accent)] font-data tracking-tight">
          ♠ Poker Analyzer
        </h1>
        <p className="text-xs text-[var(--color-text-dim)] mt-0.5">App Settings</p>
      </div>

      <nav className="flex-1 flex flex-row md:flex-col py-2 md:py-3 px-2 space-x-1 md:space-x-0 md:space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm transition-all whitespace-nowrap min-w-[70px] md:min-w-full',
                isActive
                  ? 'bg-[var(--color-bg-hover)] text-[var(--color-accent)] scale-105 md:scale-100'
                  : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]',
              )
            }
          >
            <Icon size={20} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hidden md:block px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-3">
        <div>v0.2.0 — EV Platform</div>
        <select
          value={strategyProfile}
          onChange={(e) => setStrategyProfile(e.target.value as any)}
          className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs p-1.5 rounded outline-none font-bold bg-emerald-900/10"
        >
          <option value="game_plan">Game Plan (GTO)</option>
          <option value="advanced">Advanced (Exploit)</option>
        </select>
      </div>
    </aside>
  );
}
