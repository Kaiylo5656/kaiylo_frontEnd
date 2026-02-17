import logger from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import VoiceMessage from './VoiceMessage';
import { useVideoModal } from '../contexts/VideoModalContext';

/**
 * Mobile-optimized video detail modal for students
 * Matches Figma design with centered modal overlay
 */
const StudentVideoDetailModal = ({ isOpen, onClose, video, onFeedbackUpdate }) => {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoStatus, setVideoStatus] = useState(video?.status || 'pending');
  const videoRef = useRef(null);
  const { registerVideoModalOpen, registerVideoModalClose } = useVideoModal();

  useEffect(() => {
    if (isOpen) {
      registerVideoModalOpen();
      return () => registerVideoModalClose();
    }
  }, [isOpen, registerVideoModalOpen, registerVideoModalClose]);

  useEffect(() => {
    if (video) {
      setVideoError(null);
      setIsVideoLoading(true);
      
      // Determine video status based on coach feedback presence (text or audio)
      if ((video.coach_feedback && video.coach_feedback.trim() !== '') || video.coach_feedback_audio_url) {
        setVideoStatus('completed');
      } else {
        setVideoStatus('pending');
      }
      
      // Auto-hide loading after 3 seconds as fallback
      const loadingTimeout = setTimeout(() => {
        setIsVideoLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [video]);

  // Prevent body scroll when modal is open (mobile-friendly)
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      // Prevent iOS bounce scrolling
        document.body.style.touchAction = 'manipulation';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress, true);
      return () => document.removeEventListener('keydown', handleKeyPress, true);
    }
  }, [isOpen, onClose]);

  // Get weight and reps from video data
  const getVideoWeightAndReps = (video) => {
    // Try direct properties first
    let weight = video.weight || video.target_weight || video.requested_weight;
    let reps = video.reps || video.target_reps || video.requested_reps;
    
    // If not found, try to get from assignment workout session
    if ((!weight || !reps) && video.assignment?.workout_session?.exercises) {
      const exerciseName = video.exercise_name;
      const setNumber = video.set_number || 1;
      
      for (const exercise of video.assignment.workout_session.exercises) {
        if (exercise.name === exerciseName && exercise.sets && exercise.sets[setNumber - 1]) {
          const set = exercise.sets[setNumber - 1];
          weight = weight || set.weight || set.target_weight;
          reps = reps || set.reps || set.target_reps;
          break;
        }
      }
    }
    
    return { weight: weight || 0, reps: reps || 0 };
  };

  if (!isOpen || !video) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-center px-[25px] text-center" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
          <div className="flex flex-col items-center gap-0 w-full">
            <h3 className="text-white font-light text-base flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[var(--kaiylo-primary-hex)] text-[20px] font-normal">{video.exercise_name || 'Exercice'}</span>
            </h3>
            <div className="flex items-center justify-center gap-2 text-white/50 text-[13px] font-light mt-1">
              <span>№ {video.set_number || 1}/3</span>
              {(() => {
                const { weight, reps } = getVideoWeightAndReps(video);
                if (weight > 0 || reps > 0) {
                  return (
                    <>
                      <span>•</span>
                      {weight > 0 && <span>{weight} kg</span>}
                      {weight > 0 && reps > 0 && <span>•</span>}
                      {reps > 0 && <span>{reps} reps</span>}
                    </>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* Video player */}
          {video.video_url ? (
            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10">
              <video
                ref={videoRef}
                src={video.video_url}
                controls
                playsInline
                className="w-full h-auto max-h-[300px] object-contain"
                onLoadedMetadata={() => {
                  const videoElement = videoRef.current;
                  if (videoElement) {
                    setIsVideoLoading(false);
                  }
                }}
                onCanPlay={() => setIsVideoLoading(false)}
                onError={(error) => {
                  logger.error('Video error:', error);
                  setVideoError('Erreur lors du chargement de la vidéo');
                  setIsVideoLoading(false);
                }}
                tabIndex={-1}
              />

              {/* Loading Overlay */}
              {isVideoLoading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mx-auto mb-3"></div>
                    <p className="text-sm">Chargement...</p>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {videoError && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-red-400 text-center px-4">
                    <p className="text-sm mb-3">{videoError}</p>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        setIsVideoLoading(true);
                        if (videoRef.current) {
                          videoRef.current.load();
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded text-sm touch-target"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#262626] rounded-lg border border-white/10 h-[200px] flex items-center justify-center">
              <p className="text-gray-400 text-xs font-light">Aucune vidéo disponible</p>
            </div>
          )}

          {/* Coach feedback section */}
          <div>
            <p className="text-gray-400 text-xs font-light leading-relaxed mb-3 text-left">
              Feedback du coach
            </p>
            <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--surface-800)' }}>
              {/* Audio feedback display */}
              {video.coach_feedback_audio_url && (
                <div className="mb-3">
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
              
              {/* Text feedback display */}
              {video.coach_feedback ? (
                <p className="text-white/85 text-xs font-light leading-relaxed whitespace-pre-wrap">
                  {video.coach_feedback}
                </p>
              ) : !video.coach_feedback_audio_url ? (
                <p className="text-gray-400 text-xs font-light italic text-center">
                  Aucun feedback du coach pour le moment
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentVideoDetailModal;