import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, Video, Play } from 'lucide-react';
import { Button } from './ui/button';
import WorkoutVideoUploadModal from './WorkoutVideoUploadModal';
import SessionCompletionModal from './SessionCompletionModal';
import { buildApiUrl } from '../config/api';

const WorkoutSessionExecution = ({ session, onBack, onCompleteSession }) => {
  const [completedSets, setCompletedSets] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState({}); // Track current set for each exercise
  const [selectedSetForVideo, setSelectedSetForVideo] = useState({}); // Track which set is selected for video upload per exercise
  const [sessionStatus, setSessionStatus] = useState('in_progress'); // 'in_progress', 'completed'
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // Video upload modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Session completion modal state
  const [localVideos, setLocalVideos] = useState([]); // Store videos locally until session completion
  const [isUploadingVideos, setIsUploadingVideos] = useState(false); // Track video upload state
  const [uploadProgress, setUploadProgress] = useState(null); // Track upload progress

  // Get exercises from the correct data structure
  const exercises = session?.workout_sessions?.exercises || session?.exercises || [];
  
  // Debug logging to understand data structure issues
  // console.log('🔍 WorkoutSessionExecution Debug:', {
  //   session,
  //   exercises,
  //   firstExercise: exercises[0],
  //   firstExerciseSets: exercises[0]?.sets,
  //   setsType: typeof exercises[0]?.sets,
  //   setsIsArray: Array.isArray(exercises[0]?.sets)
  // });

  // Get current set index for an exercise
  const getCurrentSetIndex = (exerciseIndex) => {
    return currentSetIndex[exerciseIndex] || 0;
  };

  // Check if video upload is enabled for the selected set
  const isVideoUploadEnabled = (exerciseIndex) => {
    let selectedSet = selectedSetForVideo[exerciseIndex];
    
    // If no set is selected yet, try to find a set with video enabled
    if (selectedSet === undefined) {
      const exercise = exercises[exerciseIndex];
      if (exercise && Array.isArray(exercise.sets)) {
        // Find the first set with video enabled
        const videoSetIndex = exercise.sets.findIndex(set => set.video === true);
        if (videoSetIndex !== -1) {
          selectedSet = videoSetIndex;
          // Auto-select this set for video upload
          setSelectedSetForVideo(prev => ({
            ...prev,
            [exerciseIndex]: selectedSet
          }));
        }
      }
    }
    
    if (selectedSet === undefined) return false;
    
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) return false;
    
    const set = exercise.sets[selectedSet];
    return set && set.video === true;
  };

  // Check if exercise is finalized (all sets have a status - completed, failed, or skipped)
  const isExerciseFullyComplete = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) {
      // console.log(`🔍 Exercise ${exerciseIndex}: No exercise or sets array`);
      return false;
    }
    
    const totalSets = exercise.sets.length;
    let finalizedCount = 0;
    const setStatuses = [];
    
    for (let i = 0; i < totalSets; i++) {
      const status = getSetStatus(exerciseIndex, i);
      setStatuses.push(status);
      // Count sets that have any status (completed, failed, or skipped) - not just completed
      if (status !== 'pending') finalizedCount++;
    }
    
    const isFinalized = finalizedCount === totalSets;
    // console.log(`🔍 Exercise ${exerciseIndex} (${exercise.name}): ${finalizedCount}/${totalSets} sets finalized`, setStatuses, `Result: ${isFinalized ? 'FINALIZED' : 'INCOMPLETE'}`);
    return isFinalized;
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

    // Only advance to next set if we're updating the current set (not a previous one)
    if (setIndex === null) {
      setCurrentSetIndex(prev => ({
        ...prev,
        [exerciseIndex]: targetSet + 1
      }));
    }
  };

  const getSetStatus = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    
    // If setData exists and has a status property, use it
    // Otherwise, if setData exists but no status, it might be just a video marker
    // If no setData at all, it's pending
    if (setData && typeof setData === 'object' && 'status' in setData) {
      return setData.status;
    } else if (setData && typeof setData === 'string') {
      // Handle legacy format where status was stored directly as string
      return setData;
    } else {
      return 'pending';
    }
  };

  const getSetStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-600';
      case 'skipped': return 'bg-gray-600';
      default: return 'bg-[#262626] border border-[#404040]';
    }
  };

  const getSetStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-white" />;
      case 'failed': return <XCircle className="h-3 w-3 text-white" />;
      case 'skipped': return <SkipForward className="h-3 w-3 text-white" />;
      default: return null;
    }
  };

  const isExerciseComplete = (exerciseIndex) => {
    return isExerciseFullyComplete(exerciseIndex);
  };

  const getTotalFinalizedSets = () => {
    if (!exercises || !Array.isArray(exercises)) {
      return { finalized: 0, total: 0 };
    }
    
    let finalizedSets = 0;
    let totalSets = 0;
    
    exercises.forEach((exercise, exerciseIndex) => {
      if (Array.isArray(exercise.sets)) {
        totalSets += exercise.sets.length;
        exercise.sets.forEach((_, setIndex) => {
          const status = getSetStatus(exerciseIndex, setIndex);
          // Count sets that have any status (completed, failed, or skipped)
          if (status !== 'pending') {
            finalizedSets++;
          }
        });
      }
    });
    
    return { finalized: finalizedSets, total: totalSets };
  };

  // Check if all exercises are fully completed (all sets have a status)
  const isAllExercisesCompleted = () => {
    if (!exercises || !Array.isArray(exercises)) {
      // console.log('🔍 isAllExercisesCompleted: No exercises array');
      return false;
    }
    
    const results = exercises.map((exercise, exerciseIndex) => {
      const isComplete = isExerciseFullyComplete(exerciseIndex);
      // console.log(`🔍 Exercise ${exerciseIndex} (${exercise.name}): ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
      return isComplete;
    });
    
    const allComplete = results.every(result => result === true);
    // console.log('🔍 isAllExercisesCompleted result:', allComplete, results);
    return allComplete;
  };

  const handleCompleteSession = () => {
    console.log('🎯 handleCompleteSession called - opening completion modal');
    setIsCompletionModalOpen(true);
  };

  const handleSessionCompletion = async (completionData) => {
    console.log('🎯 Session completion started, uploading videos...', localVideos.length);
    
    // Upload all locally stored videos to Supabase
    if (localVideos.length > 0) {
      setIsUploadingVideos(true);
      setUploadProgress({ current: 0, total: localVideos.length });
      
      try {
        // Upload videos sequentially to track progress
        let uploadedCount = 0;
        for (const videoData of localVideos) {
          const formData = new FormData();
          formData.append('video', videoData.file);
          formData.append('comment', videoData.comment || '');
          formData.append('rpeRating', videoData.rpeRating);
          formData.append('exerciseInfo', JSON.stringify(videoData.exerciseInfo));
          formData.append('setInfo', JSON.stringify(videoData.setInfo));

          const token = localStorage.getItem('authToken');
          const response = await fetch(buildApiUrl('/workout-sessions/upload-video'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Échec de l\'upload de la vidéo.');
          }

          uploadedCount++;
          setUploadProgress({ current: uploadedCount, total: localVideos.length });
          console.log(`✅ Video ${uploadedCount}/${localVideos.length} uploaded successfully`);
        }

        console.log('✅ All videos uploaded successfully:', uploadedCount);
      } catch (uploadError) {
        console.error('❌ Error uploading videos:', uploadError);
        setIsUploadingVideos(false);
        setUploadProgress(null);
        // Continue with session completion even if video upload fails
        alert('Certaines vidéos n\'ont pas pu être uploadées. La séance sera tout de même validée.');
      } finally {
        setIsUploadingVideos(false);
        setUploadProgress(null);
      }
    }
    
    setSessionStatus('completed');
    onCompleteSession({
      ...session,
      completionData
    });
    setIsCompletionModalOpen(false);
  };

  const handleVideoUpload = (exerciseIndex) => {
    const selectedSet = selectedSetForVideo[exerciseIndex];
    if (selectedSet !== undefined && isVideoUploadEnabled(exerciseIndex)) {
      setIsVideoModalOpen(true);
    }
  };

  const handleVideoUploadSuccess = (videoData) => {
    console.log('Video stored locally:', videoData);
    
    // Store video locally instead of uploading immediately
    setLocalVideos(prev => [...prev, videoData]);
    
    // Update UI to show that a video was recorded for this set
    const exerciseIndex = currentExerciseIndex;
    const setIndex = selectedSetForVideo[exerciseIndex];
    
    console.log('🎥 Adding video to set:', {
      exerciseIndex,
      setIndex,
      currentSetStatus: completedSets[`${exerciseIndex}-${setIndex}`]
    });
    
    // Mark the set as having a video while preserving its existing status
    setCompletedSets(prev => {
      const currentSetData = prev[`${exerciseIndex}-${setIndex}`] || {};
      const updatedSetData = {
        ...currentSetData,
        hasVideo: true
      };
      
      console.log('🎥 Set data update:', {
        before: currentSetData,
        after: updatedSetData
      });
      
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
      <div className="bg-[#121212] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Aucune séance trouvée</p>
          <Button 
            onClick={onBack}
            className="mt-4 bg-[#e87c3e] hover:bg-[#d66d35] text-white"
          >
            Retour
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-[#121212] text-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="text-white hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-[#e87c3e]">
            {session.workout_sessions?.title || 'Workout Session'}
          </h1>
          <p className="text-sm text-gray-400">
            Durée estimée : 1h30
          </p>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Progress Indicator */}
      <div className="p-4 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Séries complétées: {getTotalFinalizedSets().finalized}/{getTotalFinalizedSets().total}
          </span>
          <span className="text-[#e87c3e] font-medium">
            {Math.round((getTotalFinalizedSets().finalized / getTotalFinalizedSets().total) * 100)}%
          </span>
        </div>
      </div>

      {/* Exercise List */}
      <div className="p-4 space-y-4">
        {exercises && exercises.length > 0 ? (
          exercises.map((exercise, exerciseIndex) => (
          <div key={exerciseIndex} className="bg-[#1a1a1a] rounded-lg p-4">
            {/* Exercise Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-medium text-lg">{exercise.name}</h3>
                       {(() => {
                         // Use selected set for video if available, otherwise use current active set
                         const selectedSet = selectedSetForVideo[exerciseIndex];
                         const currentSet = getCurrentSetIndex(exerciseIndex);
                         const displaySetIndex = selectedSet !== undefined ? selectedSet : currentSet;
                         const setData = Array.isArray(exercise.sets) ? (exercise.sets[displaySetIndex] || exercise.sets[0]) : null;
                         const isComplete = isExerciseFullyComplete(exerciseIndex);
                         
                         return (
                           <>
                             <p className="text-gray-400 text-sm">
                               {setData?.reps || '?'} rep @{setData?.weight || 'N/A'} kg
                             </p>
                             {!isComplete && (
                               <p className="text-[#e87c3e] text-xs mt-1">
                                 Série {displaySetIndex + 1} sur {Array.isArray(exercise.sets) ? exercise.sets.length : 0}
                                 {selectedSet !== undefined && selectedSet !== currentSet && ' (sélectionnée)'}
                               </p>
                             )}
                           </>
                         );
                       })()}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!isVideoUploadEnabled(exerciseIndex)}
                onClick={() => handleVideoUpload(exerciseIndex)}
                className={`${
                  isVideoUploadEnabled(exerciseIndex)
                    ? 'bg-[#e87c3e] hover:bg-[#d66d35] text-white border-[#e87c3e]'
                    : 'bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed'
                }`}
                title={
                  !isVideoUploadEnabled(exerciseIndex)
                    ? 'Sélectionnez une série avec vidéo activée'
                    : 'Ajouter une vidéo pour cette série'
                }
              >
                <Video className="h-4 w-4 mr-2" />
                Ajouter une vidéo
              </Button>
            </div>

                   {/* Set Trackers */}
                   <div className="flex items-center gap-2 mb-4">
                     {(Array.isArray(exercise.sets) ? exercise.sets : []).map((set, setIndex) => {
                       const status = getSetStatus(exerciseIndex, setIndex);
                       const isCurrentSet = setIndex === getCurrentSetIndex(exerciseIndex) && !isExerciseFullyComplete(exerciseIndex);
                       const isCompletedSet = status !== 'pending';
                       const hasVideo = completedSets[`${exerciseIndex}-${setIndex}`]?.hasVideo;
                       
                       return (
                         <div 
                           key={setIndex}
                           className={`relative w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                             isCurrentSet 
                               ? 'bg-[#e87c3e] border-2 border-white' // Current set - orange with white border
                               : selectedSetForVideo[exerciseIndex] === setIndex
                                 ? getSetStatusColor(status) + ' border-2 border-blue-400' // Selected for video - preserve status color with blue border
                                 : getSetStatusColor(status)
                           }`}
                           onClick={() => {
                             // Select this set for video upload and to show its details
                             setSelectedSetForVideo(prev => ({
                               ...prev,
                               [exerciseIndex]: setIndex
                             }));

                             // Update the current set index to show the correct weight/reps in the header
                             setCurrentSetIndex(prev => ({
                               ...prev,
                               [exerciseIndex]: setIndex
                             }));

                             // No status modification on click - only viewing details and video selection
                           }}
                           title={
                             `Set ${setIndex + 1} - Click to view details${selectedSetForVideo[exerciseIndex] === setIndex ? ' - Selected for video' : ''}${hasVideo ? ' - Video recorded' : ''}`
                           }
                         >
                           {isCompletedSet ? (
                             getSetStatusIcon(status)
                           ) : (
                             <span className="text-xs font-bold text-white">
                               {setIndex + 1}
                             </span>
                           )}
                           {/* Video indicator badge */}
                           {hasVideo && (
                             <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                               <Video className="h-2 w-2 text-white" />
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>


                   {/* Validation Buttons */}
                   <div className="flex gap-2">
                     {isExerciseFullyComplete(exerciseIndex) ? (
                       <div className="flex-1 text-center py-2">
                         <span className="text-green-400 font-medium">✓ Exercice terminé</span>
                         <div className="text-xs text-gray-400 mt-1">
                           Utilisez les boutons pour modifier le statut
                         </div>
                       </div>
                     ) : (
                       <>
                         <Button 
                           size="sm"
                           className="bg-green-600 hover:bg-green-700 text-white flex-1"
                           onClick={() => handleSetValidation(exerciseIndex, 'completed')}
                         >
                           <CheckCircle className="h-4 w-4 mr-2" />
                           Validé
                         </Button>
                         <Button 
                           size="sm"
                           className="bg-red-600 hover:bg-red-700 text-white flex-1"
                           onClick={() => handleSetValidation(exerciseIndex, 'failed')}
                         >
                           <XCircle className="h-4 w-4 mr-2" />
                           Echec
                         </Button>
                         <Button 
                           size="sm"
                           className="bg-gray-600 hover:bg-gray-700 text-white flex-1"
                           onClick={() => handleSetValidation(exerciseIndex, 'skipped')}
                         >
                           <SkipForward className="h-4 w-4 mr-2" />
                           Skip
                         </Button>
                       </>
                     )}
                   </div>
          </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucun exercice trouvé dans cette séance</p>
          </div>
        )}
        
        {/* Session Completion Button - positioned after exercises */}
        <div className="p-4">
          {/* Check if session is already completed in the database */}
          {session?.status === 'completed' ? (
            <div className="text-center py-4">
              <div className="bg-green-600 text-white py-3 rounded-lg font-medium mb-2">
                ✓ Séance terminée
              </div>
              <p className="text-gray-400 text-sm">
                Cette séance a déjà été complétée le {session?.completed_at ? new Date(session.completed_at).toLocaleDateString('fr-FR') : 'récemment'}
              </p>
            </div>
          ) : (
            <Button 
              className={`w-full py-3 rounded-lg font-medium transition-colors border-2 ${
                sessionStatus === 'completed' 
                  ? 'bg-[#262626] text-white cursor-not-allowed border-gray-600' 
                  : isAllExercisesCompleted() 
                    ? 'bg-[#e87c3e] hover:bg-[#d66d35] text-white border-[#e87c3e]'
                    : 'bg-[#404040] text-gray-300 cursor-not-allowed border-gray-500'
              }`}
              onClick={handleCompleteSession}
              disabled={sessionStatus === 'completed' || !isAllExercisesCompleted()}
            >
              {sessionStatus === 'completed' 
                ? 'Séance terminée' 
                : isAllExercisesCompleted() 
                  ? 'Valider la séance' 
                  : `Valider la séance (${getTotalFinalizedSets().finalized}/${getTotalFinalizedSets().total})`
              }
            </Button>
          )}
        </div>
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
                coachId: session?.coach_id || session?.workout_sessions?.coach_id,
                assignmentId: session?.assignment_id || session?.id
              }}
              setInfo={{
                setNumber: (selectedSetForVideo[currentExerciseIndex] || 0) + 1,
                setIndex: selectedSetForVideo[currentExerciseIndex] || 0,
                weight: exercises[currentExerciseIndex]?.sets?.[selectedSetForVideo[currentExerciseIndex] || 0]?.weight || 0,
                reps: exercises[currentExerciseIndex]?.sets?.[selectedSetForVideo[currentExerciseIndex] || 0]?.reps || 0
              }}
            />

            {/* Session Completion Modal */}
            <SessionCompletionModal
              isOpen={isCompletionModalOpen}
              onClose={() => setIsCompletionModalOpen(false)}
              onComplete={handleSessionCompletion}
              sessionData={{
                session,
                completedSets,
                exercises,
                totalCompletedSets: getTotalFinalizedSets().finalized,
                totalSets: getTotalFinalizedSets().total
              }}
              isUploading={isUploadingVideos}
              uploadProgress={uploadProgress}
            />
          </div>
        );
      };

      export default WorkoutSessionExecution;
