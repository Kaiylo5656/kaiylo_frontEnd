import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useRegisterModal } from './ModalManager';
import ModalPortal from './ModalPortal';

const BaseModal = ({
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
  noPadding = false
}) => {
  const { isTopMost } = useRegisterModal(modalId);
  const modalRef = useRef(null);
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

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget && isTopMost && closeOnBackdrop) {
      onClose();
    }
  }, [isTopMost, closeOnBackdrop, onClose]);

  if (!isOpen) return null;

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
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${
          isTopMost ? 'bg-opacity-60' : 'bg-opacity-40'
        }`}
        onClick={handleBackdropClick}
        style={{ pointerEvents: isTopMost ? 'auto' : 'none' }}
      >
        <div
          ref={modalRef}
          className={`bg-[#121212] rounded-lg border border-white/10 shadow-2xl w-full ${sizeClasses[size]} ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `${modalId}-title` : undefined}
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-white/10">
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
          {noPadding ? (
            children
          ) : (
            <div className="p-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default BaseModal;
