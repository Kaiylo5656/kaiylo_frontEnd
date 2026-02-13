import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal pour permettre à l'étudiant de commenter un exercice spécifique pour le coach
 * Design basé sur Figma node-id=428-1220
 */
const ExerciseCommentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  exerciseName,
  initialComment = '' 
}) => {
  const [comment, setComment] = useState(initialComment);
  const [hasChanges, setHasChanges] = useState(false);

  // Mettre à jour le commentaire quand initialComment change
  useEffect(() => {
    setComment(initialComment);
    setHasChanges(false);
  }, [initialComment, isOpen]);

  // Détecter les changements
  const handleCommentChange = (e) => {
    const newComment = e.target.value;
    setComment(newComment);
    setHasChanges(newComment !== initialComment);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(comment.trim());
    }
    setHasChanges(false);
    onClose();
  };

  const handleClose = useCallback(() => {
    // Si il y a des changements non sauvegardés, demander confirmation
    if (hasChanges) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) {
        setComment(initialComment);
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, initialComment, onClose]);

  // Empêcher la fermeture par clic sur le backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Empêcher la fermeture par ESC
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-4 text-center" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
          <h2 className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">Ajouter un commentaire</h2>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4">
          {/* Textarea */}
          <div className="bg-[#262626] rounded-lg border border-white/10 p-3">
            <textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder="Ajouter un commentaire..."
              className="w-full h-24 bg-transparent border-none outline-none resize-none text-base text-white font-normal placeholder:text-gray-400 leading-relaxed focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-normal text-[13px] transition-colors"
          >
            Valider
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
    , document.body
  );
};

export default ExerciseCommentModal;

