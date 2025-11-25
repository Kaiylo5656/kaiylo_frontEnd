import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { ImageIcon, VideoIcon, X, Camera, VideoOff } from 'lucide-react';

const WorkoutVideoUploadModal = ({ isOpen, onClose, onUploadSuccess, exerciseInfo, setInfo, existingVideo }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [comment, setComment] = useState('');
  const [rpeRating, setRpeRating] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showMissingVideoModal, setShowMissingVideoModal] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { getAuthToken } = useAuth();

  // Initialize with existing video data when modal opens
  useEffect(() => {
    if (isOpen && existingVideo) {
      // Si le fichier est 'no-video', restaurer cet état
      if (existingVideo.file === 'no-video') {
        setVideoFile('no-video');
        setVideoPreviewUrl(null);
      } 
      // Si le fichier est null (vidéo était là mais ne peut pas être restaurée), ne rien faire
      // L'utilisateur devra re-uploader
      else if (existingVideo.file === null) {
        // Vidéo était enregistrée mais ne peut pas être restaurée
        // Ne pas définir videoFile pour que l'utilisateur puisse re-uploader
        setVideoFile(null);
        setVideoPreviewUrl(null);
      }
      // Si c'est un vrai fichier, le restaurer
      else if (existingVideo.file && typeof existingVideo.file === 'object') {
        setVideoFile(existingVideo.file);
        // Create preview URL for the existing video
        const url = URL.createObjectURL(existingVideo.file);
        setVideoPreviewUrl(url);
      }
      
      // Toujours restaurer RPE et commentaire si disponibles
      if (existingVideo.rpeRating) {
        setRpeRating(existingVideo.rpeRating);
      }
      if (existingVideo.comment) {
        setComment(existingVideo.comment);
      }
    } else if (isOpen && !existingVideo) {
      // Reset when opening without existing video
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setComment('');
      setRpeRating(null);
    }
  }, [isOpen, existingVideo]);

  // Cleanup preview URL when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Maximum file size: 48MB (Supabase free tier 50MB limit with 2MB safety margin)
  const MAX_FILE_SIZE = 48 * 1024 * 1024; // 48MB in bytes

  // RPE scale options (1-10)
  const rpeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle gallery selection
  const handleGallerySelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size BEFORE setting state
        if (file.size > MAX_FILE_SIZE) {
          setError(`❌ Vidéo trop volumineuse !\n\n📏 Taille maximale : 48 MB\n📦 Votre fichier : ${formatFileSize(file.size)}\n\n💡 Conseil : Utilisez une application de compression vidéo ou enregistrez en qualité réduite.`);
          return;
        }
        // Validate file type
        if (!file.type.startsWith('video/')) {
          setError('Veuillez sélectionner un fichier vidéo valide.');
          return;
        }
        setError(null);
        setVideoFile(file);
        // Create preview URL for the new video
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
      }
    };
    input.click();
  };

  // Handle video recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
        
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          setError(`❌ Vidéo trop volumineuse !\n\n📏 Taille maximale : 48 MB\n📦 Votre fichier : ${formatFileSize(file.size)}`);
          return;
        }
        
        setVideoFile(file);
        // Create preview URL for the recorded video
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier si une option vidéo a été choisie (soit un fichier, soit 'no-video')
    if (videoFile === null || videoFile === undefined) {
      setShowMissingVideoModal(true);
      return;
    }

    if (!rpeRating) {
      setError('Veuillez évaluer votre effort (RPE).');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Store video data locally instead of uploading immediately
      const videoData = {
        file: videoFile,
        comment: comment,
        rpeRating: rpeRating,
        exerciseInfo: exerciseInfo,
        setInfo: setInfo,
        timestamp: new Date().toISOString()
      };

      // Return video data to parent component for local storage
      onUploadSuccess(videoData);
      handleClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording && mediaRecorder) {
      handleStopRecording();
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Cleanup preview URL
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    
    setVideoFile(null);
    setComment('');
    setRpeRating(null);
    setError(null);
    setIsUploading(false);
    setIsRecording(false);
    setMediaRecorder(null);
    onClose();
  };

  // Format exercise name for subtitle
  const getExerciseSubtitle = () => {
    if (exerciseInfo?.exerciseName && setInfo?.setNumber) {
      return `${exerciseInfo.exerciseName} - Série ${setInfo.setNumber}`;
    }
    return exerciseInfo?.exerciseName || 'Exercice';
  };

  return (
    <React.Fragment>
      {/* Modal d'erreur pour vidéos manquantes */}
      <Dialog open={showMissingVideoModal} onOpenChange={setShowMissingVideoModal}>
        <DialogContent 
          className="!grid-cols-1 !gap-0 bg-[#1b1b1b] border-[#262626] rounded-[20px] w-[270px] flex flex-col overflow-hidden !p-0 !translate-x-[-50%] !translate-y-[-50%]"
          overlayZIndex={96}
          contentZIndex={111}
        >
          {/* Accessibility: Hidden title and description for screen readers */}
          <DialogHeader className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
            <DialogTitle>Vidéos manquantes</DialogTitle>
            <DialogDescription>Certaines séries demandent une vidéo. Si vous quittez votre séance ne sera pas complète.</DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="px-[5px] pt-[17px] pb-[10px] flex flex-col gap-[15px] items-center">
            <h2 className="text-[17px] font-light text-[#d4845a] leading-normal text-center whitespace-pre-wrap">
              Vidéos manquantes
            </h2>
            <p className="text-[12px] font-light text-white/75 leading-normal text-center w-[227px] whitespace-pre-wrap">
              Certaines séries demandent une vidéo.{' '}
              Si vous quittez votre séance ne sera pas complète.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="px-[27px] pb-[10px] flex flex-col gap-[8px]">
            <button
              type="button"
              onClick={() => setShowMissingVideoModal(false)}
              className="bg-[#d4845a] border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-[#c47850]"
            >
              <span className="text-[10px] font-normal text-white">Rester sur la page</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMissingVideoModal(false);
                handleClose();
              }}
              className="bg-white/2 border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-white/5"
            >
              <span className="text-[10px] font-normal text-white">Quitter quand même</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal principale */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="!grid-cols-1 !gap-0 bg-[#1b1b1b] border-[#262626] rounded-[20px] w-[320px] max-h-[90vh] flex flex-col overflow-hidden !p-0 !translate-x-[-50%] !translate-y-[-50%]"
        overlayZIndex={95}
        contentZIndex={110}
      >
        {/* Accessibility: Hidden title and description for screen readers */}
        <DialogHeader className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
          <DialogTitle>Ajouter une vidéo</DialogTitle>
          <DialogDescription>{getExerciseSubtitle()}</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="px-[28px] pt-[22px] pb-0 flex flex-col gap-[9px] items-center">
          <h2 className="text-[20px] font-light text-[#d4845a] leading-normal text-center">
            Ajouter une vidéo
          </h2>
          <p className="text-[11px] font-light text-white/50 leading-normal text-center">
            {getExerciseSubtitle()}
          </p>
        </div>

        {/* Video Source Selection */}
        <div className="px-[28px] pt-[15px] flex gap-[8px]">
          <button
            type="button"
            onClick={handleGallerySelect}
            className={`flex-1 h-[35px] rounded-[5px] flex items-center justify-center gap-[9px] text-white text-[12px] font-normal transition-colors ${
              videoFile && videoFile !== 'no-video'
                ? 'bg-[#d4845a] hover:bg-[#c47850]' 
                : 'bg-[#2d2d2d] hover:bg-[#3a3a3a]'
            }`}
          >
            <ImageIcon className="w-[18px] h-[18px]" />
            <span>Galerie</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setVideoFile('no-video');
              if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl);
                setVideoPreviewUrl(null);
              }
              setError(null);
            }}
            className={`flex-1 h-[35px] rounded-[5px] flex items-center justify-center gap-[9px] text-white text-[12px] font-normal transition-colors ${
              videoFile === 'no-video' 
                ? 'bg-[#d4845a] hover:bg-[#c47850]' 
                : 'bg-[#2d2d2d] hover:bg-[#3a3a3a]'
            }`}
          >
            <VideoOff className="w-[18px] h-[18px]" />
            <span>Pas de vidéo</span>
          </button>
        </div>

        {/* Message si une vidéo était enregistrée mais ne peut pas être restaurée */}
        {isOpen && existingVideo && existingVideo.file === null && !videoFile && (
          <div className="px-[28px] pt-[12px]">
            <div className="bg-[#2d2d2d] border border-white/10 rounded-[5px] px-[12px] py-[8px]">
              <p className="text-[10px] font-light text-white/75 leading-normal">
                <span className="text-[#d4845a]">⚠️</span> Une vidéo était enregistrée mais ne peut pas être restaurée. Veuillez la re-uploader.
              </p>
            </div>
          </div>
        )}

        {/* Video Preview or File Name Display */}
        {videoFile && videoFile !== 'no-video' && typeof videoFile === 'object' && (
          <div className="px-[28px] pt-[12px]">
            {videoPreviewUrl ? (
              <div className="bg-white/5 border border-white/10 rounded-[5px] overflow-hidden">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-[200px] bg-black"
                  style={{ aspectRatio: '16/9' }}
                />
                <div className="px-[12px] py-[8px]">
                  <p className="text-[10px] font-light text-white/50 leading-normal mb-[4px]">
                    Fichier sélectionné :
                  </p>
                  <p className="text-[11px] font-normal text-white leading-normal truncate" title={videoFile.name}>
                    {videoFile.name}
                  </p>
                  {videoFile.size && (
                    <p className="text-[9px] font-light text-white/40 leading-normal mt-[2px]">
                      {formatFileSize(videoFile.size)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-[5px] px-[12px] py-[8px]">
                <p className="text-[10px] font-light text-white/50 leading-normal mb-[4px]">
                  Fichier sélectionné :
                </p>
                <p className="text-[11px] font-normal text-white leading-normal truncate" title={videoFile.name}>
                  {videoFile.name}
                </p>
                {videoFile.size && (
                  <p className="text-[9px] font-light text-white/40 leading-normal mt-[2px]">
                    {formatFileSize(videoFile.size)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hidden video element for recording preview */}
        {isRecording && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="hidden"
          />
        )}

        {/* RPE Section */}
        <div className="px-[28px] pt-[20px] flex flex-col gap-[8px]">
          <p className="text-[11px] font-normal text-white leading-normal whitespace-pre-wrap">
            RPE :
          </p>
          <div className="flex gap-[8px] items-center">
            {rpeOptions.map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setRpeRating(rating)}
                className={`w-[24px] h-[24px] rounded-[3px] flex items-center justify-center transition-colors ${
                  rpeRating === rating
                    ? 'bg-[#d4845a] text-white'
                    : 'bg-[#2d2d2d] text-white/50 hover:bg-[#3a3a3a]'
                }`}
              >
                <span className="text-[11px] font-normal leading-normal">{rating}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-[28px] pt-3">
            <div className="bg-red-900/20 border border-red-500/30 rounded-[5px] p-3">
              <p className="text-red-400 text-[11px] font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-[28px] pt-[25px] pb-[22px] flex gap-[10px] items-center justify-center">
          <button
            type="button"
            onClick={handleClose}
            className="bg-white/2 border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] flex items-center justify-center transition-colors hover:bg-white/5"
            disabled={isUploading}
          >
            <span className="text-[12px] font-normal text-white">Quitter</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-[#d4845a] border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] flex items-center justify-center transition-colors hover:bg-[#c47850] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || !videoFile || !rpeRating}
          >
            <span className="text-[12px] font-normal text-white">
              {isUploading ? 'Enregistrement...' : 'Terminer'}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </React.Fragment>
  );
};

export default WorkoutVideoUploadModal;
