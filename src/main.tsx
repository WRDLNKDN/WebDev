import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import { initRefreshCapture } from './lib/utils/refreshCapture';

// Capture refresh for debugging odd behavior on reload
initRefreshCapture();

// Android UAT: prevent load-at-bottom (focus, layout shift, or scroll restoration).
// Restore manual so we control initial scroll; scroll to top on first paint.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// --- SYSTEM FIREWALL ---
import { RootErrorBoundary } from './components/layout/RootErrorBoundary';
import { GlobalFormTooltips } from './components/common/GlobalFormTooltips';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <GlobalFormTooltips />

      {/* Keep the root entry plain so the landing page can avoid eager MUI boot. */}
      <RootErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RootErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
);
