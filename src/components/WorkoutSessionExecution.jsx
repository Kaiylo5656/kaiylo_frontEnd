import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, SkipForward, Video, Play } from 'lucide-react';
import { Button } from './ui/button';

const WorkoutSessionExecution = ({ session, onBack, onCompleteSession }) => {
  const [completedSets, setCompletedSets] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState({}); // Track current set for each exercise
  const [sessionStatus, setSessionStatus] = useState('in_progress'); // 'in_progress', 'completed'

  // Debug: Log session data structure
  console.log('WorkoutSessionExecution session data:', session);

  // Get exercises from the correct data structure
  const exercises = session?.workout_sessions?.exercises || session?.exercises || [];

  // Get current set index for an exercise
  const getCurrentSetIndex = (exerciseIndex) => {
    return currentSetIndex[exerciseIndex] || 0;
  };

  // Check if exercise is completed (all sets done)
  const isExerciseFullyComplete = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !exercise.sets) return false;
    
    const totalSets = exercise.sets.length;
    let completedCount = 0;
    
    for (let i = 0; i < totalSets; i++) {
      const status = getSetStatus(exerciseIndex, i);
      if (status !== 'pending') completedCount++;
    }
    
    return completedCount === totalSets;
  };

  const handleSetValidation = (exerciseIndex, status, setIndex = null) => {
    const exercise = exercises[exerciseIndex];
    
    if (!exercise || !exercise.sets) {
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
    setCompletedSets(prev => ({
      ...prev,
      [key]: status
    }));

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
    return completedSets[key] || 'pending';
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

  const getTotalCompletedSets = () => {
    if (!exercises || !Array.isArray(exercises)) {
      return 0;
    }
    
    let total = 0;
    exercises.forEach((_, exerciseIndex) => {
      if (isExerciseComplete(exerciseIndex)) {
        total++;
      }
    });
    return total;
  };

  const handleCompleteSession = () => {
    setSessionStatus('completed');
    onCompleteSession(session);
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
            Exercices complétés: {getTotalCompletedSets()}/{exercises?.length || 0}
          </span>
          <span className="text-[#e87c3e] font-medium">
            {Math.round((getTotalCompletedSets() / (exercises?.length || 1)) * 100)}%
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
                  const currentSet = getCurrentSetIndex(exerciseIndex);
                  const setData = exercise.sets?.[currentSet] || exercise.sets?.[0];
                  const isComplete = isExerciseFullyComplete(exerciseIndex);
                  
                  return (
                    <>
                      <p className="text-gray-400 text-sm">
                        {setData?.reps || '?'} rep @{setData?.weight || 'N/A'} kg
                      </p>
                      {!isComplete && (
                        <p className="text-[#e87c3e] text-xs mt-1">
                          Série {currentSet + 1} sur {exercise.sets?.length || 0}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-[#e87c3e] hover:bg-[#d66d35] text-white border-[#e87c3e]"
              >
                <Video className="h-4 w-4 mr-2" />
                Ajouter une vidéo
              </Button>
            </div>

                   {/* Set Trackers */}
                   <div className="flex items-center gap-2 mb-4">
                     {exercise.sets?.map((set, setIndex) => {
                       const status = getSetStatus(exerciseIndex, setIndex);
                       const isCurrentSet = setIndex === getCurrentSetIndex(exerciseIndex) && !isExerciseFullyComplete(exerciseIndex);
                       const isCompletedSet = status !== 'pending';
                       
                       return (
                         <div 
                           key={setIndex}
                           className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                             isCurrentSet 
                               ? 'bg-[#e87c3e] border-2 border-white' // Current set - orange with white border
                               : getSetStatusColor(status)
                           }`}
                           onClick={() => {
                             if (isCompletedSet) {
                               // Cycle through statuses: completed -> failed -> skipped -> completed
                               const newStatus = status === 'completed' ? 'failed' : 
                                               status === 'failed' ? 'skipped' : 'completed';
                               handleSetValidation(exerciseIndex, newStatus, setIndex);
                             } else {
                               // For pending sets, allow direct marking as completed
                               handleSetValidation(exerciseIndex, 'completed', setIndex);
                             }
                           }}
                           title={isCompletedSet ? `Click to change status (Current: ${status === 'completed' ? 'Validé' : status === 'failed' ? 'Échec' : 'Skip'})` : `Set ${setIndex + 1} - Click to start`}
                         >
                           {isCompletedSet ? (
                             getSetStatusIcon(status)
                           ) : (
                             <span className="text-xs font-bold text-white">
                               {setIndex + 1}
                             </span>
                           )}
                         </div>
                       );
                     })}
                   </div>

                   {/* Instructions */}
                   {!isExerciseFullyComplete(exerciseIndex) && (
                     <div className="text-xs text-gray-400 mb-3 text-center">
                       💡 Cliquez sur les séries pour changer leur statut
                     </div>
                   )}

                   {/* Validation Buttons */}
                   <div className="flex gap-2">
                     {isExerciseFullyComplete(exerciseIndex) ? (
                       <div className="flex-1 text-center py-2">
                         <span className="text-green-400 font-medium">✓ Exercice terminé</span>
                         <div className="text-xs text-gray-400 mt-1">
                           Cliquez sur les séries pour modifier
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
      </div>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#121212] border-t border-[#1a1a1a]">
        <Button 
          className="w-full bg-[#262626] hover:bg-[#404040] text-white py-3 rounded-lg font-medium"
          onClick={handleCompleteSession}
          disabled={sessionStatus === 'completed'}
        >
          {sessionStatus === 'completed' ? 'Séance terminée' : 'Valider la séance'}
        </Button>
      </div>

      {/* Bottom padding to avoid overlap with fixed button */}
      <div className="h-20"></div>
    </div>
  );
};

export default WorkoutSessionExecution;
