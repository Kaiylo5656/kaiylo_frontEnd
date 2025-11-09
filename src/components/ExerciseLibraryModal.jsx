import React, { useState } from 'react';
import { X, BookOpen, ArrowLeft } from 'lucide-react';
import ExerciseLibraryPanel from './exercises/ExerciseLibraryPanel';
import ExerciseHistory from './ExerciseHistory';

const ExerciseLibraryModal = ({ 
  isOpen, 
  onClose, 
  position,
  exercises,
  onSelect,
  onCreateClick,
  loading,
  onExerciseUpdated,
  onExerciseDetailOpen
}) => {
  const [selectedExercise, setSelectedExercise] = useState(null);

  if (!isOpen) return null;

  const style = position
    ? {
        top: position.top ?? 0,
        left: position.left ?? -380,
        width: position.width ?? 360,
        height: position.height ?? 'auto',
      }
    : { top: 0, left: -380, width: 360, height: 'auto' };

  const handleExerciseClick = (exercise) => {
    setSelectedExercise(exercise);
  };

  const handleBackToList = () => {
    setSelectedExercise(null);
  };

  const handleClose = () => {
    setSelectedExercise(null);
    onClose();
  };

  return (
    <div
      role="region"
      aria-label="Bibliothèque d'exercices"
      className="absolute z-[1001] text-white pointer-events-auto"
      style={style}
    >
      <div className="rounded-[28px] border border-[#2c2c2c] bg-gradient-to-br from-[#181818]/95 via-[#121212]/95 to-[#0d0d0d]/95 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md overflow-hidden h-full flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-[#242424] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {selectedExercise && (
              <button
                onClick={handleBackToList}
                className="p-1 text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <BookOpen className="h-5 w-5 text-[#e87c3e]" />
            <h3 className="text-base font-semibold tracking-wide">
              {selectedExercise ? selectedExercise.title : 'Bibliothèque d\'exercices'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          {selectedExercise ? (
            // Afficher l'historique de l'exercice sélectionné
            <div className="h-full overflow-y-auto p-6">
              <ExerciseHistory exerciseId={selectedExercise.id} />
              
              {/* Bouton pour ajouter à la séance */}
              <div className="mt-6 pt-4 border-t border-[#242424]">
                <button
                  onClick={() => {
                    onSelect(selectedExercise);
                    handleBackToList();
                  }}
                  className="w-full bg-[#e87c3e] hover:bg-[#d66d35] text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Ajouter à la séance
                </button>
              </div>
            </div>
          ) : (
            // Afficher la liste des exercices
            <ExerciseLibraryPanel
              exercises={exercises}
              onSelect={onSelect}
              onCreateClick={onCreateClick}
              loading={loading}
              showPreview={false}
              onExerciseUpdated={onExerciseUpdated}
              isOpen={isOpen}
              onExerciseDetailOpen={handleExerciseClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseLibraryModal;

