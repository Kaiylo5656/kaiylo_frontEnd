import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const SessionCompletionModal = ({ isOpen, onClose, onComplete, sessionData, isUploading = false, uploadProgress = null, isValidating = false }) => {
  const [difficulty, setDifficulty] = useState('');
  const [comment, setComment] = useState('');

  const handleComplete = () => {
    if (!difficulty) {
      alert('Veuillez sélectionner la difficulté de la séance');
      return;
    }

    // Don't proceed if already validating
    if (isUploading || isValidating) {
      return;
    }

    onComplete({
      difficulty,
      comment: comment.trim() || '', // Le commentaire est optionnel
      sessionData
    });
  };

  const handleClose = () => {
    // Don't close if validation is in progress
    if (isUploading || isValidating) {
      return;
    }
    setDifficulty('');
    setComment('');
    onClose();
  };

  // Empêcher la fermeture par clic sur le backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Prevent closing modal by clicking backdrop during validation
      if (isUploading || isValidating) {
        return;
      }
      handleClose();
    }
  };

  // Empêcher la fermeture par ESC
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          if (isUploading || isValidating) {
            e.preventDefault();
            e.stopPropagation();
          } else {
            handleClose();
          }
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isUploading, isValidating]);

  if (!isOpen) return null;

  return (
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
          <h2 className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">Valider la séance</h2>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4">
          {/* Difficulty Selection */}
          <div>
            <p className="text-gray-400 text-xs font-light mb-3 text-center">Difficulté de la séance</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDifficulty('facile')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                  difficulty === 'facile'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                } ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Facile
              </button>
              <button
                onClick={() => setDifficulty('moyen')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                  difficulty === 'moyen'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                } ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Moyen
              </button>
              <button
                onClick={() => setDifficulty('difficile')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                  difficulty === 'difficile'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                } ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Difficile
              </button>
            </div>
          </div>

          {/* Comment Input */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              disabled={isUploading || isValidating}
              className="w-full h-24 bg-[#262626] border border-white/10 rounded-lg p-3 text-white text-xs font-normal placeholder-gray-400 resize-none focus:outline-none focus:border-[#d4845a] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
          <button
            onClick={handleComplete}
            disabled={isUploading || isValidating || !difficulty}
            className={`flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-normal text-[13px] transition-colors flex items-center justify-center gap-2 ${
              (isUploading || isValidating || !difficulty) ? 'opacity-50 cursor-not-allowed bg-[var(--surface-600)] hover:bg-[var(--surface-600)]' : ''
            }`}
          >
            {(isUploading || isValidating) && <Loader2 className="h-4 w-4 animate-smooth-spin" />}
            {(isUploading || isValidating) ? 'Validation en cours...' : 'Terminer'}
          </button>
          <button
            onClick={handleClose}
            disabled={isUploading || isValidating}
            className={`flex-1 py-2 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors ${
              (isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletionModal;
