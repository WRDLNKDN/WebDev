import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import './index.css';

function DebugLocation() {
  const loc = useLocation();

  React.useEffect(() => {
    // This logs every time the route changes
    console.log('[ROUTE]', loc.pathname, loc.search, loc.hash);
  }, [loc.pathname, loc.search, loc.hash]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DebugLocation />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
