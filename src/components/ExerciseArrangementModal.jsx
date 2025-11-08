import React from 'react';
import { GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';

const ExerciseArrangementModal = ({ 
  isOpen, 
  onClose, 
  exercises, 
  position,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onMoveUp,
  onMoveDown
}) => {
  if (!isOpen) return null;

  const style = position
    ? {
        top: position.top ?? 0,
        left: position.left ?? 800,
        width: position.width ?? 340,
      }
    : { top: 0, left: 800, width: 340 };

  return (
    <div
      role="region"
      aria-label="Agencement des exercices"
      className="absolute z-[1001] text-white pointer-events-auto"
      style={style}
    >
      <div className="rounded-[28px] border border-[#2c2c2c] bg-gradient-to-br from-[#181818]/95 via-[#121212]/95 to-[#0d0d0d]/95 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[#242424] flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-[#e87c3e]" />
            <h3 className="text-base font-semibold tracking-wide">Agencement des exercices</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-6 max-h-[500px] overflow-y-auto">
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-move transition-all duration-200 ${
                  draggedIndex === index 
                    ? 'bg-[#404040] opacity-50' 
                    : dragOverIndex === index 
                      ? 'bg-[#404040]' 
                      : 'bg-[#262626] hover:bg-[#333333]'
                }`}
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={(e) => onDragEnter(e, index)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, index)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="h-4 w-4 text-[#e87c3e] cursor-move" />
                  <span className="text-white text-sm truncate">{exercise.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Monter"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onMoveDown(index)}
                    disabled={index === exercises.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Descendre"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            
            {exercises.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                Aucun exercice ajouté
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseArrangementModal;

