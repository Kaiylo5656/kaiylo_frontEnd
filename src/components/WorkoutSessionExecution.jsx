import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, Video, Play, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import WorkoutVideoUploadModal from './WorkoutVideoUploadModal';
import SessionCompletionModal from './SessionCompletionModal';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const WorkoutSessionExecution = ({ session, onBack, onCompleteSession }) => {
  const { getAuthToken, refreshAuthToken, user } = useAuth();
  const [completedSets, setCompletedSets] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState({}); // Track current set for each exercise
  const [selectedSetForVideo, setSelectedSetForVideo] = useState({}); // Track which set is selected for video upload per exercise
  const [selectedSetIndex, setSelectedSetIndex] = useState({}); // Track which set is currently selected for each exercise
  const [sessionStatus, setSessionStatus] = useState('in_progress'); // 'in_progress', 'completed'
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // Video upload modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Session completion modal state
  const [localVideos, setLocalVideos] = useState([]); // Store videos locally until session completion
  const [isUploadingVideos, setIsUploadingVideos] = useState(false); // Track video upload state
  const [uploadProgress, setUploadProgress] = useState(null); // Track upload progress

  // Get exercises from the correct data structure
  const exercises = session?.workout_sessions?.exercises || session?.exercises || [];
  
  // Handle exercise selection
  const handleExerciseSelection = (exerciseIndex) => {
    setCurrentExerciseIndex(exerciseIndex);
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

  // Check if video upload is enabled for the currently selected set
  const isVideoUploadEnabled = (exerciseIndex) => {
    const selectedSet = getSelectedSetIndex(exerciseIndex);
    const exercise = exercises[exerciseIndex];
    
    if (!exercise || !Array.isArray(exercise.sets)) return false;
    
    const set = exercise.sets[selectedSet];
    return set && set.video === true;
  };

  // Check if exercise is finalized (all sets have a status - completed, failed, or skipped)
  const isExerciseFullyComplete = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) {
      return false;
    }
    
    const totalSets = exercise.sets.length;
    let finalizedCount = 0;
    
    for (let i = 0; i < totalSets; i++) {
      const status = getSetStatus(exerciseIndex, i);
      // Count sets that have any status (completed, failed, or skipped) - not just completed
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
      case 'skipped': return 'bg-gray-500';
      default: return 'bg-white/5';
    }
  };

  const getSetStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-white" />;
      case 'failed': return <XCircle className="h-4 w-4 text-white" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-white" />;
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
    // Upload all locally stored videos
    if (localVideos.length > 0) {
      setIsUploadingVideos(true);
      
      try {
        let authToken = await getAuthToken();
        console.log('🔐 Auth token for video upload:', authToken ? 'Present' : 'Missing');
        console.log('🔐 Token preview:', authToken ? `${authToken.substring(0, 50)}...` : 'No token');
        console.log('👤 Current user:', user);
        console.log('👤 User role:', user?.user_metadata?.role);
        
        if (!authToken) {
          throw new Error('No authentication token found');
        }
        
        for (let i = 0; i < localVideos.length; i++) {
          const videoData = localVideos[i];
          setUploadProgress({
            current: i + 1,
            total: localVideos.length,
            exerciseName: videoData.exerciseInfo.exerciseName
          });
          // Compute setNumber/setIndex with guaranteed fallback
          let setNumber = 1;
          let setIndex = 0;
          // Compute from setInfo first
          if (videoData.setInfo) {
            if (typeof videoData.setInfo.setNumber === 'number') {
              setNumber = videoData.setInfo.setNumber;
            }
            if (typeof videoData.setInfo.setIndex === 'number') {
              setIndex = videoData.setInfo.setIndex;
            } else if (typeof videoData.setIndex === 'number') {
              setIndex = videoData.setIndex;
            } else if (typeof setNumber === 'number') {
              setIndex = Math.max(0, setNumber - 1);
            }
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
          if (videoData.exerciseInfo?.exerciseId) {
            formData.append('exercise_id', String(videoData.exerciseInfo.exerciseId));
          }
          if (session?.id) {
            formData.append('session_id', String(session.id));
          }
          if (session?.assignment_id || session?.id) {
            formData.append('assignment_id', String(session?.assignment_id || session?.id));
          }
          
          let response = await fetch(buildApiUrl('/api/workout-sessions/upload-video'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });
          
          // If we get a 401 error, try to refresh the token and retry once
          if (response.status === 401) {
            console.log('🔄 Token expired, attempting to refresh...');
            try {
              authToken = await refreshAuthToken();
              console.log('✅ Token refreshed, retrying video upload...');
              
              response = await fetch(buildApiUrl('/api/workout-sessions/upload-video'), {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                },
                body: formData
              });
            } catch (refreshError) {
              console.error('❌ Failed to refresh token:', refreshError);
              throw new Error('Authentication failed. Please log in again.');
            }
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Video upload failed:', response.status, errorText);
            throw new Error(`Video upload failed: ${response.status} ${errorText}`);
          }
          
          console.log('✅ Video uploaded successfully');
        }
      } catch (error) {
        console.error('Error uploading videos:', error);
        alert('Erreur lors du téléchargement des vidéos');
      } finally {
        setIsUploadingVideos(false);
        setUploadProgress(null);
      }
    }
    
    setSessionStatus('completed');
    onCompleteSession({
      ...session,
      completionData,
      completedSets // Pass the set statuses
    });
    setIsCompletionModalOpen(false);
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
    
    // Get current exercise and set indices
    const exerciseIndex = currentExerciseIndex;
    const setIndex = selectedSetForVideo[exerciseIndex];
    
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
      const isSkipped = videoData.file === 'no-video';
      const updatedSetData = {
        ...currentSetData,
        hasVideo: !isSkipped,
        videoStatus: isSkipped ? 'skipped' : 'uploaded'
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
    <div className="bg-black text-white min-h-screen pb-20">
      {/* Header with back button */}
      <div className="px-[47px] pt-4">
        <button 
          onClick={onBack}
          className="text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {/* Title and subtitle */}
        <div className="text-center mb-5">
          <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal">
            {session.workout_sessions?.title || 'Séance'}
          </h1>
          <p className="text-[10px] font-light text-white/50 mt-1">
            Durée estimée : 1h30
          </p>
        </div>
      </div>

      {/* Exercise List */}
      <div className="px-[47px] space-y-[10px]">
        {exercises && exercises.length > 0 ? (
          exercises.map((exercise, exerciseIndex) => {
            const isActive = exerciseIndex === currentExerciseIndex;
            const isCompleted = isExerciseFullyComplete(exerciseIndex);
            const currentSet = getCurrentSetIndex(exerciseIndex);
            
            return (
              <div 
                key={exerciseIndex}
                onClick={() => handleExerciseSelection(exerciseIndex)}
                className={`rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 ${
                  isActive && !isCompleted 
                    ? 'bg-white/10 border-[1.5px] border-[#F2785C] shadow-[0_0_0_4px_rgba(242,120,92,0.08)]' 
                    : 'bg-white/5 border border-white/10'
                } ${isActive && !isCompleted ? 'min-h-[130px]' : 'min-h-[80px]'} ${
                  !isActive ? 'opacity-55 hover:opacity-75' : ''
                }`}
              >
                <div className={isActive && !isCompleted ? 'p-5' : 'p-4'}>
                  {/* Exercise Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className={`font-normal ${
                        isActive && !isCompleted 
                          ? 'text-white text-lg' 
                          : 'text-white/60 text-base'
                      }`}>
                        {exercise.name}
                      </h3>
                      <p className={`font-light mt-1.5 ${
                        isActive && !isCompleted ? 'text-xs' : 'text-[11px]'
                      }`}>
                        <span className={isActive && !isCompleted ? 'text-white/75' : 'text-white/60'}>
                          {isActive 
                            ? `Série ${getSelectedSetIndex(exerciseIndex) + 1}: ${exercise.sets?.[getSelectedSetIndex(exerciseIndex)]?.reps || '?'} rep`
                            : `${exercise.sets?.[0]?.reps || '?'} rep`
                          }
                        </span>
                        {' '}
                        <span className={isActive && !isCompleted ? 'text-[#d4845a]' : 'text-[#d4845a]/60'}>
                          @{isActive 
                            ? exercise.sets?.[getSelectedSetIndex(exerciseIndex)]?.weight || '?' 
                            : exercise.sets?.[0]?.weight || '?'
                          } kg
                        </span>
                      </p>
                    </div>
                    
                    {/* Set indicators (small squares) */}
                    <div className="flex flex-wrap gap-2.5 items-start ml-4 sm:ml-6 md:ml-8">
                      {exercise.sets?.map((set, setIndex) => {
                        const status = getSetStatus(exerciseIndex, setIndex);
                        const videoEnabled = hasVideoForSet(exerciseIndex, setIndex);
                        const isSelected = getSelectedSetIndex(exerciseIndex) === setIndex;
                        const isActive = exerciseIndex === currentExerciseIndex;
                        
                        // Set styling based on status (matching Figma design)
                        let bgColor = 'bg-[rgba(0,0,0,0.35)]';
                        let borderColor = 'border-[rgba(255,255,255,0.1)]';
                        let icon = null;

                        if (status === 'completed') {
                          // Validated: green background with checkmark
                          bgColor = 'bg-green-500';
                          borderColor = 'border-green-500';
                          icon = <CheckCircle size={10} className="text-white" />;
                        } else if (status === 'failed') {
                          // Failed: red background with X
                          bgColor = 'bg-red-500';
                          borderColor = 'border-red-500';
                          icon = <XCircle size={10} className="text-white" />;
                        } else if (status === 'skipped') {
                          // Skipped: gray background with skip icon
                          bgColor = 'bg-gray-500';
                          borderColor = 'border-gray-500';
                          icon = <SkipForward size={10} className="text-white" />;
                        }

                        // Add selection highlight (only for active exercise)
                        const selectionStyle = isSelected && isActive ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#1a1a1a]' : '';

                        // Different styling for active vs inactive exercises
                        const interactiveStyle = isActive 
                          ? 'hover:opacity-80 hover:scale-105 transition-all duration-150 cursor-pointer' 
                          : 'opacity-60 cursor-default';

                        return (
                          <div key={setIndex} className="relative flex items-center">
                            {/* Main set status box */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetSelection(exerciseIndex, setIndex);
                              }}
                              disabled={!isActive}
                              className={`w-5 h-5 rounded-[3px] border-[0.5px] border-solid flex items-center justify-center ${bgColor} ${borderColor} ${selectionStyle} ${interactiveStyle}`}
                              title={isActive ? `Sélectionner la série ${setIndex + 1}` : 'Sélectionnez cet exercice pour modifier les séries'}
                            >
                              {icon}
                            </button>
                            
                            {/* Small video indicator outside the box */}
                            {videoEnabled && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4845a] rounded-full flex items-center justify-center border border-white/20">
                                <Video size={6} className="text-white" />
                              </div>
                            )}
                            {/* Video status badge (uploaded/skipped) */}
                            {
                              (() => {
                                // Determine videoStatus for this set
                                const key = `${exerciseIndex}-${setIndex}`;
                                const setData = completedSets[key] || {};
                                let videoStatus = setData.videoStatus;
                                // Fallback logic if not yet set
                                if (!videoStatus) {
                                  if (setData.hasVideo) {
                                    videoStatus = 'uploaded';
                                  } else if (setData.status === 'skipped') {
                                    videoStatus = 'skipped';
                                  } else {
                                    videoStatus = 'pending';
                                  }
                                }
                                if (videoStatus === 'uploaded') {
                                  return (
                                    <span
                                      role="img"
                                      aria-label="Vidéo ajoutée"
                                      title="Vidéo envoyée"
                                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-600 grid place-items-center text-[10px] shadow ring-1 ring-emerald-300/40"
                                    >
                                      <Play className="h-2.5 w-2.5 text-white" />
                                    </span>
                                  );
                                }
                                if (videoStatus === 'skipped') {
                                  return (
                                    <span
                                      role="img"
                                      aria-label="Vidéo non fournie"
                                      title="Vidéo non fournie (sautée)"
                                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 grid place-items-center text-[10px] shadow ring-1 ring-amber-300/50"
                                    >
                                      <VideoOff className="h-2.5 w-2.5 text-black/80" />
                                    </span>
                                  );
                                }
                                return null;
                              })()
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Exercise Controls */}
                  {isActive && (
                    <div className="mt-5 space-y-2.5">
                      {/* Video button */}
                      {isVideoUploadEnabled(exerciseIndex) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoUpload(exerciseIndex);
                          }}
                          className="w-[155px] h-8 bg-[#d4845a] hover:bg-[#c47850] rounded-[3px] border-[0.5px] border-white/10 flex items-center justify-center text-[10px] font-normal text-white transition-colors"
                        >
                          Ajouter une vidéo
                        </button>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetValidation(exerciseIndex, 'completed', getSelectedSetIndex(exerciseIndex));
                          }}
                          className="flex-1 h-6 bg-[rgba(0,0,0,0.35)] hover:bg-green-500/20 rounded-[2px] border-[0.5px] border-white/10 flex items-center justify-center text-[10px] font-normal text-white/75 hover:text-green-400 transition-colors"
                        >
                          Validé
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetValidation(exerciseIndex, 'failed', getSelectedSetIndex(exerciseIndex));
                          }}
                          className="flex-1 h-6 bg-[rgba(0,0,0,0.35)] hover:bg-red-500/20 rounded-[2px] border-[0.5px] border-white/10 flex items-center justify-center text-[10px] font-normal text-white/75 hover:text-red-400 transition-colors"
                        >
                          Echec
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetValidation(exerciseIndex, 'skipped', getSelectedSetIndex(exerciseIndex));
                          }}
                          className="flex-1 h-6 bg-[rgba(0,0,0,0.35)] hover:bg-gray-500/20 rounded-[2px] border-[0.5px] border-white/10 flex items-center justify-center text-[10px] font-normal text-white/75 hover:text-gray-400 transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
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

      {/* Complete Session Button */}
      <div className="px-[47px] mt-[10px]">
        <button
          onClick={handleCompleteSession}
          disabled={!isAllExercisesCompleted()}
          className={`w-full h-[30px] rounded-[5px] flex items-center justify-center text-white font-medium transition-colors ${
            isAllExercisesCompleted()
              ? 'bg-[#d4845a] hover:bg-[#c47850] active:bg-[#b56949]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="text-[10px]">Valider la séance</span>
        </button>
      </div>

      {/* Video Upload Modal */}
      <WorkoutVideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onUploadSuccess={handleVideoUploadSuccess}
        exerciseInfo={{
          exerciseName: exercises[currentExerciseIndex]?.name || 'Exercice',
          exerciseId: exercises[currentExerciseIndex]?.exerciseId,
          sessionId: session?.id,
          coachId: session?.coach_id,
          assignmentId: session?.assignment_id || session?.id
        }}
        setInfo={{
          setNumber: (selectedSetForVideo[currentExerciseIndex] || 0) + 1,
          weight: exercises[currentExerciseIndex]?.sets?.[selectedSetForVideo[currentExerciseIndex]]?.weight || 0,
          reps: exercises[currentExerciseIndex]?.sets?.[selectedSetForVideo[currentExerciseIndex]]?.reps || 0
        }}
      />

      {/* Session Completion Modal */}
      <SessionCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        onComplete={handleSessionCompletion}
        isUploading={isUploadingVideos}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};

export default WorkoutSessionExecution;
