import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  onExerciseDetailOpen,
  onEditExercise,
  focusSearch = false
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
      className="fixed z-[1001] text-white pointer-events-auto"
      style={style}
    >
      <div 
        className="relative mx-auto w-full max-h-[92vh] overflow-hidden rounded-tl-2xl rounded-tr-none rounded-br-none rounded-bl-2xl shadow-2xl flex flex-col h-full"
        style={{
          backgroundColor: 'rgba(34, 35, 37, 0.75)',
          opacity: 0.95
        }}
      >
        <div className="shrink-0 px-6 pt-6 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectedExercise && (
                <button
                  onClick={handleBackToList}
                  className="text-white/50 hover:text-white transition-colors p-1"
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                <path d="M384 512L96 512c-53 0-96-43-96-96L0 96C0 43 43 0 96 0L400 0c26.5 0 48 21.5 48 48l0 288c0 20.9-13.4 38.7-32 45.3l0 66.7c17.7 0 32 14.3 32 32s-14.3 32-32 32l-32 0zM96 384c-17.7 0-32 14.3-32 32s14.3 32 32 32l256 0 0-64-256 0zm32-232c0 13.3 10.7 24 24 24l176 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-176 0c-13.3 0-24 10.7-24 24zm24 72c-13.3 0-24 10.7-24 24s10.7 24 24 24l176 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-176 0z"/>
              </svg>
              <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                {selectedExercise ? selectedExercise.title : 'Bibliothèque d\'exercices'}
              </h2>
            </div>
          </div>
        </div>
        <div className="border-b border-white/10 mx-6"></div>
        
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain library-modal-scrollable-body px-3 pt-3 pb-6">
          {selectedExercise ? (
            // Afficher l'historique de l'exercice sélectionné
            <div className="flex flex-col">
              <ExerciseHistory exerciseId={selectedExercise.id} />
              
              {/* Bouton pour ajouter à la séance */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    onSelect(selectedExercise);
                    handleBackToList();
                  }}
                  className="w-full py-2.5 text-sm font-normal text-white rounded-[10px] hover:opacity-90 transition-colors"
                  style={{ backgroundColor: 'var(--kaiylo-primary-hex)' }}
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
              onEditExercise={onEditExercise}
              focusSearch={focusSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseLibraryModal;

