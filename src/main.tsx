import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Self-hosted type — the Ledger trio (D15), no runtime remote font fetches.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/hanken-grotesk/300.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
