import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Video, Play, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import WorkoutVideoUploadModal from './WorkoutVideoUploadModal';
import SessionCompletionModal from './SessionCompletionModal';
import VideoProcessingModal from './VideoProcessingModal'; // Import the new modal
import ExerciseValidationModal from './ExerciseValidationModal'; // Import the exercise validation modal
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const WorkoutSessionExecution = ({ session, onBack, onCompleteSession }) => {
  const { getAuthToken, refreshAuthToken, user } = useAuth();
  const [completedSets, setCompletedSets] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState({}); // Track current set for each exercise
  const [selectedSetForVideo, setSelectedSetForVideo] = useState({}); // Track which set is selected for video upload per exercise
  const [videoUploadExerciseIndex, setVideoUploadExerciseIndex] = useState(null); // Track exercise index when opening video modal
  const [selectedSetIndex, setSelectedSetIndex] = useState({}); // Track which set is currently selected for each exercise
  const [sessionStatus, setSessionStatus] = useState('in_progress'); // 'in_progress', 'completed'
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // Video upload modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Session completion modal state
  const [localVideos, setLocalVideos] = useState([]); // Store videos locally until session completion
  const [isUploadingVideos, setIsUploadingVideos] = useState(false); // Track video upload state - can be reused for the new modal
  const [uploadProgress, setUploadProgress] = useState(null); // Track upload progress
  const [isVideoProcessingModalOpen, setIsVideoProcessingModalOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isExerciseValidationModalOpen, setIsExerciseValidationModalOpen] = useState(false);
  const [selectedExerciseForValidation, setSelectedExerciseForValidation] = useState(null);
  const [exerciseComments, setExerciseComments] = useState({}); // Store student comments for each exercise
  const [sessionVideos, setSessionVideos] = useState([]); // Store videos from API to get coach feedback
  const [dotPositions, setDotPositions] = useState({});
  const exerciseCardRefs = useRef([]);
  const exerciseListRef = useRef(null);

  // Get exercises from the correct data structure
  const exercises = session?.workout_sessions?.exercises || session?.exercises || [];
  
  // Note: Coach feedback should be included in exercise data from the backend
  // The /api/workout-sessions/videos endpoint is coach-only, so we don't fetch it here
  // Coach feedback will be displayed if it's already in exercises[].coach_feedback
  
  // Mesurer les positions des cartes et mettre à jour les positions des points
  useEffect(() => {
    const updateDotPositions = () => {
      if (!exerciseListRef.current) return;
      
      const listRect = exerciseListRef.current.getBoundingClientRect();
      const listTop = listRect.top;
      const positions = {};
      
      exerciseCardRefs.current.forEach((ref, index) => {
        if (ref) {
          const cardRect = ref.getBoundingClientRect();
          const cardTop = cardRect.top;
          const cardHeight = cardRect.height;
          // Position relative au conteneur parent
          const cardCenter = (cardTop - listTop) + (cardHeight / 2);
          positions[index] = cardCenter;
        }
      });
      
      setDotPositions(positions);
    };
    
    updateDotPositions();
    
    // Mettre à jour lors du redimensionnement ou du changement de contenu
    window.addEventListener('resize', updateDotPositions);
    const timer = setTimeout(updateDotPositions, 100); // Petit délai pour permettre le rendu
    const observer = new MutationObserver(updateDotPositions); // Observer les changements DOM
    
    if (exerciseListRef.current) {
      observer.observe(exerciseListRef.current, { childList: true, subtree: true, attributes: true });
    }
    
    return () => {
      window.removeEventListener('resize', updateDotPositions);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [exercises, currentExerciseIndex, completedSets]);
  
  // Handle exercise selection - Ouvre la modale de validation
  const handleExerciseSelection = (exerciseIndex) => {
    setSelectedExerciseForValidation(exerciseIndex);
    setCurrentExerciseIndex(exerciseIndex);
    setIsExerciseValidationModalOpen(true);
  };

  // Get current set index for an exercise
  const getCurrentSetIndex = (exerciseIndex) => {
    return currentSetIndex[exerciseIndex] || 0;
  };

  // Get selected set index for an exercise (for display purposes)
  const getSelectedSetIndex = (exerciseIndex) => {
    return selectedSetIndex[exerciseIndex] !== undefined ? selectedSetIndex[exerciseIndex] : 0;
  };

  // Handle set selection (only for active exercise)
  const handleSetSelection = (exerciseIndex, setIndex) => {
    // Only allow selection if this is the current active exercise
    if (exerciseIndex === currentExerciseIndex) {
      setSelectedSetIndex(prev => ({
        ...prev,
        [exerciseIndex]: setIndex
      }));
    }
  };

  // Count video-enabled sets for an exercise
  const countVideoEnabledSets = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) return 0;
    return exercise.sets.filter(set => set.video === true).length;
  };

  /**
   * Build the compact summary displayed under the exercise name (e.g. "4x8 @35 kg")
   * so that we can mirror the Figma card layout.
   */
  const getExerciseSummary = (exercise) => {
    if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) {
      return null;
    }

    const totalSets = exercise.sets.length;
    const firstSet = exercise.sets[0] || {};
    const reps = firstSet?.reps;
    const weight = firstSet?.weight;

    const scheme = reps ? `${totalSets}x${reps}` : `${totalSets} séries`;
    const weightLabel =
      weight !== undefined && weight !== null && weight !== ''
        ? `@${weight} kg`
        : null;

    return { scheme, weight: weightLabel };
  };

  // Check if video upload is enabled for the currently selected set
  const isVideoUploadEnabled = (exerciseIndex) => {
    const selectedSet = getSelectedSetIndex(exerciseIndex);
    const exercise = exercises[exerciseIndex];
    
    if (!exercise || !Array.isArray(exercise.sets)) return false;
    
    const set = exercise.sets[selectedSet];
    return set && set.video === true;
  };

  // Check if exercise is finalized (all sets have a status - completed or failed)
  const isExerciseFullyComplete = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) {
      return false;
    }
    
    const totalSets = exercise.sets.length;
    let finalizedCount = 0;
    
    for (let i = 0; i < totalSets; i++) {
      const status = getSetStatus(exerciseIndex, i);
      // Count sets that have any status (completed or failed) - not just completed
      if (status !== 'pending') finalizedCount++;
    }
    
    return finalizedCount === totalSets;
  };

  const handleSetValidation = (exerciseIndex, status, setIndex = null) => {
    const exercise = exercises[exerciseIndex];
    
    if (!exercise || !Array.isArray(exercise.sets)) {
      return;
    }

    // If setIndex is provided, update that specific set
    // Otherwise, update the current set
    const targetSet = setIndex !== null ? setIndex : getCurrentSetIndex(exerciseIndex);
    
    if (targetSet >= exercise.sets.length) {
      return; // Invalid set index
    }

    // Mark the target set with the status
    const key = `${exerciseIndex}-${targetSet}`;
    setCompletedSets(prev => {
      const currentSetData = prev[key];
      
      // If currentSetData is an object (has video or other properties), preserve them
      // Otherwise, create a new object with the status
      const updatedSetData = typeof currentSetData === 'object' && currentSetData !== null
        ? { ...currentSetData, status }
        : { status };
      
      return {
        ...prev,
        [key]: updatedSetData
      };
    });

    // Advance to next set if we're updating the current set
    const currentSet = getCurrentSetIndex(exerciseIndex);
    if (setIndex === null || setIndex === currentSet) {
      const nextSet = targetSet + 1;
      
      // Only advance if there's a next set available
      if (nextSet < exercise.sets.length) {
        // Update current set index to next set
        setCurrentSetIndex(prev => ({
          ...prev,
          [exerciseIndex]: nextSet
        }));
        
        // Also select the next set for video details
        setSelectedSetForVideo(prev => ({
          ...prev,
          [exerciseIndex]: nextSet
        }));
        
        // Update selectedSetIndex to visually select the next set
        setSelectedSetIndex(prev => ({
          ...prev,
          [exerciseIndex]: nextSet
        }));
      } else {
        // If this was the last set, move to next exercise if available
        if (exerciseIndex < exercises.length - 1) {
          setCurrentExerciseIndex(exerciseIndex + 1);
          setCurrentSetIndex(prev => ({
            ...prev,
            [exerciseIndex + 1]: 0
          }));
          
          // Also select the first set of next exercise
          setSelectedSetForVideo(prev => ({
            ...prev,
            [exerciseIndex + 1]: 0
          }));
          
          // Update selectedSetIndex to visually select the first set of next exercise
          setSelectedSetIndex(prev => ({
            ...prev,
            [exerciseIndex + 1]: 0
          }));
        }
      }
    }
  };

  const getSetStatus = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    
    // If setData is an object with a status property, return it
    if (setData && typeof setData === 'object' && 'status' in setData) {
      return setData.status;
    }
    // If setData is a string (legacy format), return it directly
    if (typeof setData === 'string') {
      return setData;
    }
    return 'pending';
  };

  // Check if a video has been uploaded for this set
  const hasVideoForSet = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    if (setData && typeof setData === 'object' && setData.hasVideo) {
      return true;
    }
    // Strict: only match by local video indices (NO fallback by id or name)
    return localVideos.some(
      (video) =>
        video.exerciseIndex === exerciseIndex &&
        video.setIndex === setIndex &&
        video.file !== 'no-video'
    );
  };


  const getSetStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-white/5';
    }
  };

  const getSetStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-white" />;
      case 'failed': return <XCircle className="h-4 w-4 text-white" />;
      default: return null;
    }
  };

  const isExerciseComplete = (exerciseIndex) => {
    return isExerciseFullyComplete(exerciseIndex);
  };

  const getTotalFinalizedSets = () => {
    if (!exercises || exercises.length === 0) {
      return { finalized: 0, total: 0 };
    }

    let totalSets = 0;
    let finalizedSets = 0;

    exercises.forEach((exercise, exerciseIndex) => {
      if (exercise && Array.isArray(exercise.sets)) {
        const setCount = exercise.sets.length;
        totalSets += setCount;

        for (let setIndex = 0; setIndex < setCount; setIndex++) {
          const status = getSetStatus(exerciseIndex, setIndex);
          if (status !== 'pending') {
            finalizedSets++;
          }
        }
      }
    });

    return {
      total: totalSets,
      finalized: finalizedSets
    };
  };

  const isAllExercisesCompleted = () => {
    if (!exercises || exercises.length === 0) return false;
    
    // Check if all exercises have all sets finalized
    for (let i = 0; i < exercises.length; i++) {
      if (!isExerciseFullyComplete(i)) {
        return false;
      }
    }
    
    return true;
  };

  const handleCompleteSession = () => {
    if (!isAllExercisesCompleted()) {
      alert('Veuillez compléter tous les exercices avant de terminer la séance');
      return;
    }
    setIsCompletionModalOpen(true);
  };

  const handleSessionCompletion = async (completionData) => {
    setIsCompletionModalOpen(false); // Close completion modal

    // If there are videos, handle the upload and processing flow
    if (localVideos.length > 0) {
      setIsVideoProcessingModalOpen(true); // Open processing modal
      setIsUploadingVideos(true);
      
      try {
        let authToken = await getAuthToken();
        
        // Step 1: Upload all videos
        for (let i = 0; i < localVideos.length; i++) {
          const videoData = localVideos[i];
          setUploadProgress({
            current: i + 1,
            total: localVideos.length,
            exerciseName: videoData.exerciseInfo.exerciseName
          });

          // Existing upload logic... (formData creation, fetch, etc.)
          let setNumber = 1;
          let setIndex = 0;
          if (videoData.setInfo) {
            if (typeof videoData.setInfo.setNumber === 'number') setNumber = videoData.setInfo.setNumber;
            if (typeof videoData.setInfo.setIndex === 'number') setIndex = videoData.setInfo.setIndex;
            else if (typeof videoData.setIndex === 'number') setIndex = videoData.setIndex;
            else if (typeof setNumber === 'number') setIndex = Math.max(0, setNumber - 1);
          } else if (typeof videoData.setIndex === 'number') {
            setIndex = videoData.setIndex; setNumber = setIndex + 1;
          }
          const fullSetInfo = { ...(videoData.setInfo || {}), setIndex, setNumber };
          const formData = new FormData();
          if (videoData.file !== 'no-video') {
            formData.append('video', videoData.file);
          } else {
            formData.append('noVideo', 'true');
          }
          formData.append('exerciseInfo', JSON.stringify(videoData.exerciseInfo));
          formData.append('setInfo', JSON.stringify(fullSetInfo));
          formData.append('comment', videoData.comment || '');
          formData.append('rpeRating', videoData.rpeRating || 0);
          formData.append('set_index', String(setIndex));
          formData.append('set_number', String(setNumber));
          if (videoData.exerciseInfo?.exerciseId) formData.append('exercise_id', String(videoData.exerciseInfo.exerciseId));
          if (videoData.exerciseInfo?.exerciseIndex !== undefined) formData.append('exercise_index', String(videoData.exerciseInfo.exerciseIndex));
          if (session?.id) formData.append('session_id', String(session.id));
          if (session?.assignment_id || session?.id) formData.append('assignment_id', String(session?.assignment_id || session?.id));

          let response = await fetch(buildApiUrl('/api/workout-sessions/upload-video'), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
          });

          if (response.status === 401) {
            authToken = await refreshAuthToken();
            response = await fetch(buildApiUrl('/api/workout-sessions/upload-video'), {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authToken}` },
              body: formData
            });
          }

          if (!response.ok) {
            // Parse error message from backend
            let errorMessage = `Video upload failed (${response.status})`;
            try {
              const errorText = await response.text();
              if (errorText) {
                try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {
                  // If not JSON, use the text directly (might contain the error message)
                  errorMessage = errorText.length < 200 ? errorText : errorMessage;
                }
              }
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
          }
        }
        
        setIsUploadingVideos(false);
        setIsCompressing(true);

        // Step 2: Trigger backend compression
        const finalizeResponse = await fetch(buildApiUrl(`/api/workout-sessions/${session.id}/finalize-videos`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!finalizeResponse.ok) {
          // Even if finalization fails, the session is complete from user's perspective
          console.error('Failed to trigger video finalization, but session is marked complete.');
        }

        setIsUploadComplete(true);

        // Close modal after a short delay
        setTimeout(() => {
          setIsVideoProcessingModalOpen(false);
        }, 2000);

      } catch (error) {
        console.error('Error during video processing:', error);
        // Extract and display specific error message
        const errorMessage = error.message || 'Une erreur est survenue lors du téléversement des vidéos.';
        
        // Check if it's a file size error
        if (errorMessage.toLowerCase().includes('too large') || errorMessage.toLowerCase().includes('trop volumineux')) {
          alert(`❌ ${errorMessage}\n\nVeuillez sélectionner une vidéo plus petite (maximum 300 MB).`);
        } else {
          alert(`❌ Erreur lors du téléversement des vidéos:\n\n${errorMessage}\n\nVeuillez réessayer.`);
        }
        
        setIsVideoProcessingModalOpen(false);
        // Don't proceed to complete session if uploads fail
        return;
      } finally {
        // Reset states
        setIsUploadingVideos(false);
        setIsCompressing(false);
        setUploadProgress(null);
      }
    }
    
    // Step 3: Complete the session locally (happens for sessions with or without videos)
    setSessionStatus('completed');
    onCompleteSession({
      ...session,
      completionData,
      completedSets,
      exerciseComments // Include exercise comments
    });
  };

  const handleVideoUpload = (exerciseIndex) => {
    const selectedSet = getSelectedSetIndex(exerciseIndex);
    // Check if the selected set has video enabled
    const exercise = exercises[exerciseIndex];
    if (exercise && exercise.sets && exercise.sets[selectedSet] && exercise.sets[selectedSet].video === true) {
      // Update the video selection to match the current selection
      setSelectedSetForVideo(prev => ({
        ...prev,
        [exerciseIndex]: selectedSet
      }));
      setIsVideoModalOpen(true);
    }
  };

  const handleVideoUploadSuccess = (videoData) => {
    console.log('Video stored locally:', videoData);
    
    // Get exercise and set indices from videoData (more reliable than currentExerciseIndex)
    const exerciseIndex = videoData.exerciseInfo?.exerciseIndex !== undefined 
      ? videoData.exerciseInfo.exerciseIndex 
      : currentExerciseIndex;
    const setIndex = videoData.setInfo?.setIndex !== undefined
      ? videoData.setInfo.setIndex
      : (videoData.setInfo?.setNumber ? videoData.setInfo.setNumber - 1 : selectedSetForVideo[exerciseIndex]);
    
    // Check if a video already exists for this set
    setLocalVideos(prev => {
      // Remove any existing video for this exercise and set
      const filteredVideos = prev.filter(
        v => !(v.exerciseIndex === exerciseIndex && v.setIndex === setIndex)
      );
      // Add the new video with indices for robust matching
      return [
        ...filteredVideos,
        {
          ...videoData,
          exerciseIndex,
          setIndex,
        },
      ];
    });
    
    // Add video status for badge rendering
    setCompletedSets(prev => {
      const currentSetData = prev[`${exerciseIndex}-${setIndex}`] || {};
      const hasNoVideo = videoData.file === 'no-video';
      const updatedSetData = {
        ...currentSetData,
        hasVideo: !hasNoVideo,
        videoStatus: hasNoVideo ? 'no-video' : 'uploaded'
      };
      return {
        ...prev,
        [`${exerciseIndex}-${setIndex}`]: updatedSetData
      };
    });
    
    setIsVideoModalOpen(false);
  };

  // Early return if no session data
  if (!session) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Aucune séance trouvée</p>
          <Button 
            onClick={onBack}
            className="mt-4 bg-[#d4845a] hover:bg-[#c47850] text-white"
          >
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative text-white min-h-screen pb-20 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #050505 55%, #000000 100%)'
      }}
    >
      {/* Top glow to match Figma gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(191,191,191,0.1) 45%, rgba(0,0,0,0) 70%)',
          opacity: 0.35
        }}
      />
      {/* Warm orange glow from timeline */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
        style={{
          background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
          opacity: 0.45
        }}
      />
      {/* Subtle bottom depth glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
        style={{
          background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
          opacity: 0.25
        }}
      />
      {/* Header - Centré comme dans Figma */}
      <div className="px-[47px] pt-[64px] pb-5">
        {/* Bouton retour */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 text-white/60 hover:text-white transition-colors"
            title="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {/* Title and subtitle */}
        <div className="mb-5 text-center w-full">
          <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal mb-[7px]">
            {session.workout_sessions?.title || 'Séance'}
          </h1>
          <p className="text-[10px] font-light text-white/50">
            Durée estimée : 1h30
          </p>
        </div>
      </div>

      {/* Exercise List - Tous les exercices visibles, format compact */}
      <div className="relative pl-[47px] pr-[20px]">
        {/* Ligne verticale pointillée à gauche (comme dans Figma) */}
        {exercises && exercises.length > 0 && (
          <div className="absolute left-[27px] top-0 bottom-0">
            <div className="relative w-full h-full flex flex-col items-center">
              {/* Ligne verticale pointillée */}
              <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-[1px] border-l border-dashed border-[#d4845a]/30"></div>
              {/* Points d'avancement : orange si exercice fait, blanc si pas encore fait - Alignés avec le centre de chaque carte */}
              <div className="relative w-full h-full">
                {exercises.map((_, index) => {
                  const exerciseCompleted = isExerciseFullyComplete(index);
                  const topPosition = dotPositions[index];
                  
                  if (topPosition === undefined) return null;
                  
                  return (
                    <div 
                      key={index} 
                      className={`w-[5px] h-[5px] rounded-full flex-shrink-0 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                        exerciseCompleted ? 'bg-[#d4845a]' : 'bg-white'
                      }`}
                      style={{ top: `${topPosition}px` }}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div 
          ref={exerciseListRef} 
          className="space-y-[10px] ml-[-5px] flex flex-col w-full"
        >
          {exercises && exercises.length > 0 ? (
            exercises.map((exercise, exerciseIndex) => {
              const isActive = exerciseIndex === currentExerciseIndex;
              const isCompleted = isExerciseFullyComplete(exerciseIndex);
              const exerciseSummary = getExerciseSummary(exercise);
              
              return (
                <div 
                  key={exerciseIndex}
                  ref={el => exerciseCardRefs.current[exerciseIndex] = el}
                  onClick={() => handleExerciseSelection(exerciseIndex)}
                  className={`
                    rounded-[12px] overflow-hidden cursor-pointer transition-all duration-200
                    ${isCompleted ? 'bg-[#262626]' : 'bg-[#1c1c1c]'}
                    border border-white/5 hover:border-white/10
                    w-full min-h-[64px]
                  `}
                >
                  <div className="px-[18px] py-[10px] h-full">
                    <div className="flex items-center justify-between gap-5 h-full">
                      <div className="flex flex-col gap-[3px]">
                        <h3 className="text-[15px] font-normal text-white break-words leading-tight">
                          {exercise.name}
                        </h3>
                        {exerciseSummary && (
                          <p className="text-[11px] font-light text-white/50 leading-tight">
                            <span>{exerciseSummary.scheme}</span>{' '}
                            {exerciseSummary.weight && (
                              <span className="text-[#d4845a]">
                                {exerciseSummary.weight}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      
                      {/* Set indicators - compact row */}
                      <div className="flex gap-[10px] items-center flex-shrink-0">
                        {exercise.sets?.map((set, setIndex) => {
                          const status = getSetStatus(exerciseIndex, setIndex);
                          const isSelected = getSelectedSetIndex(exerciseIndex) === setIndex;

                          let variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          if (status === 'completed') {
                            variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          } else if (status === 'failed') {
                            variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          } else if (isSelected && isActive) {
                            variantClasses = 'bg-[rgba(0,0,0,0.45)] border-[#d4845a]';
                          }

                          return (
                            <button
                              key={setIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetSelection(exerciseIndex, setIndex);
                              }}
                              disabled={!isActive}
                              className={`
                                w-[17px] h-[17px] rounded-[3px] border-[0.5px] border-solid 
                                flex items-center justify-center relative
                                transition-all duration-150
                                ${variantClasses}
                                ${isActive 
                                  ? 'cursor-pointer hover:opacity-80' 
                                  : 'opacity-60 cursor-default'
                                }
                              `}
                              title={isActive ? `Sélectionner la série ${setIndex + 1}` : 'Sélectionnez cet exercice pour modifier les séries'}
                            >
                              {status === 'completed' && (
                                <svg 
                                  width="10" 
                                  height="7" 
                                  viewBox="0 0 10 7" 
                                  fill="none" 
                                  className="flex-shrink-0"
                                  style={{ 
                                    shapeRendering: 'crispEdges',
                                    imageRendering: 'crisp-edges'
                                  }}
                                >
                                  <path 
                                    d="M1 3.5L3.5 6L9 1" 
                                    stroke="#2FA064" 
                                    strokeWidth="1.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </svg>
                              )}
                              {status === 'failed' && (
                                <svg 
                                  width="17" 
                                  height="17" 
                                  viewBox="0 0 17 17" 
                                  fill="none" 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="flex-shrink-0"
                                  style={{ 
                                    shapeRendering: 'crispEdges',
                                    imageRendering: 'crisp-edges'
                                  }}
                                >
                                  <path 
                                    d="M5 12L12 5M5 5L12 12" 
                                    stroke="#DA3336" 
                                    strokeWidth="1.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    style={{ 
                                      shapeRendering: 'geometricPrecision'
                                    }}
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">
              Aucun exercice trouvé
            </div>
          )}
        </div>
      </div>

      {/* Complete Session Button - Style Figma */}
      <div className="px-[48px] mt-[10px]">
        <button
          onClick={handleCompleteSession}
          disabled={!isAllExercisesCompleted()}
          className={`
            w-full h-[30px] rounded-[5px] 
            flex items-center justify-center 
            text-[10px] font-normal transition-colors
            ${isAllExercisesCompleted()
              ? 'bg-white/3 hover:bg-white/5 text-white/25 hover:text-white/40 active:bg-white/7'
              : 'bg-white/3 text-white/25 cursor-not-allowed'
            }
          `}
        >
          Valider la séance
        </button>
      </div>

      {/* Video Upload Modal */}
      <WorkoutVideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onUploadSuccess={handleVideoUploadSuccess}
        exerciseInfo={{
          exerciseName: exercises[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]?.name || 'Exercice',
          exerciseId: exercises[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]?.exerciseId,
          exerciseIndex: videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex, // Use the exercise index from modal if available
          sessionId: session?.id,
          coachId: session?.coach_id,
          assignmentId: session?.assignment_id || session?.id
        }}
        setInfo={{
          setIndex: selectedSetForVideo[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex] || 0,
          setNumber: (selectedSetForVideo[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex] || 0) + 1,
          weight: exercises[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]?.sets?.[selectedSetForVideo[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]]?.weight || 0,
          reps: exercises[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]?.sets?.[selectedSetForVideo[videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex]]?.reps || 0
        }}
        existingVideo={(() => {
          const exerciseIdx = videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex;
          const setIdx = selectedSetForVideo[exerciseIdx] || 0;
          return localVideos.find(
            v => v.exerciseIndex === exerciseIdx && v.setIndex === setIdx
          );
        })()}
      />

      {/* Session Completion Modal */}
      <SessionCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        onComplete={handleSessionCompletion}
        isUploading={isUploadingVideos}
        uploadProgress={uploadProgress}
      />

      {/* Video Processing Modal */}
      <VideoProcessingModal
        isOpen={isVideoProcessingModalOpen}
        progress={uploadProgress}
        isCompressing={isCompressing}
        isComplete={isUploadComplete}
      />

      {/* Exercise Validation Modal */}
      {selectedExerciseForValidation !== null && (
        <ExerciseValidationModal
          isOpen={isExerciseValidationModalOpen}
          onClose={() => {
            setIsExerciseValidationModalOpen(false);
            setSelectedExerciseForValidation(null);
          }}
          exercise={exercises[selectedExerciseForValidation]}
          exerciseIndex={selectedExerciseForValidation}
          sets={exercises[selectedExerciseForValidation]?.sets || []}
          completedSets={completedSets}
          onValidateSet={handleSetValidation}
          onVideoUpload={(exerciseIndex, setIndex) => {
            const exercise = exercises[exerciseIndex];
            if (exercise && exercise.sets && exercise.sets[setIndex] && exercise.sets[setIndex].video === true) {
              setSelectedSetForVideo(prev => ({
                ...prev,
                [exerciseIndex]: setIndex
              }));
              setVideoUploadExerciseIndex(exerciseIndex); // Store the exercise index for video upload
              // Keep ExerciseValidationModal open while opening video upload modal
              setIsVideoModalOpen(true);
            }
          }}
          coachFeedback={exercises[selectedExerciseForValidation]?.coach_feedback || exercises[selectedExerciseForValidation]?.coachFeedback || exercises[selectedExerciseForValidation]?.notes || null}
          localVideos={localVideos}
          allExercises={exercises}
          studentComment={exerciseComments[selectedExerciseForValidation] || exercises[selectedExerciseForValidation]?.student_comment || exercises[selectedExerciseForValidation]?.comment || ''}
          onStudentComment={(exerciseIndex, comment) => {
            setExerciseComments(prev => ({
              ...prev,
              [exerciseIndex]: comment
            }));
          }}
          onExerciseChange={(newExerciseIndex) => {
            if (newExerciseIndex >= 0 && newExerciseIndex < exercises.length) {
              setSelectedExerciseForValidation(newExerciseIndex);
              setCurrentExerciseIndex(newExerciseIndex);
            }
          }}
          onCompleteSession={handleCompleteSession}
        />
      )}
    </div>
  );
};

export default WorkoutSessionExecution;
