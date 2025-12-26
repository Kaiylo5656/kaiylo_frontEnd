import React, { useEffect } from 'react';
import { FolderOpen } from 'lucide-react';

const SessionExercisesModal = ({ isOpen, onClose, session, position, onExerciseSelect, selectedExerciseIndex }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const style = position
    ? {
        top: position.top ?? 0,
        left: position.left ?? 800,
        width: position.width ?? 340,
      }
    : { top: 0, left: 800, width: 340 };

  // Get exercises from session
  const exercises = session.exercises || [];

  return (
    <div
      className="absolute z-[60] bg-gradient-to-r from-[rgba(19,20,22,0.75)] via-[61.058%] via-[rgba(43,44,48,0.75)] to-[rgba(89,93,101,0.38)] border border-white/15 rounded-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md overflow-hidden"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex gap-[14px] items-start px-[24px] pt-[24px]">
        <FolderOpen className="w-6 h-6 text-white shrink-0" />
        <h3 className="text-[18px] font-normal text-white leading-normal">Séance complète</h3>
      </div>

      {/* Exercises List */}
      <div className="flex flex-col gap-[3px] px-[24px] pt-[14px] pb-[24px]">
        {exercises.map((exercise, index) => {
          const isSelected = selectedExerciseIndex === index;
          const sets = exercise.sets || [];
          const totalSets = sets.length;
          
          // Get reps and weight from first set
          const firstSet = sets[0];
          const reps = firstSet?.reps || firstSet?.target_reps || firstSet?.completed_reps || 0;
          const weight = firstSet?.weight || firstSet?.target_weight || firstSet?.completed_weight || 0;

          return (
            <div
              key={exercise.id || exercise.exerciseId || index}
              onClick={() => {
                if (onExerciseSelect) {
                  onExerciseSelect(index);
                }
              }}
              className={`
                h-[40px] px-[15px] py-[11px] rounded-[5px] flex items-center justify-between
                border-[0.5px] border-white/20 text-[13px] font-normal cursor-pointer
                transition-colors hover:bg-[#d4845a]/20
                ${isSelected 
                  ? 'bg-[#d4845a] text-white' 
                  : 'bg-[#121214] text-white/75'
                }
              `}
            >
              <div className="flex flex-col justify-center">
                <p className="leading-normal">{exercise.name || 'Exercice'}</p>
              </div>
              <div className="flex flex-col justify-center">
                <p className="leading-normal">
                  {totalSets > 0 && reps > 0 && weight > 0 ? (
                    <>
                      <span className={isSelected ? 'text-white' : 'text-white/50'}>
                        {totalSets}x{reps} reps
                      </span>
                      {' '}
                      <span className={isSelected ? 'text-white' : 'text-[#d4845a]'}>
                        @{weight}kg
                      </span>
                    </>
                  ) : (
                    <span className={isSelected ? 'text-white' : 'text-white/50'}>
                      {totalSets > 0 ? `${totalSets} séries` : 'Aucune série'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        {exercises.length === 0 && (
          <div className="h-[40px] px-[15px] py-[11px] rounded-[5px] flex items-center justify-center bg-[#121214] border-[0.5px] border-white/20 text-[13px] text-white/50">
            Aucun exercice
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionExercisesModal;

