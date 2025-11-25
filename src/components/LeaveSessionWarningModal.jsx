import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * Modal d'avertissement affiché quand l'étudiant tente de quitter la séance
 * Avertit que la progression sera sauvegardée mais qu'il devra reprendre plus tard
 */
const LeaveSessionWarningModal = ({ isOpen, onClose, onConfirm }) => {
  // Empêcher la fermeture par clic sur le backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      // Ne rien faire - forcer l'utilisateur à choisir
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
        className="bg-[#1a1a1a] rounded-lg w-full max-w-md mx-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#d4845a]" />
            <h2 className="text-white text-lg font-semibold">Quitter la séance ?</h2>
          </div>
          {/* Pas de bouton X - forcer l'utilisateur à choisir */}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            Votre progression a été sauvegardée automatiquement. Vous pourrez reprendre cette séance plus tard.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            ⚠️ Si vous quittez maintenant, vous devrez terminer tous les exercices lors de votre prochaine session.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#262626]">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-medium transition-colors"
          >
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveSessionWarningModal;

