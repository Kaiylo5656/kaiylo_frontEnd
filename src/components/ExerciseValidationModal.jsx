import logger from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
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
  onWeightUpdate,
  onVideoUpload,
  coachFeedback,
  localVideos = [],
  allExercises = [],
  onExerciseChange,
  studentComment: initialStudentComment = '',
  onStudentComment,
  onCompleteSession
}) => {
  const { getAuthToken } = useAuth();
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [direction, setDirection] = useState(0);
  const [studentComment, setStudentComment] = useState(initialStudentComment);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isRpeModalOpen, setIsRpeModalOpen] = useState(false);
  const [selectedSetForRpe, setSelectedSetForRpe] = useState(null);
  const [studentWeights, setStudentWeights] = useState({}); // Store student weights locally
  const [fetchedDetails, setFetchedDetails] = useState(null);
  const modalRef = useRef(null);

  // Reset fetched details when exercise changes
  useEffect(() => {
    setFetchedDetails(null);
  }, [exercise?.id, exercise?.exerciseId, exercise?.exercise_id]);

  // Fetch exercise details to check if info exists
  useEffect(() => {
    const fetchDetails = async () => {
      if (!exercise) return;

      const hasDirectInstructions = exercise.instructions && exercise.instructions.trim().length > 0;
      const hasDirectDescription = exercise.description && exercise.description.trim().length > 0;
      const hasDirectVideo = (exercise.demoVideoURL && exercise.demoVideoURL.trim().length > 0) ||
        (exercise.demo_video_url && exercise.demo_video_url.trim().length > 0) ||
        (exercise.videoUrl && exercise.videoUrl.trim().length > 0) ||
        (exercise.video_url && exercise.video_url.trim().length > 0);

      const exerciseId = exercise.exerciseId || exercise.exercise_id || exercise.id;

      // If missing info but has ID, fetch
      if (exerciseId && (!hasDirectInstructions && !hasDirectDescription && !hasDirectVideo)) {
        try {
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(buildApiUrl(`/exercises/public/${exerciseId}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.exercise) {
              setFetchedDetails(data.exercise);
            }
          }
        } catch (error) {
          logger.error('Error fetching details:', error);
        }
      }
    };

    if (isOpen && exercise) {
      fetchDetails();
    }
  }, [isOpen, exercise, getAuthToken]);

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


  // Minimum swipe distance (in pixels)


  // Vérifier si l'exercice a des informations disponibles (instructions ou vidéo)
  // Le bouton sera actif seulement si des informations sont vraiment présentes
  const hasExerciseInfo = () => {
    if (!exercise) return false;

    // 1. Vérifier l'exercice direct
    const hasDirectInstructions = exercise.instructions &&
      typeof exercise.instructions === 'string' &&
      exercise.instructions.trim().length > 0;

    const hasDirectDescription = exercise.description &&
      typeof exercise.description === 'string' &&
      exercise.description.trim().length > 0;

    const hasDirectVideo = (exercise.demoVideoURL &&
      typeof exercise.demoVideoURL === 'string' &&
      exercise.demoVideoURL.trim().length > 0) ||
      (exercise.demo_video_url &&
        typeof exercise.demo_video_url === 'string' &&
        exercise.demo_video_url.trim().length > 0) ||
      (exercise.videoUrl &&
        typeof exercise.videoUrl === 'string' &&
        exercise.videoUrl.trim().length > 0) ||
      (exercise.video_url &&
        typeof exercise.video_url === 'string' &&
        exercise.video_url.trim().length > 0);

    if (hasDirectInstructions || hasDirectDescription || hasDirectVideo) {
      return true;
    }

    // 2. Vérifier les détails récupérés (fetchedDetails)
    if (fetchedDetails) {
      const hasFetchedInstructions = fetchedDetails.instructions &&
        typeof fetchedDetails.instructions === 'string' &&
        fetchedDetails.instructions.trim().length > 0;

      const hasFetchedDescription = fetchedDetails.description &&
        typeof fetchedDetails.description === 'string' &&
        fetchedDetails.description.trim().length > 0;

      const hasFetchedVideo = (fetchedDetails.demoVideoURL &&
        typeof fetchedDetails.demoVideoURL === 'string' &&
        fetchedDetails.demoVideoURL.trim().length > 0) ||
        (fetchedDetails.demoVideoUrl &&
          typeof fetchedDetails.demoVideoUrl === 'string' &&
          fetchedDetails.demoVideoUrl.trim().length > 0);

      if (hasFetchedInstructions || hasFetchedDescription || hasFetchedVideo) {
        return true;
      }
    }

    // Si toujours rien, le bouton reste grisé
    return false;
  };

  const exerciseHasInfo = hasExerciseInfo();

  if (!isOpen || !exercise) return null;

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

  // Gérer le clic sur le bouton RPE (seulement si coach ne demande pas RPE)
  const handleRpeClick = (setIndex) => {
    // Si le coach demande un RPE (useRir = true), ne pas ouvrir le modal RPE
    // L'élève doit saisir une charge à la place
    if (exercise.useRir) {
      return;
    }
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

  // Gérer la mise à jour de la charge saisie par l'élève (quand coach demande RPE)
  const handleWeightUpdate = (setIndex, weight) => {
    const key = `${exerciseIndex}-${setIndex}`;
    // Mettre à jour le state local
    setStudentWeights(prev => ({
      ...prev,
      [key]: weight
    }));
    // Sauvegarder dans completedSets via le callback parent
    if (onWeightUpdate) {
      onWeightUpdate(exerciseIndex, setIndex, weight);
    }
  };

  // Récupérer la charge saisie par l'élève (quand coach demande RPE)
  const getStudentWeightForSet = (setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    // Priorité 1: Vérifier dans studentWeights (state local)
    if (studentWeights[key]) {
      return studentWeights[key];
    }
    // Priorité 2: Vérifier dans completedSets (persisté)
    const setData = completedSets[key];
    if (setData && typeof setData === 'object' && 'studentWeight' in setData) {
      return setData.studentWeight || '';
    }
    return '';
  };

  // Initialiser studentWeights depuis completedSets quand l'exercice change
  useEffect(() => {
    if (!sets || !Array.isArray(sets)) return;

    const weightsFromCompletedSets = {};
    sets.forEach((_, setIndex) => {
      const key = `${exerciseIndex}-${setIndex}`;
      const setData = completedSets[key];
      if (setData && typeof setData === 'object' && 'studentWeight' in setData) {
        weightsFromCompletedSets[key] = setData.studentWeight || '';
      }
    });

    // Fusionner avec les valeurs existantes dans studentWeights
    if (Object.keys(weightsFromCompletedSets).length > 0) {
      setStudentWeights(prev => ({
        ...prev,
        ...weightsFromCompletedSets
      }));
    }
  }, [exerciseIndex, sets, completedSets]);

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

  // Vérifier si toutes les séries ont le même temps de repos et le récupérer
  const getRestTimeInfo = () => {
    if (!sets || sets.length === 0) return { isUnique: false, value: null, hasRest: false };
    const rests = sets.map(s => s.rest).filter(Boolean);
    if (rests.length === 0) return { isUnique: false, value: null, hasRest: false };
    const uniqueRests = [...new Set(rests)];
    const isUnique = uniqueRests.length === 1;
    return { isUnique, value: isUnique ? uniqueRests[0] : null, hasRest: true };
  };
  const restTimeInfo = getRestTimeInfo();

  // Compter les RPE/charges manquants pour l'exercice actuel uniquement
  // Si useRir === true : vérifier la charge (studentWeight)
  // Si useRir === false : vérifier le RPE (rpeRating)
  const countMissingRpe = () => {
    if (!sets || !Array.isArray(sets)) return 0;

    let missingCount = 0;
    // Parcourir toutes les séries de l'exercice actuel
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const key = `${exerciseIndex}-${setIndex}`;
      const setData = completedSets[key];

      // Obtenir le statut de la série
      const status = getSetStatus(setIndex);

      // Seulement les séries validées (completed) doivent avoir un RPE ou une charge
      if (status === 'completed') {
        if (exercise.useRir) {
          // Si coach demande RPE : vérifier la charge (studentWeight)
          const studentWeight = getStudentWeightForSet(setIndex);
          if (!studentWeight || studentWeight === '' || studentWeight === null || studentWeight === undefined) {
            missingCount++;
          }
        } else {
          // Si coach demande charge : vérifier le RPE
          const rpeRating = getRpeForSet(setIndex);
          if (!rpeRating || rpeRating === null || rpeRating === undefined) {
            missingCount++;
          }
        }
      }
    }
    return missingCount;
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      position: 'relative'
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      position: 'relative'
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      position: 'absolute',
      top: 0,
      width: '100%'
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity;
  };

  const handleNextExercise = () => {
    if (exerciseIndex < allExercises.length - 1 && onExerciseChange) {
      setDirection(1);
      onExerciseChange(exerciseIndex + 1);
    }
  };

  const handlePrevExercise = () => {
    if (exerciseIndex > 0 && onExerciseChange) {
      setDirection(-1);
      onExerciseChange(exerciseIndex - 1);
    }
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-[5px]"
          onClick={handleClose}
        >
          <div
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-[550px] h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Conteneur pour le swipe avec preview */}
            <div
              ref={modalRef}
              className="relative w-full h-full min-h-0 flex flex-col"
            >
              {/* Flex Container for Static Header + Animated Content */}
              <div className="flex flex-col flex-1 min-h-0 rounded-[27px] overflow-hidden">

                {/* STATIC HEADER: Title & Navigation */}
                <div className="px-12 pt-8 pb-0 z-10 text-white flex-shrink-0">
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-3 mb-[7px]">
                      <button
                        type="button"
                        onClick={handlePrevExercise}
                        disabled={exerciseIndex === 0}
                        className="flex items-center justify-center p-1 rounded-full transition-opacity touch-target disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none hover:opacity-100"
                        aria-label="Exercice précédent"
                      >
                        <ChevronLeft className="w-5 h-5 text-white/50 flex-shrink-0" aria-hidden />
                      </button>
                      <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal text-center select-none">
                        {exercise.name}
                      </h1>
                      <button
                        type="button"
                        onClick={handleNextExercise}
                        disabled={exerciseIndex >= (allExercises?.length ?? 1) - 1}
                        className="flex items-center justify-center p-1 rounded-full text-white/50 touch-target disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none hover:opacity-100"
                        aria-label="Exercice suivant"
                      >
                        <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ANIMATED CONTENT BODY - scrollable when many sets */}
                <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                  <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                      key={exerciseIndex}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={1}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = swipePower(offset.x, velocity.x);

                        if (swipe < -swipeConfidenceThreshold) {
                          handleNextExercise();
                        } else if (swipe > swipeConfidenceThreshold) {
                          handlePrevExercise();
                        }
                      }}
                      className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden text-white shadow-xl overscroll-contain"
                    >
                      <div className="px-6 pb-8 pt-2">
                        <div className="flex flex-col gap-[15px] items-center w-full">
                          {/* Tempo et Charge par main - Affichés si définis par le coach */}
                          {(exercise.tempo || exercise.per_side) && (
                            <div className="flex flex-col gap-[15px] items-center w-full">
                              <p className="text-[12px] font-light text-white/50">
                                {exercise.tempo ? `Tempo : ${exercise.tempo}` : ''}
                                {exercise.tempo && exercise.per_side ? ' | ' : ''}
                                {exercise.per_side ? 'Charge par main' : ''}
                              </p>
                            </div>
                          )}

                          {/* Points d'avancement - représentent les exercices de la séance */}
                          {allExercises && allExercises.length > 0 && (
                            <div className="flex items-center justify-center gap-2 w-full">
                              {allExercises.map((_, exIndex) => {
                                const isFinalized = isSpecificExerciseFinalized(exIndex);
                                const isCurrentExercise = exIndex === exerciseIndex;
                                return (
                                  <div
                                    key={exIndex}
                                    className={`w-[5px] h-[5px] rounded-full transition-colors duration-200 ${isCurrentExercise ? 'bg-[#d4845a]' : isFinalized ? 'bg-white/50' : 'bg-white/30'
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
                              className={`w-5 h-5 flex items-center justify-center rounded-full transition-opacity ${exerciseHasInfo
                                ? 'hover:opacity-80 cursor-pointer'
                                : 'cursor-not-allowed'
                                }`}
                              title={exerciseHasInfo
                                ? "Voir les instructions et la vidéo de l'exercice"
                                : "Aucune information disponible pour cet exercice"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                className={`w-5 h-5 ${exerciseHasInfo
                                  ? 'text-[#d4845a]'
                                  : 'text-white/25'
                                  }`}
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM224 160a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-8 64l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCommentModalOpen(true);
                              }}
                              className="cursor-pointer relative w-5 h-5 flex items-center justify-center hover:opacity-80 transition-opacity"
                              title="Ajouter un commentaire pour le coach"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                className={`w-5 h-5 ${studentComment ? 'text-[#d4845a]' : 'text-white/25'}`}
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M51.9 384.9C19.3 344.6 0 294.4 0 240 0 107.5 114.6 0 256 0S512 107.5 512 240 397.4 480 256 480c-36.5 0-71.2-7.2-102.6-20L37 509.9c-3.7 1.6-7.5 2.1-11.5 2.1-14.1 0-25.5-11.4-25.5-25.5 0-4.3 1.1-8.5 3.1-12.2l48.8-89.4zm37.3-30.2c12.2 15.1 14.1 36.1 4.8 53.2l-18 33.1 58.5-25.1c11.8-5.1 25.2-5.2 37.1-.3 25.7 10.5 54.2 16.4 84.3 16.4 117.8 0 208-88.8 208-192S373.8 48 256 48 48 136.8 48 240c0 42.8 15.1 82.4 41.2 114.7z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Commentaire coach */}
                        <div className="mt-8 mb-6 flex flex-col items-center justify-center">
                          <div className="flex flex-col gap-[7px] items-center text-center w-full">
                            <p className="text-[10px] font-normal text-white/35 leading-normal">
                              Commentaire coach :
                            </p>
                            {coachFeedback ? (
                              <p className="text-[13px] font-medium text-[#d4845a] leading-normal whitespace-pre-wrap w-full">
                                {coachFeedback}
                              </p>
                            ) : (
                              <p className="text-[10px] text-white/25 leading-normal">
                                Aucun commentaire pour le moment
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Liste des séries */}
                        <div className="space-y-[10px] pb-6"> {/* Removed pl-6 pr-12 because parent has padding */}
                          {/* Headers - Positionnés au-dessus des séries */}
                          <div className="flex items-center mb-2">
                            <div className="w-[20px] flex-shrink-0 mr-1" />
                            <div className="rounded-[5px] flex items-center px-[15px] pr-[25px] flex-1 min-w-[200px] max-w-[400px]">
                              <div className="flex items-center w-full gap-3">
                                <div className="w-[42px] flex justify-center items-center flex-shrink-0">
                                  <p className="text-[8px] font-normal text-white/25 leading-none">
                                    {(() => {
                                      const repType = sets[0]?.repType || 'reps';
                                      if (repType === 'amrap') {
                                        return 'AMRAP';
                                      } else if (repType === 'hold') {
                                        return 'Hold';
                                      }
                                      return 'Rep.';
                                    })()}
                                  </p>
                                </div>
                                <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                                  <p className="text-[8px] font-normal text-white/25 leading-none">{exercise.useRir ? 'RPE' : 'Charge'}</p>
                                </div>
                                <div className="flex-1 flex justify-center items-center gap-[15px]">
                                  <div className="w-[17px] h-[17px]" />
                                  <div className="w-[17px] h-[17px]" />
                                </div>
                                <div className={`${exercise.useRir ? 'w-[45px]' : 'w-[24px]'} flex justify-center items-center flex-shrink-0`}>
                                  <p className="text-[8px] font-normal text-white/25 leading-none text-center w-full">
                                    {exercise.useRir ? 'Charge' : 'RPE'}
                                  </p>
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
                            const weight = set.weight ?? 0;
                            const repType = set.repType || 'reps';
                            // Handle different rep types
                            let reps = '?';
                            if (repType === 'amrap') {
                              reps = 'AMRAP';
                            } else if (repType === 'hold') {
                              // For hold, display with 's' suffix if it's not already there and not MM:SS format
                              const repsValue = set.reps || '';
                              if (repsValue.includes(':')) {
                                reps = repsValue; // MM:SS format
                              } else {
                                reps = repsValue ? (repsValue.endsWith('s') ? repsValue : `${repsValue}s`) : '0s';
                              }
                            } else {
                              reps = set.reps || '?';
                            }
                            const videoEnabled = set.video === true || set.video === 1 || set.video === 'true';
                            const rpeRating = getRpeForSet(setIndex);
                            const restTime = set.rest; // Temps de repos configuré par le coach

                            return (
                              <React.Fragment key={setIndex}>
                                <div className="flex items-center">
                                  {/* Numéro de série - À l'extérieur de la box */}
                                  <span className="text-[10px] text-white/50 w-[20px] flex-shrink-0 mr-1">{setNumber}</span>
                                  <div
                                    className="bg-white/10 rounded-[5px] flex items-center pl-[15px] pr-[25px] py-[13px] flex-1 min-w-[200px] max-w-[400px] hover:bg-white/10 transition-colors"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                  >
                                    <div className="flex items-center w-full gap-3">
                                      {/* Colonne Rep - Centrée */}
                                      <div className="w-[42px] flex justify-center items-center flex-shrink-0 overflow-hidden">
                                        <span className="text-white leading-none whitespace-nowrap" style={{ fontSize: reps.length > 8 ? '10px' : reps.length > 6 ? '11px' : reps === 'AMRAP' ? '12px' : '15px' }}>{reps}</span>
                                      </div>
                                      {/* Colonne Charge/RPE - Centrée */}
                                      <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                                        {exercise.useRir ? (
                                          // Mode RPE : afficher le RPE demandé (stocké dans set.weight en mode RPE)
                                          <span className="text-[15px] text-[#d4845a] leading-none">
                                            {weight || '-'}
                                          </span>
                                        ) : (
                                          // Mode Charge : afficher le poids en kg
                                          <span className="text-[15px] text-[#d4845a] leading-none flex items-center gap-[3px]">
                                            {weight}<span className="text-[12px] font-normal">kg</span>
                                          </span>
                                        )}
                                      </div>
                                      {/* Boutons de validation - Centrés */}
                                      <div className="flex-1 flex justify-center items-center gap-[15px]">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleValidateSet(setIndex);
                                          }}
                                          className={`w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] transition-all duration-200 ${isCompleted ? 'bg-[#d4845a]' : 'bg-white/15'
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
                                          className={`w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] transition-all duration-200 ${isFailed ? 'bg-[#d4845a]' : 'bg-white/15'
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
                                      {/* Bouton RPE / Input Charge - Centré */}
                                      <div className={`${exercise.useRir ? 'w-[45px]' : 'w-[24px]'} flex justify-center items-center flex-shrink-0`}>
                                        <div className="flex justify-center items-center w-full">
                                          {exercise.useRir ? (
                                            // Si coach demande RPE : l'élève saisit une charge
                                            <div className="relative flex items-center gap-[2px]">
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                value={getStudentWeightForSet(setIndex) || ''}
                                                onChange={(e) => {
                                                  let raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                                                  // One decimal separator only, keep as comma for display
                                                  const parts = raw.split('.');
                                                  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
                                                  if (parts.length >= 2) {
                                                    raw = parts[0].slice(0, 3) + '.' + parts[1].slice(0, 1);
                                                  } else {
                                                    raw = raw.slice(0, 3);
                                                  }
                                                  const displayValue = raw.replace('.', ',');
                                                  handleWeightUpdate(setIndex, displayValue || '');
                                                }}
                                                onKeyDown={(e) => {
                                                  const v = e.target.value;
                                                  const hasComma = /,/.test(v);
                                                  // Allow digits
                                                  if (/^\d$/.test(e.key)) {
                                                    if (hasComma) {
                                                      const afterComma = v.split(',')[1] || '';
                                                      if (afterComma.length >= 1) e.preventDefault();
                                                    } else {
                                                      if (v.replace(/\D/g, '').length >= 3) e.preventDefault();
                                                    }
                                                    return;
                                                  }
                                                  if (e.key === ',' || e.key === '.') {
                                                    if (hasComma || v.length === 0) e.preventDefault();
                                                    return;
                                                  }
                                                  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
                                                  if (allowedKeys.includes(e.key)) return;
                                                  e.preventDefault();
                                                }}
                                                disabled={!isCompleted}
                                                className={`bg-transparent border-0 border-b-[0.5px] border-white/25 rounded-none w-[32px] min-w-[32px] h-[18px] text-[10px] font-semibold text-center transition-colors focus:outline-none focus:border-[#d4845a] ${!isCompleted
                                                  ? 'opacity-50 cursor-not-allowed text-white/50'
                                                  : 'cursor-text text-[#d4845a]'
                                                  }`}
                                                style={{
                                                  padding: '0',
                                                  fontSize: '10px',
                                                  lineHeight: 1
                                                }}
                                                placeholder=""
                                                maxLength={5}
                                                title={!isCompleted ? "Validez d'abord votre série pour saisir la charge" : "Saisir la charge (kg) - 3 chiffres, virgule pour décimales (ex. 21,5)"}
                                              />
                                              <span className="text-[8px] text-white/25 font-normal leading-none">kg</span>
                                            </div>
                                          ) : (
                                            // Si coach demande charge : l'élève saisit un RPE
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isCompleted) {
                                                  handleRpeClick(setIndex);
                                                }
                                              }}
                                              disabled={!isCompleted}
                                              className={`bg-white/5 border-[0.5px] border-white/25 rounded-[5px] w-[18px] h-[18px] flex items-center justify-center transition-colors ${!isCompleted
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer hover:bg-white/10'
                                                }`}
                                              title={!isCompleted ? "Validez d'abord votre série pour évaluer l'effort (RPE)" : "Évaluer l'effort (RPE)"}
                                            >
                                              <span className={`text-[9px] font-medium leading-none ${rpeRating ? 'text-[#d4845a]' : 'text-white/50'
                                                }`}>
                                                {rpeRating || ''}
                                              </span>
                                            </button>
                                          )}
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
                              </React.Fragment>
                            );
                          })}
                          {/* Repos - affiché sous les séries : "Repos entre chaque série" si identique, sinon "Repos série 1 : XX · série 2 : XX" */}
                          {restTimeInfo.hasRest && (
                            <div className="flex items-center justify-center mt-[8px] pl-6 pr-12">
                              <span className="text-[10px] font-light text-white/40">
                                {restTimeInfo.isUnique
                                  ? `Repos entre chaque série : ${restTimeInfo.value}`
                                  : `Repos ${sets
                                    .map((s, i) => (s.rest ? `série ${i + 1} : ${s.rest}` : null))
                                    .filter(Boolean)
                                    .join(' · ')}`}
                              </span>
                            </div>
                          )}

                        </div>

                        {/* Bouton fermer - juste sous le dernier exercice */}
                        <div className="mt-4 px-0 pb-8">
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
                                  {exercise.useRir ? (
                                    countMissingRpe() === 1
                                      ? '1 charge manquante'
                                      : `${countMissingRpe()} charges manquantes`
                                  ) : (
                                    countMissingRpe() === 1
                                      ? '1 RPE manquant'
                                      : `${countMissingRpe()} RPE manquants`
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
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
        exercise={fetchedDetails ? { ...exercise, ...fetchedDetails } : exercise}
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
                        className={`border rounded-full w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 ${currentRpe === rating
                          ? 'bg-[#d4845a] border-[#d4845a] shadow-sm'
                          : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                          }`}
                      >
                        <span className={`text-[15px] font-normal leading-none ${currentRpe === rating ? 'text-white' : 'text-white/75'
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
                        className={`border rounded-full w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 ${currentRpe === rating
                          ? 'bg-[#d4845a] border-[#d4845a] shadow-sm'
                          : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                          }`}
                      >
                        <span className={`text-[15px] font-normal leading-none ${currentRpe === rating ? 'text-white' : 'text-white/75'
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
