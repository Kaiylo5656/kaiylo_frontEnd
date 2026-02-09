import React from 'react';

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
  onMoveDown,
  useAbsolute = false,
  embedded = false
}) => {
  if (!isOpen && !embedded) return null;
  if (embedded) {
    return (
      <div className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overscroll-contain modal-scrollable-body">
        <div className="space-y-1.5">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`flex items-center justify-between px-4 py-3 cursor-move transition-colors ${
                draggedIndex === index 
                  ? 'bg-[rgba(212,132,90,0.25)] opacity-50' 
                  : dragOverIndex === index 
                    ? 'bg-[rgba(212,132,90,0.25)]' 
                    : 'bg-black/50 hover:bg-black/40'
              }`}
              style={{ 
                borderRadius: '14px',
                ...(dragOverIndex === index && draggedIndex !== index && { color: 'var(--kaiylo-primary-hex)' })
              }}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragEnter={(e) => onDragEnter(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-4 w-4 flex-shrink-0" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                </svg>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-base font-normal break-words leading-relaxed text-left">{exercise.name}</span>
                  {exercise.sets && exercise.sets.length > 0 && exercise.sets[0] && (
                    <span className="text-sm font-extralight text-white/50">
                      {exercise.sets.length}×{exercise.sets[0]?.reps || '?'} {exercise.useRir ? (
                        <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>RPE {exercise.sets[0]?.weight || 0}</span>
                      ) : (
                        <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{exercise.sets[0]?.weight || 0}kg</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="h-4 w-4 flex-shrink-0" fill="currentColor" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                <path d="M128 40c0-22.1-17.9-40-40-40L40 0C17.9 0 0 17.9 0 40L0 88c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zm0 192c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM0 424l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 40c0-22.1-17.9-40-40-40L232 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM192 232l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 424c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48z"/>
              </svg>
            </div>
          ))}
          {exercises.length === 0 && (
            <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-extralight">
              Aucun exercice ajouté
            </div>
          )}
        </div>
      </div>
    );
  }

  const style = position
    ? {
        top: position.top ?? 0,
        left: position.left ?? 800,
        width: position.width ?? 340,
        height: position.height ? `${position.height}px` : 'auto',
        maxHeight: position.height ? `${position.height}px` : '600px',
      }
    : { top: 0, left: 800, width: 340, maxHeight: '600px', height: 'auto' };

  return (
    <div
      role="region"
      aria-label="Agencement des exercices"
      className={`${useAbsolute ? 'relative' : 'fixed'} z-[1001] text-white pointer-events-auto w-[340px] overflow-hidden rounded-2xl shadow-2xl flex flex-col`}
      style={{
        ...(useAbsolute ? {} : style),
        ...(useAbsolute && position ? {
          width: position.width ?? 340,
          height: position.height ? `${position.height}px` : 'auto',
          maxHeight: position.height ? `${position.height}px` : '600px',
        } : {}),
        background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
        opacity: 0.95,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-3 flex items-center">
        <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5" fill="currentColor">
            <path d="M0 72C0 58.8 10.7 48 24 48l48 0c13.3 0 24 10.7 24 24l0 104 24 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-96 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-80-24 0C10.7 96 0 85.3 0 72zM30.4 301.2C41.8 292.6 55.7 288 70 288l4.9 0c33.7 0 61.1 27.4 61.1 61.1 0 19.6-9.4 37.9-25.2 49.4l-24 17.5 33.2 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-90.7 0C13.1 464 0 450.9 0 434.7 0 425.3 4.5 416.5 12.1 411l70.5-51.3c3.4-2.5 5.4-6.4 5.4-10.6 0-7.2-5.9-13.1-13.1-13.1L70 336c-3.9 0-7.7 1.3-10.8 3.6L38.4 355.2c-10.6 8-25.6 5.8-33.6-4.8S-1 324.8 9.6 316.8l20.8-15.6zM224 64l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>
          </svg>
          Agencement des exercices
        </h2>
      </div>
      <div className="border-b border-white/10 mx-6"></div>
      
      {/* Exercises List */}
      <div className="flex-1 min-h-0 px-6 py-6 overflow-y-auto overscroll-contain modal-scrollable-body">
        <div className="space-y-1.5">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`flex items-center justify-between px-4 py-3 cursor-move transition-colors ${
                draggedIndex === index 
                  ? 'bg-[rgba(212,132,90,0.25)] opacity-50' 
                  : dragOverIndex === index 
                    ? 'bg-[rgba(212,132,90,0.25)]' 
                    : 'bg-black/50 hover:bg-black/40'
              }`}
              style={{ 
                borderRadius: '14px',
                ...(dragOverIndex === index && draggedIndex !== index && { color: 'var(--kaiylo-primary-hex)' })
              }}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragEnter={(e) => onDragEnter(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 256 512" 
                  className="h-4 w-4 flex-shrink-0" 
                  fill="currentColor"
                  style={{ color: 'var(--kaiylo-primary-hex)' }}
                >
                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                </svg>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-base font-normal break-words leading-relaxed text-left">{exercise.name}</span>
                  {exercise.sets && exercise.sets.length > 0 && exercise.sets[0] && (
                    <span className="text-sm font-extralight text-white/50">
                      {exercise.sets.length}×{exercise.sets[0]?.reps || '?'} {exercise.useRir ? (
                        <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>RPE {exercise.sets[0]?.weight || 0}</span>
                      ) : (
                        <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{exercise.sets[0]?.weight || 0}kg</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 320 512" 
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
                style={{ color: 'rgba(255, 255, 255, 0.25)' }}
              >
                <path d="M128 40c0-22.1-17.9-40-40-40L40 0C17.9 0 0 17.9 0 40L0 88c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zm0 192c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM0 424l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 40c0-22.1-17.9-40-40-40L232 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM192 232l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 424c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48z"/>
              </svg>
            </div>
          ))}
          
          {exercises.length === 0 && (
            <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-extralight">
              Aucun exercice ajouté
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseArrangementModal;

