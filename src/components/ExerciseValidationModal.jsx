import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, MessageCircle, Info } from 'lucide-react';
import ExerciseCommentModal from './ExerciseCommentModal';
import ExerciseInfoModal from './ExerciseInfoModal';

const ExerciseValidationModal = ({
  isOpen,
  onClose,
  exercise,
  exerciseIndex,
  sets,
  completedSets,
  onValidateSet,
  onRpeUpdate,
  onVideoUpload,
  coachFeedback,
  localVideos = [],
  allExercises = [],
  onExerciseChange,
  studentComment: initialStudentComment = '',
  onStudentComment,
  onCompleteSession
}) => {
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
  const [studentComment, setStudentComment] = useState(initialStudentComment);
  const [showMissingVideoModal, setShowMissingVideoModal] = useState(false);
  const [pendingExerciseIndex, setPendingExerciseIndex] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isRpeModalOpen, setIsRpeModalOpen] = useState(false);
  const [selectedSetForRpe, setSelectedSetForRpe] = useState(null);
  const modalRef = useRef(null);

  // Update studentComment when initialStudentComment changes (e.g., when switching exercises)
  useEffect(() => {
    setStudentComment(initialStudentComment);
  }, [initialStudentComment]);

  // Empêcher la fermeture automatique de la modal d'erreur
  useEffect(() => {
    if (showMissingVideoModal) {
      // Empêcher la propagation des événements qui pourraient fermer la modal
      const handleClickOutside = (e) => {
        // Si on clique sur l'overlay, empêcher la fermeture
        const target = e.target;
        if (target && target.classList.contains('fixed') && target.classList.contains('inset-0')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [showMissingVideoModal]);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  if (!isOpen || !exercise) return null;

  // Modal d'erreur pour vidéos manquantes
  const MissingVideoErrorModal = () => {
    if (!showMissingVideoModal) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[111] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => {
          // Empêcher la fermeture au clic sur l'overlay
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          // Empêcher la fermeture avec Escape
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div 
          className="bg-[#1b1b1b] border border-[#262626] rounded-[20px] w-[270px] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="missing-video-title"
          aria-describedby="missing-video-description"
        >
          {/* Content */}
          <div className="px-[5px] pt-[17px] pb-[10px] flex flex-col gap-[15px] items-center">
            <h2 id="missing-video-title" className="text-[17px] font-light text-[#d4845a] leading-normal text-center whitespace-pre-wrap">
              Vidéos manquantes
            </h2>
            <p id="missing-video-description" className="text-[12px] font-light text-white/75 leading-normal text-center w-[227px] whitespace-pre-wrap">
              Certaines séries demandent une vidéo.{' '}
              Si vous quittez votre séance ne sera pas complète.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="px-[27px] pb-[10px] flex flex-col gap-[8px]">
            <button
              type="button"
              onClick={() => {
                setShowMissingVideoModal(false);
                // Réinitialiser l'index en attente
                setPendingExerciseIndex(null);
              }}
              className="bg-[#d4845a] border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-[#c47850]"
            >
              <span className="text-[10px] font-normal text-white">Rester sur la page</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMissingVideoModal(false);
                // Permettre le changement d'exercice si un index est en attente
                if (pendingExerciseIndex !== null && onExerciseChange) {
                  onExerciseChange(pendingExerciseIndex);
                  setPendingExerciseIndex(null);
                }
              }}
              className="bg-white/2 border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-white/5"
            >
              <span className="text-[10px] font-normal text-white">Quitter quand même</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Handle swipe detection
  const onTouchStart = (e) => {
    setTouchEnd({ x: null, y: null });
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  // Vérifier si toutes les séries avec vidéo obligatoire ont une vidéo ou "pas de vidéo"
  const checkVideoRequirements = () => {
    if (!sets || !Array.isArray(sets)) return true;
    
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const set = sets[setIndex];
      // Si la série nécessite une vidéo
      if (set.video === true || set.video === 1 || set.video === 'true') {
        const key = `${exerciseIndex}-${setIndex}`;
        const setData = completedSets[key];
        
        // Vérifier si une vidéo a été uploadée ou si "pas de vidéo" a été choisi
        const hasVideoOrNoVideo = localVideos.some((video) => {
          // Vérifier si c'est la bonne série
          let isMatchingSet = false;
          
          if (video.exerciseIndex === exerciseIndex && video.setIndex === setIndex) {
            isMatchingSet = true;
          } else if (video.exerciseInfo && video.setInfo) {
            const videoExerciseIndex = video.exerciseInfo.exerciseIndex;
            const videoSetIndex = video.setInfo.setIndex;
            if (videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex) {
              isMatchingSet = true;
            }
          } else if (video.exerciseIndex === exerciseIndex && video.setInfo) {
            const videoSetIndex = video.setInfo.setIndex;
            if (videoSetIndex === setIndex) {
              isMatchingSet = true;
            }
          }
          
          if (isMatchingSet) {
            // Retourner true si une vidéo existe (même si c'est 'no-video', cela compte comme une réponse)
            return video.file !== null && video.file !== undefined;
          }
          
          return false;
        });
        
        // Vérifier aussi dans completedSets si hasVideo est true ou si videoStatus est 'no-video'
        const hasVideoInSetData = setData && (
          setData.hasVideo === true || 
          setData.videoStatus === 'no-video'
        );
        
        // Si aucune vidéo n'a été uploadée/choisie (ni upload, ni "pas de vidéo")
        if (!hasVideoOrNoVideo && !hasVideoInSetData) {
          return false;
        }
      }
    }
    return true;
  };

  const onTouchEnd = () => {
    if (!touchStart.x || !touchEnd.x || !onExerciseChange || allExercises.length === 0) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    // Only trigger swipe if horizontal movement is greater than vertical (to avoid conflicts with scrolling)
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      const isLeftSwipe = distanceX > minSwipeDistance;
      const isRightSwipe = distanceX < -minSwipeDistance;

      // Déterminer l'index de l'exercice cible
      let targetExerciseIndex = null;
      if (isLeftSwipe && exerciseIndex < allExercises.length - 1) {
        // Swipe left: go to next exercise
        targetExerciseIndex = exerciseIndex + 1;
      } else if (isRightSwipe && exerciseIndex > 0) {
        // Swipe right: go to previous exercise
        targetExerciseIndex = exerciseIndex - 1;
      }

      // Si un exercice cible est identifié, utiliser handleExerciseChange qui vérifie les vidéos
      if (targetExerciseIndex !== null) {
        handleExerciseChange(targetExerciseIndex);
      }
    }
  };

  // Calculer la durée estimée (par exemple 15 min par exercice)
  const estimatedDuration = '15 min';

  // Progress bar : progression de l'exercice actuel uniquement (les sets de cet exercice)
  // Calculer le nombre total de séries dans l'exercice actuel
  const totalSetsInExercise = exercise?.sets?.length || 0;

  // Calculer le nombre de séries complétées dans l'exercice actuel
  const completedSetsInExercise = exercise?.sets?.filter((_, setIdx) => {
    const key = `${exerciseIndex}-${setIdx}`;
    const setData = completedSets[key];
    if (setData && typeof setData === 'object' && 'status' in setData) {
      return setData.status === 'completed' || setData.status === 'failed';
    }
    return false;
  }).length || 0;

  // Calculer le pourcentage de progression pour l'exercice actuel
  const progress = totalSetsInExercise > 0 ? (completedSetsInExercise / totalSetsInExercise) * 100 : 0;

  // Obtenir le statut d'une série
  const getSetStatus = (setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    if (setData && typeof setData === 'object' && 'status' in setData) {
      return setData.status;
    }
    if (typeof setData === 'string') {
      return setData;
    }
    return 'pending';
  };

  // Vérifier si un set est finalisé (completed ou failed)
  const isSetFinalized = (setIndex) => {
    const status = getSetStatus(setIndex);
    return status === 'completed' || status === 'failed';
  };

  // Vérifier si l'exercice est complètement finalisé (tous les sets ont un statut)
  const isExerciseFinalized = () => {
    if (totalSets === 0) return false;
    for (let i = 0; i < totalSets; i++) {
      const status = getSetStatus(i);
      if (status === 'pending') return false;
    }
    return true;
  };

  // Vérifier si un exercice spécifique (par index) est finalisé
  const isSpecificExerciseFinalized = (exIndex) => {
    const exercise = allExercises[exIndex];
    if (!exercise || !exercise.sets || exercise.sets.length === 0) return false;
    
    for (let i = 0; i < exercise.sets.length; i++) {
      const key = `${exIndex}-${i}`;
      const setData = completedSets[key];
      let status = 'pending';
      
      if (setData && typeof setData === 'object' && 'status' in setData) {
        status = setData.status;
      } else if (typeof setData === 'string') {
        status = setData;
      }
      
      if (status === 'pending') return false;
    }
    return true;
  };

  // Vérifier si tous les exercices sont complétés
  const isAllExercisesCompleted = () => {
    if (!allExercises || allExercises.length === 0) return false;
    
    for (let i = 0; i < allExercises.length; i++) {
      if (!isSpecificExerciseFinalized(i)) {
        return false;
      }
    }
    
    return true;
  };

  // Obtenir le RPE d'une série
  const getRpeForSet = (setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    if (setData && typeof setData === 'object' && 'rpeRating' in setData) {
      return setData.rpeRating;
    }
    return null;
  };

  // Gérer le clic sur le bouton RPE
  const handleRpeClick = (setIndex) => {
    setSelectedSetForRpe(setIndex);
    setIsRpeModalOpen(true);
  };

  // Gérer la sélection du RPE
  const handleRpeSelect = (rpeRating) => {
    if (selectedSetForRpe !== null && onRpeUpdate) {
      onRpeUpdate(exerciseIndex, selectedSetForRpe, rpeRating);
    }
    setIsRpeModalOpen(false);
    setSelectedSetForRpe(null);
  };

  // Vérifier si une série a une vidéo
  const hasVideoForSet = (setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    
    // Vérifier dans completedSets
    if (setData && typeof setData === 'object' && setData.hasVideo) {
      return true;
    }
    
    // Vérifier dans localVideos avec plusieurs formats possibles
    const hasLocalVideo = localVideos.some((video) => {
      // Format 1: exerciseIndex et setIndex directs
      if (video.exerciseIndex === exerciseIndex && video.setIndex === setIndex) {
        // Retourner true si une vidéo existe (même si c'est 'no-video', pour griser l'icône)
        return video.file !== null && video.file !== undefined;
      }
      
      // Format 2: via exerciseInfo et setInfo
      if (video.exerciseInfo && video.setInfo) {
        const videoExerciseIndex = video.exerciseInfo.exerciseIndex;
        const videoSetIndex = video.setInfo.setIndex;
        if (videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex) {
          // Retourner true si une vidéo existe (même si c'est 'no-video', pour griser l'icône)
          return video.file !== null && video.file !== undefined;
        }
      }
      
      // Format 3: via exerciseIndex direct et setInfo
      if (video.exerciseIndex === exerciseIndex && video.setInfo) {
        const videoSetIndex = video.setInfo.setIndex;
        if (videoSetIndex === setIndex) {
          // Retourner true si une vidéo existe (même si c'est 'no-video', pour griser l'icône)
          return video.file !== null && video.file !== undefined;
        }
      }
      
      return false;
    });
    
    return hasLocalVideo;
  };

  // Gérer la validation d'une série (completed)
  const handleValidateSet = (setIndex) => {
    const currentStatus = getSetStatus(setIndex);
    if (currentStatus === 'completed') {
      // Si déjà validée, on la remet en pending (toggle)
      onValidateSet(exerciseIndex, 'pending', setIndex);
    } else {
      // Sinon, on la valide
      onValidateSet(exerciseIndex, 'completed', setIndex);
    }
  };

  // Gérer l'échec d'une série (failed)
  const handleFailSet = (setIndex) => {
    const currentStatus = getSetStatus(setIndex);
    if (currentStatus === 'failed') {
      // Si déjà en échec, on la remet en pending (toggle)
      onValidateSet(exerciseIndex, 'pending', setIndex);
    } else {
      // Sinon, on la marque comme échouée
      onValidateSet(exerciseIndex, 'failed', setIndex);
    }
  };

  // Fonction wrapper pour changer d'exercice avec validation des vidéos
  const handleExerciseChange = (newExerciseIndex) => {
    // Vérifier les vidéos manquantes avant de permettre le changement
    if (!checkVideoRequirements()) {
      // Stocker l'index de l'exercice cible pour permettre le changement si l'utilisateur choisit "Quitter quand même"
      setPendingExerciseIndex(newExerciseIndex);
      setShowMissingVideoModal(true);
      return;
    }
    // Si tout est OK, changer d'exercice
    onExerciseChange(newExerciseIndex);
  };

  // Gérer la fermeture : simplement fermer le modal sans modifier l'état des sets
  const handleClose = () => {
    onClose();
  };

  return (
    <>
      <MissingVideoErrorModal />
      {createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm"
          onClick={handleClose}
        >
      <div 
        ref={modalRef}
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-black text-white rounded-[27px] w-full max-w-[550px] max-h-[85vh] overflow-y-auto overflow-x-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header avec titre */}
        <div className="px-12 pt-8 pb-6">
          <div className="mb-6">
            {/* Navigation et titre */}
            <div className="flex items-center justify-between gap-4 mb-[7px]">
              {/* Bouton précédent */}
              {exerciseIndex > 0 && allExercises.length > 1 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExerciseChange(exerciseIndex - 1);
                  }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  title="Exercice précédent (swipe droit)"
                >
                  <ChevronLeft className="w-5 h-5 text-white/60" />
                </button>
              ) : (
                <div className="w-8" />
              )}
              
              {/* Titre centré */}
              <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal flex-1 text-center">
                {exercise.name}
              </h1>
              
              {/* Bouton suivant */}
              {exerciseIndex < allExercises.length - 1 && allExercises.length > 1 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExerciseChange(exerciseIndex + 1);
                  }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  title="Exercice suivant (swipe gauche)"
                >
                  <ChevronRight className="w-5 h-5 text-white/60" />
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>
            <div className="flex flex-col gap-[15px] items-start w-full">
              {/* Tempo - Affiché si défini par le coach */}
              {exercise.tempo && (
              <p className="text-[10px] font-light text-white/50">
                  Tempo : {exercise.tempo}
              </p>
              )}
              
              {/* Points d'avancement - représentent les exercices de la séance */}
              {allExercises && allExercises.length > 0 && (
                <div className="flex items-center gap-2">
                  {allExercises.map((_, exIndex) => {
                    const isFinalized = isSpecificExerciseFinalized(exIndex);
                    return (
                      <div
                        key={exIndex}
                        className={`w-[5px] h-[5px] rounded-full transition-colors duration-200 ${
                          isFinalized ? 'bg-[#d4845a]' : 'bg-white/30'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Progress bar - Fine, en dessous des points */}
              <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#d4845a] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Icônes information et commentaire - En bas de la barre de progression */}
              <div className="flex gap-[10px] items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInfoModalOpen(true);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-pointer"
                  title="Voir les instructions et la vidéo de l'exercice"
                >
                  <Info className="w-5 h-5 text-[#d4845a]" strokeWidth={1} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCommentModalOpen(true);
                  }}
                  className="cursor-pointer relative w-5 h-5 flex items-center justify-center hover:opacity-80 transition-opacity"
                  title="Ajouter un commentaire pour le coach"
                >
                  <MessageCircle 
                    className="w-5 h-5 text-[#d4845a]" 
                    strokeWidth={1}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Commentaire coach */}
        <div className="px-12 mb-6">
          <div className="flex flex-col gap-[7px] items-start w-full">
            <p className="text-[10px] font-normal text-white/25 leading-normal">
              Commentaire coach :
            </p>
            {coachFeedback ? (
              <p className="text-[12px] text-[#d4845a] leading-normal whitespace-pre-wrap w-full">
                {coachFeedback}
              </p>
            ) : (
              <p className="text-[12px] text-white/25 leading-normal italic">
                Aucun commentaire pour le moment
              </p>
            )}
          </div>
        </div>

        {/* Liste des séries */}
        <div className="pl-6 pr-12 space-y-3 pb-6">
          {/* Headers - Positionnés au-dessus des séries */}
          <div className="flex items-center mb-2">
            <div className="w-[20px]" />
            <div className="w-[265px] px-[15px] pr-[30px]">
              <div className="flex items-center">
                <div className="w-[50px] flex justify-center">
                  <p className="text-[8px] font-normal text-white/25">Charge (kg)</p>
                </div>
                <div className="w-[40px] flex justify-center ml-[20px]">
                    <p className="text-[8px] font-normal text-white/25">Rep.</p>
                  </div>
                <div className="flex-1 flex justify-center gap-[15px]">
                  <div className="w-[17px] h-[17px]" />
                  <div className="w-[17px] h-[17px]" />
                </div>
                <div className="w-[24px] flex justify-center">
                  <p className="text-[8px] font-normal text-white/25">RPE</p>
                </div>
              </div>
            </div>
            <div className="w-[18px]" />
          </div>

          {/* Séries */}
          {sets && sets.map((set, setIndex) => {
            const status = getSetStatus(setIndex);
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';
            const hasVideo = hasVideoForSet(setIndex);
            const setNumber = setIndex + 1;
            const weight = set.weight || '?';
            const reps = set.reps || '?';
            const videoEnabled = set.video === true || set.video === 1 || set.video === 'true';
            const rpeRating = getRpeForSet(setIndex);

            return (
              <div key={setIndex} className="flex items-center">
                {/* Numéro de série - À l'extérieur de la box */}
                <span className="text-[10px] text-white/50 w-[20px] flex-shrink-0 mr-1">{setNumber}</span>
                <div 
                  className="bg-white/5 rounded-[5px] flex items-center px-[15px] pr-[30px] py-[13px] w-[265px] min-w-[265px] max-w-[265px] hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center w-full">
                    {/* Colonne Charge - Centrée */}
                    <div className="w-[50px] flex justify-center">
                    <span className="text-[15px] text-[#d4845a]">{weight}</span>
                    </div>
                    {/* Colonne Rep - Centrée */}
                    <div className="w-[40px] flex justify-center ml-[20px]">
                      <span className="text-[15px] text-white">{reps}</span>
                    </div>
                    {/* Boutons de validation - Centrés */}
                    <div className="flex-1 flex justify-center items-center gap-[15px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValidateSet(setIndex);
                        }}
                        className={`w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] transition-all duration-200 ${
                          isCompleted ? 'bg-[#d4845a]' : 'bg-white/15'
                        }`}
                        title="Valider la série"
                      >
                        <svg width="10" height="7" viewBox="0 0 10 7" fill="none" className="flex-shrink-0">
                          <path 
                            d="M1 3.5L3.5 6L9 1" 
                            stroke="#FFF" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            strokeOpacity={isCompleted ? "1" : "0.25"}
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFailSet(setIndex);
                        }}
                        className={`w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] transition-all duration-200 ${
                          isFailed ? 'bg-[#d4845a]' : 'bg-white/15'
                        }`}
                        title="Marquer en échec"
                      >
                        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className="flex-shrink-0">
                          <path 
                            d="M5 12L12 5M5 5L12 12" 
                            stroke="white" 
                            strokeOpacity={isFailed ? "1" : "0.25"} 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* Bouton RPE - Centré */}
                    <div className="w-[24px] flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRpeClick(setIndex);
                        }}
                        className="bg-white/5 border-[0.5px] border-white/25 rounded-[5px] w-[14px] h-[14px] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                        title="Évaluer l'effort (RPE)"
                      >
                        <span className={`text-[8px] font-normal leading-normal ${
                          rpeRating ? 'text-[#d4845a]' : 'text-white/50'
                        }`}>
                          {rpeRating || ''}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Icône vidéo - À l'extérieur de la box */}
                {videoEnabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onVideoUpload) {
                        onVideoUpload(exerciseIndex, setIndex);
                      }
                    }}
                    className={`w-[24px] h-[24px] min-w-[24px] max-w-[24px] flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0 ml-2 ${
                      hasVideo 
                        ? 'bg-white/10 hover:bg-white/20' 
                        : 'bg-[rgba(212,132,90,0.30)] hover:bg-[rgba(212,132,90,0.40)]'
                    }`}
                    title={hasVideo ? "Vidéo uploadée" : "Ajouter une vidéo"}
                  >
                    {hasVideo ? (
                      // Icône grisée pour indiquer qu'une vidéo a été uploadée
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 3.75C0 3.35218 0.158035 2.97064 0.43934 2.68934C0.720644 2.40804 1.10218 2.25 1.5 2.25H7.125C7.48882 2.24996 7.84025 2.38214 8.11386 2.62195C8.38746 2.86175 8.56459 3.19282 8.61225 3.5535L10.9447 2.517C11.0589 2.46613 11.184 2.4446 11.3086 2.45436C11.4332 2.46413 11.5534 2.50488 11.6583 2.57292C11.7631 2.64096 11.8493 2.73412 11.909 2.84394C11.9687 2.95376 11.9999 3.07676 12 3.20175V8.79825C11.9999 8.92314 11.9686 9.04603 11.909 9.15576C11.8493 9.26549 11.7632 9.35859 11.6585 9.42661C11.5537 9.49463 11.4336 9.53541 11.3091 9.54526C11.1846 9.55511 11.0596 9.53371 10.9455 9.483L8.61225 8.4465C8.56459 8.80718 8.38746 9.13825 8.11386 9.37805C7.84025 9.61786 7.48882 9.75004 7.125 9.75H1.5C1.10218 9.75 0.720644 9.59196 0.43934 9.31066C0.158035 9.02936 0 8.64782 0 8.25V3.75ZM8.625 7.63125L11.25 8.79825V3.20175L8.625 4.36875V7.63125ZM1.5 3C1.30109 3 1.11032 3.07902 0.96967 3.21967C0.829018 3.36032 0.75 3.55109 0.75 3.75V8.25C0.75 8.44891 0.829018 8.63968 0.96967 8.78033C1.11032 8.92098 1.30109 9 1.5 9H7.125C7.32391 9 7.51468 8.92098 7.65533 8.78033C7.79598 8.63968 7.875 8.44891 7.875 8.25V3.75C7.875 3.55109 7.79598 3.36032 7.65533 3.21967C7.51468 3.07902 7.32391 3 7.125 3H1.5Z" fill="#9CA3AF" fillOpacity="0.6"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 3.75C0 3.35218 0.158035 2.97064 0.43934 2.68934C0.720644 2.40804 1.10218 2.25 1.5 2.25H7.125C7.48882 2.24996 7.84025 2.38214 8.11386 2.62195C8.38746 2.86175 8.56459 3.19282 8.61225 3.5535L10.9447 2.517C11.0589 2.46613 11.184 2.4446 11.3086 2.45436C11.4332 2.46413 11.5534 2.50488 11.6583 2.57292C11.7631 2.64096 11.8493 2.73412 11.909 2.84394C11.9687 2.95376 11.9999 3.07676 12 3.20175V8.79825C11.9999 8.92314 11.9686 9.04603 11.909 9.15576C11.8493 9.26549 11.7632 9.35859 11.6585 9.42661C11.5537 9.49463 11.4336 9.53541 11.3091 9.54526C11.1846 9.55511 11.0596 9.53371 10.9455 9.483L8.61225 8.4465C8.56459 8.80718 8.38746 9.13825 8.11386 9.37805C7.84025 9.61786 7.48882 9.75004 7.125 9.75H1.5C1.10218 9.75 0.720644 9.59196 0.43934 9.31066C0.158035 9.02936 0 8.64782 0 8.25V3.75ZM8.625 7.63125L11.25 8.79825V3.20175L8.625 4.36875V7.63125ZM1.5 3C1.30109 3 1.11032 3.07902 0.96967 3.21967C0.829018 3.36032 0.75 3.55109 0.75 3.75V8.25C0.75 8.44891 0.829018 8.63968 0.96967 8.78033C1.11032 8.92098 1.30109 9 1.5 9H7.125C7.32391 9 7.51468 8.92098 7.65533 8.78033C7.79598 8.63968 7.875 8.44891 7.875 8.25V3.75C7.875 3.55109 7.79598 3.36032 7.65533 3.21967C7.51468 3.07902 7.32391 3 7.125 3H1.5Z" fill="#D4845A"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Boutons fermer et valider la séance */}
        <div className="px-12 pb-8 space-y-3">
          {onCompleteSession && (
            <button
              onClick={() => {
                if (isAllExercisesCompleted()) {
                  onCompleteSession();
                  handleClose();
                } else {
                  alert('Veuillez compléter tous les exercices avant de terminer la séance');
                }
              }}
              disabled={!isAllExercisesCompleted()}
              className={`w-full h-[30px] rounded-[5px] text-[10px] font-normal transition-colors flex items-center justify-center ${
                isAllExercisesCompleted()
                  ? 'bg-[#d4845a] hover:bg-[#c47850] text-white'
                  : 'bg-white/3 text-white/25 cursor-not-allowed'
              }`}
            >
              Valider la séance
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-full h-[30px] rounded-[5px] bg-white/3 hover:bg-white/5 text-[10px] font-normal text-white/25 hover:text-white/40 transition-colors flex items-center justify-center"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
      , document.body)}
      
      {/* Exercise Comment Modal */}
      <ExerciseCommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        onSave={(comment) => {
          setStudentComment(comment);
          if (onStudentComment) {
            onStudentComment(exerciseIndex, comment);
          }
        }}
        exerciseName={exercise?.name}
        initialComment={studentComment}
      />
      
      {/* Exercise Info Modal */}
      <ExerciseInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        exercise={exercise}
      />

      {/* RPE Selection Modal */}
      {isRpeModalOpen && selectedSetForRpe !== null && (() => {
        const currentRpe = getRpeForSet(selectedSetForRpe);
        return createPortal(
          <div 
            className="fixed inset-0 z-[111] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsRpeModalOpen(false);
              setSelectedSetForRpe(null);
            }}
          >
            <div 
              className="bg-[#1b1b1b] rounded-[20px] w-[220px] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rpe-title"
            >
              {/* Content */}
              <div className="px-[10px] py-[17px] flex flex-col gap-[20px] items-center">
                <h2 id="rpe-title" className="text-[17px] font-normal text-[#d4845a] leading-normal text-center">
                  RPE
                </h2>
                
                {/* Grille de boutons RPE - 2 lignes de 5 */}
                <div className="flex flex-col gap-[8px] items-start w-[199px]">
                  {/* Première ligne : 1-5 */}
                  <div className="flex gap-[6px] items-center w-full">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRpeSelect(rating)}
                        className={`border rounded-[50px] w-[35px] h-[35px] flex items-center justify-center transition-colors ${
                          currentRpe === rating 
                            ? 'bg-[#d4845a] border-[#d4845a]' 
                            : 'bg-[#1e1e1e] border-white/25 hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <span className={`text-[15px] font-normal leading-normal ${
                          currentRpe === rating ? 'text-white' : 'text-[#d4845a]'
                        }`}>
                          {rating}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Deuxième ligne : 6-10 */}
                  <div className="flex gap-[6px] items-center w-full">
                    {[6, 7, 8, 9, 10].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRpeSelect(rating)}
                        className={`border rounded-[50px] w-[35px] h-[35px] flex items-center justify-center transition-colors ${
                          currentRpe === rating 
                            ? 'bg-[#d4845a] border-[#d4845a]' 
                            : 'bg-[#1e1e1e] border-white/25 hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <span className={`text-[15px] font-normal leading-normal ${
                          currentRpe === rating ? 'text-white' : 'text-[#d4845a]'
                        }`}>
                          {rating}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Bouton Quitter */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRpeModalOpen(false);
                    setSelectedSetForRpe(null);
                  }}
                  className="bg-white/2 border-[0.5px] border-white/10 h-[20px] rounded-[5px] w-[70px] flex items-center justify-center transition-colors hover:bg-white/5"
                >
                  <span className="text-[10px] font-normal text-white leading-normal text-center">
                    Quitter
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </>
  );
};

export default ExerciseValidationModal;
