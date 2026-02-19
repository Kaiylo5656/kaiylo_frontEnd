import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

/** Tracks when any overlay modal is open (coach mobile). When true, MainLayout hides the bottom nav. */
const OverlayModalContext = createContext({
  isModalOpen: false,
  registerModalOpen: () => {},
  registerModalClose: () => {}
});

export const OverlayModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openCountRef = useRef(0);

  const registerModalOpen = useCallback(() => {
    openCountRef.current += 1;
    setIsModalOpen(openCountRef.current > 0);
  }, []);

  const registerModalClose = useCallback(() => {
    openCountRef.current = Math.max(0, openCountRef.current - 1);
    setIsModalOpen(openCountRef.current > 0);
  }, []);

  return (
    <OverlayModalContext.Provider
      value={{
        isModalOpen,
        registerModalOpen,
        registerModalClose
      }}
    >
      {children}
    </OverlayModalContext.Provider>
  );
};

export const useOverlayModal = () => useContext(OverlayModalContext);

// Backwards compatibility: same hook, aliased names
export const useVideoModal = () => {
  const ctx = useContext(OverlayModalContext);
  return {
    isVideoModalOpen: ctx.isModalOpen,
    registerVideoModalOpen: ctx.registerModalOpen,
    registerVideoModalClose: ctx.registerModalClose
  };
};
