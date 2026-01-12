import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Send, Edit3 } from 'lucide-react';
import axios from 'axios';
import { buildApiUrl, getApiBaseUrlWithApi } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import VideoPlayer from './VideoPlayer';

const CoachResourceModal = ({ isOpen, onClose, video, onFeedbackUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [description, setDescription] = useState(video?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isFileMissing, setIsFileMissing] = useState(false);
  const lastToggleTimeRef = useRef(0);

  const videoRef = useRef(null);
  const { getAuthToken } = useAuth();

  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);

  useEffect(() => {
    if (video) {
      setDescription(video.description || '');
      setVideoError(null);
      setIsVideoLoading(true);
      setIsFileMissing(false);
      setCurrentVideoUrl(video.video_url);
      console.log('Coach resource loaded:', video);
      
      // Auto-hide loading after 3 seconds as fallback
      const loadingTimeout = setTimeout(() => {
        setIsVideoLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [video]);

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
        console.log('ESC pressed: Closing modal');
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
          console.log('Space bar debounced');
          return;
        }
        
        lastToggleTimeRef.current = now;
        
        // Direct control based on current video state
        if (videoRef.current.paused) {
          console.log('Space bar: Playing video');
          videoRef.current.play();
        } else {
          console.log('Space bar: Pausing video');
          videoRef.current.pause();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress, true); // Use capture phase
      return () => document.removeEventListener('keydown', handleKeyPress, true);
    }
  }, [isOpen, onClose]);

  const handleSaveDescription = async () => {
    if (!description.trim()) {
      alert('Veuillez saisir une description');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Erreur d\'authentification. Veuillez vous reconnecter.');
        return;
      }
      await axios.patch(
        buildApiUrl(`/resources/${video.id}`),
        { description: description.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, description.trim(), null, false, 'description', 'coach');
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Erreur lors de l\'enregistrement de la description');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Erreur d\'authentification. Veuillez vous reconnecter.');
        return;
      }
      const deleteUrl = buildApiUrl(`/resources/${video.id}`);
      console.log('🗑️ Deleting resource:', {
        videoId: video.id,
        deleteUrl: deleteUrl,
        videoTitle: video.title
      });
      
      await axios.delete(
        deleteUrl,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Resource deleted successfully');
      onClose();
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, null, null, true, 'completed', 'coach');
      }
    } catch (error) {
      console.error('❌ Error deleting resource:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      alert('Erreur lors de la suppression de la ressource');
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
      onClick={onClose}
      style={{ zIndex: 100 }}
    >
      <div 
        className="relative mx-auto w-full max-w-7xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column - Video */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Container */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 relative">
          {currentVideoUrl && currentVideoUrl.trim() !== '' ? (
            <>
            <VideoPlayer
              ref={videoRef}
              src={currentVideoUrl}
              onLoadedMetadata={() => {
                const videoElement = videoRef.current;
                if (videoElement) {
                  setDuration(videoElement.duration);
                  setCurrentTime(0);
                  setIsPlaying(false);
                  setIsVideoLoading(false);
                  setVideoError(null);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsVideoLoading(false);
                setVideoError(null);
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
              onError={async (error) => {
                const videoElement = error?.target || error?.nativeEvent?.target;
                const mediaError = videoElement?.error;
                
                let errorMessage = 'Erreur lors du chargement de la vidéo';
                let isFileMissing = false;
                
                if (mediaError) {
                  const errorMsg = mediaError.message || '';
                  const errCode = mediaError.code;
                  
                  if (errCode === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                    if (errorMsg.includes('Format error') || errorMsg.includes('MEDIA_ELEMENT_ERROR')) {
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
                              console.log('🔄 Resource updated, reloading with new URL:', updatedResource.fileUrl);
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
                    } else {
                      errorMessage = 'Format vidéo non supporté ou fichier introuvable';
                      setIsFileMissing(true);
                    }
                  } else if (errCode === 3) { // MEDIA_ERR_DECODE
                    errorMessage = 'Erreur de décodage vidéo - le fichier est peut-être corrompu';
                    setIsFileMissing(false);
                  } else if (errCode === 2) { // MEDIA_ERR_NETWORK
                    errorMessage = 'Erreur réseau lors du chargement de la vidéo. Vérifiez votre connexion.';
                    setIsFileMissing(false);
                  } else if (errCode === 1) { // MEDIA_ERR_ABORTED
                    errorMessage = 'Le chargement de la vidéo a été annulé';
                    setIsFileMissing(false);
                  }
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
            <div className="absolute inset-6 bg-black/80 rounded-2xl flex items-center justify-center z-10">
              <div className="text-white font-light">Chargement de la vidéo...</div>
            </div>
          )}

          {/* Error Overlay */}
          {videoError && (
            <div className="absolute inset-6 bg-black/90 rounded-2xl flex items-center justify-center z-10 border border-red-500/30">
              <div className="text-center p-6 max-w-md">
                <p className="text-red-400 mb-4 font-light">{videoError}</p>
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
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors font-light"
                  >
                    Réessayer
                  </button>
                )}
                {isFileMissing && (
                  <button
                    onClick={async () => {
                      if (confirm('Le fichier vidéo a été supprimé ou n\'existe plus. Voulez-vous supprimer cette ressource de la liste ?')) {
                        await handleDelete();
                      }
                    }}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors font-light"
                  >
                    Supprimer cette ressource
                  </button>
                )}
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
          <div className="px-6 pb-6 flex gap-2 flex-shrink-0 justify-center">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor">
              <path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32S0 334.3 0 352l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/>
            </svg>
            Télécharger
          </button>
          <button
            onClick={handleDelete}
            className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] flex items-center justify-center gap-2"
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
          className="w-96 flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.4), 0px 4px 8px 0px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div 
            className="flex flex-col overflow-y-auto flex-1"
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
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
                <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  Ressource coach
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

            {/* Video Information */}
            <div className="px-6 pt-1.5 pb-5 space-y-3 border-b border-white/5">
              {video.title && (
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
                  <span className="text-white font-light text-base">{video.title}</span>
                </div>
              )}
              {video.folder_name && (
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
                  <span className="text-white/50 font-light text-base">Dossier : {video.folder_name}</span>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="px-6 py-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>Description</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-white/50 hover:text-white transition-colors text-sm font-light"
                  disabled={isSubmitting}
                >
                  {isEditing ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              
              {isEditing ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="text-[14px] font-light text-white overflow-y-auto pr-1 break-words bg-[rgba(0,0,0,0.25)] rounded-[10px] px-[12px] py-[12px] min-h-[150px] w-full resize-none focus:outline-none placeholder-white/50"
                  />
                  <button
                    onClick={handleSaveDescription}
                    disabled={isSubmitting}
                    className="w-full text-white py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-light"
                    style={{ 
                      backgroundColor: 'var(--kaiylo-primary-hex)'
                    }}
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Envoyer'}
                  </button>
                </div>
              ) : (
                <div className="text-[14px] font-light text-white/75 overflow-y-auto pr-1 break-words bg-[rgba(0,0,0,0.25)] rounded-[10px] px-[12px] py-[12px] min-h-[150px]">
                  {description || 'Aucune description'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachResourceModal;
