import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X } from 'lucide-react';

/**
 * Mobile-optimized video detail modal for students
 * Matches Figma design with centered modal overlay
 */
const StudentVideoDetailModal = ({ isOpen, onClose, video, onFeedbackUpdate }) => {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoStatus, setVideoStatus] = useState(video?.status || 'pending');
  
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

  if (!isOpen || !video) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-black/60 backdrop-blur flex items-center justify-center px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-[900px] max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 shadow-2xl flex flex-col touch-pan-y"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header pinned to the top */}
        <div className="shrink-0 px-6 pt-5 pb-3 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-base font-light leading-tight">
              {video.exercise_name || 'Exercice'}
              <span className="text-white/50 ml-1">{video.set_number || 1}/3</span>
            </h2>
            <p className="text-white/50 text-xs font-extralight">
              {video.created_at ? format(new Date(video.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-2 py-1.5 rounded-[10px] flex items-center justify-center ${
                videoStatus === 'pending' ? 'bg-orange-500/75' : 'bg-[rgba(47,160,100,0.75)]'
              }`}
            >
              <span className="text-white text-xs font-light leading-none">
                {videoStatus === 'pending' ? 'A feedback' : 'Complété'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Fermer la modale"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body is the only scrollable area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-2 space-y-2 pb-14 md:pb-18 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Video player safely constrained */}
          {video.video_url ? (
            <>
              <div className="relative w-full bg-black rounded-[14px] overflow-hidden shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)]">
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  playsInline
                  className="w-full h-auto max-h-[70vh] object-contain"
                  onLoadedMetadata={() => {
                    const videoElement = videoRef.current;
                    if (videoElement) {
                      setIsVideoLoading(false);
                    }
                  }}
                  onCanPlay={() => setIsVideoLoading(false)}
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
              </div>
            </>
          ) : (
            <div className="bg-black rounded-[14px] w-full flex items-center justify-center min-h-[240px]">
              <p className="text-gray-400 text-sm">Aucune vidéo disponible</p>
            </div>
          )}

          {/* Coach feedback copy */}
          <div className="flex flex-col gap-[2px] items-start">
            <p className="text-white/25 text-xs font-light">Feedback du coach</p>
            {video.coach_feedback ? (
              <p className="text-white text-[13px] font-light leading-tight whitespace-pre-wrap">{video.coach_feedback}</p>
            ) : (
              <p className="text-white/50 text-sm font-light italic">Aucun feedback du coach pour le moment</p>
            )}
          </div>
        </div>

        {/* Footer pinned to the bottom */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-[#0f0f10]/95 backdrop-blur pb-[max(0px,env(safe-area-inset-bottom))] flex justify-center">
          <button
            onClick={onClose}
            className="bg-white/2 border border-white/10 rounded-[6px] px-6 py-3 flex items-center justify-center touch-target text-white/75 text-sm font-normal hover:text-white hover:bg-white/10 transition-colors"
          >
            Quitter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentVideoDetailModal;