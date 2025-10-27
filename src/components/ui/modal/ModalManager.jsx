import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ModalManagerContext = createContext();

export const useModalManager = () => {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalManagerProvider');
  }
  return context;
};

export const ModalManagerProvider = ({ children }) => {
  const [modalStack, setModalStack] = useState([]);
  const [bodyScrollLocked, setBodyScrollLocked] = useState(false);

  // Lock body scroll when first modal opens
  useEffect(() => {
    if (modalStack.length > 0 && !bodyScrollLocked) {
      document.body.style.overflow = 'hidden';
      setBodyScrollLocked(true);
    } else if (modalStack.length === 0 && bodyScrollLocked) {
      document.body.style.overflow = '';
      setBodyScrollLocked(false);
    }
  }, [modalStack.length, bodyScrollLocked]);

  const registerModal = useCallback((modalId) => {
    setModalStack(prev => {
      if (!prev.includes(modalId)) {
        return [...prev, modalId];
      }
      return prev;
    });
  }, []);

  const unregisterModal = useCallback((modalId) => {
    setModalStack(prev => prev.filter(id => id !== modalId));
  }, []);

  const isTopMost = useCallback((modalId) => {
    return modalStack.length > 0 && modalStack[modalStack.length - 1] === modalId;
  }, [modalStack]);

  const getTopMostModal = useCallback(() => {
    return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
  }, [modalStack]);

  const value = {
    modalStack,
    registerModal,
    unregisterModal,
    isTopMost,
    getTopMostModal,
    bodyScrollLocked
  };

  return (
    <ModalManagerContext.Provider value={value}>
      {children}
    </ModalManagerContext.Provider>
  );
};

export const useRegisterModal = (modalId) => {
  const { registerModal, unregisterModal, isTopMost } = useModalManager();

  useEffect(() => {
    registerModal(modalId);
    return () => unregisterModal(modalId);
  }, [modalId, registerModal, unregisterModal]);

  return {
    isTopMost: isTopMost(modalId)
  };
};
