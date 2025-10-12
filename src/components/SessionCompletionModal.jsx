import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const SessionCompletionModal = ({ isOpen, onClose, onComplete, sessionData, isUploading = false, uploadProgress = null }) => {
  const [difficulty, setDifficulty] = useState('');
  const [comment, setComment] = useState('');

  const handleComplete = () => {
    if (!difficulty) {
      alert('Veuillez sélectionner la difficulté de la séance');
      return;
    }

    onComplete({
      difficulty,
      comment: comment.trim(),
      sessionData
    });
  };

  const handleClose = () => {
    setDifficulty('');
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626]">
          <h2 className="text-[#e87c3e] text-lg font-bold">Valider la séance</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Difficulty Selection */}
          <div>
            <p className="text-gray-400 text-sm mb-3">Difficulté de la séance</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDifficulty('facile')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === 'facile'
                    ? 'bg-[#e87c3e] text-white'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                }`}
              >
                Facile
              </button>
              <button
                onClick={() => setDifficulty('moyen')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === 'moyen'
                    ? 'bg-[#e87c3e] text-white'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                }`}
              >
                Moyen
              </button>
              <button
                onClick={() => setDifficulty('difficile')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === 'difficile'
                    ? 'bg-[#e87c3e] text-white'
                    : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                }`}
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
              className="w-full h-24 bg-[#262626] border border-[#404040] rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-[#e87c3e]"
            />
          </div>
        </div>

        {/* Upload Progress Indicator */}
        {isUploading && uploadProgress && (
          <div className="px-4 pb-4">
            <div className="bg-[#262626] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 text-[#e87c3e] animate-spin" />
                <span className="text-white text-sm">Upload des vidéos en cours...</span>
              </div>
              <div className="text-gray-400 text-xs">
                {uploadProgress.current} / {uploadProgress.total} vidéos uploadées
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#262626]">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className={`flex-1 py-3 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-medium transition-colors ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Quitter
          </button>
          <button
            onClick={handleComplete}
            disabled={isUploading}
            className={`flex-1 py-3 px-4 bg-[#e87c3e] hover:bg-[#d66d35] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletionModal;
