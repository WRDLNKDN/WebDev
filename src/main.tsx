import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { initRefreshCapture } from './lib/refreshCapture';
import theme from './theme/theme';

// Capture refresh for debugging odd behavior on reload
initRefreshCapture();

// --- SYSTEM FIREWALL ---
import { ErrorBoundary } from './components/layout/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HelmetProvider handles the Head metadata */}
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {/* THE FIREWALL:
           Placed inside ThemeProvider so the crash screen looks good.
           Placed outside BrowserRouter to catch routing failures.
        */}
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
