import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';

const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value || '';
    if (/ResizeObserver loop/i.test(msg)) return null;
    if (/Network Error/i.test(msg)) return null;
    if (/AbortError|canceled/i.test(msg)) return null;
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') return null;
    return breadcrumb;
  },
};

// TODO: Re-enable cookie consent before production launch
Sentry.init(SENTRY_CONFIG);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
