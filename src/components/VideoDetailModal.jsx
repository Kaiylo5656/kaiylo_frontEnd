import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Send, Save, Edit3, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl, getApiBaseUrlWithApi } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useVideoModal } from '../contexts/VideoModalContext';
import ReactPlayer from 'react-player';
import VideoPlayer from './VideoPlayer';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessage from './VoiceMessage';
import logger from '../utils/logger';

const VideoDetailModal = ({ isOpen, onClose, video, onFeedbackUpdate, videoType = 'student', isCoachView = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(video?.coach_rating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoStatus, setVideoStatus] = useState(video?.status || 'pending');
  const lastToggleTimeRef = useRef(0);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [studentWeight, setStudentWeight] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [audioRecording, setAudioRecording] = useState(null);
  const [isMarkingCompletedNoFeedback, setIsMarkingCompletedNoFeedback] = useState(false);

  
  const videoRef = useRef(null);
  const textareaRef = useRef(null);
  const { getAuthToken } = useAuth();
  const { registerVideoModalOpen, registerVideoModalClose } = useVideoModal();

  useEffect(() => {
    if (isOpen) {
      registerVideoModalOpen();
      return () => registerVideoModalClose();
    }
  }, [isOpen, registerVideoModalOpen, registerVideoModalClose]);

  useEffect(() => {
    if (video) {
      // Initialize feedback field based on video type
      if (videoType === 'coach') {
        setFeedback(video.description || '');
      } else {
        setFeedback(video.coach_feedback || '');
      }
      setRating(video.coach_rating || 0);
      setVideoError(null);
      setIsVideoLoading(true);

      // Determine video status based on coach feedback presence (text or audio)
      const hasAnyFeedback = (video.coach_feedback !== null && video.coach_feedback !== undefined) || video.coach_feedback_audio_url;
      const isCompleted = video.status === 'completed' || video.status === 'reviewed' || hasAnyFeedback;
      
      if (isCompleted) {
        setVideoStatus('completed');
        logger.debug('Setting status to completed - video is completed or has feedback');
      } else {
        setVideoStatus('pending');
        logger.debug('Setting status to pending - no coach feedback and not marked completed');
      }
      
      // Initialize feedback based on video type
      if (videoType === 'coach') {
        setFeedback(video.description || '');
      } else {
        setFeedback(''); // Empty for student videos - they should write their own response
      }
      
      // Auto-hide loading after 3 seconds as fallback
      const loadingTimeout = setTimeout(() => {
        setIsVideoLoading(false);
        logger.debug('Loading overlay auto-hidden after 3 seconds');
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [video]);

  // Fetch student weight from profile
  useEffect(() => {
    const fetchStudentWeight = async () => {
      if (!video?.student?.id) {
        setStudentWeight(null);
        return;
      }

      try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await axios.get(
          `${getApiBaseUrlWithApi()}/coach/student/${video.student.id}/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.data?.weight) {
          setStudentWeight(response.data.data.weight);
        }
      } catch (error) {
        logger.error('Error fetching student weight:', error);
        setStudentWeight(null);
      }
    };

    if (isOpen && video?.student?.id) {
      fetchStudentWeight();
    }
  }, [isOpen, video?.student?.id, getAuthToken]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Add keyboard event listener for space bar pause/play and ESC to close
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Handle ESC key to close modal
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('ESC pressed: Closing modal');
        onClose();
        return;
      }
      
      // Only handle space bar when modal is open and not when typing in inputs
      if (e.code === 'Space' && 
          videoRef.current && 
          isOpen && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true') {
        
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();

        // Debounce rapid calls (prevent calls within 100ms)
        if (now - lastToggleTimeRef.current < 100) {
          logger.debug('Space bar debounced');
          return;
        }

        lastToggleTimeRef.current = now;

        // Direct control based on current video state
        if (videoRef.current.paused) {
          logger.debug('Space bar: Playing video');
          videoRef.current.play();
        } else {
          logger.debug('Space bar: Pausing video');
          videoRef.current.pause();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress, true); // Use capture phase
      return () => document.removeEventListener('keydown', handleKeyPress, true);
    }
  }, [isOpen, onClose]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [feedback]);

  const togglePlay = () => {
    const now = Date.now();

    // Debounce rapid calls (prevent calls within 100ms)
    if (now - lastToggleTimeRef.current < 100) {
      logger.debug('Toggle debounced');
      return;
    }

    lastToggleTimeRef.current = now;
    logger.debug('togglePlay called, isPlaying:', isPlaying, 'videoRef.current:', videoRef.current);

    // Native HTML5 video element
    if (videoRef.current) {
      if (videoRef.current.paused) {
        logger.debug('Playing video');
        videoRef.current.play();
      } else {
        logger.debug('Pausing video');
        videoRef.current.pause();
      }
    }
  };


  const handleProgressClick = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime; // Native video element property
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmitFeedback = async (audioFile = null) => {
    // At least one of text or audio feedback must be provided for student videos
    if (videoType === 'student' && !feedback.trim() && !audioFile && !audioRecording) {
      return;
    }
    
    // For coach resources, text is required
    if (videoType === 'coach' && !feedback.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get auth token asynchronously (it may need to refresh)
      const token = await getAuthToken();
      
      if (!token) {
        alert('Erreur d\'authentification. Veuillez vous reconnecter.');
        return;
      }
      
      if (videoType === 'coach') {
        // For coach resources, update the description
        await axios.patch(
          buildApiUrl(`/resources/${video.id}`),
          { 
            description: feedback.trim()
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsEditing(false);
      } else {
        // For student videos, submit feedback (text and/or audio)
        const audioToSend = audioFile || audioRecording;
        
        if (audioToSend) {
          // Send with FormData if audio is present
          const formData = new FormData();
          if (feedback.trim()) {
            formData.append('feedback', feedback.trim());
          }
          formData.append('audio', audioToSend);
          formData.append('rating', rating || '5');
          formData.append('status', 'completed');
          
          await axios.patch(
            buildApiUrl(`/workout-sessions/videos/${video.id}/feedback`),
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
            buildApiUrl(`/workout-sessions/videos/${video.id}/feedback`),
            { 
              feedback: feedback.trim(),
              rating: rating || null,
              status: 'completed'  // Update status to completed when feedback is sent
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        // Update local status immediately for student videos
        setVideoStatus('completed');
        // Close the modal after successful submission for student videos
        onClose();
      }
      
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, feedback.trim(), rating, false, videoType === 'coach' ? 'description' : 'completed', videoType);
      }
      
      // Clear audio recording after successful submission
      setAudioRecording(null);
      setIsRecordingVoice(false);
      
    } catch (error) {
      logger.error('Error submitting:', error);
      alert(videoType === 'coach' ? 'Erreur lors de l\'enregistrement de la description' : 'Erreur lors de l\'envoi du feedback');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle voice message send
  const handleVoiceMessageSend = useCallback((audioFile) => {
    if (audioFile && video) {
      setAudioRecording(audioFile);
      // Automatically save the feedback with audio
      handleSubmitFeedback(audioFile);
    }
  }, [video]);
  
  // Handle voice recorder cancel
  const handleVoiceRecorderCancel = useCallback(() => {
    setIsRecordingVoice(false);
    setAudioRecording(null);
  }, []);

  const handleDownload = () => {
    if (video?.video_url) {
      const link = document.createElement('a');
      link.href = video.video_url;
      link.download = video.video_filename || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
      return;
    }

    try {
      // Use axios directly without manually passing token - interceptor handles it
      await axios.delete(buildApiUrl(`/workout-sessions/videos/${video.id}`));
      
      // Refresh the parent component BEFORE closing modal to prevent race conditions
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, null, null, true); // true indicates deletion
      }
      
      // Show success message
      alert('✅ Vidéo supprimée avec succès');
      
      // Close modal after parent state is updated
      onClose();
    } catch (error) {
      logger.error('Error deleting video:', error);
      alert('❌ Erreur lors de la suppression de la vidéo');
    }
  };

  // Mark video as completed without writing feedback (student video, coach view only)
  const handleMarkAsCompletedNoFeedback = async () => {
    if (videoType !== 'student' || !video?.id) return;
    const token = await getAuthToken();
    if (!token) return;
    setIsMarkingCompletedNoFeedback(true);
    try {
      await axios.patch(
        buildApiUrl(`/workout-sessions/videos/${video.id}/feedback`),
        { feedback: '', rating: null, status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVideoStatus('completed');
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, '', null, false, 'completed', 'student');
      }
      onClose();
    } catch (error) {
      logger.error('Error marking video as completed:', error);
      alert('Erreur lors du passage en complété.');
    } finally {
      setIsMarkingCompletedNoFeedback(false);
    }
  };

  // Get weight, reps and RPE from video data
  const getVideoWeightAndReps = (video) => {
    let weight = video.weight || video.target_weight || video.requested_weight;
    let reps = video.reps || video.target_reps || video.requested_reps;
    let rpe = 0;

    // Check assignment data for useRir flag and fill in missing data
    if (video.assignment?.workout_session?.exercises) {
      const exerciseName = video.exercise_name;
      const setNumber = video.set_number || 1;

      for (const exercise of video.assignment.workout_session.exercises) {
        if (exercise.name === exerciseName) {
          const set = exercise.sets?.[setNumber - 1];
          if (exercise.useRir) {
            // RPE mode: coach's RPE target is in set.weight, ignore video.weight for display
            rpe = set?.weight || set?.target_weight || 0;
            weight = 0;
          } else {
            // Charge mode: fill in weight from assignment if missing
            if (!weight && set) weight = set.weight || set.target_weight;
          }
          if (set) reps = reps || set.reps || set.target_reps;
          break;
        }
      }
    }

    return { weight: weight || 0, reps: reps || 0, rpe };
  };

  if (!isOpen || !video) return null;

  const studentName = video.student?.raw_user_meta_data?.full_name || 
                     video.student?.raw_user_meta_data?.name || 
                     video.student?.email || 
                     'Coach Resource';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-2 md:p-4"
      onClick={onClose}
      style={{ zIndex: 100 }}
    >
      <div 
        className="relative mx-auto w-full max-w-6xl max-h-[92vh] md:max-h-[92vh] min-h-0 overflow-y-auto rounded-2xl shadow-2xl flex flex-col md:flex-row dashboard-scrollbar"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Mobile: First, Desktop: Inside sidebar */}
        <div className="md:hidden shrink-0 px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/10" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="flex items-center justify-end gap-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 576 512" 
              className="h-5 w-5"
              style={{ color: 'var(--kaiylo-primary-hex)' }}
              fill="currentColor"
            >
              <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z"/>
            </svg>
            <h2 className="text-base font-normal text-white flex items-center gap-2 flex-wrap" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              <span>Vidéo séance</span>
              {video.created_at && (
                <> - <span className="font-light" style={{ fontWeight: 300 }}>{format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}</span></>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Information - Mobile: Below header, Desktop: Inside sidebar */}
        <div className="md:hidden shrink-0 px-4 pt-3 pb-4 space-y-3 border-b border-white/10" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="flex items-center gap-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 256 512" 
              className="h-4 w-4"
              style={{ color: 'var(--kaiylo-primary-hex)' }}
              fill="currentColor"
            >
              <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
            </svg>
            <span className="text-white font-light text-sm">
              {studentName}
              {studentWeight && (
                <span className="ml-2 font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  @{studentWeight}kg
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 256 512" 
              className="h-4 w-4"
              style={{ color: 'var(--kaiylo-primary-hex)' }}
              fill="currentColor"
            >
              <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
            </svg>
            <span className="text-white font-light text-sm">{video.exercise_name || 'Exercice'}</span>
            <span className="text-white/75 text-sm font-extralight">•</span>
            <span className="text-white/75 text-sm font-extralight">
              {(() => {
                const { weight, reps, rpe } = getVideoWeightAndReps(video);
                const seriesText = `Série ${video.set_number || 1}/${video.total_sets || '?'}`;
                const repsText = reps > 0 ? `${reps} reps` : null;
                const weightText = weight > 0 ? `${weight}kg` : null;
                const rpeText = rpe > 0 ? `RPE ${rpe}` : null;

                const parts = [seriesText];
                if (repsText) parts.push(repsText);

                if (weightText || rpeText) {
                  return (
                    <>
                      {parts.join(' • ')}
                      {weightText && (
                        <>
                          {' '}
                          <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                        </>
                      )}
                      {rpeText && (
                        <>
                          {' '}
                          <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>{rpeText}</span>
                        </>
                      )}
                    </>
                  );
                }
                return parts.join(' • ');
              })()}
            </span>
          </div>
          {videoType === 'student' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 512" 
                className="h-4 w-4"
                style={{ color: 'var(--kaiylo-primary-hex)' }}
                fill="currentColor"
              >
                <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
              </svg>
              {videoStatus === 'pending' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                  A feedback
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
                  Complété
                </span>
              )}
            </div>
          )}
        </div>

        {/* Left Column - Video */}
        <div className="flex-1 flex flex-col min-w-0 w-full md:w-auto order-2 md:order-1">
          {/* Video Container */}
          <div className="flex-shrink-0 px-3 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 relative">
          {video?.video_url && video.video_url.trim() !== '' ? (
            <>
            <VideoPlayer
              ref={videoRef}
              src={video.video_url}
              onLoadedMetadata={() => {
                const videoElement = videoRef.current;
                if (videoElement) {
                  setDuration(videoElement.duration);
                  setCurrentTime(0);
                  setIsPlaying(false);
                  setIsVideoLoading(false);
                    setVideoError(null); // Clear any previous errors
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsVideoLoading(false);
                  setVideoError(null); // Clear errors on successful play
              }}
              onPause={() => {
                setIsPlaying(false);
              }}
              onTimeUpdate={() => {
                const videoElement = videoRef.current;
                if (videoElement) {
                  setCurrentTime(videoElement.currentTime);
                }
              }}
              onError={(error) => {
                  const videoElement = error?.target || error?.nativeEvent?.target;
                  const mediaError = videoElement?.error;
                  
                  let errorMessage = 'Erreur lors du chargement de la vidéo';
                  
                  if (mediaError) {
                    const errorMsg = mediaError.message || '';
                    
                    // Check for specific error messages
                    if (errorMsg.includes('Format error') || errorMsg.includes('MEDIA_ELEMENT_ERROR')) {
                      errorMessage = 'Cette vidéo semble avoir été supprimée ou est corrompue. Elle n\'est plus disponible.';
                    } else {
                      // Extract detailed error information based on error code
                      switch (mediaError.code) {
                        case mediaError.MEDIA_ERR_ABORTED:
                          errorMessage = 'Le chargement de la vidéo a été annulé';
                          break;
                        case mediaError.MEDIA_ERR_NETWORK:
                          errorMessage = 'Erreur réseau lors du chargement de la vidéo. Vérifiez votre connexion.';
                          break;
                        case mediaError.MEDIA_ERR_DECODE:
                          errorMessage = 'Erreur de décodage de la vidéo. Le fichier peut être corrompu.';
                          break;
                        case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                          errorMessage = 'Cette vidéo n\'est plus disponible. Elle a peut-être été supprimée.';
                          break;
                        default:
                          errorMessage = errorMsg || 'Erreur lors du chargement de la vidéo';
                      }
                    }
                  }
                  
                  // Only log error details in development or for debugging
                  if (process.env.NODE_ENV === 'development') {
                    logger.error('Video error:', {
                      error,
                      mediaError,
                      code: mediaError?.code,
                      message: mediaError?.message,
                      videoUrl: video?.video_url
                    });
                  }
                  
                  setVideoError(errorMessage);
                setIsVideoLoading(false);
              }}
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />

          {/* Loading Overlay */}
          {isVideoLoading && (
            <div className="absolute inset-3 md:inset-6 bg-black/80 rounded-xl md:rounded-2xl flex items-center justify-center z-10">
              <div className="text-white font-light text-sm md:text-base">Chargement de la vidéo...</div>
            </div>
          )}

          {/* Error Overlay */}
          {videoError && (
            <div className="absolute inset-3 md:inset-6 bg-black/90 rounded-xl md:rounded-2xl flex items-center justify-center z-10 border border-red-500/30">
              <div className="text-center p-6 max-w-md">
                <p className="text-red-400 mb-4 font-light">{videoError}</p>
                <button
                  onClick={() => {
                    setVideoError(null);
                    // Try to reload the video
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors font-light"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-white/50 bg-black/20 rounded-2xl border border-white/10">
              <p className="font-light">Aucune vidéo disponible</p>
            </div>
          )}
          </div>

          {/* Footer Actions */}
          <div className="px-3 md:px-6 pb-4 md:pb-6 flex gap-2 flex-shrink-0 justify-center">
          <button
            onClick={handleDownload}
            className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors flex items-center justify-center gap-1.5 md:gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor">
              <path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32S0 334.3 0 352l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/>
            </svg>
            <span className="hidden sm:inline">Télécharger</span>
          </button>
          <button
            onClick={handleDelete}
            className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors flex items-center justify-center gap-1.5 md:gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor">
              <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z"/>
            </svg>
            Supprimer
          </button>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div 
          className="w-full md:w-96 flex-1 md:flex-shrink-0 flex flex-col overflow-visible border-t md:border-t-0 order-3 md:order-2 min-h-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.4), 0px 4px 8px 0px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header - Desktop only */}
            <div className="hidden md:flex shrink-0 px-6 pt-6 pb-3 items-center justify-between">
              <div className="flex items-center justify-end gap-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 576 512" 
                  className="h-5 w-5"
                  style={{ color: 'var(--kaiylo-primary-hex)' }}
                  fill="currentColor"
                >
                  <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z"/>
                </svg>
                <h2 className="text-xl font-normal text-white flex items-center gap-2 flex-wrap" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  <span>Vidéo séance</span>
                  {video.created_at && (
                    <> - <span className="font-light" style={{ fontWeight: 300 }}>{format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}</span></>
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Information - Desktop only */}
            <div className="hidden md:block px-6 pt-1.5 pb-5 space-y-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 256 512" 
                  className="h-4 w-4"
                  style={{ color: 'var(--kaiylo-primary-hex)' }}
                  fill="currentColor"
                >
                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                </svg>
                <span className="text-white font-light text-sm md:text-base">
                  {studentName}
                  {studentWeight && (
                    <span className="ml-2 font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                      @{studentWeight}kg
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 256 512" 
                  className="h-4 w-4"
                  style={{ color: 'var(--kaiylo-primary-hex)' }}
                  fill="currentColor"
                >
                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                </svg>
                <span className="text-white font-light text-sm md:text-base">{video.exercise_name || 'Exercice'}</span>
                <span className="text-white/75 text-sm md:text-base font-extralight">•</span>
                <span className="text-white/75 text-sm md:text-base font-extralight">
                  {(() => {
                    const { weight, reps, rpe } = getVideoWeightAndReps(video);
                    const seriesText = `Série ${video.set_number || 1}/${video.total_sets || '?'}`;
                    const repsText = reps > 0 ? `${reps} reps` : null;
                    const weightText = weight > 0 ? `${weight}kg` : null;
                    const rpeText = rpe > 0 ? `RPE ${rpe}` : null;

                    const parts = [seriesText];
                    if (repsText) parts.push(repsText);

                    if (weightText || rpeText) {
                      return (
                        <>
                          {parts.join(' • ')}
                          {weightText && (
                            <>
                              {' '}
                              <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                            </>
                          )}
                          {rpeText && (
                            <>
                              {' '}
                              <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>{rpeText}</span>
                            </>
                          )}
                        </>
                      );
                    } else {
                      return parts.join(' • ');
                    }
                  })()}
                </span>
              </div>
              {videoType === 'student' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 256 512" 
                    className="h-4 w-4"
                    style={{ color: 'var(--kaiylo-primary-hex)' }}
                    fill="currentColor"
                  >
                    <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                  </svg>
                  {videoStatus === 'pending' ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                      A feedback
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
                      Complété
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Comment Section */}
            <div className="px-4 md:px-6 py-4 md:py-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-xs md:text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>Commentaire coach</h3>
                {videoType === 'coach' && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-white/50 hover:text-white transition-colors text-sm font-light"
                    disabled={isSubmitting}
                  >
                    {isEditing ? 'Annuler' : 'Modifier'}
                  </button>
                )}
              </div>
              
              {/* Student Video - Coach Feedback Display */}
              {videoType === 'student' && !isCoachView && (
                <div className="mb-4">
                  {video.coach_feedback_audio_url && (
                    <div className="mb-2">
                      <VoiceMessage 
                        message={{
                          file_url: video.coach_feedback_audio_url,
                          message_type: 'audio',
                          file_type: 'audio/webm'
                        }} 
                        isOwnMessage={false}
                      />
                    </div>
                  )}
                  {video.coach_feedback ? (
                    <p className="text-white/75 text-sm leading-relaxed font-extralight">{video.coach_feedback}</p>
                  ) : !video.coach_feedback_audio_url ? (
                    <p className="text-white/50 text-sm font-extralight italic">Aucun feedback du coach pour le moment</p>
                  ) : null}
                </div>
              )}

              {/* Description/Response Section - Only show for coaches or coach resources */}
              {(videoType === 'coach' || isCoachView) && (
                <div className="flex-1 flex flex-col">
                  {videoType === 'coach' ? (
                    // Coach resource - editable description
                    isEditing ? (
                      <div className="space-y-3 flex-1 flex flex-col">
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="w-full flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--kaiylo-primary-hex)] text-base font-light"
                        />
                        <button
                          onClick={handleSubmitFeedback}
                          disabled={isSubmitting}
                          className="w-full text-white py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-light"
                          style={{ 
                            backgroundColor: 'var(--kaiylo-primary-hex)'
                          }}
                        >
                          <Save size={16} />
                          {isSubmitting ? 'Enregistrement...' : 'Envoyer'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 min-h-[100px] flex-1">
                        {feedback ? (
                          <p className="text-white/75 text-sm whitespace-pre-wrap font-extralight">{feedback}</p>
                        ) : (
                          <p className="text-white/50 text-sm font-extralight italic">Aucune description</p>
                        )}
                      </div>
                    )
                  ) : (
                    // Student video - coach view only (feedback input)
                    <div className="flex-1 flex flex-col space-y-3">
                      {/* Display existing comment if feedback exists (text or audio) */}
                      {(video.coach_feedback || video.coach_feedback_audio_url) && (
                        <div className="flex flex-col gap-[8px] flex-shrink-0 mb-3">
                          {/* Audio feedback display */}
                          {video.coach_feedback_audio_url && (
                            <div className="mb-2">
                              <VoiceMessage 
                                message={{
                                  file_url: video.coach_feedback_audio_url,
                                  message_type: 'audio',
                                  file_type: 'audio/webm'
                                }} 
                                isOwnMessage={true}
                              />
                            </div>
                          )}
                          
                          {/* Text feedback display */}
                          {video.coach_feedback && (
                            <div className="text-[12px] md:text-[14px] font-light text-white overflow-y-auto pr-1 break-words bg-[rgba(0,0,0,0.25)] rounded-[10px] px-[10px] md:px-[12px] py-[8px] md:py-[12px] min-h-[80px] md:min-h-[150px]">
                              {video.coach_feedback}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Comment input section */}
                      <div className="w-full min-h-[40px] md:min-h-[48px] bg-[#121214] rounded-[10px] px-[10px] md:px-[14px] py-[8px] md:py-[12px] flex items-center gap-2 md:gap-3 flex-shrink-0 mt-auto">
                        {isRecordingVoice ? (
                          <VoiceRecorder
                            onSend={handleVoiceMessageSend}
                            onCancel={handleVoiceRecorderCancel}
                            disabled={isSubmitting}
                          />
                        ) : (
                          <>
                            <textarea
                              ref={textareaRef}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Ajouter un commentaire ..."
                              rows={1}
                              className="flex-1 bg-transparent text-base font-normal text-white placeholder-white/50 outline-none resize-none overflow-hidden leading-normal"
                              style={{ paddingTop: '1px', paddingBottom: '1px', lineHeight: '1.5' }}
                            />
                            <button
                              type="button"
                              onClick={() => setIsRecordingVoice(true)}
                              disabled={isSubmitting}
                              className="flex items-center justify-center cursor-pointer p-1 md:p-1.5 w-[24px] h-[24px] md:w-[28px] md:h-[28px] flex-shrink-0 disabled:cursor-not-allowed rounded-md hover:bg-white/5 transition-colors"
                              title="Enregistrer un message vocal"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 384 512" 
                                className="h-3 w-3 md:h-4 md:w-4" 
                                style={{ fill: 'var(--kaiylo-primary-hex)', color: 'var(--kaiylo-primary-hex)' }}
                              >
                                <path d="M192 0C139 0 96 43 96 96l0 128c0 53 43 96 96 96s96-43 96-96l0-128c0-53-43-96-96-96zM48 184c0-13.3-10.7-24-24-24S0 170.7 0 184l0 40c0 97.9 73.3 178.7 168 190.5l0 49.5-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-49.5c94.7-11.8 168-92.6 168-190.5l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 79.5-64.5 144-144 144S48 303.5 48 224l0-40z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleSubmitFeedback(audioRecording)}
                              disabled={(!feedback.trim() && !audioRecording) || isSubmitting}
                              className="flex items-center justify-center cursor-pointer p-1 md:p-1.5 w-[24px] h-[24px] md:w-[28px] md:h-[28px] flex-shrink-0 disabled:cursor-not-allowed rounded-md hover:bg-white/5 transition-colors"
                              style={{ opacity: ((!feedback.trim() && !audioRecording) || isSubmitting) ? 0.5 : 1 }}
                              type="button"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-3 w-3 md:h-4 md:w-4" style={{ fill: 'var(--kaiylo-primary-hex)' }}>
                                <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      {/* Marquer en complété sans commentaire - only when no feedback yet */}
                      {videoStatus === 'pending' && (
                        <button
                          type="button"
                          onClick={handleMarkAsCompletedNoFeedback}
                          disabled={isMarkingCompletedNoFeedback}
                          className="mt-3 w-full py-2 px-4 rounded-[50px] text-xs md:text-sm font-normal transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'rgba(250, 250, 250, 0.5)',
                            fontWeight: '400'
                          }}
                          onMouseEnter={(e) => {
                            if (isMarkingCompletedNoFeedback) return;
                            e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.1)';
                            e.currentTarget.style.color = '#D48459';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = 'rgba(250, 250, 250, 0.5)';
                          }}
                        >
                          {isMarkingCompletedNoFeedback ? (
                            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                              <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                            </svg>
                          )}
                          {isMarkingCompletedNoFeedback ? 'En cours...' : 'Marquer en complété sans commentaire'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailModal;
