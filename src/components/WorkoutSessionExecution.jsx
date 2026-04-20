import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, CheckCircle, XCircle, Video, Play, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import WorkoutVideoUploadModal from './WorkoutVideoUploadModal';
import BackgroundUploadIndicator from './BackgroundUploadIndicator';
import SessionCompletionModal from './SessionCompletionModal';
import VideoProcessingModal from './VideoProcessingModal'; // Import the new modal
import ExerciseValidationModal from './ExerciseValidationModal'; // Import the exercise validation modal
import LeaveSessionWarningModal from './LeaveSessionWarningModal'; // Import the leave warning modal
import MissingVideosWarningModal from './MissingVideosWarningModal'; // Import the missing videos warning modal
import { buildApiUrl, getApiBaseUrlWithApi } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useWorkoutSession } from './MainLayout';
import { safeGetItem, safeSetItem, safeRemoveItem, isStorageAvailable } from '../utils/storage';
import axios from 'axios';
import logger from '../utils/logger';
import { ExerciseSummaryPreview } from './ExerciseSummaryPreview';

const WorkoutSessionExecution = ({ session, onBack, onCompleteSession, shouldCloseCompletionModal = false, omitAmbientBackground = false, readOnly = false, isActive = true }) => {
  const { getAuthToken, refreshAuthToken, user } = useAuth();
  const { setIsWorkoutSessionOpen } = useWorkoutSession();
  const [completedSets, setCompletedSets] = useState({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState({}); // Track current set for each exercise
  const [selectedSetForVideo, setSelectedSetForVideo] = useState({}); // Track which set is selected for video upload per exercise
  const [videoUploadExerciseIndex, setVideoUploadExerciseIndex] = useState(null); // Track exercise index when opening video modal
  const [selectedSetIndex, setSelectedSetIndex] = useState({}); // Track which set is currently selected for each exercise
  const [sessionStatus, setSessionStatus] = useState('in_progress'); // 'in_progress', 'completed'
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); // Video upload modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Session completion modal state
  const [isValidatingSession, setIsValidatingSession] = useState(false); // Track if session validation is in progress
  const [localVideos, setLocalVideos] = useState([]); // Store videos locally until session completion
  const [isUploadingVideos, setIsUploadingVideos] = useState(false); // Track video upload state - can be reused for the new modal
  const [uploadProgress, setUploadProgress] = useState(null); // Track upload progress
  const [isVideoProcessingModalOpen, setIsVideoProcessingModalOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isExerciseValidationModalOpen, setIsExerciseValidationModalOpen] = useState(false);
  const [selectedExerciseForValidation, setSelectedExerciseForValidation] = useState(null);
  const [isLeaveWarningModalOpen, setIsLeaveWarningModalOpen] = useState(false); // Modal d'avertissement pour quitter
  const [isMissingVideosModalOpen, setIsMissingVideosModalOpen] = useState(false); // Modal d'avertissement pour vidéos manquantes
  const [pendingExerciseChange, setPendingExerciseChange] = useState(null); // Stocker le changement d'exercice en attente
  const [pendingSessionCompletion, setPendingSessionCompletion] = useState(false); // Flag pour validation de séance en attente
  const [exerciseComments, setExerciseComments] = useState({}); // Store student comments for each exercise
  const [sessionVideos, setSessionVideos] = useState([]); // Store videos from API to get coach feedback
  const [dotPositions, setDotPositions] = useState({});
  const [isSessionStarted, setIsSessionStarted] = useState(false); // Track if the session has been started
  const isReadOnlySession = readOnly || session?.status === 'completed';
  const exerciseCardRefs = useRef([]);
  const exerciseListRef = useRef(null);
  const hasRestoredProgress = useRef(false); // Flag to track if progress has been restored
  const isRestoringProgress = useRef(false); // Flag to prevent saving during restoration
  const lastRestoredSessionId = useRef(null); // Track which session was last restored
  const restoreTimeoutRef = useRef(null); // Ref to store timeout ID
  const lastFetchedVideosAssignmentId = useRef(null); // Guard against duplicate video fetches
  const historyEntryAdded = useRef(false); // Track if history entry was added for back button interception
  const hasHydratedReadOnlyData = useRef(false);

  // Show/hide Header and BottomNavBar when component mounts/unmounts
  useEffect(() => {
    setIsWorkoutSessionOpen(true);
    return () => {
      setIsWorkoutSessionOpen(false);
    };
  }, [setIsWorkoutSessionOpen]);

  // Close completion modal when requested from parent
  useEffect(() => {
    if (shouldCloseCompletionModal) {
      setIsCompletionModalOpen(false);
    }
  }, [shouldCloseCompletionModal]);

  // Get exercises from the correct data structure
  const exercises = session?.workout_sessions?.exercises || session?.exercises || [];

  // Superset range utility: given an exercise index, find the start and end of its superset group
  const getSupersetRange = (exArr, index) => {
    let start = index;
    while (start > 0 && exArr[start - 1]?.linkedToNext) start--;
    let end = index;
    while (end < exArr.length - 1 && exArr[end]?.linkedToNext) end++;
    return { start, end };
  };

  // Calculate estimated duration: each exercise = 10 minutes
  const calculateEstimatedDuration = () => {
    const totalMinutes = exercises.length * 10;
    if (totalMinutes === 0) return '0min';

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  const estimatedDuration = calculateEstimatedDuration();

  // Generate a unique storage key for this session (memoized)
  const sessionId = React.useMemo(() => {
    return session?.id || session?.workout_sessions?.id || session?.assignment_id;
  }, [session]);

  const storageKey = React.useMemo(() => {
    return sessionId ? `workout_progress_${sessionId}` : null;
  }, [sessionId]);

  useEffect(() => {
    if (!isReadOnlySession || !sessionId || hasHydratedReadOnlyData.current) {
      return;
    }

    const hydratedCompletedSets = {};
    const hydratedComments = {};

    exercises.forEach((exercise, exerciseIndex) => {
      const studentComment = exercise?.student_comment ?? exercise?.comment;
      if (studentComment) {
        hydratedComments[exerciseIndex] = studentComment;
      }

      (exercise?.sets || []).forEach((set, setIndex) => {
        const key = `${exerciseIndex}-${setIndex}`;
        const nextSetData = {};

        const status = set?.validation_status;
        if (status === 'completed' || status === 'failed') {
          nextSetData.status = status;
        }

        const rpeRating = set?.rpe_rating ?? set?.rpeRating ?? set?.rpe;
        if (rpeRating !== null && rpeRating !== undefined && rpeRating !== '') {
          nextSetData.rpeRating = rpeRating;
        }

        const studentWeight = set?.student_weight ?? set?.studentWeight;
        if (studentWeight !== null && studentWeight !== undefined && studentWeight !== '') {
          nextSetData.studentWeight = studentWeight;
        }

        if (Object.keys(nextSetData).length > 0) {
          hydratedCompletedSets[key] = nextSetData;
        }
      });
    });

    setCompletedSets(hydratedCompletedSets);
    setExerciseComments(hydratedComments);
    setIsSessionStarted(true);
    setSessionStatus('completed');
    setCurrentExerciseIndex(0);
    setCurrentSetIndex({ 0: 0 });
    setSelectedSetIndex({ 0: 0 });
    hasHydratedReadOnlyData.current = true;
  }, [isReadOnlySession, sessionId, exercises]);

  useEffect(() => {
    hasHydratedReadOnlyData.current = false;
  }, [sessionId]);

  // Helper function to save progress to localStorage
  const saveProgressToStorage = React.useCallback((progressData) => {
    if (!storageKey) return;
    try {
      // Use safe storage function to handle contexts where localStorage is not available
      const success = safeSetItem(storageKey, JSON.stringify({
        ...progressData,
        savedAt: new Date().toISOString()
      }));
      if (!success) {
        logger.warn('⚠️ Could not save progress to localStorage (storage not available)');
      }
    } catch (error) {
      logger.error('Error saving progress to localStorage:', error);
    }
  }, [storageKey]);

  // Helper function to load progress from localStorage
  const loadProgressFromStorage = React.useCallback(() => {
    if (!storageKey) return null;
    try {
      // Use safe storage function to handle contexts where localStorage is not available
      const saved = safeGetItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      logger.error('Error loading progress from localStorage:', error);
    }
    return null;
  }, [storageKey]);

  // Helper function to clear progress from localStorage
  const clearProgressFromStorage = React.useCallback(() => {
    if (!storageKey) return;
    try {
      // Use safe storage function to handle contexts where localStorage is not available
      safeRemoveItem(storageKey);
    } catch (error) {
      logger.error('Error clearing progress from localStorage:', error);
    }
  }, [storageKey]);

  // Gérer l'avertissement avant de quitter la page (fermeture d'onglet, navigation)
  useEffect(() => {
    if (isReadOnlySession) {
      return;
    }
    // Ne pas afficher l'avertissement si on est encore sur la page aperçu
    if (!isSessionStarted) {
      return;
    }

    const hasProgress = Object.keys(completedSets).length > 0 ||
      currentExerciseIndex > 0 ||
      Object.keys(exerciseComments).length > 0 ||
      localVideos.length > 0;

    if (!hasProgress) {
      return; // Pas besoin d'avertir si pas de progression
    }

    const handleBeforeUnload = (e) => {
      // La progression est déjà sauvegardée automatiquement via localStorage
      // Mais on avertit quand même l'utilisateur
      e.preventDefault();
      e.returnValue = ''; // Chrome nécessite returnValue
      return ''; // Pour les autres navigateurs
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isReadOnlySession, isSessionStarted, completedSets, currentExerciseIndex, exerciseComments, localVideos]);

  // Load saved progress on mount or when session changes (only once per session)
  useEffect(() => {
    if (isReadOnlySession) {
      return;
    }
    if (!sessionId || !storageKey) {
      return;
    }

    // Check if we've already restored for this session
    if (lastRestoredSessionId.current === sessionId && hasRestoredProgress.current) {
      // Already restored for this session, but check if flag is stuck
      if (isRestoringProgress.current && restoreTimeoutRef.current === null) {
        // Flag is stuck, reset it
        logger.warn('⚠️ isRestoringProgress flag stuck after restoration, resetting...');
        isRestoringProgress.current = false;
      }
      logger.debug('⏭️ Skipping restoration - already restored for session:', sessionId);
      return;
    }

    logger.debug('🔄 Starting restoration check for session:', sessionId, {
      lastRestoredSessionId: lastRestoredSessionId.current,
      hasRestoredProgress: hasRestoredProgress.current
    });

    // If session changed, reset flags and clear any pending timeout
    if (lastRestoredSessionId.current !== sessionId && lastRestoredSessionId.current !== null) {
      hasRestoredProgress.current = false;
      isRestoringProgress.current = false;
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
        restoreTimeoutRef.current = null;
      }
    }

    // Prevent saving during restoration
    isRestoringProgress.current = true;

    // Load saved progress synchronously to avoid race conditions
    try {
      const saved = safeGetItem(storageKey);
      if (saved) {
        const savedProgress = JSON.parse(saved);
        logger.debug('📦 Restoring saved progress for session:', sessionId);
        logger.debug('📦 Progress details:', {
          currentExerciseIndex: savedProgress.currentExerciseIndex,
          completedSetsKeys: Object.keys(savedProgress.completedSets || {}),
          currentSetIndex: savedProgress.currentSetIndex,
          selectedSetIndex: savedProgress.selectedSetIndex,
          exerciseCommentsKeys: Object.keys(savedProgress.exerciseComments || {})
        });

        // Restore all states directly (we control restoration with hasRestoredProgress flag)
        if (savedProgress.completedSets) {
          logger.debug('✅ Restoring completedSets:', savedProgress.completedSets);
          setCompletedSets(savedProgress.completedSets);
        }
        if (savedProgress.currentExerciseIndex !== undefined) {
          logger.debug('✅ Restoring currentExerciseIndex:', savedProgress.currentExerciseIndex);
          setCurrentExerciseIndex(savedProgress.currentExerciseIndex);
        }
        if (savedProgress.currentSetIndex) {
          logger.debug('✅ Restoring currentSetIndex:', savedProgress.currentSetIndex);
          setCurrentSetIndex(savedProgress.currentSetIndex);
        }
        if (savedProgress.selectedSetIndex) {
          logger.debug('✅ Restoring selectedSetIndex:', savedProgress.selectedSetIndex);
          setSelectedSetIndex(savedProgress.selectedSetIndex);
        }
        if (savedProgress.exerciseComments) {
          logger.debug('✅ Restoring exerciseComments:', savedProgress.exerciseComments);
          setExerciseComments(savedProgress.exerciseComments);
        }
        // Restaurer les métadonnées des vidéos (sans les fichiers)
        // Cela permet à WorkoutVideoUploadModal de savoir qu'une vidéo a été enregistrée
        if (savedProgress.videoMetadata && savedProgress.videoMetadata.length > 0) {
          logger.debug('📹 Restoring video metadata:', savedProgress.videoMetadata.length, 'videos');
          const restoredVideos = savedProgress.videoMetadata.map(metadata => ({
            exerciseIndex: metadata.exerciseIndex,
            setIndex: metadata.setIndex,
            rpeRating: metadata.rpeRating,
            comment: metadata.comment,
            // Si "pas de vidéo" était choisi, restaurer avec 'no-video'
            // Sinon, mettre null pour indiquer qu'une vidéo était là mais ne peut pas être restaurée
            file: metadata.isNoVideo ? 'no-video' : null,
            exerciseInfo: {
              exerciseName: exercises[metadata.exerciseIndex]?.name || 'Exercice',
              exerciseId: exercises[metadata.exerciseIndex]?.exerciseId,
              exerciseIndex: metadata.exerciseIndex,
              sessionId: session?.id,
              coachId: session?.coach_id,
              assignmentId: session?.assignment_id || session?.id
            },
            setInfo: (() => {
              const ex = exercises[metadata.exerciseIndex];
              const set = ex?.sets?.[metadata.setIndex];
              const setWeight = set?.weight || 0;
              const setReps = set?.reps || 0;
              if (ex?.useRir) {
                const key = `${metadata.exerciseIndex}-${metadata.setIndex}`;
                const setData = savedProgress.completedSets?.[key];
                return {
                  setIndex: metadata.setIndex,
                  setNumber: metadata.setIndex + 1,
                  weight: (setData && typeof setData === 'object' && setData.studentWeight) || 0,
                  reps: setReps,
                  rpe: setWeight
                };
              }
              return {
                setIndex: metadata.setIndex,
                setNumber: metadata.setIndex + 1,
                weight: setWeight,
                reps: setReps
              };
            })(),
            timestamp: new Date().toISOString()
          }));
          setLocalVideos(restoredVideos);

          // Restaurer le RPE dans completedSets et réinitialiser l'état hasVideo pour les vidéos qui ne peuvent pas être restaurées
          // Cela permet à l'étudiant de re-uploader la vidéo
          setCompletedSets(prev => {
            const updated = { ...prev };
            let hasResetVideos = false;

            restoredVideos.forEach(video => {
              const key = `${video.exerciseIndex}-${video.setIndex}`;
              const currentSetData = updated[key];

              // Restaurer le RPE dans completedSets
              if (video.rpeRating !== null && video.rpeRating !== undefined) {
                updated[key] = typeof currentSetData === 'object' && currentSetData !== null
                  ? { ...currentSetData, rpeRating: video.rpeRating }
                  : { rpeRating: video.rpeRating };
              }

              // Si la vidéo n'a pas de fichier (null) et n'est pas "no-video", 
              // cela signifie qu'elle ne peut pas être restaurée
              if (video.file === null) {
                if (updated[key] && typeof updated[key] === 'object') {
                  // Réinitialiser hasVideo et videoStatus pour permettre un nouvel upload
                  updated[key] = {
                    ...updated[key],
                    hasVideo: false,
                    videoStatus: undefined
                  };
                  hasResetVideos = true;
                  logger.debug(`🔄 Réinitialisation de l'état vidéo pour l'exercice ${video.exerciseIndex}, série ${video.setIndex}`);
                }
              }
            });

            if (hasResetVideos) {
              logger.debug('⚠️ Des vidéos étaient enregistrées mais les fichiers ne peuvent pas être restaurés. L\'état a été réinitialisé pour permettre un nouvel upload.');
            }

            return updated;
          });
        }
      } else {
        logger.debug('📭 No saved progress found for session:', sessionId);
      }
    } catch (error) {
      logger.error('Error loading progress from localStorage:', error);
    }

    // Mark as restored immediately
    hasRestoredProgress.current = true;
    lastRestoredSessionId.current = sessionId;

    // Clear any existing timeout
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }

    // Reset the flag immediately after a short delay to allow React to process state updates
    // Use a simple setTimeout instead of requestAnimationFrame for more reliable execution
    restoreTimeoutRef.current = setTimeout(() => {
      isRestoringProgress.current = false;
      restoreTimeoutRef.current = null;
      logger.debug('✅ Progress restoration complete, saving enabled');
    }, 150);

    // Safety mechanism: also reset the flag after a longer delay to ensure it's never stuck
    setTimeout(() => {
      if (isRestoringProgress.current) {
        logger.warn('⚠️ Safety: Forcing isRestoringProgress to false after 1 second');
        isRestoringProgress.current = false;
        if (restoreTimeoutRef.current) {
          clearTimeout(restoreTimeoutRef.current);
          restoreTimeoutRef.current = null;
        }
      }
    }, 1000);

    // Fetch videos from API for this session (after localStorage restoration)
    // This will merge uploaded videos from Supabase with local videos
    // Guard: only fetch once per assignmentId to avoid hammering the API on every exercises update
    if (sessionId && exercises && exercises.length > 0) {
      const assignmentId = session?.assignment_id || session?.id;
      if (assignmentId && lastFetchedVideosAssignmentId.current !== assignmentId) {
        lastFetchedVideosAssignmentId.current = assignmentId;
        setTimeout(() => {
          fetchSessionVideosFromAPI(assignmentId);
        }, 300);
      }
    }
  }, [isReadOnlySession, sessionId, storageKey, session, exercises]);

  useEffect(() => {
    if (!isReadOnlySession || !sessionId || !exercises || exercises.length === 0) {
      return;
    }
    const assignmentId = session?.assignment_id || session?.id;
    if (assignmentId && lastFetchedVideosAssignmentId.current !== assignmentId) {
      lastFetchedVideosAssignmentId.current = assignmentId;
      fetchSessionVideosFromAPI(assignmentId);
    }
  }, [isReadOnlySession, sessionId, session, exercises]);

  // Function to fetch videos from API for this session
  const fetchSessionVideosFromAPI = React.useCallback(async (assignmentId) => {
    if (!assignmentId) return;

    // Wait for exercises to be available
    if (!exercises || exercises.length === 0) {
      logger.debug('⏳ Waiting for exercises to load before fetching videos...');
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/student-videos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { assignmentId }
        }
      );

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        logger.debug('📹 Fetched videos from API for session:', assignmentId, response.data.data.length, 'videos');
        logger.debug('📊 Available exercises:', exercises.map((ex, idx) => ({ index: idx, name: ex.name, id: ex.exerciseId })));

        // Map API videos to local video format
        const apiVideos = response.data.data
          .filter(video => {
            // Only include videos with valid URL and that are not still processing
            const hasValidUrl = video.video_url && video.video_url.trim() !== '';
            const isReady = video.status === 'READY' || video.status === 'completed' || video.status === 'reviewed';
            const isNotProcessing = !['PROCESSING', 'UPLOADING', 'PENDING'].includes(video.status);

            if (!hasValidUrl) {
              logger.debug(`⏭️ Skipping video ${video.id}: No valid URL`);
              return false;
            }

            if (!isReady && !isNotProcessing) {
              logger.debug(`⏭️ Skipping video ${video.id}: Still processing (status: ${video.status})`);
              return false;
            }

            return true;
          })
          .map(video => {
            // Extract exercise index and set index from metadata or video data
            const metadata = video.metadata || {};
            const exerciseName = video.exercise_name || metadata.exercise_name || '';
            const setNumber = video.set_number || metadata.set_number || 1;
            const setIndex = video.set_index !== undefined ? video.set_index : (metadata.set_index !== undefined ? metadata.set_index : (setNumber - 1));

            // PRIORITY 1: Use exercise_index from metadata if available (most reliable)
            let exerciseIndex = -1;
            if (metadata.exercise_index !== undefined && metadata.exercise_index !== null) {
              exerciseIndex = parseInt(metadata.exercise_index, 10);
              if (exerciseIndex >= 0 && exerciseIndex < exercises.length) {
                logger.debug(`✅ Using exercise_index from metadata: ${exerciseIndex} for video: ${exerciseName}`);
              } else {
                logger.warn(`⚠️ exercise_index from metadata (${exerciseIndex}) is out of range. Exercises count: ${exercises.length}`);
                exerciseIndex = -1;
              }
            }

            // PRIORITY 2: Try to find by exercise_id if available
            if (exerciseIndex === -1 && video.exercise_id) {
              exerciseIndex = exercises.findIndex(ex => ex.exerciseId === video.exercise_id);
              if (exerciseIndex !== -1) {
                logger.debug(`✅ Found exercise by exercise_id: ${video.exercise_id} at index ${exerciseIndex}`);
              }
            }

            // PRIORITY 3: Find matching exercise by name (flexible matching)
            if (exerciseIndex === -1 && exerciseName) {
              // Normalize names for comparison (trim, lowercase, remove extra spaces)
              const normalizeName = (name) => {
                if (!name) return '';
                return name.toLowerCase().trim().replace(/\s+/g, ' ');
              };

              const normalizedExerciseName = normalizeName(exerciseName);

              // Try exact match first
              exerciseIndex = exercises.findIndex(ex =>
                normalizeName(ex.name) === normalizedExerciseName
              );

              // Try partial match if exact match fails
              if (exerciseIndex === -1) {
                exerciseIndex = exercises.findIndex(ex => {
                  const normalizedExName = normalizeName(ex.name);
                  return normalizedExName.includes(normalizedExerciseName) ||
                    normalizedExerciseName.includes(normalizedExName);
                });
              }

              if (exerciseIndex !== -1) {
                logger.debug(`✅ Found exercise by name matching: "${exerciseName}" -> "${exercises[exerciseIndex]?.name}" at index ${exerciseIndex}`);
              }
            }

            if (exerciseIndex === -1) {
              logger.warn('⚠️ Could not find exercise for video:', {
                exerciseName,
                exercise_index: metadata.exercise_index,
                exercise_id: video.exercise_id,
                availableExercises: exercises.map((ex, idx) => ({ index: idx, name: ex.name, id: ex.exerciseId }))
              });
              return null;
            }

            return {
              exerciseIndex,
              setIndex,
              rpeRating: video.rpe_rating || metadata.rpe_rating || metadata.rpe || null,
              comment: video.comment || metadata.comment || null,
              file: 'uploaded', // Mark as uploaded (not a File object, but uploaded to Supabase)
              videoId: video.id,
              videoUrl: video.video_url,
              status: video.status,
              exerciseInfo: {
                exerciseName: exerciseName,
                exerciseId: video.exercise_id || exercises[exerciseIndex]?.exerciseId,
                exerciseIndex: exerciseIndex,
                sessionId: session?.id,
                coachId: session?.coach_id,
                assignmentId: assignmentId
              },
              setInfo: {
                setIndex: setIndex,
                setNumber: setNumber,
                weight: video.weight || metadata.weight || exercises[exerciseIndex]?.sets?.[setIndex]?.weight || 0,
                reps: video.reps || metadata.reps || exercises[exerciseIndex]?.sets?.[setIndex]?.reps || 0
              },
              timestamp: video.created_at || new Date().toISOString(),
              isFromAPI: true // Flag to identify API videos
            };
          })
          .filter(video => video !== null); // Remove null entries

        if (apiVideos.length > 0) {
          logger.debug('✅ Mapped', apiVideos.length, 'videos from API');

          // Merge with local videos, prioritizing API videos (they're already uploaded)
          setLocalVideos(prev => {
            const merged = [...prev];

            apiVideos.forEach(apiVideo => {
              const existingIndex = merged.findIndex(v =>
                v.exerciseIndex === apiVideo.exerciseIndex &&
                v.setIndex === apiVideo.setIndex
              );

              if (existingIndex !== -1) {
                // Replace local video with API video (API video is the source of truth)
                logger.debug(`🔄 Replacing local video with API video for exercise ${apiVideo.exerciseIndex}, set ${apiVideo.setIndex}`);
                merged[existingIndex] = apiVideo;
              } else {
                // Add new API video
                merged.push(apiVideo);
              }
            });

            return merged;
          });

          // Update completedSets to mark these sets as having videos
          setCompletedSets(prev => {
            const updated = { ...prev };
            apiVideos.forEach(video => {
              const key = `${video.exerciseIndex}-${video.setIndex}`;
              updated[key] = {
                ...(updated[key] || {}),
                hasVideo: true,
                videoStatus: video.status === 'READY' || video.status === 'completed' ? 'completed' : 'uploaded',
                rpeRating: video.rpeRating || updated[key]?.rpeRating
              };
            });
            return updated;
          });
        }
      } else {
        logger.debug('📭 No videos found in API for session:', assignmentId);
      }
    } catch (error) {
      logger.error('❌ Error fetching videos from API:', error);
      // Don't throw - this is not critical, just a nice-to-have feature
    }
  }, [exercises, session, getAuthToken]);

  // Save progress whenever it changes (but not during restoration)
  useEffect(() => {
    if (!sessionId || !storageKey) {
      return;
    }

    if (isRestoringProgress.current) {
      // Don't save if we're still restoring
      // But check if the timeout has expired (safety check)
      if (restoreTimeoutRef.current === null) {
        // Timeout has completed, but flag wasn't reset - reset it now
        logger.warn('⚠️ isRestoringProgress flag stuck (timeout null), resetting...');
        isRestoringProgress.current = false;
        // Continue to save below
      } else {
        // If we're here and the flag is true, we're still in the restoration window
        // Allow a small grace period, but if it's been too long, force reset
        logger.debug('⏸️ Skipping save - restoration in progress');
        return;
      }
    }

    if (!hasRestoredProgress.current) {
      // Don't save if we haven't restored yet (initial mount)
      logger.debug('⏸️ Skipping save - restoration not complete yet');
      return;
    }

    const progressData = {
      completedSets,
      currentExerciseIndex,
      currentSetIndex,
      selectedSetIndex,
      exerciseComments,
      // Note: On ne sauvegarde pas localVideos car les fichiers ne peuvent pas être stockés
      // Mais on peut sauvegarder les métadonnées des vidéos (sans les fichiers)
      // IMPORTANT: Ne pas sauvegarder les vidéos déjà uploadées sur Supabase (isFromAPI ou file === 'uploaded')
      // Ces vidéos seront récupérées depuis Supabase lors de la restauration
      // Le RPE est maintenant récupéré depuis completedSets
      videoMetadata: localVideos
        .filter(v => {
          // Exclure les vidéos déjà uploadées sur Supabase
          const isFromSupabase = v.file === 'uploaded' || v.isFromAPI === true;
          if (isFromSupabase) {
            logger.debug(`📦 Skipping cache for uploaded video: exercise ${v.exerciseIndex}, set ${v.setIndex} (will be fetched from Supabase)`);
          }
          return !isFromSupabase;
        })
        .map(v => {
          const exerciseIndex = v.exerciseIndex;
          const setIndex = v.setIndex;
          const key = `${exerciseIndex}-${setIndex}`;
          const setData = completedSets[key];
          const rpeRating = (setData && typeof setData === 'object' && 'rpeRating' in setData)
            ? setData.rpeRating
            : (v.rpeRating || null);

          return {
            exerciseIndex,
            setIndex,
            rpeRating,
            comment: v.comment,
            hasVideo: v.file && v.file !== 'no-video',
            isNoVideo: v.file === 'no-video'
          };
        })
    };

    // Only save if there's actual progress (not just empty initial state)
    const hasProgress = Object.keys(completedSets).length > 0 ||
      currentExerciseIndex > 0 ||
      Object.keys(exerciseComments).length > 0 ||
      localVideos.length > 0;

    if (!hasProgress) {
      logger.debug('⏸️ Skipping save - no progress to save yet');
      return;
    }

    logger.debug('💾 Saving progress to localStorage:', {
      sessionId,
      currentExerciseIndex,
      completedSetsCount: Object.keys(completedSets).length,
      completedSets: completedSets,
      currentSetIndex: currentSetIndex,
      selectedSetIndex: selectedSetIndex,
      exerciseCommentsCount: Object.keys(exerciseComments).length,
      exerciseComments: exerciseComments,
      localVideosCount: localVideos.length
    });

    saveProgressToStorage(progressData);
  }, [completedSets, currentExerciseIndex, currentSetIndex, selectedSetIndex, exerciseComments, localVideos, sessionId, storageKey, saveProgressToStorage]);

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

  // Vérifier si un exercice a été commencé (au moins un set complété ou une vidéo uploadée)
  const hasExerciseBeenStarted = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) {
      return false;
    }

    // Vérifier si au moins un set a été complété ou échoué
    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
      const key = `${exerciseIndex}-${setIndex}`;
      const setData = completedSets[key];

      // Vérifier le statut du set
      let status = 'pending';
      if (setData && typeof setData === 'object' && 'status' in setData) {
        status = setData.status;
      } else if (typeof setData === 'string') {
        status = setData;
      }

      if (status === 'completed' || status === 'failed') {
        return true;
      }
    }

    // Vérifier si au moins une vidéo a été uploadée pour cet exercice
    const hasAnyVideo = localVideos.some(
      (video) =>
        video.exerciseIndex === exerciseIndex &&
        video.file !== null &&
        video.file !== undefined
    );

    return hasAnyVideo;
  };

  // Vérifier si des vidéos sont manquantes pour un exercice spécifique
  const hasMissingVideosForExercise = (exerciseIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise || !Array.isArray(exercise.sets)) {
      return false;
    }

    // Parcourir tous les sets de l'exercice
    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
      const set = exercise.sets[setIndex];

      // Si le set nécessite une vidéo
      if (set.video === true) {
        // Vérifier si une vidéo a été uploadée pour ce set
        const hasVideo = hasVideoForSet(exerciseIndex, setIndex);

        // Vérifier aussi si "no-video" a été choisi
        const hasNoVideoChoice = localVideos.some(
          (video) =>
            video.exerciseIndex === exerciseIndex &&
            video.setIndex === setIndex &&
            video.file === 'no-video'
        );

        // Si aucune vidéo n'est uploadée et "no-video" n'a pas été choisi, la vidéo est manquante
        if (!hasVideo && !hasNoVideoChoice) {
          return true;
        }
      }
    }

    return false;
  };

  // Vérifier si des vidéos sont manquantes pour toute la séance
  const hasMissingVideosForSession = () => {
    if (!exercises || exercises.length === 0) {
      return false;
    }

    // Vérifier tous les exercices
    for (let i = 0; i < exercises.length; i++) {
      if (hasMissingVideosForExercise(i)) {
        return true;
      }
    }

    return false;
  };

  // Vérifier si des RPE ou charges sont manquants pour toute la séance
  const hasMissingRpeForSession = () => {
    if (!exercises || exercises.length === 0) {
      return false;
    }

    // Vérifier tous les exercices et leurs sets
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
      const exercise = exercises[exerciseIndex];
      if (!exercise || !Array.isArray(exercise.sets)) {
        continue;
      }

      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
        // Vérifier les RPE/charges manquants pour les sets complétés
        // Si useRir === true : vérifier la charge (studentWeight)
        // Si useRir === false : vérifier le RPE (rpeRating)
        const status = getSetStatus(exerciseIndex, setIndex);
        if (status === 'completed') {
          const key = `${exerciseIndex}-${setIndex}`;
          const setData = completedSets[key];

          if (exercise.useRir) {
            // Si coach demande RPE : vérifier la charge (studentWeight)
            const hasWeight = setData && typeof setData === 'object' && 'studentWeight' in setData && setData.studentWeight !== null && setData.studentWeight !== undefined && setData.studentWeight !== '';
            if (!hasWeight) {
              return true;
            }
          } else {
            // Si coach demande charge : vérifier le RPE
            const hasRpe = setData && typeof setData === 'object' && 'rpeRating' in setData && setData.rpeRating !== null && setData.rpeRating !== undefined;
            if (!hasRpe) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  // Compter les vidéos et RPE/charges manquants pour toute la séance
  const getMissingVideosAndRpeCount = () => {
    let missingVideosCount = 0;
    let missingRpeCount = 0;
    let missingWeightCount = 0;

    if (!exercises || exercises.length === 0) {
      return { missingVideosCount: 0, missingRpeCount: 0, missingWeightCount: 0 };
    }

    exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise || !Array.isArray(exercise.sets)) {
        return;
      }

      exercise.sets.forEach((set, setIndex) => {
        // Compter les vidéos manquantes
        if (set.video === true) {
          const hasVideo = hasVideoForSet(exerciseIndex, setIndex);
          const hasNoVideoChoice = localVideos.some(
            (video) =>
              video.exerciseIndex === exerciseIndex &&
              video.setIndex === setIndex &&
              video.file === 'no-video'
          );

          if (!hasVideo && !hasNoVideoChoice) {
            missingVideosCount++;
          }
        }

        // Compter les RPE/charges manquants pour les sets complétés
        // Si useRir === true : vérifier la charge (studentWeight)
        // Si useRir === false : vérifier le RPE (rpeRating)
        const status = getSetStatus(exerciseIndex, setIndex);
        if (status === 'completed') {
          const key = `${exerciseIndex}-${setIndex}`;
          const setData = completedSets[key];

          if (exercise.useRir) {
            // Si coach demande RPE : vérifier la charge (studentWeight)
            const hasWeight = setData && typeof setData === 'object' && 'studentWeight' in setData && setData.studentWeight !== null && setData.studentWeight !== undefined && setData.studentWeight !== '';
            if (!hasWeight) {
              missingWeightCount++;
            }
          } else {
            // Si coach demande charge : vérifier le RPE
            const hasRpe = setData && typeof setData === 'object' && 'rpeRating' in setData && setData.rpeRating !== null && setData.rpeRating !== undefined;
            if (!hasRpe) {
              missingRpeCount++;
            }
          }
        }
      });
    });

    return { missingVideosCount, missingRpeCount, missingWeightCount };
  };

  // Handle exercise selection - Ouvre la modale de validation
  const handleExerciseSelection = (exerciseIndex) => {
    // Ne rien faire si la séance n'a pas encore commencé
    if (!isSessionStarted) {
      return;
    }
    // Ouvrir directement la modale de validation sans vérification
    setSelectedExerciseForValidation(exerciseIndex);
    setCurrentExerciseIndex(exerciseIndex);
    setIsExerciseValidationModalOpen(true);
  };

  // Handle start session button click
  const handleStartSession = () => {
    if (isReadOnlySession) {
      return;
    }
    setIsSessionStarted(true);
    // Sélectionner automatiquement la première série du premier exercice
    if (exercises && exercises.length > 0) {
      setCurrentExerciseIndex(0);
      setSelectedSetIndex({ 0: 0 });
      setCurrentSetIndex({ 0: 0 });
    }
  };

  // Get current set index for an exercise
  const getCurrentSetIndex = (exerciseIndex) => {
    return currentSetIndex[exerciseIndex] || 0;
  };

  // Get selected set index for an exercise (for display purposes)
  const getSelectedSetIndex = (exerciseIndex) => {
    // Ne pas retourner de série sélectionnée si la séance n'a pas commencé
    if (!isSessionStarted) {
      return undefined;
    }
    return selectedSetIndex[exerciseIndex] !== undefined ? selectedSetIndex[exerciseIndex] : 0;
  };

  // Handle set selection (only for active exercise)
  const handleSetSelection = (exerciseIndex, setIndex) => {
    // Ne rien faire si la séance n'a pas commencé
    if (!isSessionStarted) {
      return;
    }
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
    if (isReadOnlySession) {
      return;
    }
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

  // Gérer la mise à jour du RPE pour une série
  const handleRpeUpdate = (exerciseIndex, setIndex, rpeRating) => {
    if (isReadOnlySession) {
      return;
    }
    const exercise = exercises[exerciseIndex];

    if (!exercise || !Array.isArray(exercise.sets)) {
      return;
    }

    if (setIndex >= exercise.sets.length) {
      return; // Invalid set index
    }

    // Mettre à jour le RPE dans completedSets
    const key = `${exerciseIndex}-${setIndex}`;
    setCompletedSets(prev => {
      const currentSetData = prev[key];

      // Préserver les données existantes et ajouter/mettre à jour le RPE
      const updatedSetData = typeof currentSetData === 'object' && currentSetData !== null
        ? { ...currentSetData, rpeRating }
        : { rpeRating };

      return {
        ...prev,
        [key]: updatedSetData
      };
    });
  };

  // Gérer la mise à jour de la charge saisie par l'élève (quand coach demande RPE)
  const handleWeightUpdate = (exerciseIndex, setIndex, weight) => {
    if (isReadOnlySession) {
      return;
    }
    const exercise = exercises[exerciseIndex];

    if (!exercise || !Array.isArray(exercise.sets)) {
      return;
    }

    if (setIndex >= exercise.sets.length) {
      return; // Invalid set index
    }

    // Mettre à jour la charge dans completedSets
    const key = `${exerciseIndex}-${setIndex}`;
    setCompletedSets(prev => {
      const currentSetData = prev[key];

      // Préserver les données existantes et ajouter/mettre à jour la charge
      const updatedSetData = typeof currentSetData === 'object' && currentSetData !== null
        ? { ...currentSetData, studentWeight: weight }
        : { studentWeight: weight };

      return {
        ...prev,
        [key]: updatedSetData
      };
    });
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
    // PRIORITÉ 1: Vérifier dans localVideos avec correspondance STRICTE (exerciseIndex ET setIndex)
    // C'est la source de vérité la plus fiable pour éviter que plusieurs sets affichent la même vidéo
    const hasLocalVideo = localVideos.some(
      (video) => {
        // Format principal: exerciseIndex et setIndex directs
        if (video.exerciseIndex === exerciseIndex && video.setIndex === setIndex) {
          return video.file !== null && video.file !== undefined && video.file !== 'no-video';
        }

        // Format alternatif: via exerciseInfo et setInfo
        if (video.exerciseInfo && video.setInfo) {
          const videoExerciseIndex = video.exerciseInfo.exerciseIndex;
          const videoSetIndex = video.setInfo.setIndex;
          if (videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex) {
            return video.file !== null && video.file !== undefined && video.file !== 'no-video';
          }
        }

        // Format alternatif: via exerciseIndex direct et setInfo
        if (video.exerciseIndex === exerciseIndex && video.setInfo) {
          const videoSetIndex = video.setInfo.setIndex;
          if (videoSetIndex === setIndex) {
            return video.file !== null && video.file !== undefined && video.file !== 'no-video';
          }
        }

        return false;
      }
    );

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


  const getSetStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-white/5';
    }
  };

  const getSetStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-white opacity-100" style={{ opacity: 1 }} />;
      case 'failed': return <XCircle className="h-4 w-4 text-white opacity-100" style={{ opacity: 1 }} />;
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
    if (isReadOnlySession) {
      return;
    }
    if (!isAllExercisesCompleted()) {
      alert('Veuillez compléter tous les exercices avant de terminer la séance');
      return;
    }

    // Vérifier si des vidéos sont manquantes avant de valider
    if (hasMissingVideosForSession()) {
      setPendingSessionCompletion(true);
      setIsMissingVideosModalOpen(true);
      return;
    }

    // Vérifier si des RPE sont manquants avant de valider
    if (hasMissingRpeForSession()) {
      setPendingSessionCompletion(true);
      setIsMissingVideosModalOpen(true);
      return;
    }

    setIsCompletionModalOpen(true);
  };

  const handleSessionCompletion = async (completionData) => {
    setIsValidatingSession(true); // Start validation, keep modal open

    // Filter videos that haven't been uploaded yet (via TUS)
    // Videos uploaded via TUS have status 'READY' or 'UPLOADED_RAW' and a videoId
    // OR they have file === 'uploaded' or isFromAPI === true (retrieved from Supabase)
    const videosToUpload = localVideos.filter(video => {
      // Skip videos that are already uploaded via TUS (have status and videoId)
      const isAlreadyUploadedViaTUS = (
        (video.status === 'READY' || video.status === 'UPLOADED_RAW') &&
        video.videoId
      );
      // Skip videos that were retrieved from Supabase API (already uploaded)
      const isFromSupabase = video.file === 'uploaded' || video.isFromAPI === true;
      // Skip 'no-video' choices
      const isNoVideo = video.file === 'no-video';
      // Skip videos that have a videoId (already uploaded, even if status is not set)
      const hasVideoId = !!video.videoId;

      const shouldSkip = isAlreadyUploadedViaTUS || isFromSupabase || isNoVideo || hasVideoId;

      if (shouldSkip) {
        logger.debug(`⏭️ Skipping video upload for exercise ${video.exerciseIndex}, set ${video.setIndex}:`, {
          isAlreadyUploadedViaTUS,
          isFromSupabase,
          isNoVideo,
          hasVideoId,
          status: video.status,
          videoId: video.videoId,
          file: typeof video.file === 'string' ? video.file : (video.file ? 'File object' : 'null')
        });
      }

      return !shouldSkip;
    });

    logger.debug(`📊 Video upload check: ${localVideos.length} total videos, ${videosToUpload.length} to upload, ${localVideos.length - videosToUpload.length} already uploaded`);

    // If there are videos that need to be uploaded (old flow for compatibility)
    if (videosToUpload.length > 0) {
      setIsVideoProcessingModalOpen(true); // Open processing modal
      setIsUploadingVideos(true);

      try {
        let authToken = await getAuthToken();

        // Step 1: Upload only videos that haven't been uploaded yet
        for (let i = 0; i < videosToUpload.length; i++) {
          const videoData = videosToUpload[i];
          setUploadProgress({
            current: i + 1,
            total: videosToUpload.length,
            exerciseName: videoData.exerciseInfo?.exerciseName || 'Exercice'
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
          // Récupérer le RPE depuis completedSets
          const exerciseIndex = videoData.exerciseInfo?.exerciseIndex ?? videoData.exerciseIndex;
          const rpeKey = `${exerciseIndex}-${setIndex}`;
          const setData = completedSets[rpeKey];
          const rpeRating = (setData && typeof setData === 'object' && 'rpeRating' in setData)
            ? setData.rpeRating
            : (videoData.rpeRating || 0);

          formData.append('exerciseInfo', JSON.stringify(videoData.exerciseInfo));
          formData.append('setInfo', JSON.stringify(fullSetInfo));
          formData.append('comment', videoData.comment || '');
          formData.append('rpeRating', rpeRating);
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
              logger.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
          }
        }

        setIsUploadingVideos(false);

        // Step 1.5: Upload RPE for sets without video requirement but with RPE
        // Parcourir toutes les séries pour trouver celles qui ont un RPE mais pas de vidéo
        if (exercises && exercises.length > 0) {
          for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
            const exercise = exercises[exerciseIndex];
            if (!exercise || !exercise.sets) continue;

            for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
              const set = exercise.sets[setIndex];
              const key = `${exerciseIndex}-${setIndex}`;
              const setData = completedSets[key];

              // Vérifier si cette série a un RPE
              const rpeRating = (setData && typeof setData === 'object' && 'rpeRating' in setData)
                ? setData.rpeRating
                : null;

              if (!rpeRating) continue; // Pas de RPE, on passe

              // Vérifier si cette série a déjà été traitée dans localVideos
              const alreadyProcessed = localVideos.some(video => {
                const videoExerciseIndex = video.exerciseInfo?.exerciseIndex ?? video.exerciseIndex;
                const videoSetIndex = video.setInfo?.setIndex ?? video.setIndex;
                return videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex;
              });

              if (alreadyProcessed) continue; // Déjà traité, on passe

              // Cette série a un RPE mais pas de vidéo, créer un enregistrement
              try {
                const setNumber = setIndex + 1;
                const exerciseInfo = {
                  exerciseId: exercise.exerciseId || exercise.id || exercise.exercise_id,
                  exerciseName: exercise.name,
                  exerciseIndex: exerciseIndex,
                  sessionId: session?.id,
                  assignmentId: session?.assignment_id || session?.id
                };
                const setInfo = (() => {
                  if (exercise.useRir) {
                    return {
                      setNumber: setNumber,
                      setIndex: setIndex,
                      weight: (setData && typeof setData === 'object' && setData.studentWeight) || 0,
                      reps: set.reps || 0,
                      rpe: set.weight || 0
                    };
                  }
                  return {
                    setNumber: setNumber,
                    setIndex: setIndex,
                    weight: set.weight || 0,
                    reps: set.reps || 0
                  };
                })();

                const formData = new FormData();
                formData.append('noVideo', 'true'); // Pas de vidéo
                formData.append('exerciseInfo', JSON.stringify(exerciseInfo));
                formData.append('setInfo', JSON.stringify(setInfo));
                formData.append('comment', ''); // Pas de commentaire
                formData.append('rpeRating', rpeRating);
                formData.append('set_index', String(setIndex));
                formData.append('set_number', String(setNumber));
                if (exerciseInfo.exerciseId) formData.append('exercise_id', String(exerciseInfo.exerciseId));
                if (exerciseInfo.exerciseIndex !== undefined) formData.append('exercise_index', String(exerciseInfo.exerciseIndex));
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
                  logger.warn(`Failed to save RPE for exercise ${exerciseIndex}, set ${setIndex}:`, response.status);
                  // Ne pas bloquer la complétion de la séance si l'enregistrement du RPE échoue
                } else {
                  logger.debug(`✅ RPE saved for exercise ${exerciseIndex}, set ${setIndex}: ${rpeRating}`);
                }
              } catch (error) {
                logger.error(`Error saving RPE for exercise ${exerciseIndex}, set ${setIndex}:`, error);
                // Ne pas bloquer la complétion de la séance si l'enregistrement du RPE échoue
              }
            }
          }
        }

        // Step 2: Trigger backend compression for videos uploaded via old flow
        // Videos uploaded via TUS are already being processed by the worker
        setIsCompressing(true);

        const finalizeResponse = await fetch(buildApiUrl(`/api/workout-sessions/${session.id}/finalize-videos`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!finalizeResponse.ok) {
          // Even if finalization fails, the session is complete from user's perspective
          logger.error('Failed to trigger video finalization, but session is marked complete.');
        }

        setIsUploadComplete(true);

        // Close modal after a short delay
        setTimeout(() => {
          setIsVideoProcessingModalOpen(false);
          // Clear local videos after successful upload and processing
          // They're now safely stored in Supabase Storage and database
          setLocalVideos([]);
          logger.debug('🧹 Cleaned localVideos after successful video processing');
        }, 2000);

      } catch (error) {
        logger.error('Error during video upload (old flow):', error);
        const errorMessage = error.message || 'Une erreur est survenue lors du téléversement des vidéos.';

        if (errorMessage.toLowerCase().includes('too large') || errorMessage.toLowerCase().includes('trop volumineux')) {
          alert(`❌ ${errorMessage}\n\nVeuillez sélectionner une vidéo plus petite (maximum 300 MB).`);
        } else {
          alert(`❌ Erreur lors du téléversement des vidéos:\n\n${errorMessage}\n\nVeuillez réessayer.`);
        }

        setIsVideoProcessingModalOpen(false);
        setIsUploadingVideos(false);
        setIsCompressing(false);
        setUploadProgress(null);
        setIsValidatingSession(false); // Re-enable button on error
        setIsCompletionModalOpen(false); // Close modal on error
        return;
      } finally {
        setIsUploadingVideos(false);
        setIsCompressing(false);
        setUploadProgress(null);
      }
    } else if (localVideos.length > 0) {
      // All videos were already uploaded via TUS, just confirm session completion
      logger.debug('✅ All videos already uploaded via TUS, proceeding to session confirmation');

      try {
        let authToken = await getAuthToken();

        // Still need to upload RPE for sets without video requirement but with RPE
        if (exercises && exercises.length > 0) {
          for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
            const exercise = exercises[exerciseIndex];
            if (!exercise || !exercise.sets) continue;

            for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
              const set = exercise.sets[setIndex];
              const key = `${exerciseIndex}-${setIndex}`;
              const setData = completedSets[key];

              // Vérifier si cette série a un RPE
              const rpeRating = (setData && typeof setData === 'object' && 'rpeRating' in setData)
                ? setData.rpeRating
                : null;

              if (!rpeRating) continue; // Pas de RPE, on passe

              // Vérifier si cette série a déjà été traitée dans localVideos
              const alreadyProcessed = localVideos.some(video => {
                const videoExerciseIndex = video.exerciseInfo?.exerciseIndex ?? video.exerciseIndex;
                const videoSetIndex = video.setInfo?.setIndex ?? video.setIndex;
                return videoExerciseIndex === exerciseIndex && videoSetIndex === setIndex;
              });

              if (alreadyProcessed) continue; // Déjà traité, on passe

              // Cette série a un RPE mais pas de vidéo, créer un enregistrement
              try {
                const setNumber = setIndex + 1;
                const exerciseInfo = {
                  exerciseId: exercise.exerciseId || exercise.id || exercise.exercise_id,
                  exerciseName: exercise.name,
                  exerciseIndex: exerciseIndex,
                  sessionId: session?.id,
                  assignmentId: session?.assignment_id || session?.id
                };
                const setInfo = (() => {
                  if (exercise.useRir) {
                    return {
                      setNumber: setNumber,
                      setIndex: setIndex,
                      weight: (setData && typeof setData === 'object' && setData.studentWeight) || 0,
                      reps: set.reps || 0,
                      rpe: set.weight || 0
                    };
                  }
                  return {
                    setNumber: setNumber,
                    setIndex: setIndex,
                    weight: set.weight || 0,
                    reps: set.reps || 0
                  };
                })();

                const formData = new FormData();
                formData.append('noVideo', 'true');
                formData.append('exerciseInfo', JSON.stringify(exerciseInfo));
                formData.append('setInfo', JSON.stringify(setInfo));
                formData.append('comment', '');
                formData.append('rpeRating', rpeRating);
                formData.append('set_index', String(setIndex));
                formData.append('set_number', String(setNumber));
                if (exerciseInfo.exerciseId) formData.append('exercise_id', String(exerciseInfo.exerciseId));
                if (exerciseInfo.exerciseIndex !== undefined) formData.append('exercise_index', String(exerciseInfo.exerciseIndex));
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
                  logger.warn(`Failed to save RPE for exercise ${exerciseIndex}, set ${setIndex}:`, response.status);
                } else {
                  logger.debug(`✅ RPE saved for exercise ${exerciseIndex}, set ${setIndex}: ${rpeRating}`);
                }
              } catch (error) {
                logger.error(`Error saving RPE for exercise ${exerciseIndex}, set ${setIndex}:`, error);
              }
            }
          }
        }

        // Trigger finalize to ensure TUS uploads are processed and visible to coaches
        try {
          const finalizeResponse = await fetch(buildApiUrl(`/api/workout-sessions/${session.id}/finalize-videos`), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!finalizeResponse.ok) {
            logger.error('Failed to trigger video finalization for TUS uploads.');
          } else {
            logger.debug('✅ Finalization triggered for TUS uploads.');
          }
        } catch (error) {
          logger.error('Error triggering finalization for TUS uploads:', error);
        }

        // Clear local videos since they're already uploaded
        setLocalVideos([]);
        logger.debug('🧹 Cleaned localVideos - all videos already uploaded via TUS');

      } catch (error) {
        logger.error('Error during video processing:', error);
        // Extract and display specific error message
        const errorMessage = error.message || 'Une erreur est survenue lors du téléversement des vidéos.';

        // Check if it's a file size error
        if (errorMessage.toLowerCase().includes('too large') || errorMessage.toLowerCase().includes('trop volumineux')) {
          alert(`❌ ${errorMessage}\n\nVeuillez sélectionner une vidéo plus petite (maximum 300 MB).`);
        } else {
          alert(`❌ Erreur lors du téléversement des vidéos:\n\n${errorMessage}\n\nVeuillez réessayer.`);
        }

        setIsVideoProcessingModalOpen(false);
        setIsValidatingSession(false); // Re-enable button on error
        setIsCompletionModalOpen(false); // Close modal on error
        // Don't proceed to complete session if uploads fail
        return;
      } finally {
        // Reset states
        setIsUploadingVideos(false);
        setIsCompressing(false);
        setUploadProgress(null);
      }
    } else {
      // Pas de vidéos, mais on doit quand même sauvegarder les RPE des séries sans vidéo
      try {
        let authToken = await getAuthToken();

        if (exercises && exercises.length > 0) {
          for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
            const exercise = exercises[exerciseIndex];
            if (!exercise || !exercise.sets) continue;

            for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
              const set = exercise.sets[setIndex];
              const key = `${exerciseIndex}-${setIndex}`;
              const setData = completedSets[key];

              // Vérifier si cette série a un RPE
              const rpeRating = (setData && typeof setData === 'object' && 'rpeRating' in setData)
                ? setData.rpeRating
                : null;

              if (!rpeRating) continue; // Pas de RPE, on passe

              // Cette série a un RPE mais pas de vidéo, créer un enregistrement
              try {
                const setNumber = setIndex + 1;
                const exerciseInfo = {
                  exerciseId: exercise.exerciseId || exercise.id || exercise.exercise_id,
                  exerciseName: exercise.name,
                  exerciseIndex: exerciseIndex,
                  sessionId: session?.id,
                  assignmentId: session?.assignment_id || session?.id
                };
                const setInfo = (() => {
                  if (exercise.useRir) {
                    return {
                      setNumber: setNumber,
                      setIndex: setIndex,
                      weight: (setData && typeof setData === 'object' && setData.studentWeight) || 0,
                      reps: set.reps || 0,
                      rpe: set.weight || 0
                    };
                  }
                  return {
                    setNumber: setNumber,
                    setIndex: setIndex,
                    weight: set.weight || 0,
                    reps: set.reps || 0
                  };
                })();

                const formData = new FormData();
                formData.append('noVideo', 'true'); // Pas de vidéo
                formData.append('exerciseInfo', JSON.stringify(exerciseInfo));
                formData.append('setInfo', JSON.stringify(setInfo));
                formData.append('comment', ''); // Pas de commentaire
                formData.append('rpeRating', rpeRating);
                formData.append('set_index', String(setIndex));
                formData.append('set_number', String(setNumber));
                if (exerciseInfo.exerciseId) formData.append('exercise_id', String(exerciseInfo.exerciseId));
                if (exerciseInfo.exerciseIndex !== undefined) formData.append('exercise_index', String(exerciseInfo.exerciseIndex));
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
                  logger.warn(`Failed to save RPE for exercise ${exerciseIndex}, set ${setIndex}:`, response.status);
                  // Ne pas bloquer la complétion de la séance si l'enregistrement du RPE échoue
                } else {
                  logger.debug(`✅ RPE saved for exercise ${exerciseIndex}, set ${setIndex}: ${rpeRating}`);
                }
              } catch (error) {
                logger.error(`Error saving RPE for exercise ${exerciseIndex}, set ${setIndex}:`, error);
                // Ne pas bloquer la complétion de la séance si l'enregistrement du RPE échoue
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error saving RPEs for sets without video:', error);
        // Ne pas bloquer la complétion de la séance si l'enregistrement des RPE échoue
      }
    }

    // Step 3: Complete the session locally (happens for sessions with or without videos)
    setSessionStatus('completed');

    // Clear saved progress from localStorage when session is completed
    // This includes video metadata that was stored temporarily
    clearProgressFromStorage();

    // Clear local videos state since they're now in Supabase Storage and database
    // No need to keep them in memory after session completion
    setLocalVideos([]);

    logger.debug('🧹 Cleaned localStorage and localVideos after session completion');

    // Keep modal open with loading state - don't set isValidatingSession(false) here
    // The parent will unmount this component when done. Keeping loading visible
    // avoids the "freeze" UX (modal with no loading while parent's API call runs).

    // Call onCompleteSession - parent will handle closing modal and showing success
    onCompleteSession({
      ...session,
      completionData,
      completedSets,
      exerciseComments // Include exercise comments
    });
  };

  const handleVideoUpload = (exerciseIndex) => {
    logger.debug('🎬 handleVideoUpload called:', { exerciseIndex, exercisesLength: exercises?.length });
    const selectedSet = getSelectedSetIndex(exerciseIndex);
    logger.debug('🎬 Selected set:', { selectedSet, exerciseIndex });
    // Check if the selected set has video enabled
    const exercise = exercises[exerciseIndex];
    logger.debug('🎬 Exercise:', { exercise: exercise?.name, sets: exercise?.sets, selectedSet });
    if (exercise && exercise.sets && exercise.sets[selectedSet] && exercise.sets[selectedSet].video === true) {
      // Update the video selection to match the current selection
      setSelectedSetForVideo(prev => {
        const updated = {
          ...prev,
          [exerciseIndex]: selectedSet
        };
        logger.debug('🎬 Setting selectedSetForVideo:', updated);
        return updated;
      });
      logger.debug('🎬 Opening video modal for exercise', exerciseIndex, 'set', selectedSet);
      setIsVideoModalOpen(true);
    } else {
      logger.warn('⚠️ Cannot open video modal:', {
        hasExercise: !!exercise,
        hasSets: !!(exercise?.sets),
        hasSelectedSet: !!(exercise?.sets?.[selectedSet]),
        videoEnabled: exercise?.sets?.[selectedSet]?.video
      });
    }
  };

  const handleVideoUploadSuccess = useCallback((videoData) => {
    logger.debug('✅ Video upload success received:', {
      exerciseIndex: videoData.exerciseInfo?.exerciseIndex,
      setIndex: videoData.setInfo?.setIndex,
      status: videoData.status,
      file: videoData.file ? 'Present' : 'None'
    });

    // Get exercise and set indices from videoData (more reliable than currentExerciseIndex)
    const exerciseIndex = videoData.exerciseInfo?.exerciseIndex !== undefined
      ? videoData.exerciseInfo.exerciseIndex
      : currentExerciseIndex;

    // Prioritize setIndex from setInfo, fallback to selectedSetForVideo
    const setIndex = videoData.setInfo?.setIndex !== undefined
      ? videoData.setInfo.setIndex
      : (videoData.setInfo?.setNumber ? videoData.setInfo.setNumber - 1 : (selectedSetForVideo[exerciseIndex] ?? 0));

    logger.debug('🔄 Processing upload for target:', { exerciseIndex, setIndex });

    // Use flushSync to force immediate state updates for "no-video" choice
    // This ensures the UI updates immediately when user clicks "Pas de vidéo"
    const isNoVideo = videoData.file === 'no-video';

    if (isNoVideo) {
      // Force synchronous updates for immediate UI feedback
      flushSync(() => {
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
          const updatedSetData = {
            ...currentSetData,
            hasVideo: false,
            videoStatus: 'no-video'
          };
          return {
            ...prev,
            [`${exerciseIndex}-${setIndex}`]: updatedSetData
          };
        });
      });
    } else {
      // For actual video uploads, use normal async updates
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

      // If video was uploaded but no URL returned yet, re-fetch from API as fallback
      // (rawVideoUrl is provided directly by confirmVideoUpload, so this is only needed if that failed)
      if (videoData.videoId && !videoData.videoUrl && (videoData.status === 'READY' || videoData.status === 'UPLOADED_RAW')) {
        const assignmentId = session?.assignment_id || session?.id;
        if (assignmentId) {
          setTimeout(() => {
            fetchSessionVideosFromAPI(assignmentId);
          }, 500);
        }
      }

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
    }
  }, [currentExerciseIndex, selectedSetForVideo]);

  // Handle video deletion - completely remove video from localVideos
  const handleVideoDelete = useCallback((exerciseInfo, setInfo) => {
    const exerciseIndex = exerciseInfo?.exerciseIndex !== undefined
      ? exerciseInfo.exerciseIndex
      : currentExerciseIndex;
    const setIndex = setInfo?.setIndex !== undefined
      ? setInfo.setIndex
      : (setInfo?.setNumber ? setInfo.setNumber - 1 : (selectedSetForVideo[exerciseIndex] ?? 0));

    logger.debug('🗑️ Deleting video for:', { exerciseIndex, setIndex });

    // Remove video from localVideos completely (not just mark as 'no-video')
    setLocalVideos(prev => {
      return prev.filter(
        v => !(
          (v.exerciseIndex === exerciseIndex && v.setIndex === setIndex) ||
          (v.exerciseInfo?.exerciseIndex === exerciseIndex && v.setInfo?.setIndex === setIndex) ||
          (v.exerciseIndex === exerciseIndex && v.setInfo?.setIndex === setIndex)
        )
      );
    });

    // Remove video status from completedSets
    setCompletedSets(prev => {
      const key = `${exerciseIndex}-${setIndex}`;
      const currentSetData = prev[key] || {};
      const updatedSetData = {
        ...currentSetData,
        hasVideo: false,
        videoStatus: undefined // Remove videoStatus completely
      };
      return {
        ...prev,
        [key]: updatedSetData
      };
    });
  }, [currentExerciseIndex, selectedSetForVideo]);

  // Handle back button - show warning modal before leaving
  const handleBack = () => {
    if (isReadOnlySession) {
      if (onBack) {
        onBack();
      }
      return;
    }
    // Si on est encore sur la page aperçu (séance non commencée), quitter directement sans modale
    if (!isSessionStarted) {
      if (onBack) {
        onBack();
      }
      return;
    }

    // Vérifier s'il y a une progression à sauvegarder
    const hasProgress = Object.keys(completedSets).length > 0 ||
      currentExerciseIndex > 0 ||
      Object.keys(exerciseComments).length > 0 ||
      localVideos.length > 0;

    // Si la séance a été commencée et qu'il y a de la progression, afficher le modal d'avertissement
    if (hasProgress) {
      setIsLeaveWarningModalOpen(true);
    } else {
      // Sinon, quitter directement
      if (onBack) {
        onBack();
      }
    }
  };

  // Confirmer la sortie après l'avertissement
  const handleConfirmLeave = () => {
    setIsLeaveWarningModalOpen(false);
    // Progress is already saved automatically via useEffect
    if (onBack) {
      onBack();
    }
  };

  // Intercepter le bouton retour arrière d'Android/iOS pour afficher la modale
  useEffect(() => {
    if (isReadOnlySession) {
      return;
    }
    // Ne pas intercepter si la séance n'est pas commencée
    if (!isSessionStarted) {
      historyEntryAdded.current = false;
      return;
    }

    // Ajouter une entrée dans l'historique une seule fois quand la séance commence
    if (!historyEntryAdded.current) {
      window.history.pushState({ preventBack: true }, '', window.location.href);
      historyEntryAdded.current = true;
    }

    const handlePopState = (event) => {
      // Empêcher la navigation par défaut en ré-ajoutant l'entrée dans l'historique
      window.history.pushState({ preventBack: true }, '', window.location.href);

      // Utiliser handleBack qui gère déjà la logique d'affichage de la modale
      handleBack();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isReadOnlySession, isSessionStarted, completedSets, currentExerciseIndex, exerciseComments, localVideos, setIsLeaveWarningModalOpen, onBack]);

  // Early return if no session data
  if (!session) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Aucune séance trouvée</p>
          <Button
            onClick={handleBack}
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
      className={`text-foreground w-full relative ${omitAmbientBackground ? 'min-h-[100dvh]' : 'min-h-full overflow-hidden'}`}
      style={
        omitAmbientBackground
          ? undefined
          : {
              background: 'unset',
              backgroundColor: '#0a0a0a',
              backgroundImage: 'none'
            }
      }
    >
      {!omitAmbientBackground && (
        <>
          {/* Image de fond */}
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100dvh',
              backgroundImage: 'url(/background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 1,
              backgroundColor: '#0a0a0a'
            }}
          />

          {/* Layer blur sur l'écran */}
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100dvh',
              backdropFilter: 'blur(50px)',
              WebkitBackdropFilter: 'blur(100px)',
              backgroundColor: 'rgba(0, 0, 0, 0.01)',
              zIndex: 6,
              pointerEvents: 'none',
              opacity: 1
            }}
          />

          {/* Gradient conique Figma - partie droite */}
          <div
            style={{
              position: 'absolute',
              top: '-25px',
              left: '0',
              transform: 'translateY(-50%)',
              width: '50vw',
              height: '900px',
              borderRadius: '0',
              background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
              backdropFilter: 'blur(75px)',
              boxShadow: 'none',
              filter: 'brightness(1.5)',
              zIndex: 5,
              pointerEvents: 'none',
              opacity: 1.0,
              animation: 'organicGradientBright 15s ease-in-out infinite'
            }}
          />

          {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
          <div
            style={{
              position: 'absolute',
              top: '-25px',
              left: '50vw',
              transform: 'translateY(-50%) scaleX(-1)',
              width: '50vw',
              height: '900px',
              borderRadius: '0',
              background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
              backdropFilter: 'blur(75px)',
              boxShadow: 'none',
              filter: 'brightness(1.5)',
              zIndex: 5,
              pointerEvents: 'none',
              opacity: 1.0,
              animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
              opacity: 0.35
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
            style={{
              background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
              opacity: 0.45
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
            style={{
              background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
              opacity: 0.25
            }}
          />
        </>
      )}
      {/* Header - Centré comme dans Figma */}
      <div className="pt-[40px] pb-0 relative z-10">
        {/* Bouton retour */}
        {onBack && (
          <div className="pl-[47px] pr-[20px] max-w-[400px] mx-auto">
            <button
              onClick={handleBack}
              className="mb-4 text-white/60 hover:text-white transition-colors"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        )}
        {/* Title and subtitle */}
        <div className="pl-[60px] pr-[40px] max-w-[400px] mx-auto">
          <div className="mb-5 text-left w-full ml-[-5px] pl-0 mr-[30px] pr-0">
            <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal mb-0">
              {session.workout_sessions?.title || 'Séance'}
            </h1>
            <p className="text-[12px] font-light text-white/50 mr-[30px]">
              Durée estimée : {estimatedDuration}
            </p>
            {/* Progress bar - Barre d'avancement de la séance */}
            {(() => {
              const { finalized, total } = getTotalFinalizedSets();
              const progress = total > 0 ? (finalized / total) * 100 : 0;
              return (
                <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-[#d4845a] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Exercise List - Tous les exercices visibles, format compact */}
      <div
        className={`relative pl-[60px] pr-[40px] max-w-[400px] mx-auto z-10 ${!isSessionStarted ? 'pb-0 md:pb-5' : 'pb-0'}`}
        style={!isSessionStarted ? { paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' } : undefined}
      >
        {/* Ligne verticale pointillée à gauche (comme dans Figma) */}
        {exercises && exercises.length > 0 && (() => {
          // Calculer la position du premier et du dernier point
          const validPositions = Object.values(dotPositions).filter(pos => pos !== undefined);
          const firstDotPosition = validPositions.length > 0 ? Math.min(...validPositions) : 0;
          const lastDotPosition = validPositions.length > 0 ? Math.max(...validPositions) : 0;
          // La ligne s'arrête exactement au centre du dernier point (pas après)
          // On ne trace la ligne que s'il y a au moins 2 points différents
          const hasMultiplePoints = validPositions.length > 1 && lastDotPosition > firstDotPosition;
          const lineHeight = hasMultiplePoints ? lastDotPosition - firstDotPosition : 0;

          return (
            <div className="absolute left-[27px] top-0 bottom-0 pl-[10px]" style={{ width: '5px' }}>
              <div className="relative w-full h-full flex flex-col items-center">
                {/* Ligne verticale pointillée - commence au premier point et s'arrête exactement au dernier point */}
                {hasMultiplePoints && lineHeight > 0 && (
                  <div
                    className="absolute w-[1px] border-l border-dashed border-[#d4845a]/30"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: `${firstDotPosition}px`,
                      height: `${lineHeight}px`
                    }}
                  ></div>
                )}
                {/* Points d'avancement : orange si exercice fait, blanc si pas encore fait - Alignés avec le centre de chaque carte */}
                <div className="relative w-full h-full">
                  {exercises.map((_, index) => {
                    const exerciseCompleted = isExerciseFullyComplete(index);
                    const topPosition = dotPositions[index];

                    if (topPosition === undefined) return null;

                    return (
                      <div
                        key={index}
                        className={`w-[5px] h-[5px] rounded-full flex-shrink-0 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 ${exerciseCompleted ? 'bg-[#d4845a]' : 'bg-white'
                          }`}
                        style={{ top: `${topPosition}px` }}
                      ></div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        <div
          ref={exerciseListRef}
          className="ml-[-5px] flex flex-col w-full"
        >
          {exercises && exercises.length > 0 ? (
            exercises.map((exercise, exerciseIndex) => {
              const { start: sStart, end: sEnd } = getSupersetRange(exercises, exerciseIndex);
              const isExerciseInFocus = currentExerciseIndex >= sStart && currentExerciseIndex <= sEnd;
              const isCompleted = isExerciseFullyComplete(exerciseIndex);
              const isLinkedToNext = !!exercise.supersetGroup && 
                exercise.supersetGroup === exercises[exerciseIndex + 1]?.supersetGroup;
              const isLinkedToPrev = !!exercise.supersetGroup && 
                exercise.supersetGroup === exercises[exerciseIndex - 1]?.supersetGroup;

              return (
                <React.Fragment key={exerciseIndex}>
                <div
                  ref={el => exerciseCardRefs.current[exerciseIndex] = el}
                  style={{ marginBottom: 0 }}
                  onClick={() => handleExerciseSelection(exerciseIndex)}
                  className={`
                    overflow-hidden transition-all duration-200
                    ${isCompleted ? 'bg-white/10' : 'bg-white/10'}
                    ${isSessionStarted ? 'cursor-pointer' : 'cursor-default opacity-75'}
                    ${isLinkedToNext && isLinkedToPrev ? 'rounded-none border-b border-white/5' : 
                      isLinkedToNext ? 'rounded-t-[12px] rounded-b-none border-b border-white/5' : 
                      isLinkedToPrev ? 'rounded-b-[12px] rounded-t-none' : 
                      'rounded-[12px]'}
                    w-full min-h-[64px] flex items-center justify-center
                  `}
                >
                  <div className="px-[18px] py-[10px] h-full w-full">
                    <div className="flex items-center justify-between gap-5 h-full">
                      <div className="flex flex-col gap-[3px]">
                        <h3 className={`${(isLinkedToNext || isLinkedToPrev) ? 'text-[12px]' : 'text-[14px]'} font-light text-white break-words leading-tight`}>
                          {exercise.name}
                        </h3>
                        <ExerciseSummaryPreview exercise={exercise} />
                      </div>

                      {/* Set indicators - compact row, wrap after 5 sets */}
                      <div className="flex flex-wrap gap-x-[10px] gap-y-[6px] items-center max-w-[125px] flex-shrink-0 justify-start">
                        {exercise.sets?.map((set, setIndex) => {
                          const status = getSetStatus(exerciseIndex, setIndex);
                          const selectedSetIndex = getSelectedSetIndex(exerciseIndex);
                          const isSelected = isSessionStarted && selectedSetIndex !== undefined && selectedSetIndex === setIndex;

                          let variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          if (status === 'completed') {
                            variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          } else if (status === 'failed') {
                            variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[rgba(255,255,255,0.08)]';
                          } else if (isSelected && isExerciseInFocus) {
                            variantClasses = 'bg-[rgba(0,0,0,0.35)] border-[#d4845a]';
                          }

                          const isButtonDimmed = !isExerciseInFocus || !isSessionStarted;

                          return (
                            <button
                              key={setIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetSelection(exerciseIndex, setIndex);
                              }}
                              disabled={isButtonDimmed}
                              className={`
                                w-[17px] h-[17px] rounded-[3px] border-[0.5px] border-solid
                                flex items-center justify-center relative p-0 box-border
                                transition-all duration-150
                                ${variantClasses}
                                ${isExerciseInFocus && isSessionStarted
                                  ? 'cursor-pointer hover:opacity-80'
                                  : 'cursor-default'
                                }
                              `}
                              style={isButtonDimmed ? {
                                backgroundColor: 'rgba(0,0,0,0.21)',
                                borderColor: 'rgba(255,255,255,0.048)'
                              } : {}}
                              title={isExerciseInFocus && isSessionStarted ? `Sélectionner la série ${setIndex + 1}` : isSessionStarted ? 'Sélectionnez cet exercice pour modifier les séries' : 'Commencez la séance pour accéder aux séries'}
                            >
                              {status === 'completed' && (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  className="flex-shrink-0 relative z-10"
                                  style={{ display: 'block', margin: '0' }}
                                >
                                  <path
                                    d="M2 6L4.5 8.5L10 3"
                                    stroke="#4ADE80"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                              {status === 'failed' && (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="flex-shrink-0 relative z-10"
                                  style={{ display: 'block', margin: '0' }}
                                >
                                  <path
                                    d="M3 3L9 9M9 3L3 9"
                                    stroke="#DA3336"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
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
                {isLinkedToNext ? (
                  <div className="h-0" />
                ) : (
                  <div className="h-[10px]" />
                )}
                </React.Fragment>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">
              Aucun exercice trouvé
            </div>
          )}

          {/* Bouton Commencer/Reprendre la séance */}
          {!isSessionStarted && (() => {
            // Vérifier s'il y a au moins une série validée (completed ou failed)
            const hasValidatedSets = Object.keys(completedSets).some(key => {
              const setData = completedSets[key];
              return setData && (setData.status === 'completed' || setData.status === 'failed');
            });

            return (
              <button
                onClick={handleStartSession}
                disabled={!isActive}
                className="
                  inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px]
                  transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
                  disabled:pointer-events-none disabled:opacity-50
                  [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
                  shadow h-9 px-4 w-full py-2 rounded-lg font-normal
                  bg-[#e87c3e] hover:bg-[#d66d35] text-white
                "
              >
                {hasValidatedSets ? 'Reprendre la séance' : 'Commencer la séance'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Complete Session Button - Style Figma */}
      {/* Always show the button when session is started, but enable it only when all exercises are completed */}
      {isSessionStarted && !isReadOnlySession && (
        <div className="relative pl-[60px] pr-[40px] max-w-[400px] mx-auto z-10 pb-5">
          <div className="mt-[10px] mb-[20px] ml-[-5px] w-full">
            <button
              onClick={handleCompleteSession}
              disabled={!isAllExercisesCompleted()}
              className={`
                inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] 
                transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring 
                disabled:pointer-events-none disabled:opacity-50 
                [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 
                shadow h-[36px] px-4 w-full py-2 rounded-lg font-light
                ${isAllExercisesCompleted()
                  ? 'bg-[#e87c3e] hover:bg-[#d66d35] text-white'
                  : 'bg-white/3 text-white/25'
                }
              `}
            >
              Valider la séance
            </button>
            {(() => {
              const { missingVideosCount, missingRpeCount, missingWeightCount } = getMissingVideosAndRpeCount();
              const hasMissingItems = missingVideosCount > 0 || missingRpeCount > 0 || missingWeightCount > 0;

              if (!hasMissingItems) return null;

              const messages = [];
              if (missingVideosCount > 0) {
                messages.push(`${missingVideosCount} vidéo${missingVideosCount > 1 ? 's' : ''} manquante${missingVideosCount > 1 ? 's' : ''}`);
              }
              if (missingWeightCount > 0) {
                messages.push(`${missingWeightCount} charge${missingWeightCount > 1 ? 's' : ''} manquante${missingWeightCount > 1 ? 's' : ''}`);
              }
              if (missingRpeCount > 0) {
                messages.push(`${missingRpeCount} RPE manquant${missingRpeCount > 1 ? 's' : ''}`);
              }

              return (
                <p className="text-[#d4845a] text-[11px] font-medium text-center mt-[8px] whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {messages.join(' • ')}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Video Upload Modal */}
      {(() => {
        // Calculer les indices actifs pour le modal avec sécurité
        const activeExerciseIndex = videoUploadExerciseIndex !== null ? videoUploadExerciseIndex : currentExerciseIndex;
        // Utiliser l'opérateur nullish coalescing (??) pour accepter 0 comme valeur valide
        const activeSetIndex = selectedSetForVideo[activeExerciseIndex] ?? 0;
        const activeExercise = exercises[activeExerciseIndex];
        const activeSet = activeExercise?.sets?.[activeSetIndex];

        // Trouver la vidéo existante pour ce set spécifique
        const existingVideoForSet = localVideos.find(
          v => v.exerciseIndex === activeExerciseIndex && v.setIndex === activeSetIndex
        );

        logger.debug('🔍 existingVideoForSet lookup:', {
          activeExerciseIndex,
          activeSetIndex,
          localVideosCount: localVideos.length,
          found: !!existingVideoForSet,
          hasVideoUrl: !!existingVideoForSet?.videoUrl,
          hasVideoId: !!existingVideoForSet?.videoId,
          file: existingVideoForSet?.file,
          isFromAPI: existingVideoForSet?.isFromAPI
        });

        // Log pour déboguer l'ouverture du modal
        if (isVideoModalOpen) {
          logger.debug('🎥 Opening Video Modal for:', {
            exercise: activeExercise?.name,
            exerciseIndex: activeExerciseIndex,
            setIndex: activeSetIndex,
            existingVideo: existingVideoForSet ? 'Found' : 'None',
            hasVideoUrl: existingVideoForSet?.videoUrl ? 'Yes' : 'No',
            videoId: existingVideoForSet?.videoId
          });
        }

        // Log what we're passing to the modal
        if (isVideoModalOpen && existingVideoForSet) {
          logger.debug('📤 Passing existingVideo to modal:', {
            videoId: existingVideoForSet.videoId,
            videoUrl: existingVideoForSet.videoUrl,
            file: existingVideoForSet.file,
            isFromAPI: existingVideoForSet.isFromAPI,
            status: existingVideoForSet.status
          });
        }

        return (
          <WorkoutVideoUploadModal
            // Clé unique pour forcer le remontage du composant quand les indices changent
            // C'est CRUCIAL pour éviter la duplication d'affichage entre les sets
            key={`upload-modal-${activeExerciseIndex}-${activeSetIndex}`}
            isOpen={isVideoModalOpen}
            onClose={() => setIsVideoModalOpen(false)}
            onUploadSuccess={handleVideoUploadSuccess}
            onDeleteVideo={handleVideoDelete}
            exerciseInfo={{
              exerciseName: activeExercise?.name || 'Exercice',
              exerciseId: activeExercise?.exerciseId,
              exerciseIndex: activeExerciseIndex,
              sessionId: session?.id,
              coachId: session?.coach_id,
              assignmentId: session?.assignment_id || session?.id
            }}
            setInfo={{
              setIndex: activeSetIndex,
              setNumber: activeSetIndex + 1,
              weight: activeExercise?.useRir
                ? (completedSets[`${activeExerciseIndex}-${activeSetIndex}`]?.studentWeight || 0)
                : (activeSet?.weight || 0),
              reps: activeSet?.reps || 0,
              ...(activeExercise?.useRir ? { rpe: activeSet?.weight || 0 } : {})
            }}
            existingVideo={existingVideoForSet}
            isActive={isActive}
          />
        );
      })()}

      {/* Session Completion Modal */}
      <SessionCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => {
          if (!isValidatingSession) {
            setIsCompletionModalOpen(false);
          }
        }}
        onComplete={handleSessionCompletion}
        isValidating={isValidatingSession}
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
          readOnly={isReadOnlySession}
          onValidateSet={handleSetValidation}
          onRpeUpdate={handleRpeUpdate}
          onWeightUpdate={handleWeightUpdate}
          onVideoUpload={(exerciseIndex, setIndex) => {
            if (isReadOnlySession) return;
            const exercise = exercises[exerciseIndex];
            if (exercise && exercise.sets && exercise.sets[setIndex] && exercise.sets[setIndex].video === true) {
              setSelectedSetForVideo(prev => ({
                ...prev,
                [exerciseIndex]: setIndex
              }));
              setVideoUploadExerciseIndex(exerciseIndex); // Store the exercise index for video upload
              // If video was uploaded but URL not yet available, re-fetch from API
              const existingVid = localVideos.find(v => v.exerciseIndex === exerciseIndex && v.setIndex === setIndex);
              if (existingVid && !existingVid.videoUrl) {
                const assignmentId = session?.assignment_id || session?.id;
                if (assignmentId) fetchSessionVideosFromAPI(assignmentId);
              }
              // Keep ExerciseValidationModal open while opening video upload modal
              setIsVideoModalOpen(true);
            }
          }}
          coachFeedback={exercises[selectedExerciseForValidation]?.coach_feedback || exercises[selectedExerciseForValidation]?.coachFeedback || exercises[selectedExerciseForValidation]?.notes || null}
          localVideos={localVideos}
          allExercises={exercises}
          studentComment={exerciseComments[selectedExerciseForValidation] || exercises[selectedExerciseForValidation]?.student_comment || exercises[selectedExerciseForValidation]?.comment || ''}
          onStudentComment={(exerciseIndex, comment) => {
            if (isReadOnlySession) return;
            setExerciseComments(prev => ({
              ...prev,
              [exerciseIndex]: comment
            }));
          }}
          onExerciseChange={(newExerciseIndex) => {
            if (newExerciseIndex >= 0 && newExerciseIndex < exercises.length) {
              // Ne pas vérifier les vidéos manquantes quand on change d'exercice dans la modale
              // L'étudiant est toujours en train de travailler, donc on permet le changement librement
              setSelectedExerciseForValidation(newExerciseIndex);
              setCurrentExerciseIndex(newExerciseIndex);
            }
          }}
          onCompleteSession={handleCompleteSession}
        />
      )}

      {/* Background Upload Progress Indicator */}
      <BackgroundUploadIndicator />

      {/* Leave Session Warning Modal */}
      <LeaveSessionWarningModal
        isOpen={isLeaveWarningModalOpen}
        onClose={() => setIsLeaveWarningModalOpen(false)}
        onConfirm={handleConfirmLeave}
      />

      {/* Missing Videos Warning Modal */}
      <MissingVideosWarningModal
        isOpen={isMissingVideosModalOpen}
        showForceCompleteButton={pendingSessionCompletion && (() => {
          const { missingVideosCount } = getMissingVideosAndRpeCount();
          return missingVideosCount === 0;
        })()}
        missingVideosCount={(() => {
          const { missingVideosCount } = getMissingVideosAndRpeCount();
          return missingVideosCount;
        })()}
        missingRpeCount={(() => {
          const { missingRpeCount } = getMissingVideosAndRpeCount();
          return missingRpeCount;
        })()}
        missingWeightCount={(() => {
          const { missingWeightCount } = getMissingVideosAndRpeCount();
          return missingWeightCount;
        })()}
        onClose={() => {
          // "Rester sur la page" - fermer le modal et annuler l'action en attente
          setIsMissingVideosModalOpen(false);
          setPendingExerciseChange(null);
          setPendingSessionCompletion(false);
        }}
        onConfirm={() => {
          // "Terminer quand même la séance" - permettre la validation malgré vidéos/RPE manquants
          setIsMissingVideosModalOpen(false);

          if (pendingSessionCompletion) {
            setPendingSessionCompletion(false);
            setIsCompletionModalOpen(true);
            return;
          }

          // Si un changement d'exercice était en attente, l'appliquer maintenant
          if (pendingExerciseChange !== null) {
            const newExerciseIndex = pendingExerciseChange;
            setPendingExerciseChange(null);

            // Si on était dans la modale de validation, la fermer et changer d'exercice
            if (isExerciseValidationModalOpen) {
              setIsExerciseValidationModalOpen(false);
              setSelectedExerciseForValidation(newExerciseIndex);
              setCurrentExerciseIndex(newExerciseIndex);
            } else {
              // Sinon, ouvrir la modale de validation pour le nouvel exercice
              setSelectedExerciseForValidation(newExerciseIndex);
              setCurrentExerciseIndex(newExerciseIndex);
              setIsExerciseValidationModalOpen(true);
            }
          }
        }}
      />
    </div>
  );
};

export default WorkoutSessionExecution;
