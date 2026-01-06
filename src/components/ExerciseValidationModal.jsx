import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Info } from 'lucide-react';
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

  // Empêcher la fermeture de la modale RPE par ESC
  useEffect(() => {
    if (isRpeModalOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isRpeModalOpen]);

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

  // Vérifier si l'exercice a des informations disponibles (instructions ou vidéo)
  const hasExerciseInfo = () => {
    if (!exercise) return false;
    
    // Vérifier si l'exercice a des instructions (non vides)
    const hasInstructions = exercise.instructions && 
      exercise.instructions.trim().length > 0;
    
    // Vérifier si l'exercice a une vidéo
    const hasVideo = exercise.demoVideoURL && 
      exercise.demoVideoURL.trim().length > 0;
    
    // Vérifier si l'exercice a un exerciseId (l'API pourrait avoir des informations)
    // Si l'exercice a un exerciseId, on permet l'ouverture car l'API pourrait avoir des infos
    const hasExerciseId = exercise.exerciseId && 
      exercise.exerciseId.trim().length > 0;
    
    // L'exercice a des informations si :
    // - Il a des instructions OU
    // - Il a une vidéo OU
    // - Il a un exerciseId (l'API pourrait avoir des informations à récupérer)
    return hasInstructions || hasVideo || hasExerciseId;
  };

  const exerciseHasInfo = hasExerciseInfo();

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

  // Progress bar : progression de toute la session (tous les exercices)
  // Calculer le nombre total de séries dans tous les exercices
  const totalSetsInSession = allExercises.reduce((total, ex, exIdx) => {
    return total + (ex?.sets?.length || 0);
  }, 0);

  // Calculer le nombre de séries complétées dans toute la session
  const completedSetsInSession = allExercises.reduce((total, ex, exIdx) => {
    const completedInExercise = (ex?.sets || []).filter((_, setIdx) => {
      const key = `${exIdx}-${setIdx}`;
      const setData = completedSets[key];
      if (setData && typeof setData === 'object' && 'status' in setData) {
        return setData.status === 'completed' || setData.status === 'failed';
      }
      return false;
    }).length;
    return total + completedInExercise;
  }, 0);

  // Calculer le pourcentage de progression pour toute la session
  const progress = totalSetsInSession > 0 ? (completedSetsInSession / totalSetsInSession) * 100 : 0;

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
  // IMPORTANT: Vérifier d'abord localVideos avec une correspondance STRICTE par setIndex
  // pour éviter que plusieurs sets affichent la même vidéo
  const hasVideoForSet = (setIndex) => {
    // PRIORITÉ 1: Vérifier dans localVideos avec correspondance STRICTE (exerciseIndex ET setIndex)
    // C'est la source de vérité la plus fiable
    const hasLocalVideo = localVideos.some((video) => {
      // Format 1: exerciseIndex et setIndex directs (format principal)
      if (video.exerciseIndex === exerciseIndex && video.setIndex === setIndex) {
        // Retourner true seulement si une vidéo réelle existe (pas 'no-video')
        return video.file !== null && video.file !== undefined && video.file !== 'no-video';
      }
      
      // Format 2: via exerciseInfo et setInfo
      if (video.exerciseInfo && video.setInfo) {
        const videoExerciseIndex = video.exerciseInfo.exerciseIndex;
        const videoSetIndex = video.setInfo.setIndex;
        if (videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex) {
          return video.file !== null && video.file !== undefined && video.file !== 'no-video';
        }
      }
      
      // Format 3: via exerciseIndex direct et setInfo
      if (video.exerciseIndex === exerciseIndex && video.setInfo) {
        const videoSetIndex = video.setInfo.setIndex;
        if (videoSetIndex === setIndex) {
          return video.file !== null && video.file !== undefined && video.file !== 'no-video';
        }
      }
      
      return false;
    });
    
    if (hasLocalVideo) {
      return true;
    }
    
    // PRIORITÉ 2: Vérifier dans completedSets seulement si aucune vidéo trouvée dans localVideos
    // ET vérifier que le setIndex correspond exactement
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    
    if (setData && typeof setData === 'object' && setData.hasVideo === true) {
      // Double vérification: s'assurer qu'une vidéo existe vraiment dans localVideos pour ce set spécifique
      const hasMatchingVideo = localVideos.some((video) => {
        const videoExerciseIndex = video.exerciseIndex ?? video.exerciseInfo?.exerciseIndex;
        const videoSetIndex = video.setIndex ?? video.setInfo?.setIndex;
        return videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex;
      });
      
      // Ne retourner true que si une vidéo correspond vraiment à ce set
      return hasMatchingVideo;
    }
    
    return false;
  };

  // Vérifier si le client a fait un choix pour cette série (vidéo uploadée OU "pas de vidéo")
  // Retourne: true si vidéo uploadée, 'no-video' si "pas de vidéo" choisi, false si aucun choix
  const hasVideoChoiceForSet = (setIndex) => {
    // PRIORITÉ 1: Vérifier dans localVideos
    const matchingVideo = localVideos.find((video) => {
      // Format 1: exerciseIndex et setIndex directs
      if (video.exerciseIndex === exerciseIndex && video.setIndex === setIndex) {
        return true;
      }
      
      // Format 2: via exerciseInfo et setInfo
      if (video.exerciseInfo && video.setInfo) {
        const videoExerciseIndex = video.exerciseInfo.exerciseIndex;
        const videoSetIndex = video.setInfo.setIndex;
        if (videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex) {
          return true;
        }
      }
      
      // Format 3: via exerciseIndex direct et setInfo
      if (video.exerciseIndex === exerciseIndex && video.setInfo) {
        const videoSetIndex = video.setInfo.setIndex;
        if (videoSetIndex === setIndex) {
          return true;
        }
      }
      
      return false;
    });
    
    if (matchingVideo) {
      // Si file est 'no-video', retourner 'no-video', sinon retourner true (vidéo uploadée)
      if (matchingVideo.file === 'no-video') {
        return 'no-video';
      }
      // Vérifier aussi dans completedSets pour videoStatus
      const key = `${exerciseIndex}-${setIndex}`;
      const setData = completedSets[key];
      if (setData && typeof setData === 'object' && setData.videoStatus === 'no-video') {
        return 'no-video';
      }
      return true; // Vidéo uploadée
    }
    
    // PRIORITÉ 2: Vérifier dans completedSets
    const key = `${exerciseIndex}-${setIndex}`;
    const setData = completedSets[key];
    
    if (setData && typeof setData === 'object') {
      if (setData.videoStatus === 'no-video') {
        return 'no-video';
      }
      if (setData.hasVideo === true) {
        return true;
      }
    }
    
    return false; // Aucun choix fait
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

  // Compter les vidéos manquantes pour l'exercice actuel
  const countMissingVideos = () => {
    if (!sets || !Array.isArray(sets)) return 0;
    
    let missingCount = 0;
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const set = sets[setIndex];
      // Si la série nécessite une vidéo
      if (set.video === true || set.video === 1 || set.video === 'true') {
        const key = `${exerciseIndex}-${setIndex}`;
        const setData = completedSets[key];
        
        // Vérifier si une vidéo a été uploadée ou si "pas de vidéo" a été choisi
        const hasVideoOrNoVideo = localVideos.some((video) => {
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
            return video.file !== null && video.file !== undefined;
          }
          
          return false;
        });
        
        const hasVideoInSetData = setData && (
          setData.hasVideo === true || 
          setData.videoStatus === 'no-video'
        );
        
        // Si aucune vidéo n'a été uploadée/choisie
        if (!hasVideoOrNoVideo && !hasVideoInSetData) {
          missingCount++;
        }
      }
    }
    return missingCount;
  };

  // Compter les RPE manquants pour l'exercice actuel uniquement
  // Principe : si le bouton RPE est vide (pas de valeur affichée), c'est un RPE manquant
  const countMissingRpe = () => {
    if (!sets || !Array.isArray(sets)) return 0;
    
    let missingCount = 0;
    // Parcourir toutes les séries de l'exercice actuel
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const key = `${exerciseIndex}-${setIndex}`;
      const setData = completedSets[key];
      
      // Obtenir le statut de la série
      const status = getSetStatus(setIndex);
      
      // Seulement les séries validées (completed) doivent avoir un RPE
      if (status === 'completed') {
        // Obtenir le RPE de la série - même logique que dans getRpeForSet
        const rpeRating = getRpeForSet(setIndex);
        
        // Si le bouton RPE serait vide (pas de valeur), c'est un RPE manquant
        // Le bouton affiche {rpeRating || ''}, donc si rpeRating est null/undefined, le bouton est vide
        if (!rpeRating || rpeRating === null || rpeRating === undefined) {
          missingCount++;
        }
      }
    }
    return missingCount;
  };

  return (
    <>
      <MissingVideoErrorModal />
      {createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-[5px]"
          onClick={handleClose}
        >
      <div 
        ref={modalRef}
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] text-white rounded-[27px] w-full max-w-[550px] max-h-[85vh] overflow-y-auto overflow-x-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header avec titre */}
        <div className="px-12 pt-8 pb-0">
          <div className="mb-6">
            {/* Navigation et titre */}
            <div className="flex items-center justify-start gap-4 mb-[7px]">
              {/* Titre aligné à gauche */}
              <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal text-left flex-1">
                {exercise.name}
              </h1>
            </div>
            <div className="flex flex-col gap-[15px] items-start w-full">
              {/* Tempo et Chaque côté - Affichés si définis par le coach */}
              {(exercise.tempo || exercise.per_side) && (
                <div className="flex flex-col gap-[15px] items-start">
                  <p className="text-[10px] font-light text-white/50">
                    {exercise.tempo ? `Tempo : ${exercise.tempo}` : ''}
                    {exercise.tempo && exercise.per_side ? ' | ' : ''}
                    {exercise.per_side ? 'Chaque côté' : ''}
                  </p>
                </div>
              )}
              
              {/* Points d'avancement - représentent les exercices de la séance */}
              {allExercises && allExercises.length > 0 && (
                <div className="flex items-center gap-2">
                  {allExercises.map((_, exIndex) => {
                    const isFinalized = isSpecificExerciseFinalized(exIndex);
                    const isCurrentExercise = exIndex === exerciseIndex;
                    // Le point est orange si c'est l'exercice actuel (même s'il n'est pas finalisé)
                    // ou si l'exercice est finalisé ET c'est l'exercice actuel
                    return (
                      <div
                        key={exIndex}
                        className={`w-[5px] h-[5px] rounded-full transition-colors duration-200 ${
                          isCurrentExercise ? 'bg-[#d4845a]' : isFinalized ? 'bg-white/50' : 'bg-white/30'
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
                    if (exerciseHasInfo) {
                      setIsInfoModalOpen(true);
                    }
                  }}
                  disabled={!exerciseHasInfo}
                  className={`w-5 h-5 flex items-center justify-center rounded-full transition-opacity ${
                    exerciseHasInfo 
                      ? 'hover:opacity-80 cursor-pointer' 
                      : 'cursor-not-allowed opacity-30'
                  }`}
                  title={exerciseHasInfo 
                    ? "Voir les instructions et la vidéo de l'exercice" 
                    : "Aucune information disponible pour cet exercice"}
                >
                  <Info 
                    className={`w-5 h-5 ${
                      !exerciseHasInfo 
                        ? 'text-white/10' 
                        : coachFeedback 
                          ? 'text-[#d4845a]' 
                          : 'text-white/25'
                    }`} 
                    strokeWidth={1.5} 
                  />
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
                    className={`w-5 h-5 ${studentComment ? 'text-[#d4845a]' : 'text-white/25'}`} 
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Commentaire coach */}
        <div className="px-12 mb-6">
          <div className="flex flex-col gap-[7px] items-start w-full">
            <p className="text-[10px] font-normal text-white/35 leading-normal">
              Commentaire coach :
            </p>
            {coachFeedback ? (
              <p className="text-[12px] text-[#d4845a] leading-normal whitespace-pre-wrap w-full">
                {coachFeedback}
              </p>
            ) : (
              <p className="text-[10px] text-white/25 leading-normal italic">
                Aucun commentaire pour le moment
              </p>
            )}
          </div>
        </div>

        {/* Liste des séries */}
        <div className="pl-6 pr-12 space-y-3 pb-6">
          {/* Headers - Positionnés au-dessus des séries */}
          <div className="flex items-center mb-2">
            <div className="w-[20px] flex-shrink-0 mr-1" />
            <div className="rounded-[5px] flex items-center px-[15px] pr-[30px] flex-1 min-w-[200px] max-w-[400px]">
              <div className="flex items-center w-full gap-3">
                <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                  <p className="text-[8px] font-normal text-white/25 leading-none">Charge (kg)</p>
                </div>
                <div className="w-[40px] flex justify-center items-center flex-shrink-0">
                  <p className="text-[8px] font-normal text-white/25 leading-none">Rep.</p>
                </div>
                <div className="flex-1 flex justify-center items-center gap-[15px]">
                  <div className="w-[17px] h-[17px]" />
                  <div className="w-[17px] h-[17px]" />
                </div>
                <div className="w-[24px] flex justify-center items-center flex-shrink-0">
                  <p className="text-[8px] font-normal text-white/25 leading-none text-center w-full">RPE</p>
                </div>
              </div>
            </div>
            <div className="w-[24px] flex-shrink-0 ml-[10px]" />
          </div>

          {/* Séries */}
          {sets && sets.map((set, setIndex) => {
            const status = getSetStatus(setIndex);
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';
            const hasVideo = hasVideoForSet(setIndex);
            const videoChoice = hasVideoChoiceForSet(setIndex); // 'no-video', true, or false
            const hasVideoOrNoVideo = hasVideo || videoChoice === 'no-video'; // True si vidéo uploadée OU "pas de vidéo" choisi
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
                  className="bg-white/10 rounded-[5px] flex items-center px-[15px] pr-[30px] py-[13px] flex-1 min-w-[200px] max-w-[400px] hover:bg-white/10 transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <div className="flex items-center w-full gap-3">
                    {/* Colonne Charge - Centrée */}
                    <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                      <span className="text-[15px] text-[#d4845a] leading-none">{weight}</span>
                    </div>
                    {/* Colonne Rep - Centrée */}
                    <div className="w-[40px] flex justify-center items-center flex-shrink-0">
                      <span className="text-[15px] text-white leading-none">{reps}</span>
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
                    <div className="w-[24px] flex justify-center items-center">
                      <div className="flex justify-center items-center w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isFailed) {
                              handleRpeClick(setIndex);
                            }
                          }}
                          disabled={isFailed}
                          className={`bg-white/5 border-[0.5px] border-white/25 rounded-[5px] w-[18px] h-[18px] flex items-center justify-center transition-colors ${
                            isFailed 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'cursor-pointer hover:bg-white/10'
                          }`}
                          title={isFailed ? "RPE non disponible pour une série en échec" : "Évaluer l'effort (RPE)"}
                        >
                          <span className={`text-[9px] font-medium leading-none ${
                            rpeRating ? 'text-[#d4845a]' : 'text-white/50'
                          }`}>
                            {rpeRating || ''}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Icône vidéo - À l'extérieur de la box - 4 états */}
                <div className="relative flex-shrink-0 ml-[10px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoEnabled && onVideoUpload) {
                        onVideoUpload(exerciseIndex, setIndex);
                      }
                    }}
                    disabled={!videoEnabled}
                    className={`w-[24px] h-[24px] min-w-[24px] max-w-[24px] flex items-center justify-center rounded-full transition-all duration-200 ${
                      // État 1: Coach ne demande pas de vidéo - visible mais disabled
                      !videoEnabled
                        ? 'bg-white/5 opacity-50 cursor-not-allowed'
                        : // État 2: Vidéo requise mais pas renseignée - orange
                        !hasVideoOrNoVideo
                        ? 'bg-[#d4845a] hover:bg-[#e87c3e] cursor-pointer'
                        : // État 3 & 4: Vidéo renseignée (uploadée ou "pas de vidéo") - grisé mais cliquable
                        'bg-white/10 hover:bg-white/20 cursor-pointer'
                    }`}
                    title={
                      !videoEnabled
                        ? "Vidéo non requise"
                        : hasVideo 
                        ? "Vidéo uploadée - Cliquez pour modifier" 
                        : videoChoice === 'no-video' 
                        ? "Pas de vidéo - Cliquez pour modifier" 
                        : "⚠️ Vidéo requise - Cliquez pour ajouter"
                    }
                  >
                    {/* Icône caméra barrée (utilisée pour les états 3 et 4, et état 1) */}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 3.75C0 3.35218 0.158035 2.97064 0.43934 2.68934C0.720644 2.40804 1.10218 2.25 1.5 2.25H7.125C7.48882 2.24996 7.84025 2.38214 8.11386 2.62195C8.38746 2.86175 8.56459 3.19282 8.61225 3.5535L10.9447 2.517C11.0589 2.46613 11.184 2.4446 11.3086 2.45436C11.4332 2.46413 11.5534 2.50488 11.6583 2.57292C11.7631 2.64096 11.8493 2.73412 11.909 2.84394C11.9687 2.95376 11.9999 3.07676 12 3.20175V8.79825C11.9999 8.92314 11.9686 9.04603 11.909 9.15576C11.8493 9.26549 11.7632 9.35859 11.6585 9.42661C11.5537 9.49463 11.4336 9.53541 11.3091 9.54526C11.1846 9.55511 11.0596 9.53371 10.9455 9.483L8.61225 8.4465C8.56459 8.80718 8.38746 9.13825 8.11386 9.37805C7.84025 9.61786 7.48882 9.75004 7.125 9.75H1.5C1.10218 9.75 0.720644 9.59196 0.43934 9.31066C0.158035 9.02936 0 8.64782 0 8.25V3.75ZM8.625 7.63125L11.25 8.79825V3.20175L8.625 4.36875V7.63125ZM1.5 3C1.30109 3 1.11032 3.07902 0.96967 3.21967C0.829018 3.36032 0.75 3.55109 0.75 3.75V8.25C0.75 8.44891 0.829018 8.63968 0.96967 8.78033C1.11032 8.92098 1.30109 9 1.5 9H7.125C7.32391 9 7.51468 8.92098 7.65533 8.78033C7.79598 8.63968 7.875 8.44891 7.875 8.25V3.75C7.875 3.55109 7.79598 3.36032 7.65533 3.21967C7.51468 3.07902 7.32391 3 7.125 3H1.5Z" 
                        fill={!videoEnabled ? "#9CA3AF" : !hasVideoOrNoVideo ? "white" : "#9CA3AF"} 
                        fillOpacity={!videoEnabled ? "0.4" : !hasVideoOrNoVideo ? "1" : "0.6"}
                      />
                      {/* Ligne de barré - affichée pour les états 1, 3 et 4 */}
                      {(!videoEnabled || hasVideoOrNoVideo) && (
                        <line 
                          x1="1" 
                          y1="1" 
                          x2="11" 
                          y2="11" 
                          stroke={!videoEnabled ? "#9CA3AF" : "#9CA3AF"} 
                          strokeWidth="1.5" 
                          strokeOpacity={!videoEnabled ? "0.4" : "0.6"} 
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  </button>
                  
                  {/* Indicateur en haut à droite */}
                  {videoEnabled && hasVideoOrNoVideo && (
                    <>
                      {/* État 3: Vidéo uploadée - Check vert */}
                      {hasVideo && (
                        <div className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-[#4ADE80] rounded-full flex items-center justify-center border border-white/20 !opacity-100" style={{ opacity: 1 }}>
                          <svg width="6" height="5" viewBox="0 0 6 5" fill="none" className="flex-shrink-0" style={{ opacity: 1 }}>
                            <path 
                              d="M1 2.5L2.5 4L5 1" 
                              stroke="white" 
                              strokeWidth="1.2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{ opacity: 1 }}
                            />
                          </svg>
                        </div>
                      )}
                      {/* État 4: "Pas de vidéo" choisi - Croix rouge */}
                      {videoChoice === 'no-video' && (
                        <div className="absolute -top-1 -right-1 w-[10px] h-[10px] bg-[#DA3336] rounded-full flex items-center justify-center border border-white/20 !opacity-100" style={{ opacity: 1 }}>
                          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="flex-shrink-0" style={{ opacity: 1 }}>
                            <path 
                              d="M1 1L5 5M5 1L1 5" 
                              stroke="white" 
                              strokeWidth="1.2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{ opacity: 1 }}
                            />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bouton fermer */}
        <div className="px-12 pb-8">
          <button
            onClick={handleClose}
            className="w-full h-[30px] rounded-[10px] bg-white/3 hover:bg-white/5 text-[10px] font-normal text-white/40 hover:text-white/75 transition-colors flex items-center justify-center border border-white/20 hover:border-white/30"
          >
            Fermer
          </button>
          
          {/* Messages informatifs */}
          {(countMissingVideos() > 0 || countMissingRpe() > 0) && (
            <div className="mt-3 flex flex-col gap-1 items-center">
              {countMissingVideos() > 0 && (
                <p className="text-[9px] font-medium leading-normal text-center" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  {countMissingVideos() === 1 
                    ? '1 vidéo manquante' 
                    : `${countMissingVideos()} vidéos manquantes`}
                </p>
              )}
              {countMissingRpe() > 0 && (
                <p className="text-[9px] font-medium leading-normal text-center" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  {countMissingRpe() === 1 
                    ? '1 RPE manquant' 
                    : `${countMissingRpe()} RPE manquants`}
                </p>
              )}
            </div>
          )}
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
        
        // Empêcher la fermeture par clic sur le backdrop
        const handleBackdropClick = (e) => {
          if (e.target === e.currentTarget) {
            // Ne rien faire - forcer l'utilisateur à choisir
            return;
          }
        };
        
        return createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[111] p-4"
            onClick={handleBackdropClick}
          >
            <div 
              className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rpe-title"
            >
              {/* Header */}
              <div className="flex items-center justify-center px-4 text-center" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
                <h2 id="rpe-title" className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">
                  RPE
                </h2>
              </div>

              {/* Content */}
              <div className="px-[25px] py-0 space-y-4">
                {/* Grille de boutons RPE - 2 lignes de 5 */}
                <div className="flex flex-col gap-[10px] items-center w-full">
                  {/* Première ligne : 1-5 */}
                  <div className="flex gap-[8px] items-center justify-center w-full">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRpeSelect(rating)}
                        className={`border rounded-full w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 ${
                          currentRpe === rating 
                            ? 'bg-[#d4845a] border-[#d4845a] shadow-sm' 
                            : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                        }`}
                      >
                        <span className={`text-[15px] font-normal leading-none ${
                          currentRpe === rating ? 'text-white' : 'text-white/75'
                        }`}>
                          {rating}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Deuxième ligne : 6-10 */}
                  <div className="flex gap-[8px] items-center justify-center w-full">
                    {[6, 7, 8, 9, 10].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRpeSelect(rating)}
                        className={`border rounded-full w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 ${
                          currentRpe === rating 
                            ? 'bg-[#d4845a] border-[#d4845a] shadow-sm' 
                            : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                        }`}
                      >
                        <span className={`text-[15px] font-normal leading-none ${
                          currentRpe === rating ? 'text-white' : 'text-white/75'
                        }`}>
                          {rating}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsRpeModalOpen(false);
                    setSelectedSetForRpe(null);
                  }}
                  className="flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-normal text-[13px] transition-colors"
                >
                  Fermer
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
