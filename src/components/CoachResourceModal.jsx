import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Download, Trash2, Save, Edit3, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

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

  const videoRef = useRef(null);
  const { getAuthToken } = useAuth();

  useEffect(() => {
    if (video) {
      setDescription(video.description || '');
      setVideoError(null);
      setIsVideoLoading(true);
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
        
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onClose]);

  const handleSaveDescription = async () => {
    if (!description.trim()) {
      alert('Veuillez saisir une description');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      await axios.patch(
        buildApiUrl(`/resources/${video.id}`),
        { description: description.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, description.trim(), null, false, 'description', 'coach');
      }
      
      setIsEditing(false);
      alert('Description enregistrée avec succès');
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
      const token = getAuthToken();
      await axios.delete(
        buildApiUrl(`/resources/${video.id}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onClose();
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, null, null, true);
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Erreur lors de la suppression de la ressource');
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg w-full h-[85vh] flex flex-col overflow-hidden max-w-4xl">
        <div 
          className="flex-1 flex flex-col overflow-y-auto custom-scrollbar"
          onWheel={(e) => {
            // Prevent scroll from bubbling to parent when modal is open
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent touch scroll from bubbling to parent on mobile
            e.stopPropagation();
          }}
        >
        {/* Header */}
        <div className="p-4 border-b border-[#262626]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-white font-medium text-lg">{video.title || 'Ressource Coach'}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                {video.folder_name && (
                  <div className="flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    <span>{video.folder_name}</span>
                  </div>
                )}
                <span>
                  {video.created_at ? format(new Date(video.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="h-96 relative bg-black flex-shrink-0">
          {video.video_url ? (
            <video
              ref={videoRef}
              src={video.video_url}
              controls
              className="w-full h-full object-contain"
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onLoadedMetadata={() => {
                const videoElement = videoRef.current;
                if (videoElement) {
                  setDuration(videoElement.duration);
                  setCurrentTime(0);
                  setIsPlaying(false);
                  setIsVideoLoading(false);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsVideoLoading(false);
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
                console.error('Video error:', error);
                setVideoError('Erreur lors du chargement de la vidéo');
                setIsVideoLoading(false);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Aucune vidéo disponible</p>
            </div>
          )}

          {/* Loading Overlay */}
          {isVideoLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white">Chargement de la vidéo...</div>
            </div>
          )}

          {/* Error Overlay */}
          {videoError && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-red-400 text-center">
                <p>{videoError}</p>
                <button
                  onClick={() => setVideoError(null)}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="bg-[#262626] border-t border-[#404040]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                Description
                <Edit3 size={16} className="text-gray-400" />
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                disabled={isSubmitting}
              >
                {isEditing ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajouter une description pour cette ressource..."
                  className="w-full h-24 bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
                <button
                  onClick={handleSaveDescription}
                  disabled={isSubmitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 min-h-[60px]">
                {description ? (
                  <p className="text-white text-sm whitespace-pre-wrap">{description}</p>
                ) : (
                  <p className="text-gray-400 text-sm italic">Aucune description</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#404040] flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Télécharger
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CoachResourceModal;
