import React, { useEffect } from 'react';

const SessionExercisesModal = ({ isOpen, onClose, session, position, mainModalHeight, onExerciseSelect, selectedExerciseIndex, sessionVideos = [] }) => {
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

  const width = position?.width ?? 340;

  // Get exercises from session
  const exercises = session.exercises || [];

  // Helper function to check if exercise has a comment
  const hasComment = (exercise) => {
    const comment = exercise.comment || exercise.studentComment || exercise.student_comment;
    return comment && comment.trim() !== '';
  };

  // Helper function to check if exercise has videos
  const hasVideos = (exercise, exerciseIndex) => {
    if (!sessionVideos || sessionVideos.length === 0) return false;
    
    // Check by exercise_index and exercise_name (most specific)
    if (exerciseIndex !== undefined && exerciseIndex !== null) {
      const videosByIndex = sessionVideos.filter(
        (video) => video.exercise_index === exerciseIndex && video.exercise_name === exercise.name
      );
      if (videosByIndex.length > 0) return true;
    }
    
    // Check by exercise_id
    const exerciseId = exercise.id || exercise.exercise_id || exercise.exerciseId;
    if (exerciseId) {
      const videosById = sessionVideos.filter(
        (video) => video.exercise_id && video.exercise_id === exerciseId
      );
      if (videosById.length > 0) return true;
    }
    
    // Check by exercise name only if exercise_index is not available on the video
    // This prevents false positives when multiple exercises have the same name
    if (exercise.name && exerciseIndex !== undefined && exerciseIndex !== null) {
      const videosByName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name && 
        (video.exercise_index === null || video.exercise_index === undefined || video.exercise_index === exerciseIndex)
      );
      if (videosByName.length > 0) return true;
    } else if (exercise.name && (exerciseIndex === undefined || exerciseIndex === null)) {
      // Fallback: only check by name if we don't have an index
      const videosByName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name
      );
      if (videosByName.length > 0) return true;
    }
    
    return false;
  };

  // Helper function to count videos for an exercise
  const getVideoCount = (exercise, exerciseIndex) => {
    if (!sessionVideos || sessionVideos.length === 0) return 0;
    
    // Check by exercise_index and exercise_name (most specific)
    if (exerciseIndex !== undefined && exerciseIndex !== null) {
      const videosByIndex = sessionVideos.filter(
        (video) => video.exercise_index === exerciseIndex && video.exercise_name === exercise.name
      );
      if (videosByIndex.length > 0) return videosByIndex.length;
    }
    
    // Check by exercise_id
    const exerciseId = exercise.id || exercise.exercise_id || exercise.exerciseId;
    if (exerciseId) {
      const videosById = sessionVideos.filter(
        (video) => video.exercise_id && video.exercise_id === exerciseId
      );
      if (videosById.length > 0) return videosById.length;
    }
    
    // Check by exercise name only if exercise_index is not available on the video
    // This prevents false positives when multiple exercises have the same name
    if (exercise.name && exerciseIndex !== undefined && exerciseIndex !== null) {
      const videosByName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name && 
        (video.exercise_index === null || video.exercise_index === undefined || video.exercise_index === exerciseIndex)
      );
      if (videosByName.length > 0) return videosByName.length;
    } else if (exercise.name && (exerciseIndex === undefined || exerciseIndex === null)) {
      // Fallback: only check by name if we don't have an index
      const videosByName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name
      );
      if (videosByName.length > 0) return videosByName.length;
    }
    
    return 0;
  };

  return (
    <div
      role="region"
      aria-label="Séance complète"
      className="relative w-[320px] overflow-hidden rounded-2xl shadow-2xl flex flex-col text-white pointer-events-auto"
      style={{
        background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
        opacity: 0.95,
        width: width,
        height: mainModalHeight ? `${mainModalHeight}px` : 'auto',
        maxHeight: mainModalHeight ? `${mainModalHeight}px` : '92vh'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="shrink-0 pl-6 pr-0 pt-6 pb-3 flex items-center justify-between">
        <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
            <path d="M88 289.6L64.4 360.2L64.4 160C64.4 124.7 93.1 96 128.4 96L267.1 96C280.9 96 294.4 100.5 305.5 108.8L343.9 137.6C349.4 141.8 356.2 144 363.1 144L480.4 144C515.7 144 544.4 172.7 544.4 208L544.4 224L179 224C137.7 224 101 250.4 87.9 289.6zM509.8 512L131 512C98.2 512 75.1 479.9 85.5 448.8L133.5 304.8C140 285.2 158.4 272 179 272L557.8 272C590.6 272 613.7 304.1 603.3 335.2L555.3 479.2C548.8 498.8 530.4 512 509.8 512z"/>
          </svg>
          Séance complète
        </h2>
      </div>
      <div className="border-b border-white/10 mx-6"></div>

      {/* Exercises List */}
      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 ${exercises.length ? 'space-y-1.5' : 'flex items-center justify-center'}`}>
        {exercises.length ? (
          exercises.map((exercise, index) => {
            const isSelected = selectedExerciseIndex === index;

            return (
              <div
                key={exercise.id || exercise.exerciseId || index}
                onClick={() => {
                  if (onExerciseSelect) {
                    onExerciseSelect(index);
                  }
                }}
                className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-[rgba(212,132,90,0.25)]' 
                    : 'bg-black/50 text-white/50 hover:bg-black/40'
                }`}
                style={{ 
                  borderRadius: '14px',
                  ...(isSelected && { color: 'var(--kaiylo-primary-hex)' })
                }}
              >
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-base ${isSelected ? 'font-medium' : 'font-normal'}`}>
                    {exercise.name || 'Exercice'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Comment Indicator */}
                    <div className="flex items-center" title={hasComment(exercise) ? "Commentaire ajouté" : "Aucun commentaire"}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 640 640" 
                        className="h-4 w-4"
                        style={{ 
                          fill: hasComment(exercise) 
                            ? 'rgba(212, 132, 89, 0.8)' 
                            : 'rgba(255, 255, 255, 0.2)' 
                        }}
                      >
                        <path d="M576 304C576 436.5 461.4 544 320 544C282.9 544 247.7 536.6 215.9 523.3L97.5 574.1C88.1 578.1 77.3 575.8 70.4 568.3C63.5 560.8 62 549.8 66.8 540.8L115.6 448.6C83.2 408.3 64 358.3 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304z"/>
                      </svg>
                    </div>
                    {/* Video Indicator */}
                    <div className="flex items-center gap-0.5" title={hasVideos(exercise, index) ? `${getVideoCount(exercise, index)} vidéo(s) ajoutée(s)` : "Aucune vidéo"}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 640 640" 
                        className="h-4 w-4"
                        style={{ 
                          fill: hasVideos(exercise, index) 
                            ? 'rgba(212, 132, 89, 0.8)' 
                            : 'rgba(255, 255, 255, 0.2)' 
                        }}
                      >
                        <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z"/>
                      </svg>
                      {getVideoCount(exercise, index) > 1 && (
                        <span 
                          className="text-xs font-medium"
                          style={{ 
                            color: hasVideos(exercise, index) 
                              ? 'rgba(212, 132, 89, 0.8)' 
                              : 'rgba(255, 255, 255, 0.2)' 
                          }}
                        >
                          x{getVideoCount(exercise, index)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-thin">
            Aucun exercice disponible.
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionExercisesModal;

