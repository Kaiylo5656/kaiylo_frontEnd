import React from 'react';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';

const DeleteMessageModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading = false
}) => {
  const { isTopMost } = useModalManager();
  const modalId = 'delete-message-modal';

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
      zIndex={80}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="md"
      title="Supprimer le message"
      titleClassName="text-xl font-normal text-white"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="flex flex-col items-start space-y-4">
          <div className="text-left space-y-2">
            <p className="text-sm font-extralight text-white/70">
              Êtes-vous sûr de vouloir supprimer ce message ?
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default DeleteMessageModal;

