import React from 'react';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';

const DeleteStudentModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  studentNames = [],
  studentCount = 0,
  loading = false
}) => {
  const { isTopMost } = useModalManager();
  const modalId = 'delete-student-modal';

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const isMultiple = studentCount > 1 || studentNames.length > 1;
  const count = studentCount || studentNames.length || 1;
  const studentText = count === 1 ? 'élève' : 'élèves';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      modalId={modalId}
      zIndex={80}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="md"
      title={isMultiple ? `Supprimer ${count} ${studentText}` : 'Supprimer l\'élève'}
      titleClassName="text-xl font-normal text-white"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="flex flex-col items-start space-y-4">
          <div className="text-left space-y-2">
            <p className="text-sm font-extralight text-white/70">
              {isMultiple ? (
                <>
                  Êtes-vous sûr de vouloir supprimer <span className="font-normal text-white">{count} {studentText}</span> sélectionné{count > 1 ? 's' : ''} ?
                </>
              ) : studentNames.length > 0 ? (
                <>
                  Êtes-vous sûr de vouloir supprimer l'élève <span className="font-normal text-white">"{studentNames[0]}"</span> ?
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer cet élève ?
                </>
              )}
            </p>
          </div>
          
          {/* Student Names List (if multiple and names provided) */}
          {isMultiple && studentNames.length > 0 && studentNames.length <= 5 && (
            <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-lg p-3 space-y-1">
              {studentNames.map((name, index) => (
                <div key={index} className="text-xs font-light text-white/75">
                  • {name}
                </div>
              ))}
            </div>
          )}
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

export default DeleteStudentModal;
