import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { HandsPage } from './pages/HandsPage';
import { StatsPage } from './pages/StatsPage';
import { RangesPage } from './pages/RangesPage';
import { LeaksPage } from './pages/LeaksPage';
import { SessionsPage } from './pages/SessionsPage';
import { VillainsPage } from './pages/VillainsPage';
import { ArenaPage } from './pages/ArenaPage';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/hands" element={<HandsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/ranges" element={<RangesPage />} />
          <Route path="/leaks" element={<LeaksPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/villains" element={<VillainsPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
