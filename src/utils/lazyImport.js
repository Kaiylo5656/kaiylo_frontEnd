import { lazy } from 'react';

const RELOAD_FLAG = '__kaiyloLazyChunkReload';

function isStaleChunkError(error) {
  const message = String(error?.message ?? error ?? '');
  return (
    (message.includes('text/html') && message.includes('MIME')) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message)
  );
}

/**
 * React.lazy wrapper: on stale-build chunk failures (HTML instead of JS), reload once
 * so the browser fetches a fresh index with correct hashed asset URLs.
 */
export function lazyImport(importFn) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      if (typeof window !== 'undefined' && isStaleChunkError(error) && !window[RELOAD_FLAG]) {
        window[RELOAD_FLAG] = true;
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
