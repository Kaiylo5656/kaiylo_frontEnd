import React, { useState, useEffect } from 'react';
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

  const handleClose = () => {
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
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-[#1b1b1b] rounded-[20px] w-full max-w-md mx-4 overflow-hidden flex flex-col gap-[15px] px-[25px] py-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title - Centré comme dans Figma */}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-[#d4845a] text-[15px] font-normal leading-normal text-center whitespace-nowrap">
            Ajouter un commentaire
          </h2>
        </div>

        {/* Textarea - Style Figma avec modifications utilisateur */}
        <div className="bg-[#111111] rounded-[16px] h-[120px] p-[15px] w-full box-border">
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Ajouter un commentaire ..."
            className="w-full h-full bg-transparent border-none outline-none resize-none text-white text-[14px] font-light placeholder:text-white/25 leading-normal"
            autoFocus
          />
        </div>

        {/* Action Buttons - Style Figma exact */}
        <div className="flex gap-[4px] items-center justify-center cursor-pointer">
          <button
            onClick={handleClose}
            className="bg-white/2 border-[0.5px] border-white/10 border-solid h-[20px] rounded-[5px] w-[80px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-white/5"
          >
            <span className="text-[10px] font-normal text-white/75 text-center whitespace-nowrap leading-normal">
              Quitter
            </span>
          </button>
          <button
            onClick={handleSave}
            className="bg-[#d4845a] border-[0.5px] border-white/10 border-solid h-[20px] rounded-[5px] w-[80px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-[#c47850]"
          >
            <span className="text-[10px] font-normal text-white text-center whitespace-nowrap leading-normal">
              Valider
            </span>
          </button>
        </div>
      </div>
    </div>
    , document.body
  );
};

export default ExerciseCommentModal;

