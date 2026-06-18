import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Grid3X3,
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  Trophy,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../data/appStore';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hands', icon: Search, label: 'Hands' },
  { to: '/leaks', icon: AlertTriangle, label: 'Leaks' },
  { to: '/career', icon: Trophy, label: 'Career Arc', section: 'Reports' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/ranges', icon: Grid3X3, label: 'Ranges' },
  { to: '/arena', icon: Zap, label: 'The Arena', section: 'Practice' },
  { to: '/villains', icon: Users, label: 'Villains' },
];

export function Sidebar() {
  const heroName = useAppStore((s) => s.heroName);
  const initial = heroName.trim().charAt(0).toUpperCase() || '?';

  return (
    <aside className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-56 bg-[var(--color-ink)] border-t md:border-t-0 md:border-r border-[var(--color-hairline)] flex flex-row md:flex-col z-50 overflow-x-auto md:overflow-visible">
      <div className="hidden md:flex flex-col px-5 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded bg-[var(--color-fg)] text-[var(--color-ink)] font-display font-extrabold flex items-center justify-center text-[15px] tracking-tighter">PA</div>
          <div>
            <h1 className="font-display font-extrabold text-[15px] leading-tight tracking-tight">Poker Analyzer</h1>
            <span className="text-[11px] text-[var(--color-fg-muted)]">Command Desk</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-row md:flex-col py-2 md:py-0 px-3 space-x-1 md:space-x-0 md:space-y-0.5">
        <div className="hidden md:block px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-fg-dim)] font-mono mt-2 mb-1">Review</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label, section }) => (
          <div key={to}>
            {section && <div className="hidden md:block px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--color-fg-dim)] font-mono mt-4 mb-1">{section}</div>}
            <NavLink
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 py-2 md:py-2 rounded-md text-[11px] md:text-[13px] transition-all whitespace-nowrap min-w-[70px] md:min-w-full font-sans',
                  isActive
                    ? 'text-[var(--color-fg)] bg-[rgba(255,255,255,0.045)] shadow-[inset_2px_0_0_var(--color-sig)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-ink-3)]'
                )
              }
            >
              <Icon size={16} className="md:w-[16px] md:h-[16px] opacity-70" />
              <span className="hidden sm:inline md:inline font-medium">{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="hidden md:block px-5 py-6 mt-auto">
        <div className="pt-4 border-t border-[var(--color-hairline)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-ink-3)] text-[var(--color-fg)] flex items-center justify-center font-display font-bold text-sm">{initial}</div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--color-fg)]">{heroName}</div>
            <div className="font-mono text-[10px] text-[var(--color-fg-dim)] mt-0.5">Hero</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
