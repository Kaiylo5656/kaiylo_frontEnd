import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Mobile-optimized video detail modal for students
 * Matches Figma design with centered modal overlay
 */
const StudentVideoDetailModal = ({ isOpen, onClose, video, onFeedbackUpdate }) => {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoStatus, setVideoStatus] = useState(video?.status || 'pending');
  const [currentTime, setCurrentTime] = useState(0);
  
  const videoRef = useRef(null);

  useEffect(() => {
    if (video) {
      setVideoError(null);
      setIsVideoLoading(true);
      
      // Determine video status based on coach feedback presence
      if (video.coach_feedback && video.coach_feedback.trim() !== '') {
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
      document.body.style.touchAction = 'none';
      
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

  if (!isOpen || !video) return null;

  const formatVideoTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-black/85 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Container - Larger to fit screen better */}
        <div 
          className="bg-[#1b1b1b] rounded-[20px] w-full max-w-[90%] sm:max-w-[340px] overflow-hidden shadow-xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-base font-light leading-tight">
                  {video.exercise_name || 'Exercice'}
                  <span className="text-white/50 ml-1">{video.set_number || 1}/3</span>
                </h2>
                <p className="text-white/50 text-xs font-extralight">
                  {video.created_at ? format(new Date(video.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                </p>
              </div>
              {/* Status Badge - Top Right */}
              <div className={`px-2 py-1.5 rounded-[10px] flex items-center justify-center ${
                videoStatus === 'pending' 
                  ? 'bg-orange-500/75' 
                  : 'bg-[rgba(47,160,100,0.75)]'
              }`}>
                <span className="text-white text-xs font-light leading-none">
                  {videoStatus === 'pending' ? 'A feedback' : 'Complété'}
                </span>
              </div>
            </div>
          </div>

          {/* Video Player Container - Larger for better visibility */}
          <div className="px-4 pb-0">
            {video.video_url ? (
              <div className="relative bg-black rounded-[10px] overflow-hidden shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)] w-full" style={{ minHeight: '300px', height: '65vh', maxHeight: '450px' }}>
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    const videoElement = videoRef.current;
                    if (videoElement) {
                      setIsVideoLoading(false);
                    }
                  }}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onError={(error) => {
                    console.error('Video error:', error);
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

                {/* Video Time Display - Bottom Left */}
                {!isVideoLoading && !videoError && currentTime > 0 && (
                  <div className="absolute bottom-2 left-3 bg-black/20 px-1.5 py-0.5 rounded text-xs">
                    <span className="text-white text-xs font-normal">
                      {formatVideoTime(currentTime)}
                    </span>
                  </div>
                )}
              </div>
              ) : (
              <div className="bg-black rounded-[10px] w-full flex items-center justify-center" style={{ minHeight: '300px', height: '65vh', maxHeight: '450px' }}>
                <p className="text-gray-400 text-sm">Aucune vidéo disponible</p>
              </div>
            )}
          </div>

          {/* Coach Feedback Section */}
          <div className="px-6 pt-6 pb-0">
            <div className="flex flex-col gap-2 items-start">
              <p className="text-white/25 text-xs font-light">
                Feedback du coach
              </p>
              {video.coach_feedback ? (
                <p className="text-white text-sm font-light leading-relaxed whitespace-pre-wrap">
                  {video.coach_feedback}
                </p>
              ) : (
                <p className="text-white/50 text-sm font-light italic">
                  Aucun feedback du coach pour le moment
                </p>
              )}
            </div>
          </div>

          {/* Quit Button */}
          <div className="px-6 pt-6 pb-6 flex justify-center">
            <button
              onClick={onClose}
              className="bg-white/2 border border-white/10 rounded-[5px] px-6 py-3 flex items-center justify-center touch-target"
            >
              <span className="text-white/75 text-sm font-normal">Quitter</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentVideoDetailModal;