import React from 'react';

/**
 * Modal d'erreur affiché quand l'élève tente de valider la séance
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      {/* Modal Container - Design Figma exact */}
      <div 
        className="bg-[#1b1b1b] rounded-[20px] w-full max-w-[253px] mx-4 overflow-clip relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content Container - Centré verticalement */}
        <div className="flex flex-col items-center px-[5px] pt-[17px] pb-[17px]">
          {/* Title and Description Container */}
          <div className="flex flex-col items-center gap-[15px] w-full mb-[15px]">
            {/* Title - "Impossible de valider la séance" */}
            <div className="flex flex-col justify-center w-full">
              <p 
                className="text-[#d4845a] text-[17px] font-light leading-normal text-center whitespace-pre-wrap"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Impossible de valider la séance
              </p>
            </div>
            
            {/* Description */}
            <div className="flex flex-col justify-center w-full max-w-[233px]">
              <p 
                className="text-[12px] leading-normal text-center whitespace-pre-wrap"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 300
                }}
              >
                {missingVideosCount > 0 
                  ? `Vous devez compléter et uploader ${missingVideosCount} ${missingVideosCount === 1 ? 'vidéo manquante' : 'vidéos manquantes'} avant de pouvoir valider la séance.`
                  : 'Vous devez compléter et uploader toutes les vidéos requises avant de pouvoir valider la séance.'
                }
              </p>
            </div>
          </div>

          {/* Button - "Compris" */}
          <button
            onClick={onClose}
            className="bg-[#d4845a] border-[0.5px] border-[rgba(255,255,255,0.1)] border-solid flex items-center justify-center h-[25px] px-[14px] py-[4px] rounded-[5px] w-[200px] transition-opacity hover:opacity-90 active:opacity-80"
          >
            <p 
              className="text-white text-[10px] font-normal leading-normal text-center whitespace-nowrap"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Compris
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingVideosValidationErrorModal;

