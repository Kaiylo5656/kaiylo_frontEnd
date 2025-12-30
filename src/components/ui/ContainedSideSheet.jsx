import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalManager } from './modal/ModalManager';

const ContainedSideSheet = ({
  open,
  onClose,
  title = "Bibliothèque d'exercices",
  widthClass = "max-w-4xl",
  children,
  zIndex = 75,
  contained = true,
  sideBySide = false,
  preventClose = false,
  modalId = 'exercise-library-sheet',
}) => {
  const panelRef = useRef(null);
  const { registerModal, unregisterModal, isTopMost } = useModalManager();

  // Register/unregister modal with modal manager
  useEffect(() => {
    if (open) {
      registerModal(modalId);
    } else {
      unregisterModal(modalId);
    }
    
    return () => {
      unregisterModal(modalId);
    };
  }, [open, registerModal, unregisterModal, modalId]);

  // Close on ESC - only when this modal is topmost
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isTopMost(modalId) && !preventClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, preventClose, isTopMost, modalId]);

  // Click outside to close - only when this modal is topmost
  useEffect(() => {
    if (!open || preventClose) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && isTopMost(modalId)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onClose, preventClose, isTopMost, modalId]);

  // Choose positioning based on containment and side-by-side mode
  const pos = 'fixed'; // Always use fixed positioning for proper z-index layering
  const zBackdrop = zIndex - 5;
  const zPanel = zIndex;
  
  // For side-by-side mode, position the panel to the right of the main content
  const sideBySideClasses = sideBySide ? 'right-0 top-0 h-full w-1/2' : 'right-0 top-0';

  if (!open) return null;

  const content = (
    <>
      {/* Backdrop scoped to parent if contained */}
      <div
        aria-hidden
        className={`${pos} inset-0 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          zIndex: zBackdrop,
          pointerEvents: isTopMost(modalId) ? 'auto' : 'none'
        }}
        onClick={preventClose ? undefined : onClose}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      </div>

      {/* Side Sheet Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${pos} ${sideBySideClasses} h-full ${sideBySide ? 'w-1/2' : 'w-full'} ${widthClass} ${
          open ? 'translate-x-0' : 'translate-x-full'
        } bg-[#121212] text-white border-l border-[#1a1a1a] transition-transform duration-300 ease-in-out`}
        style={{ 
          zIndex: zPanel,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#1a1a1a] bg-[#121212]">
          <h2 className="text-lg font-medium text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-[#262626] rounded-lg hover:bg-[#404040] transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-60px)] overflow-y-auto bg-[#121212]">
          {children}
        </div>
      </div>
    </>
  );

  // Use portal to ensure proper z-index stacking
  return createPortal(content, document.body);
};

export default ContainedSideSheet;
