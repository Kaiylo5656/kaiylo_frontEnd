import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const CoachResourceModal = ({ isOpen, onClose, video, onFeedbackUpdate }) => {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFileMissing, setIsFileMissing] = useState(false);
  
  const videoRef = useRef(null);
  const { getAuthToken } = useAuth();

  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);

  useEffect(() => {
    if (video) {
      setVideoError(null);
      setIsVideoLoading(true);
      setIsFileMissing(false);
      setCurrentVideoUrl(video.video_url || video.fileUrl);
      
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
              <span className="text-[var(--kaiylo-primary-hex)] text-[20px] font-normal">{video.title || 'Ressource'}</span>
            </h3>
            {video.folder_name && (
              <div className="flex items-center justify-center gap-2 text-white/50 text-[13px] font-light mt-1">
                <span>Dossier : {video.folder_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {/* Video player */}
          {currentVideoUrl && currentVideoUrl.trim() !== '' ? (
            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10">
              <video
                ref={videoRef}
                src={currentVideoUrl}
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
                onError={async (error) => {
                  console.error('Video error:', error);
                  const videoElement = error?.target;
                  const mediaError = videoElement?.error;
                  
                  let errorMessage = 'Erreur lors du chargement de la vidéo';
                  let isFileMissing = false;
                  
                  if (mediaError) {
                    const errCode = mediaError.code;
                    
                    if (errCode === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                      try {
                        const token = await getAuthToken();
                        const response = await axios.get(buildApiUrl(`/resources/coach`), {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (response.data.success) {
                          const updatedResource = response.data.data.find(r => r.id === video?.id);
                          if (updatedResource) {
                            if (updatedResource.status === 'FAILED') {
                              errorMessage = 'La vidéo a échoué lors du traitement. Fichier supprimé ou corrompu.';
                              setIsFileMissing(true);
                            } else if (updatedResource.status === 'READY' && updatedResource.fileUrl && updatedResource.fileUrl !== currentVideoUrl) {
                              setCurrentVideoUrl(updatedResource.fileUrl);
                              setVideoError(null);
                              setIsFileMissing(false);
                              setIsVideoLoading(true);
                              return;
                            } else {
                              errorMessage = 'Le fichier vidéo a été supprimé ou n\'existe plus.';
                              setIsFileMissing(true);
                            }
                          } else {
                            errorMessage = 'Cette ressource n\'existe plus dans la base de données.';
                            setIsFileMissing(true);
                          }
                        }
                      } catch (refreshError) {
                        console.error('Failed to refresh resource:', refreshError);
                        errorMessage = 'Le fichier vidéo semble avoir été supprimé. Impossible de le charger.';
                        setIsFileMissing(true);
                      }
                    } else if (errCode === 3) {
                      errorMessage = 'Erreur de décodage vidéo - le fichier est peut-être corrompu';
                    } else if (errCode === 2) {
                      errorMessage = 'Erreur réseau lors du chargement de la vidéo. Vérifiez votre connexion.';
                    } else if (errCode === 1) {
                      errorMessage = 'Le chargement de la vidéo a été annulé';
                    }
                  }
                  
                  setVideoError(errorMessage);
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
                    {!isFileMissing && (
                      <button
                        onClick={async () => {
                          setVideoError(null);
                          setIsVideoLoading(true);
                          
                          try {
                            const token = await getAuthToken();
                            const response = await axios.get(buildApiUrl(`/resources/coach`), {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            
                            if (response.data.success) {
                              const updatedResource = response.data.data.find(r => r.id === video?.id);
                              if (updatedResource && updatedResource.status === 'READY' && updatedResource.fileUrl) {
                                if (updatedResource.fileUrl !== currentVideoUrl) {
                                  setCurrentVideoUrl(updatedResource.fileUrl);
                                }
                              }
                            }
                          } catch (refreshError) {
                            console.error('Failed to refresh resource:', refreshError);
                          }
                          
                          if (videoRef.current) {
                            videoRef.current.load();
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded text-sm touch-target"
                      >
                        Réessayer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#262626] rounded-lg border border-white/10 h-[200px] flex items-center justify-center">
              <p className="text-gray-400 text-xs font-light">Aucune vidéo disponible</p>
            </div>
          )}

          {/* Description section */}
          {video.description && (
            <div>
              <p className="text-gray-400 text-xs font-light leading-relaxed mb-3 text-left">
                Description
              </p>
              <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--surface-800)' }}>
                <p className="text-white/85 text-xs font-light leading-relaxed whitespace-pre-wrap">
                  {video.description}
                </p>
              </div>
            </div>
          )}
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

export default CoachResourceModal;
