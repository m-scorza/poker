import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
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
const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]" role="status" aria-label="Loading page">
      <div className="w-9 h-9 border-3 border-accent/15 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

function PageErrorFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh] p-6">
      <div className="glass-card border border-[var(--color-danger)]/40 rounded-xl max-w-md w-full p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">This page hit an error</h2>
        <p className="text-sm text-[var(--color-text-dim)] mb-4">
          The rest of the app still works — try another page or reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-all active:scale-95"
        >
          <RefreshCcw size={16} />
          Reload
        </button>
      </div>
    </div>
  );
}

function page(node: ReactNode) {
  return <ErrorBoundary fallback={<PageErrorFallback />}>{node}</ErrorBoundary>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={page(<DashboardPage />)} />
          <Route path="/career" element={page(<CareerPage />)} />
          <Route path="/demo" element={page(<DemoPage />)} />
          <Route path="/hands" element={page(<HandsPage />)} />
          <Route path="/stats" element={page(<StatsPage />)} />
          <Route path="/ranges" element={page(<RangesPage />)} />
          <Route path="/leaks" element={page(<LeaksPage />)} />
          <Route path="/sessions" element={page(<SessionsPage />)} />
          <Route path="/villains" element={page(<VillainsPage />)} />
          <Route path="/arena" element={page(<ArenaPage />)} />
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
