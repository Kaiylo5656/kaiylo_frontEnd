import logger from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';

const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateWorker, setUpdateWorker] = useState(null);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      logger.debug('👍 beforeinstallprompt event fired');
      setDeferredPrompt(e);
      setShowInstallPrompt(true); // Show your custom install button/modal
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      logger.debug('🎉 PWA was successfully installed');
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initialize Workbox for service worker updates
    if ('serviceWorker' in navigator) {
      // Check if service worker is available
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            logger.debug('🆕 New service worker is waiting to activate!');
            setNeedsUpdate(true);
            setUpdateWorker(registration);
          });
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      logger.debug(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  }, [deferredPrompt]);

  const checkForUpdates = useCallback(() => {
    if (updateWorker) {
      updateWorker.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload(); // Reload to apply updates
    }
  }, [updateWorker]);

  return {
    showInstallPrompt,
    installPWA,
    needsUpdate,
    checkForUpdates,
    isPWAInstalled: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
  };
};

export default usePWA;