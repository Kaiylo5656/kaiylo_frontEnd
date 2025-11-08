import React, { useEffect, useRef, useCallback, forwardRef } from 'react';
import { X } from 'lucide-react';
import { useRegisterModal } from './ModalManager';
import ModalPortal from './ModalPortal';

const BaseModal = forwardRef(({
  isOpen,
  onClose,
  title,
  children,
  modalId,
  zIndex = 50,
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = '',
  size = 'md',
  noPadding = false,
  footer
}, ref) => {
  const { isTopMost } = useRegisterModal(modalId);
  const internalModalRef = useRef(null);
  const modalRef = ref || internalModalRef;
  const previousActiveElement = useRef(null);

  // Store the element that opened the modal
  useEffect(() => {
    if (isOpen && !previousActiveElement.current) {
      previousActiveElement.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && isTopMost && modalRef.current) {
      // Focus the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isOpen, isTopMost]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isTopMost && closeOnEsc) {
      onClose();
    }
  }, [isTopMost, closeOnEsc, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Lock body scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && isTopMost && closeOnBackdrop) {
      onClose();
    }
  }, [isTopMost, closeOnBackdrop, onClose]);

  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  return (
    <ModalPortal zIndex={zIndex}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        style={{ zIndex: zIndex }}
      >
        <div
          ref={modalRef}
          className={`relative mx-auto w-full ${sizeClasses[size]} max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 shadow-2xl flex flex-col ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `${modalId}-title` : undefined}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Header */}
          {title && (
            <div className="shrink-0 px-6 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
              <h2 id={`${modalId}-title`} className="text-xl font-semibold text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body ${
              noPadding ? '' : 'px-6 py-5 space-y-5'
            } ${footer ? 'pb-4' : ''}`}
            style={{ 
              scrollbarGutter: 'stable',
              WebkitOverflowScrolling: 'touch',
              maxHeight: title && footer 
                ? 'calc(92vh - 73px - 80px)' 
                : title 
                  ? 'calc(92vh - 73px)' 
                  : footer 
                    ? 'calc(92vh - 80px)' 
                    : '92vh',
              height: title && footer 
                ? 'calc(92vh - 73px - 80px)' 
                : title 
                  ? 'calc(92vh - 73px)' 
                  : footer 
                    ? 'calc(92vh - 80px)' 
                    : '92vh'
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-[#0f0f10]/95 backdrop-blur pb-[max(0px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
});

BaseModal.displayName = 'BaseModal';

export default BaseModal;
