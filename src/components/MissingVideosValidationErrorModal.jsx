import React from 'react';

/**
 * Modal d'erreur affiché quand le client tente de valider la séance
 * alors que des vidéos requises ne sont pas uploadées
 * Design basé sur Figma node-id: 348-730
 */
const MissingVideosValidationErrorModal = ({ isOpen, onClose, missingVideosCount = 0 }) => {
  // Empêcher la fermeture par clic sur le backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Ne rien faire - forcer l'utilisateur à fermer avec le bouton
      return;
    }
  };

  // Empêcher la fermeture par ESC
  React.useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

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
          <h2 className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">
            Impossible de valider la séance
          </h2>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4">
          <p className="text-gray-400 text-xs font-light leading-relaxed text-center">
            {missingVideosCount > 0 
              ? `Vous devez compléter et uploader ${missingVideosCount} ${missingVideosCount === 1 ? 'vidéo manquante' : 'vidéos manquantes'} avant de pouvoir valider la séance.`
              : 'Vous devez compléter et uploader toutes les vidéos requises avant de pouvoir valider la séance.'
            }
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-normal text-[13px] transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingVideosValidationErrorModal;

