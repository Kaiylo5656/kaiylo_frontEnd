import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Download, Trash2, Send, Dumbbell, Calendar, User, Save, Edit3, Folder } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import ReactPlayer from 'react-player';
import VideoPlayer from './VideoPlayer';

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

  
  const videoRef = useRef(null);
  const { getAuthToken } = useAuth();

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
      console.log('Video object loaded:', video);
      console.log('Video URL:', video.video_url);
      console.log('Coach feedback:', video.coach_feedback);
      console.log('Video status:', video.status);
      
      // Determine video status based on coach feedback presence
      if (video.coach_feedback && video.coach_feedback.trim() !== '') {
        setVideoStatus('completed');
        console.log('Setting status to completed - coach feedback exists');
      } else {
        setVideoStatus('pending');
        console.log('Setting status to pending - no coach feedback');
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
        console.log('Loading overlay auto-hidden after 3 seconds');
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

  const togglePlay = () => {
    const now = Date.now();

    // Debounce rapid calls (prevent calls within 100ms)
    if (now - lastToggleTimeRef.current < 100) {
      console.log('Toggle debounced');
      return;
    }

    lastToggleTimeRef.current = now;
    console.log('togglePlay called, isPlaying:', isPlaying, 'videoRef.current:', videoRef.current);

    // Native HTML5 video element
    if (videoRef.current) {
      if (videoRef.current.paused) {
        console.log('Playing video');
        videoRef.current.play();
      } else {
        console.log('Pausing video');
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

  const handleSubmitFeedback = async () => {
    if (!video || !feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      
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
        alert('Description enregistrée avec succès');
      } else {
        // For student videos, submit feedback
        await axios.patch(
          buildApiUrl(`/workout-sessions/videos/${video.id}/feedback`),
          { 
            feedback: feedback.trim(),
            rating: rating || null,
            status: 'completed'  // Update status to completed when feedback is sent
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Update local status immediately for student videos
        setVideoStatus('completed');
        // Close the modal after successful submission for student videos
        onClose();
      }
      
      if (onFeedbackUpdate) {
        onFeedbackUpdate(video.id, feedback.trim(), rating, false, videoType === 'coach' ? 'description' : 'completed', videoType);
      }
      
    } catch (error) {
      console.error('Error submitting:', error);
      alert(videoType === 'coach' ? 'Erreur lors de l\'enregistrement de la description' : 'Erreur lors de l\'envoi du feedback');
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
      console.error('Error deleting video:', error);
      alert('❌ Erreur lors de la suppression de la vidéo');
    }
  };

  if (!isOpen || !video) return null;

  const studentName = video.student?.raw_user_meta_data?.full_name || 
                     video.student?.raw_user_meta_data?.name || 
                     video.student?.email || 
                     'Coach Resource';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-h-[95vh] sm:max-h-[85vh] flex flex-col overflow-hidden max-w-4xl">
        <div 
          className="flex flex-col overflow-y-auto custom-scrollbar"
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
        <div className="p-3 sm:p-4 border-b border-[#262626]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-white font-medium text-base sm:text-lg">
                {videoType === 'coach' ? (
                  video.title || 'Ressource Coach'
                ) : (
                  <>
                    <span className="text-white">{video.exercise_name}</span>
                    <span className="text-gray-400 ml-1">{video.set_number || 1}/3</span>
                  </>
                )}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                {videoType === 'coach' && video.folder_name && (
                  <div className="flex items-center gap-1">
                    <Folder className="w-4 h-4" />
                    <span>{video.folder_name}</span>
                  </div>
                )}
                <span>
                  {video.created_at ? format(new Date(video.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                </span>
                {videoType === 'student' && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    videoStatus === 'pending' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {videoStatus === 'pending' ? 'A feedback' : 'Complété'}
                  </span>
                )}
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
        <div className="flex-shrink-0 p-4">
          {video?.video_url && video.video_url.trim() !== '' ? (
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
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 bg-black/90 rounded-md border border-white/10">
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

        {/* Student Video - Coach Feedback Display */}
        {videoType === 'student' && (
          <div className="bg-[#262626] border-t border-[#404040]">
            <div className="p-3 sm:p-4">
              <h3 className="text-gray-400 text-sm font-medium mb-3">Feedback du coach</h3>
              {video.coach_feedback ? (
                <p className="text-white text-sm leading-relaxed">{video.coach_feedback}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">Aucun feedback du coach pour le moment</p>
              )}
            </div>
          </div>
        )}

        {/* Description/Response Section - Only show for coaches or coach resources */}
        {(videoType === 'coach' || isCoachView) && (
          <div className="bg-[#262626] border-t border-[#404040]">
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium flex items-center gap-2">
                  {videoType === 'coach' ? 'Description' : 'Feedback du coach'}
                  <Edit3 size={16} className="text-gray-400" />
                </h3>
                {videoType === 'coach' && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                    disabled={isSubmitting}
                  >
                    {isEditing ? 'Annuler' : 'Modifier'}
                  </button>
                )}
              </div>

              {videoType === 'coach' ? (
                // Coach resource - editable description
                isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Ajouter une description pour cette ressource..."
                      className="w-full h-24 bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 min-h-[60px]">
                    {feedback ? (
                      <p className="text-white text-sm whitespace-pre-wrap">{feedback}</p>
                    ) : (
                      <p className="text-gray-400 text-sm italic">Aucune description</p>
                    )}
                  </div>
                )
              ) : (
                // Student video - coach view only (feedback input)
                <div className="space-y-3">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Écrire un feedback pour l'étudiant..."
                    className="w-full h-24 bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!feedback.trim() || isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {isSubmitting ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-3 py-3 sm:px-4 sm:py-4 border-t border-[#404040] flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 sm:py-3 px-2 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            Télécharger
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 sm:py-3 px-2 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <Trash2 size={14} className="sm:w-4 sm:h-4" />
            Supprimer
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailModal;
