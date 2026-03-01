import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Video, Trash2 } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';
import ExerciseTagTypeahead from './ui/ExerciseTagTypeahead';
import axios from 'axios';

const AddExerciseModal = ({ isOpen, onClose, onExerciseCreated, editingExercise, onExerciseUpdated, existingExercises = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [duplicateNameError, setDuplicateNameError] = useState(false);

  // Modal management
  const { isTopMost } = useModalManager();
  const modalId = 'add-exercise';

  // Reset form when modal opens/closes or when editing exercise changes
  useEffect(() => {
    if (isOpen) {
      if (editingExercise && editingExercise.id) {
        // Editing an existing exercise
        setFormData({
          title: editingExercise.title || '',
          instructions: editingExercise.instructions || '',
          tags: editingExercise.tags || []
        });
        setDuplicateNameError(false); // Reset duplicate error when editing
        // Set video preview if editing exercise has a demo video
        logger.debug('Editing exercise:', editingExercise);
        logger.debug('Demo video URL:', editingExercise.demoVideoURL);
        if (editingExercise.demoVideoURL) {
          setVideoPreview(editingExercise.demoVideoURL);
          logger.debug('Video preview set to:', editingExercise.demoVideoURL);
        } else {
          setVideoPreview(null);
          logger.debug('No demo video URL found');
        }
      } else {
        // Creating a new exercise - always reset to empty values
        setFormData({
          title: '',
          instructions: '',
          tags: []
        });
        setVideoFile(null);
        setVideoPreview(null);
        setVideoError('');
        setDuplicateNameError(false); // Reset duplicate error when creating new
      }
    } else {
      // Reset duplicate error when modal closes
      setDuplicateNameError(false);
    }
  }, [isOpen, editingExercise]);

  // Check if exercise name already exists
  const checkDuplicateName = (title) => {
    if (!title || !title.trim()) {
      setDuplicateNameError(false);
      return;
    }

    const normalizedTitle = title.trim().toLowerCase();
    const duplicateExists = existingExercises.some(exercise => {
      // When editing, exclude the current exercise from the check
      if (editingExercise && editingExercise.id === exercise.id) {
        return false;
      }
      return exercise.title && exercise.title.trim().toLowerCase() === normalizedTitle;
    });

    setDuplicateNameError(duplicateExists);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check for duplicate name when title changes
    if (name === 'title') {
      checkDuplicateName(value);
    }
  };

  const handleTagsChange = (newTags) => {
    setFormData(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const isImageType = (type) => type && type.startsWith('image/');

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedVideo = ['video/mp4', 'video/mov', 'video/quicktime'];
      const allowedImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif'];
      const allowedTypes = [...allowedVideo, ...allowedImage];
      if (!allowedTypes.includes(file.type)) {
        setVideoError('Sélectionnez une vidéo (MP4, MOV) ou une image (JPG, PNG, WebP, etc.)');
        return;
      }

      const maxVideoSize = 50 * 1024 * 1024 * 1024; // 50GB
      const maxImageSize = 20 * 1024 * 1024; // 20MB
      const maxSize = isImageType(file.type) ? maxImageSize : maxVideoSize;
      if (file.size > maxSize) {
        setVideoError(isImageType(file.type) ? 'Image : max 20 Mo' : 'Vidéo : max 50 Go');
        return;
      }

      setVideoFile(file);
      setVideoError('');
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const removeVideo = () => {
    if (videoPreview && videoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setVideoError('');
  };

  const uploadVideoToResources = async () => {
    if (!videoFile) return null;

    try {
      logger.debug('🎥 Starting video upload process...', {
        videoFile: videoFile.name,
        videoFileSize: videoFile.size,
        videoFileType: videoFile.type
      });
      
      setUploadingVideo(true);
      const token = localStorage.getItem('authToken');
      
      // First, get or create the "exercise" folder
      logger.debug('📁 Fetching folders...');
      const folderResponse = await axios.get(buildApiUrl('/resources/folders'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      logger.debug('📁 Folders response:', folderResponse.data);
      let exerciseFolder = folderResponse.data.data.find(folder => folder.name === 'exercise');
      
      if (!exerciseFolder) {
        // Create the exercise folder
        logger.debug('📁 Creating exercise folder...');
        const createFolderResponse = await axios.post(buildApiUrl('/resources/folders'), {
          name: 'exercise',
          description: 'Exercise demonstration videos'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        logger.debug('📁 Folder creation response:', createFolderResponse.data);
        exerciseFolder = createFolderResponse.data.data;
      } else {
        logger.debug('📁 Using existing exercise folder:', exerciseFolder);
      }

      // Upload the video to the exercise folder
      const uploadFormData = new FormData();
      uploadFormData.append('video', videoFile);
      uploadFormData.append('title', `${formData.title} - Demo Video`);
      uploadFormData.append('description', `Demonstration video for ${formData.title} exercise`);
      uploadFormData.append('folderId', exerciseFolder.id);

      logger.debug('Uploading video to resources...', {
        title: `${formData.title} - Demo Video`,
        description: `Demonstration video for ${formData.title} exercise`,
        folderId: exerciseFolder.id
      });

      const uploadResponse = await axios.post(buildApiUrl('/resources'), uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        }
      });

      logger.debug('Video upload response:', uploadResponse.data);
      
      if (uploadResponse.data.success && uploadResponse.data.data) {
        const videoUrl = uploadResponse.data.data.fileUrl;
        logger.debug('✅ Video upload successful! URL:', videoUrl);
        return videoUrl;
      } else {
        logger.debug('❌ Video upload failed:', uploadResponse.data);
        throw new Error('Video upload failed');
      }
    } catch (error) {
      logger.error('Error uploading video:', error);
      setVideoError('Failed to upload video. Please try again.');
      return null;
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let exerciseData = { ...formData };
      
      // Handle video URL - either upload new video or preserve existing one
      if (videoFile) {
        // Upload new video if one is selected
        const videoUrl = await uploadVideoToResources();
        if (videoUrl) {
          exerciseData.demoVideoURL = videoUrl;
        } else {
          setLoading(false);
          return; // Don't proceed if video upload failed
        }
      } else if (editingExercise && editingExercise.demoVideoURL) {
        // Preserve existing video URL when editing
        logger.debug('Preserving existing video URL:', editingExercise.demoVideoURL);
        exerciseData.demoVideoURL = editingExercise.demoVideoURL;
      }
      
      logger.debug('Final exercise data being sent:', exerciseData);
      logger.debug('Video file:', videoFile);
      logger.debug('Video preview:', videoPreview);

      if (editingExercise && editingExercise.id) {
        await onExerciseUpdated(editingExercise.id, exerciseData);
      } else {
        await onExerciseCreated(exerciseData);
      }
      
      // Reset form after successful submission
      setFormData({
        title: '',
        instructions: '',
        tags: []
      });
      setVideoFile(null);
      setVideoPreview(null);
      setVideoError('');
      
      onClose();
    } catch (error) {
      logger.error('Error saving exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to empty values
    setFormData({
      title: '',
      instructions: '',
      tags: []
    });
    setVideoFile(null);
    setVideoPreview(null);
    setVideoError('');
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      modalId={modalId}
      zIndex={80}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="h-5 w-5" fill="currentColor">
            <path d="M96 112c0-26.5 21.5-48 48-48s48 21.5 48 48l0 112 256 0 0-112c0-26.5 21.5-48 48-48s48 21.5 48 48l0 16 16 0c26.5 0 48 21.5 48 48l0 48c17.7 0 32 14.3 32 32s-14.3 32-32 32l0 48c0 26.5-21.5 48-48 48l-16 0 0 16c0 26.5-21.5 48-48 48s-48-21.5-48-48l0-112-256 0 0 112c0 26.5-21.5 48-48 48s-48-21.5-48-48l0-16-16 0c-26.5 0-48-21.5-48-48l0-48c-17.7 0-32-14.3-32-32s14.3-32 32-32l0-48c0-26.5 21.5-48 48-48l16 0 0-16z"/>
          </svg>
          {editingExercise ? 'Modifier l\'exercice' : 'Nouvel exercice'}
        </span>
      }
      titleClassName="text-lg md:text-xl font-normal text-white"
      className="!w-full md:!w-[448px] !max-w-full md:!max-w-[448px] !min-w-0 md:!min-w-[448px]"
      borderRadius="16px"
    >

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Exercise Name */}
          <div className="space-y-2">
            <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
              Nom de l'exercice *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
              placeholder="ex: Pompes"
            />
            {duplicateNameError && (
              <p className="text-xs font-extralight text-[#d4845a] mt-1">
                Un exercice avec un nom similaire existe déjà
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] resize-none"
              placeholder="Instructions étape par étape pour effectuer l'exercice..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
              Tags
            </label>
            <ExerciseTagTypeahead
              selectedTags={formData.tags}
              onTagsChange={handleTagsChange}
              placeholder="Appuyez sur Entrée pour ajouter des tags..."
              canCreate={true}
            />
          </div>

          {/* Video or Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
              Vidéo ou image (optionnelle)
            </label>
            {!videoPreview || videoPreview === null ? (
              <div className="border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] p-6 text-center hover:border-[rgba(255,255,255,0.1)] transition-colors bg-[rgba(0,0,0,0.5)]">
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/quicktime,image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/avif"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <span className="text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    Sélectionner une vidéo ou une image
                  </span>
                  <span className="text-xs font-extralight text-[rgba(255,255,255,0.5)]">
                    (vidéo: mp4, mov – max 50 Go · image: jpg, png, webp, gif… – max 20 Mo)
                  </span>
                </label>
              </div>
            ) : (
              <div className="rounded-[10px] border-[0.5px] border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.5)] p-3 max-w-full">
                <div className="flex items-center gap-2 max-w-full overflow-hidden mb-3">
                  <Video className="h-4 w-4 shrink-0 text-[#d4845a]" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-extralight text-white/80"
                      title={videoFile ? videoFile.name : 'Preview'}
                      data-testid="video-file-name"
                    >
                      {videoFile ? videoFile.name : 'Preview'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="shrink-0 rounded-[6px] px-3 py-1.5 text-xs font-extralight text-white/70 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
                {(videoFile && videoFile.type.startsWith('image/')) || (videoPreview && /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(videoPreview)) ? (
                  <img
                    src={videoPreview}
                    alt="Aperçu"
                    className="w-full max-h-64 object-contain rounded-[8px] bg-black"
                  />
                ) : (
                  <video
                    src={videoPreview}
                    controls
                    className="w-full max-h-64 rounded-[8px] bg-black"
                  >
                    Votre navigateur ne supporte pas la balise vidéo.
                  </video>
                )}
              </div>
            )}
            {videoError && (
              <p className="text-sm font-extralight text-red-400 mt-2">{videoError}</p>
            )}
          </div>

          {/* Upload Progress Bar */}
          {uploadingVideo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extralight text-white/60">Téléchargement en cours...</span>
                <span className="text-xs font-normal" style={{ color: '#d4845a' }}>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, backgroundColor: '#d4845a' }}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full md:w-auto px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploadingVideo || (duplicateNameError && !editingExercise)}
              className="w-full md:w-auto px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              {uploadingVideo ? 'Téléchargement...' : loading ? 'Enregistrement...' : (editingExercise ? 'Mettre à jour & fermer' : 'Créer & fermer')}
            </button>
          </div>
        </form>
    </BaseModal>
  );
};

export default AddExerciseModal;
