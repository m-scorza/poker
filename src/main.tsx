import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerGlobalErrorHandlers } from './data/errorReporter';
import './index.css';

registerGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
