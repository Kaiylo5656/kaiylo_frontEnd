import React from 'react';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';

/**
 * Modal d'avertissement affiché quand le coach tente de quitter la modale avec des modifications non sauvegardées
 */
const UnsavedChangesWarningModal = ({ isOpen, onClose, onConfirm }) => {
  const { isTopMost } = useModalManager();
  const modalId = 'unsaved-changes-warning-modal';

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      modalId={modalId}
      zIndex={110}
      closeOnEsc={false}
      closeOnBackdrop={false}
      size="md"
      title={
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5 flex-shrink-0" fill="currentColor">
            <path d="M352.9 21.2L308 66.1 445.9 204 490.8 159.1C504.4 145.6 512 127.2 512 108s-7.6-37.6-21.2-51.1L455.1 21.2C441.6 7.6 423.2 0 404 0s-37.6 7.6-51.1 21.2zM274.1 100L58.9 315.1c-10.7 10.7-18.5 24.1-22.6 38.7L.9 481.6c-2.3 8.3 0 17.3 6.2 23.4s15.1 8.5 23.4 6.2l127.8-35.5c14.6-4.1 27.9-11.8 38.7-22.6L412 237.9 274.1 100z"/>
          </svg>
          Modifications non sauvegardées
        </>
      }
      titleClassName="text-xl font-normal text-white"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="flex flex-col items-start space-y-4">
          <div className="text-left">
            <p className="text-sm font-extralight text-white/70">
              Si vous quittez maintenant, vos modifications ne seront pas enregistrées.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 w-full pt-0">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors whitespace-nowrap border-none"
          >
            Quitter sans enregistrer
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
          >
            Poursuivre les modifications
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default UnsavedChangesWarningModal;
