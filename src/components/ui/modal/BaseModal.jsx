import React, { useEffect, useRef, useCallback, forwardRef } from 'react';
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
  footer,
  titleClassName = 'text-xl font-semibold text-white'
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
          className={`relative mx-auto w-full ${sizeClasses[size]} max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `${modalId}-title` : undefined}
          style={{
            background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(89, 93, 101, 0.5) 100%)',
            opacity: 0.95
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Header */}
          {title && (
            <>
              <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
                <h2 id={`${modalId}-title`} className={`${titleClassName} flex items-center gap-2`} style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z"/>
                  </svg>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                    <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                  </svg>
                </button>
              </div>
              <div className="border-b border-white/10 mx-6"></div>
            </>
          )}

          {/* Scrollable Body */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body ${
              noPadding ? '' : 'px-6 py-6 space-y-5'
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
