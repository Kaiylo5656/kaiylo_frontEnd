import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Play, Volume2, Maximize, Mic } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import SessionExercisesModal from './SessionExercisesModal';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessage from './VoiceMessage';

const CoachSessionReviewModal = ({ isOpen, onClose, session, selectedDate, studentId }) => {
  const { getAuthToken, refreshAuthToken } = useAuth();
  const [sessionVideos, setSessionVideos] = useState([]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [sessionDifficulty, setSessionDifficulty] = useState('');
  const [sessionComment, setSessionComment] = useState('');
  const [selectedSetIndex, setSelectedSetIndex] = useState(null);
  const [coachComment, setCoachComment] = useState('');
  const textareaRef = React.useRef(null);
  const [exercisesPosition, setExercisesPosition] = useState({ 
    width: 340 
  });
  const contentRef = useRef(null);
  const exercisesButtonRef = useRef(null);
  const [mainModalHeight, setMainModalHeight] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [audioRecording, setAudioRecording] = useState(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => { 
      document.body.style.overflow = prev; 
    };
  }, [isOpen]);

  // Fetch videos for this session and load student feedback
  useEffect(() => {
    if (isOpen && session && studentId) {
      setSessionVideos([]);
      setSelectedExerciseIndex(0);
      setSelectedVideo(null);
      setSelectedSetIndex(null);
      setFeedback('');
      setCoachComment('');
      setLoading(true);
      
      fetchSessionVideos();
      setSessionDifficulty(session.difficulty || '');
      
      // Try multiple possible fields for student comment
      // ONLY check global session-level comment, NOT exercise-level comments
      // Exercise comments should be displayed separately in the exercise section (see line ~1059)
      let studentComment = session.notes || session.comment || session.studentComment || session.student_comment || '';
      
      // Do NOT aggregate exercise-level comments into session comment
      // Exercise comments are displayed in their own section when viewing individual exercises
      setSessionComment(studentComment);
    }
  }, [isOpen, session, studentId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [coachComment]);

  // Update exercises modal width
  const updateExercisesPosition = useCallback(() => {
    const panelWidth = 340;
    setExercisesPosition({ width: panelWidth });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateExercisesPosition();
    }
  }, [isOpen, updateExercisesPosition]);

  // Calculer la hauteur de la modale principale pour aligner la modale exercices
  useEffect(() => {
    if (!contentRef.current || !exercisesButtonRef.current) return;
    
    const updateHeight = () => {
      if (contentRef.current && exercisesButtonRef.current) {
        const modalRect = contentRef.current.getBoundingClientRect();
        const buttonRect = exercisesButtonRef.current.getBoundingClientRect();
        const gap = 10; // 10px gap between button and modal (gap-2.5 = 10px)
        // La hauteur de la modale exercices = hauteur modale principale - (position du bouton depuis le haut + hauteur du bouton + gap)
        const buttonTop = buttonRect.top - modalRect.top;
        const buttonHeight = buttonRect.height;
        const availableHeight = modalRect.height - (buttonTop + buttonHeight + gap);
        setMainModalHeight(availableHeight);
      }
    };

    if (isOpen) {
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [isOpen, contentRef, exercisesButtonRef]);

  const fetchSessionVideos = async () => {
    try {
      setLoading(true);
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        console.warn('No auth token available for coach videos fetch. Skipping.');
        setSessionVideos([]);
        return;
      }
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            studentId: studentId,
            assignmentId: session.assignmentId || session.id
          }
        }
      );
      
      if (response.data.success) {
        const videos = response.data.data || [];
        console.log('📹 Fetched session videos:', videos.length, videos);
        setSessionVideos(videos);
        // Auto-select first exercise and first set
        if (session.exercises && session.exercises.length > 0) {
          setSelectedExerciseIndex(0);
          const firstExercise = session.exercises[0];
          const firstSetIndexWithVideo = findFirstSetWithVideo(firstExercise, 0);
          
          if (firstSetIndexWithVideo !== null) {
            setSelectedSetIndex(firstSetIndexWithVideo);
            const firstExerciseVideos = getVideosForExercise(firstExercise, 0);
            const firstSetVideo = firstExerciseVideos.find(v => 
              v.set_number === firstSetIndexWithVideo + 1 || 
              v.set_index === firstSetIndexWithVideo ||
              (v.set_number && v.set_number === firstExercise.sets[firstSetIndexWithVideo].serie)
            );
            if (firstSetVideo) {
              setSelectedVideo(firstSetVideo);
              setFeedback(firstSetVideo.coach_feedback || '');
              setCoachComment('');
            }
          } else {
            // No video for any set in this exercise
            setSelectedSetIndex(null);
            setSelectedVideo(null);
            setFeedback('');
            setCoachComment('');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching session videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideosForExercise = (exercise, exerciseIndex) => {
    if (!exercise) return [];
    
    if (exerciseIndex !== undefined && exerciseIndex !== null) {
      const filtered = sessionVideos.filter(
        (video) => video.exercise_index === exerciseIndex && video.exercise_name === exercise.name
      );
      if (filtered.length > 0) {
        return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
      }
    }
    
    const exerciseId = exercise.id || exercise.exercise_id || exercise.exerciseId || null;
    if (exerciseId) {
      const hasDuplicates = session?.exercises && 
        session.exercises.filter(ex => ex.name === exercise.name).length > 1;
      
      if (hasDuplicates && exerciseIndex !== undefined && exerciseIndex !== null) {
        const filtered = sessionVideos.filter(
          (video) => video.exercise_id && video.exercise_id === exerciseId && 
          (video.exercise_index === exerciseIndex || video.exercise_index === null || video.exercise_index === undefined)
        );
        if (filtered.length > 0) {
          return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
        }
      } else {
        const filtered = sessionVideos.filter(
          (video) => video.exercise_id && video.exercise_id === exerciseId
        );
        if (filtered.length > 0) {
          return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
        }
      }
    }
    
    if (exercise.name) {
      const allVideosForName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name
      );
      
      if (exerciseIndex !== undefined && exerciseIndex !== null && session?.exercises) {
        const exercisesWithSameName = session.exercises.filter(ex => ex.name === exercise.name);
        
        if (exercisesWithSameName.length > 1) {
          const firstOccurrenceIndex = session.exercises.findIndex(ex => ex.name === exercise.name);
          
          if (exerciseIndex === firstOccurrenceIndex) {
            const filtered = allVideosForName.filter(video => 
              video.exercise_index === null || video.exercise_index === undefined
            );
            return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
          } else {
            return [];
          }
        }
      }
      
      return allVideosForName.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
    }
    
    return [];
  };

  // Find the first set index that has a video for the given exercise
  const findFirstSetWithVideo = (exercise, exerciseIndex) => {
    if (!exercise || !exercise.sets || exercise.sets.length === 0) {
      return null;
    }
    
    const exerciseVideos = getVideosForExercise(exercise, exerciseIndex);
    if (exerciseVideos.length === 0) {
      return null;
    }
    
    // Find the first set that has a video
    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
      const setVideo = exerciseVideos.find(v => 
        v.set_number === setIndex + 1 || 
        v.set_index === setIndex ||
        (v.set_number && v.set_number === exercise.sets[setIndex].serie)
      );
      if (setVideo && setVideo.video_url) {
        return setIndex;
      }
    }
    
    return null;
  };

  const handleSetSelect = (setIndex, exercise, exerciseIndex) => {
    setSelectedSetIndex(setIndex);
    setSelectedExerciseIndex(exerciseIndex);
    const exerciseVideos = getVideosForExercise(exercise, exerciseIndex);
    const setVideo = exerciseVideos.find(v => v.set_number === setIndex + 1);
    if (setVideo) {
      setSelectedVideo(setVideo);
      setFeedback(setVideo.coach_feedback || '');
      setCoachComment('');
    } else {
      setSelectedVideo(null);
      setFeedback('');
      setCoachComment('');
    }
  };

  const handleSaveComment = async (videoToSave = null, audioFile = null) => {
    // Use the provided video, or fallback to selectedVideo
    const video = videoToSave || selectedVideo;
    
    if (!video || !video.id) {
      console.warn('No video selected for saving feedback');
      return;
    }
    
    // At least one of text or audio feedback must be provided
    if (!coachComment.trim() && !audioFile && !audioRecording) {
      console.warn('No feedback to save (neither text nor audio)');
      return;
    }
    
    try {
      setSavingFeedback(true);
      const token = await getAuthToken();
      
      if (!token) {
        alert('Erreur d\'authentification. Veuillez vous reconnecter.');
        return;
      }
      
      // Use audioFile parameter or audioRecording state
      const audioToSend = audioFile || audioRecording;
      
      // If audio is present, use FormData; otherwise use JSON
      if (audioToSend) {
        const formData = new FormData();
        if (coachComment.trim()) {
          formData.append('feedback', coachComment.trim());
        }
        formData.append('audio', audioToSend);
        formData.append('rating', '5');
        formData.append('status', 'completed');
        
        await axios.patch(
          `${getApiBaseUrlWithApi()}/workout-sessions/videos/${video.id}/feedback`,
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        // Text-only feedback
        await axios.patch(
          `${getApiBaseUrlWithApi()}/workout-sessions/videos/${video.id}/feedback`,
          {
            feedback: coachComment.trim(),
            rating: 5,
            status: 'completed'
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
      
      // Fetch updated videos to get the audio URL if audio was sent
      const { data: responseData } = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            studentId: studentId,
            assignmentId: session.assignmentId || session.id
          }
        }
      );
      
      if (responseData.success && responseData.data) {
        // Update all videos in sessionVideos with the latest data from API
        setSessionVideos(prev => {
          const updated = prev.map(v => {
            const updatedVideoFromApi = responseData.data.find(apiV => apiV.id === v.id);
            if (updatedVideoFromApi) {
              // Merge API data with existing video data
              const mergedVideo = {
                ...v,
                coach_feedback: updatedVideoFromApi.coach_feedback || v.coach_feedback,
                coach_feedback_audio_url: updatedVideoFromApi.coach_feedback_audio_url || v.coach_feedback_audio_url,
                coach_rating: updatedVideoFromApi.coach_rating || v.coach_rating,
                status: updatedVideoFromApi.status || v.status
              };
              return mergedVideo;
            }
            return v;
          });
          return updated;
        });
        
        // Update selectedVideo to reflect the saved feedback immediately
        const updatedVideoFromApi = responseData.data.find(v => v.id === video.id);
        if (updatedVideoFromApi) {
          const updatedVideo = {
            ...video,
            coach_feedback: updatedVideoFromApi.coach_feedback || video.coach_feedback,
            coach_feedback_audio_url: updatedVideoFromApi.coach_feedback_audio_url || video.coach_feedback_audio_url,
            coach_rating: updatedVideoFromApi.coach_rating || video.coach_rating,
            status: updatedVideoFromApi.status || video.status
          };
          setSelectedVideo(updatedVideo);
        }
      }
      
      // Clear the inputs after successful save
      setCoachComment('');
      setAudioRecording(null);
      setIsRecordingVoice(false);
    } catch (error) {
      console.error('Error saving feedback:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert('Erreur lors de la sauvegarde du commentaire. Veuillez réessayer.');
    } finally {
      setSavingFeedback(false);
    }
  };
  
  // Handle voice message send
  const handleVoiceMessageSend = useCallback((audioFile) => {
    if (audioFile && selectedVideo) {
      setAudioRecording(audioFile);
      // Automatically save the feedback with audio
      handleSaveComment(selectedVideo, audioFile);
    }
  }, [selectedVideo]);
  
  // Handle voice recorder cancel
  const handleVoiceRecorderCancel = useCallback(() => {
    setIsRecordingVoice(false);
    setAudioRecording(null);
  }, []);

  const handleSaveAndQuit = async () => {
    // Save comment first if there is one
    if (selectedVideo && coachComment.trim()) {
      await handleSaveComment();
    }
    // Then close the modal
    onClose();
  };

  // Calculate selectedExercise (must be before useMemo hooks to maintain hook order)
  const selectedExercise = session?.exercises && session.exercises[selectedExerciseIndex] 
    ? session.exercises[selectedExerciseIndex] 
    : null;
  
  // Memoize exerciseVideos to recalculate when sessionVideos changes
  // Must be called unconditionally (same order every render)
  // Note: getVideosForExercise uses sessionVideos from closure, so we include sessionVideos in deps
  const exerciseVideos = useMemo(() => {
    if (!selectedExercise || !session) return [];
    return getVideosForExercise(selectedExercise, selectedExerciseIndex);
  }, [selectedExercise, selectedExerciseIndex, sessionVideos, session]);
  
  // Memoize currentSetVideo to recalculate when exerciseVideos or selectedSetIndex changes
  // Must be called unconditionally (same order every render)
  const currentSetVideo = useMemo(() => {
    if (selectedSetIndex === null || !exerciseVideos || exerciseVideos.length === 0) {
      return null;
    }
    const video = exerciseVideos.find(v => v.set_number === selectedSetIndex + 1);
    return video;
  }, [selectedSetIndex, exerciseVideos]);
  
  const currentSet = selectedSetIndex !== null ? selectedExercise?.sets?.[selectedSetIndex] : null;
  const currentSetRpe = currentSet?.rpe || currentSet?.rpe_rating || currentSetVideo?.rpe_rating || null;

  if (!session) return null;

  // Calculate session duration
  const sessionDuration = session.startTime && session.endTime
    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
    : null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      style={{ zIndex: 100 }}
      onClick={handleBackdropClick}
    >
      <div className="relative">
        {/* Exercises button and modal container - positioned outside modal to the right */}
        <div 
          className="absolute flex flex-col gap-2.5"
          style={{
            left: '100%',
            marginLeft: '1rem',
            top: '1.125rem',
            zIndex: 101,
          }}
        >
          <button
            ref={exercisesButtonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Masquer les exercices" : "Voir tous les exercices de la séance"}
            disabled={isOpen}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              isOpen 
                ? 'scale-95 opacity-60 cursor-not-allowed' 
                : 'bg-white/15 hover:scale-105 hover:bg-white/15'
            }`}
            style={{
              ...(isOpen && { 
                backgroundColor: 'var(--kaiylo-primary-hex)',
                opacity: 0.6
              })
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 512 512" 
              className={`h-4 w-4 text-white transition-transform duration-150 ${isOpen ? '' : 'rotate-180'}`}
              fill="currentColor"
            >
              <path d="M48 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM48 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM96 256a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z"/>
            </svg>
          </button>

          {/* Exercises panel */}
          {isOpen && (
            <SessionExercisesModal
              isOpen={isOpen}
              onClose={() => {}}
              session={session}
              position={exercisesPosition}
              mainModalHeight={mainModalHeight}
              sessionVideos={sessionVideos}
              onExerciseSelect={(exerciseIndex) => {
                setSelectedExerciseIndex(exerciseIndex);
                // Update video selection for the new exercise
                const newExercise = session.exercises[exerciseIndex];
                if (newExercise) {
                  const firstSetIndexWithVideo = findFirstSetWithVideo(newExercise, exerciseIndex);
                  
                  if (firstSetIndexWithVideo !== null) {
                    setSelectedSetIndex(firstSetIndexWithVideo);
                    const exerciseVideos = getVideosForExercise(newExercise, exerciseIndex);
                    const firstSetVideo = exerciseVideos.find(v => 
                      v.set_number === firstSetIndexWithVideo + 1 || 
                      v.set_index === firstSetIndexWithVideo ||
                      (v.set_number && v.set_number === newExercise.sets[firstSetIndexWithVideo].serie)
                    );
                    if (firstSetVideo) {
                      setSelectedVideo(firstSetVideo);
                      setFeedback(firstSetVideo.coach_feedback || '');
                      setCoachComment('');
                    }
                  } else {
                    // No video for any set in this exercise
                    setSelectedSetIndex(null);
                    setSelectedVideo(null);
                    setFeedback('');
                    setCoachComment('');
                  }
                }
              }}
              selectedExerciseIndex={selectedExerciseIndex}
            />
          )}
        </div>
        <div 
          ref={contentRef}
          className="relative mx-auto w-full max-w-5xl max-h-[92vh] overflow-visible rounded-2xl shadow-2xl flex flex-col"
          style={{
            background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
            opacity: 0.95
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header Section */}
        <div className="shrink-0 px-6 pt-6 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                  <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z"/>
                </svg>
                {session.title || 'Séance d\'entraînement'}
              </h2>
              <span className="text-xl font-extralight" style={{ color: 'var(--kaiylo-primary-hex)' }}> - </span>
              <p className="text-xl font-extralight" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                {(() => {
                  const formattedDate = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
                  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                })()}
                {session.startTime && session.endTime && (
                  <>
                    {' - '}
                    {format(new Date(session.startTime), 'HH:mm')}
                    {' à '}
                    {format(new Date(session.endTime), 'HH:mm')}
                    {sessionDuration && ` (${sessionDuration}min)`}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 pt-3 pb-6 space-y-5">
          {/* Difficulty and Comment Section */}
          <div className="flex flex-col gap-3 mb-[12px]">
            {/* Headings row */}
            <div className="flex gap-[22px] items-start">
              <h3 className="text-[14px] font-extralight text-white/50 leading-tight mb-0">Commentaire global :</h3>
              <div className="flex-shrink-0 w-[111px]">
                <h3 className="text-[14px] font-extralight text-white/50 leading-tight mb-0 text-center"></h3>
              </div>
            </div>

            <div className="flex gap-[18px] items-stretch">
              {/* Global Comment Section */}
              <div className="flex-1 flex">
                <div className={`bg-[rgba(0,0,0,0.25)] border-0 rounded-[10px] px-[12px] py-[12px] h-[102px] w-[507px] text-[14px] font-light leading-tight whitespace-pre-wrap break-words overflow-y-auto ${
                  sessionComment ? 'text-white' : 'text-white/25'
                }`}>
                  {sessionComment ? (sessionComment.charAt(0).toUpperCase() + sessionComment.slice(1)) : 'Aucun commentaire de l\'élève'}
                </div>
              </div>

              {/* Difficulty buttons column */}
              <div className="flex-shrink-0">
                <div className="flex flex-col gap-[6px]">
                  {['Facile', 'Moyen', 'Difficile'].map((level) => {
                    const isSelected = sessionDifficulty?.toLowerCase() === level.toLowerCase();
                    return (
                      <div
                        key={level}
                        className={`
                          h-[30px] px-[32px] py-[8px] rounded-[10px] text-[14px] leading-tight
                          border-0 flex items-center justify-center text-center whitespace-nowrap
                          ${
                            isSelected
                              ? 'bg-[#D4845A] text-white font-normal shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)]'
                              : 'bg-[rgba(0,0,0,0.25)] text-white/75 font-light shadow-none'
                          }
                        `}
                      >
                        {level}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full mt-[12px] bg-white/10"></div>

          {/* Exercise Title */}
          {selectedExercise && (
            <div className="mb-[10px]">
              <h3 className="text-[18px] font-light text-white leading-tight flex items-center gap-[6px]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-[20px] w-[20px] flex-shrink-0" style={{ color: '#D4845A' }}>
                  <path d="M441.3 299.8C451.5 312.4 450.8 330.9 439.1 342.6L311.1 470.6C301.9 479.8 288.2 482.5 276.2 477.5C264.2 472.5 256.5 460.9 256.5 448L256.5 192C256.5 179.1 264.3 167.4 276.3 162.4C288.3 157.4 302 160.2 311.2 169.3L439.2 297.3L441.4 299.7z" fill="currentColor"/>
                </svg>
                {(() => {
                  const setsCount = selectedExercise.sets?.length || 0;
                  const repsPerSet = selectedExercise.sets?.[0]?.reps;
                  const weight = selectedExercise.sets?.[0]?.weight;
                  
                  // Si useRir === true, on doit afficher le RPE au lieu de la charge
                  let displayValue = null;
                  let displayLabel = '';
                  
                  if (selectedExercise.useRir || selectedExercise.use_rir) {
                    // Quand useRir === true, le champ weight contient le RPE demandé par le coach
                    const firstSet = selectedExercise.sets?.[0];
                    const requestedRpe = firstSet?.weight;
                    
                    if (requestedRpe !== undefined && requestedRpe !== null && requestedRpe !== '') {
                      // Convertir en nombre si nécessaire
                      const rpeNumber = typeof requestedRpe === 'string' ? parseFloat(requestedRpe) : requestedRpe;
                      if (!isNaN(rpeNumber) && rpeNumber >= 1 && rpeNumber <= 10) {
                        displayValue = Math.round(rpeNumber);
                        displayLabel = 'RPE';
                      }
                    }
                  } else {
                    // Si useRir === false, afficher la charge normale
                    if (weight !== undefined && weight !== null) {
                      displayValue = weight;
                      displayLabel = 'kg';
                    }
                  }
                  
                  return (
                    <>
                      <span className="font-normal">{selectedExercise.name}</span>
                      {setsCount > 0 && repsPerSet !== undefined && repsPerSet !== null && (
                        <span className="text-white font-normal">
                          {' '}{setsCount}x{repsPerSet}
                        </span>
                      )}
                      {displayValue !== null && (
                        <span className="text-[#D4845A] font-normal">
                          {displayLabel === 'kg' ? ` @${displayValue}${displayLabel}` : ` RPE ${displayValue}`}
                        </span>
                      )}
                    </>
                  );
                })()}
              </h3>
            </div>
          )}

          {/* Exercise and Sets Section */}
          <div className="flex gap-[20px] mb-[20px]">
            {/* Left: Exercise Sets */}
            <div className="w-[320px] flex-shrink-0 flex flex-col">
              <div className="h-[171px] overflow-y-auto space-y-[7px] pr-2 scrollbar-transparent">
              {selectedExercise && selectedExercise.sets?.map((set, setIndex) => {
                    // Try to find video by set_number (1-indexed) or set_index (0-indexed)
                    const setVideo = exerciseVideos.find(v => 
                      v.set_number === setIndex + 1 || 
                      v.set_index === setIndex ||
                      (v.set_number && v.set_number === set.serie) ||
                      (v.set_index !== undefined && v.set_index === setIndex)
                    );
                    // Try multiple sources for RPE value
                    // Check set first (RPE might be stored directly in the set after completion)
                    // The RPE could be in various fields depending on how it was saved
                    let rpeValue = set.rpe || 
                                   set.rpe_rating || 
                                   set.rpeRating || 
                                   set.RPE || // Sometimes uppercase
                                   (set.completedSets && typeof set.completedSets === 'object' && set.completedSets.rpeRating) ||
                                   null;
                    
                    // Convert to number if it's a string
                    if (rpeValue && typeof rpeValue === 'string') {
                      rpeValue = parseInt(rpeValue, 10) || null;
                    }
                    
                    // If not in set, check video
                    if (!rpeValue && setVideo) {
                      rpeValue = setVideo.rpe_rating || setVideo.rpe || null;
                      if (rpeValue && typeof rpeValue === 'string') {
                        rpeValue = parseInt(rpeValue, 10) || null;
                      }
                    }
                    
                    // If still no RPE, try to find it in any video for this set number
                    if (!rpeValue && exerciseVideos.length > 0) {
                      const anySetVideo = exerciseVideos.find(v => 
                        (v.set_number === setIndex + 1 || v.set_index === setIndex) && 
                        (v.rpe_rating || v.rpe)
                      );
                      if (anySetVideo) {
                        rpeValue = anySetVideo.rpe_rating || anySetVideo.rpe || null;
                        if (rpeValue && typeof rpeValue === 'string') {
                          rpeValue = parseInt(rpeValue, 10) || null;
                        }
                      }
                    }
                    
                    // Ensure rpeValue is a valid number (1-10) or null
                    if (rpeValue !== null && (isNaN(rpeValue) || rpeValue < 1 || rpeValue > 10)) {
                      rpeValue = null;
                    }
                    const setStatus = set.validation_status || (setVideo?.status === 'completed' ? 'completed' : null);
                    const isSelected = selectedSetIndex === setIndex;
                    const isFailed = setStatus === 'failed';
                    const hasVideo = setVideo && setVideo.video_url;
                    
                    // Debug RPE and weight for this set - show full set object
                    if (setIndex === 0 && (selectedExercise.useRir || selectedExercise.use_rir)) {
                      console.log('🔍 Charge/RPE Debug for first set (useRir=true):', {
                        setIndex,
                        set: JSON.parse(JSON.stringify(set)), // Deep clone to see all properties
                        setKeys: Object.keys(set), // Show all keys in the set object
                        setVideo: setVideo,
                        studentWeight: set.studentWeight || set.student_weight,
                        studentWeightFromCompletedSets: set.completedSets?.studentWeight,
                        videoStudentWeight: setVideo?.student_weight || setVideo?.studentWeight,
                        requestedRpe: set.weight,
                        rpeValue: rpeValue,
                        useRir: selectedExercise.useRir || selectedExercise.use_rir
                      });
                    }
                    
                    return (
                      <div
                        key={setIndex}
                        onClick={hasVideo ? () => handleSetSelect(setIndex, selectedExercise, selectedExerciseIndex) : undefined}
                        className={`
                          h-[37.5px] px-[15px] rounded-[8px]
                          flex items-center justify-between
                          ${hasVideo ? 'cursor-pointer transition-colors' : ''}
                          ${
                            hasVideo
                              ? isSelected
                                ? 'bg-[rgba(212,132,90,0.2)]'
                                : 'bg-black/50'
                              : ''
                          }
                        `}
                      >
                        <div className="flex items-end justify-end gap-[15px]">
                          <div className="w-[30px] h-[15px] flex items-center">
                            <span className={`text-[12px] ${isSelected ? 'font-normal text-[#D4845A]' : 'font-light text-white/50'}`}>
                              Set {setIndex + 1}
                            </span>
                          </div>
                          <span className={`text-[14px] ${isSelected ? 'font-normal text-[#D4845A]' : 'font-light text-white'}`}>
                            {set.reps || '?'}{set.repType === 'hold' ? '' : ' reps'}
                            {(() => {
                              // Si useRir === true, afficher le RPE demandé au lieu de la charge
                              if (selectedExercise.useRir || selectedExercise.use_rir) {
                                const requestedRpe = set.weight;
                                if (requestedRpe !== undefined && requestedRpe !== null && requestedRpe !== '') {
                                  const rpeNumber = typeof requestedRpe === 'string' ? parseFloat(requestedRpe) : requestedRpe;
                                  if (!isNaN(rpeNumber) && rpeNumber >= 1 && rpeNumber <= 10) {
                                    return (
                                      <span className={`font-normal ${isSelected ? 'text-[#D4845A]' : 'text-[#D4845A]'}`}>
                                        {' RPE '}{Math.round(rpeNumber)}
                                      </span>
                                    );
                                  }
                                }
                              } else {
                                // Si useRir === false, afficher la charge normale
                                return (
                                  <span className={`font-normal ${isSelected ? 'text-[#D4845A]' : 'text-[#D4845A]'}`}>
                                    {' @'}{set.weight || 0}kg
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-end gap-[15px]">
                          {(() => {
                            // Si useRir === true, afficher la charge renseignée par l'élève au lieu du RPE
                            if (selectedExercise.useRir || selectedExercise.use_rir) {
                              // Récupérer la charge (studentWeight) depuis plusieurs sources possibles
                              let studentWeight = set.studentWeight || 
                                                set.student_weight ||
                                                set.studentWeightValue ||
                                                (set.completedSets && typeof set.completedSets === 'object' && set.completedSets.studentWeight) ||
                                                (set.data && typeof set.data === 'object' && set.data.studentWeight) ||
                                                setVideo?.student_weight ||
                                                setVideo?.studentWeight ||
                                                setVideo?.weight ||
                                                null;
                              
                              // Si toujours null, chercher dans les données de session complétée
                              if (!studentWeight && session?.exercises?.[selectedExerciseIndex]?.sets?.[setIndex]) {
                                const completedSet = session.exercises[selectedExerciseIndex].sets[setIndex];
                                studentWeight = completedSet.studentWeight || 
                                             completedSet.student_weight ||
                                             (completedSet.completedSets && typeof completedSet.completedSets === 'object' && completedSet.completedSets.studentWeight) ||
                                             null;
                              }
                              
                              // Si toujours null et qu'il n'y a pas de vidéo, essayer d'utiliser la charge demandée du set original comme fallback
                              // (ceci permettra d'afficher la charge même sans vidéo uploadée)
                              if (!studentWeight && !hasVideo && set.weight !== undefined && set.weight !== null && set.weight !== '') {
                                studentWeight = set.weight;
                              }
                              
                              // Convertir en string si nécessaire et afficher
                              if (studentWeight !== null && studentWeight !== undefined && studentWeight !== '') {
                                const weightValue = String(studentWeight).trim();
                                if (weightValue) {
                                  return (
                                    <div className="h-[15px] px-[5px] py-0 rounded-[3px] flex items-center justify-center">
                                      <span className="text-[12px] font-light text-white/50">Charge : <span className="text-[#D4845A] font-normal" style={{ fontWeight: 500 }}>{weightValue}kg</span></span>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            } else {
                              // Si useRir === false, afficher le RPE normal
                              // Le coach a demandé un RPE, donc set.weight contient la valeur RPE demandée
                              if (rpeValue) {
                                return (
                                  <div className="h-[15px] px-[5px] py-0 rounded-[3px] flex items-center justify-center">
                                    <span className="text-[12px] font-light text-white/50">RPE : <span className="text-[#D4845A] font-normal" style={{ fontWeight: 500 }}>{rpeValue}</span></span>
                                  </div>
                                );
                              }
                              // Si pas de RPE enregistré mais qu'il y a une valeur demandée (set.weight contient le RPE demandé par le coach)
                              // Afficher le RPE demandé comme fallback (car useRir === false signifie que c'est du RPE, pas une charge)
                              if (!hasVideo && set.weight !== undefined && set.weight !== null && set.weight !== '') {
                                const requestedRpe = set.weight;
                                // Vérifier que c'est bien un RPE valide (1-10)
                                if (!isNaN(parseFloat(requestedRpe)) && parseFloat(requestedRpe) >= 1 && parseFloat(requestedRpe) <= 10) {
                                  return (
                                    <div className="h-[15px] px-[5px] py-0 rounded-[3px] flex items-center justify-center">
                                      <span className="text-[12px] font-light text-white/50">RPE : <span className="text-[#D4845A] font-normal" style={{ fontWeight: 500 }}>{Math.round(parseFloat(requestedRpe))}</span></span>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            }
                          })()}
                          {setStatus === 'completed' && (
                            <svg 
                              width="20" 
                              height="20" 
                              viewBox="0 0 12 12" 
                              fill="none" 
                              className="flex-shrink-0 relative z-10"
                              style={{ display: 'block', margin: '0' }}
                            >
                              <path 
                                d="M2 6L4.5 8.5L10 3" 
                                stroke="#2FA064" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {setStatus === 'failed' && (
                            <svg 
                              width="20" 
                              height="20" 
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
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Student Comment for this Exercise - Display at bottom of sets list */}
              {selectedExercise && (
                <div className="mt-[12px] pt-[12px] border-t border-white/10">
                  <div className="text-[14px] font-extralight text-white/50 mb-[12px]">Commentaire sur l'exercice :</div>
                  <div className={`text-[14px] font-light bg-black/25 rounded-[10px] px-[12px] py-[12px] break-words h-[102px] overflow-y-auto ${
                    selectedExercise.comment || selectedExercise.studentComment || selectedExercise.student_comment
                      ? 'text-white'
                      : 'text-white/25'
                  }`}>
                    {(() => {
                      const exerciseComment = selectedExercise.comment || selectedExercise.studentComment || selectedExercise.student_comment || '';
                      return exerciseComment ? (exerciseComment.charAt(0).toUpperCase() + exerciseComment.slice(1)) : 'Aucun commentaire de l\'élève';
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Video Player */}
            <div className="flex-1 flex flex-col min-w-[300px]">
              {currentSetVideo && currentSetVideo.video_url ? (
                <div className="bg-[#1A1A1D] rounded-[10px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] relative min-h-[320px] flex flex-col pt-[14px] px-[14px] pb-[14px]">
                  {/* Video Player Container */}
                  <div className="bg-black rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)] overflow-hidden mb-[12px] flex-shrink-0 relative flex flex-col">
                    {/* Video Player */}
                    <div className="h-[158px] w-full overflow-hidden">
                      <video
                        src={currentSetVideo.video_url}
                        controls
                        className="w-full h-full object-contain"
                        poster={currentSetVideo.thumbnail_url}
                      />
                    </div>
                  </div>

                  {/* Comment Display Section - In gray container, not in black video box */}
                  <div className="flex flex-col gap-[8px] mb-[12px] flex-shrink-0">
                    <div className="text-[10px] font-normal text-[var(--kaiylo-primary-hex)] flex-shrink-0">Commentaire coach :</div>
                    
                    {/* Audio feedback display */}
                    {currentSetVideo?.coach_feedback_audio_url && (
                      <div className="mb-2">
                        <VoiceMessage 
                          message={{
                            file_url: currentSetVideo.coach_feedback_audio_url,
                            message_type: 'audio',
                            file_type: 'audio/webm'
                          }} 
                          isOwnMessage={true}
                        />
                      </div>
                    )}
                    
                    {/* Text feedback display */}
                    {currentSetVideo?.coach_feedback && (
                      <div className="text-[14px] font-light text-white overflow-y-auto pr-1 break-words bg-[rgba(0,0,0,0.25)] rounded-[10px] px-[12px] py-[12px] w-[272px] min-h-[45px]">
                        {currentSetVideo.coach_feedback}
                      </div>
                    )}
                    
                    {/* No feedback message */}
                    {!currentSetVideo?.coach_feedback && !currentSetVideo?.coach_feedback_audio_url && (
                      <div className="text-[14px] font-light text-white/50 overflow-y-auto pr-1 break-words bg-[rgba(0,0,0,0.25)] rounded-[10px] px-[12px] py-[12px] w-[272px] h-[45px]">
                        Aucun commentaire
                      </div>
                    )}
                  </div>

                  {/* Coach Comment Input - Below video box */}
                  <div className="w-full min-h-[48px] bg-[#121214] rounded-[10px] px-[14px] py-[12px] flex items-center gap-3 flex-shrink-0 mt-auto">
                    {isRecordingVoice ? (
                      <VoiceRecorder
                        onSend={handleVoiceMessageSend}
                        onCancel={handleVoiceRecorderCancel}
                        disabled={savingFeedback}
                      />
                    ) : (
                      <>
                        <textarea
                          ref={textareaRef}
                          value={coachComment}
                          onChange={(e) => {
                            setCoachComment(e.target.value);
                            setFeedback(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if ((coachComment.trim() || audioRecording) && currentSetVideo) {
                                handleSaveComment(currentSetVideo, audioRecording);
                              }
                            }
                          }}
                          placeholder="Ajouter un commentaire ..."
                          rows={1}
                          className="flex-1 bg-transparent text-[13px] font-light text-white placeholder-white/50 outline-none resize-none overflow-y-auto leading-normal"
                          style={{ minHeight: '24px', maxHeight: '100px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsRecordingVoice(true)}
                          disabled={savingFeedback || !currentSetVideo}
                          className="flex items-center justify-center cursor-pointer p-1.5 w-[28px] h-[28px] flex-shrink-0 disabled:cursor-not-allowed rounded-md hover:bg-white/5 transition-colors"
                          title="Enregistrer un message vocal"
                        >
                          <Mic className="h-4 w-4" style={{ fill: 'var(--kaiylo-primary-hex)', color: 'var(--kaiylo-primary-hex)' }} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if ((coachComment.trim() || audioRecording) && currentSetVideo) {
                              handleSaveComment(currentSetVideo, audioRecording);
                            }
                          }}
                          className="flex items-center justify-center cursor-pointer p-1.5 w-[28px] h-[28px] flex-shrink-0 disabled:cursor-not-allowed rounded-md hover:bg-white/5 transition-colors"
                          style={{ opacity: 1 }}
                          disabled={(!coachComment.trim() && !audioRecording) || savingFeedback || !currentSetVideo}
                          type="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" style={{ fill: 'var(--kaiylo-primary-hex)' }}>
                            <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-black/50 border-none rounded-[10px] p-[17.5px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] h-[171px] flex flex-col">
                  <div className="bg-black flex-1 rounded-[10px] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-8 w-8 text-white/25">
                      <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L447.9 414.2L447.9 192C447.9 156.7 419.2 128 383.9 128L161.8 128L73 39.1zM64 192L64 448C64 483.3 92.7 512 128 512L384 512C391.8 512 399.3 510.6 406.2 508L68 169.8C65.4 176.7 64 184.2 64 192zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAndQuit}
              disabled={savingFeedback}
              className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              {savingFeedback ? 'Sauvegarde...' : 'Sauvegarder & Quitter'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CoachSessionReviewModal;
