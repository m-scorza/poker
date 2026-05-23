import { Navigate } from 'react-router-dom';

/**
 * StatsPage redirects to the unified Player Career Hub's Tiers & Formats tab.
 */
export function StatsPage() {
  return <Navigate to="/career?tab=tiers" replace />;
}
