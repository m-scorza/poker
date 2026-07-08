import {
  LayoutDashboard,
  Crosshair,
  Search,
  Grid3X3,
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  Trophy,
  Database,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  section?: string;
}

// Coach's Note is the front door ('/'); dashboards are demoted to supporting
// evidence under "Reports". See docs/product/ROADMAP.md (Act II).
// Single registry consumed by both the Sidebar and the command palette.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: Crosshair, label: "Coach's Note" },
  { to: '/hands', icon: Search, label: 'Hands' },
  { to: '/leaks', icon: AlertTriangle, label: 'Leaks' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Reports' },
  { to: '/career', icon: Trophy, label: 'Career Arc' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/ranges', icon: Grid3X3, label: 'Ranges' },
  { to: '/arena', icon: Zap, label: 'The Arena', section: 'Practice' },
  { to: '/villains', icon: Users, label: 'Villains' },
  { to: '/data', icon: Database, label: 'Data Vault', section: 'Data' },
];

/** Destinations reachable from the palette but not pinned in the sidebar. */
export const PALETTE_EXTRA_ITEMS: NavItem[] = [
  { to: '/demo', icon: PlayCircle, label: 'Demo Mode' },
];
