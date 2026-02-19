import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';

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
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      style={{ zIndex: 110 }}
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full flex items-center justify-center md:h-auto md:w-auto">
        <div
          className="relative mx-auto w-full overflow-hidden rounded-2xl flex flex-col my-4 w-[calc(100vw-2rem)] max-w-[400px] max-h-[85dvh] md:my-0 md:w-full md:max-w-md md:h-auto md:max-h-[92vh]"
          style={{ background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 1) 100%)', opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-4 shrink-0" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading || isValidating}
            className="text-white/50 hover:text-white transition-colors p-1 -ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Revenir à la séance"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[var(--kaiylo-primary-hex)] text-xl font-normal absolute left-1/2 -translate-x-1/2">Valider la séance</h2>
          <div className="w-9" aria-hidden />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[25px] py-0 space-y-4">
          {/* Difficulty Selection */}
          <div>
            <p className="text-gray-400 text-xs font-light mb-3 text-center">Difficulté de la séance</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDifficulty('facile')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${difficulty === 'facile'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-black/50 text-gray-300 hover:bg-black/60'
                  } ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Facile
              </button>
              <button
                onClick={() => setDifficulty('moyen')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${difficulty === 'moyen'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-black/50 text-gray-300 hover:bg-black/60'
                  } ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Moyen
              </button>
              <button
                onClick={() => setDifficulty('difficile')}
                disabled={isUploading || isValidating}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${difficulty === 'difficile'
                    ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                    : 'bg-black/50 text-gray-300 hover:bg-black/60'
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
              className="w-full h-24 bg-black/50 rounded-lg p-3 text-white text-sm font-normal placeholder-gray-400 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px] shrink-0">
          <button
            onClick={handleComplete}
            disabled={isUploading || isValidating || !difficulty}
            className={`flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-normal text-[13px] transition-colors flex items-center justify-center gap-2 ${(isUploading || isValidating || !difficulty) ? 'opacity-50 cursor-not-allowed bg-[var(--surface-600)] hover:bg-[var(--surface-600)]' : ''
              }`}
          >
            {(isUploading || isValidating) && <Loader2 className="h-4 w-4 animate-smooth-spin" />}
            {(isUploading || isValidating) ? 'Validation en cours...' : 'Terminer'}
          </button>
          <button
            onClick={handleClose}
            disabled={isUploading || isValidating}
            className={`flex-1 py-2 px-4 bg-black/50 hover:bg-black/60 text-white rounded-lg font-light text-[13px] transition-colors ${(isUploading || isValidating) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            Annuler
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletionModal;
