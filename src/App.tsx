import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const HandsPage = lazy(() => import('./pages/HandsPage').then(m => ({ default: m.HandsPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const RangesPage = lazy(() => import('./pages/RangesPage').then(m => ({ default: m.RangesPage })));
const LeaksPage = lazy(() => import('./pages/LeaksPage').then(m => ({ default: m.LeaksPage })));
const SessionsPage = lazy(() => import('./pages/SessionsPage').then(m => ({ default: m.SessionsPage })));
const VillainsPage = lazy(() => import('./pages/VillainsPage').then(m => ({ default: m.VillainsPage })));
const ArenaPage = lazy(() => import('./pages/ArenaPage').then(m => ({ default: m.ArenaPage })));
const CareerPage = lazy(() => import('./pages/CareerPage').then(m => ({ default: m.CareerPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(0, 255, 136, 0.15)',
        borderTopColor: 'var(--color-accent, #00ff88)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/career" element={<CareerPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/hands" element={<HandsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/ranges" element={<RangesPage />} />
          <Route path="/leaks" element={<LeaksPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/villains" element={<VillainsPage />} />
          <Route path="/arena" element={<ArenaPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
