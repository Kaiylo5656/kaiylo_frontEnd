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
  badgeCount,
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

  const content = (
    <>
      {/* Backdrop: appears immediately so page is blurred as soon as user clicks */}
      <div
        aria-hidden
        className={`${pos} inset-0 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          zIndex: zBackdrop,
          pointerEvents: isTopMost(modalId) ? 'auto' : 'none',
          transition: 'opacity 120ms ease-out'
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
        className={`${pos} ${sideBySideClasses} h-full ${sideBySide ? 'w-1/2' : 'w-full'} ${widthClass} text-white border-l border-white/10`}
        style={{ 
          zIndex: zPanel,
          pointerEvents: open ? 'auto' : 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          opacity: 1,
          transition: 'transform 600ms cubic-bezier(0.32, 0.72, 0, 1)',
          transform: open ? 'translateX(0)' : 'translateX(100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-light" style={{ color: 'var(--tw-ring-offset-color)' }}>{title}</h2>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span 
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-light"
                style={{ 
                  backgroundColor: 'var(--kaiylo-primary-hex)',
                  color: 'white',
                  fontSize: '13px'
                }}
              >
                {badgeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-60px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );

  // Use portal to ensure proper z-index stacking
  return createPortal(content, document.body);
};

export default ContainedSideSheet;
