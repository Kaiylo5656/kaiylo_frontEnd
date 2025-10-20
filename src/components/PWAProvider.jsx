import React, { createContext, useContext, useEffect, useState } from 'react';
import usePWA from '../hooks/usePWA';
import PWAInstallModal from './PWAInstallModal';

const PWAContext = createContext();

export const usePWAContext = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
};

const PWAProvider = ({ children }) => {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hasShownInstallPrompt, setHasShownInstallPrompt] = useState(false);
  
  const {
    isInstallable,
    isInstalled,
    needRefresh,
    installPWA,
    updateApp,
  } = usePWA();

  // Show install prompt after a delay if app is installable and not already installed
  useEffect(() => {
    if (isInstallable && !isInstalled && !hasShownInstallPrompt) {
      const timer = setTimeout(() => {
        setShowInstallModal(true);
        setHasShownInstallPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, hasShownInstallPrompt]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShowInstallModal(false);
    }
  };

  const handleCloseModal = () => {
    setShowInstallModal(false);
  };

  const contextValue = {
    isInstallable,
    isInstalled,
    needRefresh,
    installPWA: handleInstall,
    updateApp,
    showInstallModal,
    setShowInstallModal,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Install Modal */}
      {showInstallModal && (
        <PWAInstallModal
          isOpen={showInstallModal}
          onClose={handleCloseModal}
          onInstall={handleInstall}
        />
      )}
    </PWAContext.Provider>
  );
};

export default PWAProvider;
