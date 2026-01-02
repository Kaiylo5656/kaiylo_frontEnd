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
        console.log('Editing exercise:', editingExercise);
        console.log('Demo video URL:', editingExercise.demoVideoURL);
        if (editingExercise.demoVideoURL) {
          setVideoPreview(editingExercise.demoVideoURL);
          console.log('Video preview set to:', editingExercise.demoVideoURL);
        } else {
          setVideoPreview(null);
          console.log('No demo video URL found');
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mov', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        setVideoError('Please select a valid video file (MP4 or MOV)');
        return;
      }

      // Validate file size (300MB max)
      const maxSize = 300 * 1024 * 1024; // 300MB in bytes
      if (file.size > maxSize) {
        setVideoError('File size must be less than 300MB');
        return;
      }

      setVideoFile(file);
      setVideoError('');
      
      // Create preview URL
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
      console.log('🎥 Starting video upload process...', {
        videoFile: videoFile.name,
        videoFileSize: videoFile.size,
        videoFileType: videoFile.type
      });
      
      setUploadingVideo(true);
      const token = localStorage.getItem('authToken');
      
      // First, get or create the "exercise" folder
      console.log('📁 Fetching folders...');
      const folderResponse = await axios.get(buildApiUrl('/resources/folders'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📁 Folders response:', folderResponse.data);
      let exerciseFolder = folderResponse.data.data.find(folder => folder.name === 'exercise');
      
      if (!exerciseFolder) {
        // Create the exercise folder
        console.log('📁 Creating exercise folder...');
        const createFolderResponse = await axios.post(buildApiUrl('/resources/folders'), {
          name: 'exercise',
          description: 'Exercise demonstration videos'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('📁 Folder creation response:', createFolderResponse.data);
        exerciseFolder = createFolderResponse.data.data;
      } else {
        console.log('📁 Using existing exercise folder:', exerciseFolder);
      }

      // Upload the video to the exercise folder
      const uploadFormData = new FormData();
      uploadFormData.append('video', videoFile);
      uploadFormData.append('title', `${formData.title} - Demo Video`);
      uploadFormData.append('description', `Demonstration video for ${formData.title} exercise`);
      uploadFormData.append('folderId', exerciseFolder.id);

      console.log('Uploading video to resources...', {
        title: `${formData.title} - Demo Video`,
        description: `Demonstration video for ${formData.title} exercise`,
        folderId: exerciseFolder.id
      });

      const uploadResponse = await axios.post(buildApiUrl('/resources'), uploadFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Video upload response:', uploadResponse.data);
      
      if (uploadResponse.data.success && uploadResponse.data.data) {
        const videoUrl = uploadResponse.data.data.fileUrl;
        console.log('✅ Video upload successful! URL:', videoUrl);
        return videoUrl;
      } else {
        console.log('❌ Video upload failed:', uploadResponse.data);
        throw new Error('Video upload failed');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      setVideoError('Failed to upload video. Please try again.');
      return null;
    } finally {
      setUploadingVideo(false);
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
        console.log('Preserving existing video URL:', editingExercise.demoVideoURL);
        exerciseData.demoVideoURL = editingExercise.demoVideoURL;
      }
      
      console.log('Final exercise data being sent:', exerciseData);
      console.log('Video file:', videoFile);
      console.log('Video preview:', videoPreview);

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
      console.error('Error saving exercise:', error);
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
      size="md"
      title={editingExercise ? 'Modifier l\'exercice' : 'Nouvel exercice'}
      titleClassName="text-xl font-normal text-white"
    >

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
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
              className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] resize-none"
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

          {/* Video Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
              Vidéo (optionnelle)
            </label>
            {console.log('Video preview state:', videoPreview)}
            {!videoPreview || videoPreview === null ? (
              <div className="border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] p-6 text-center hover:border-[rgba(255,255,255,0.1)] transition-colors bg-[rgba(0,0,0,0.5)]">
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/quicktime"
                  onChange={handleVideoChange}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <span className="text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    Sélectionner un fichier vidéo
                  </span>
                  <span className="text-xs font-extralight text-[rgba(255,255,255,0.5)]">
                    (formats: mp4, mov - max 300 Mo)
                  </span>
                </label>
              </div>
            ) : (
              <div className="rounded-[10px] border-[0.5px] border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.5)] p-3 max-w-full">
                <div className="flex items-center gap-2 max-w-full overflow-hidden mb-3">
                  {/* Video icon */}
                  <Video className="h-4 w-4 shrink-0 text-[#d4845a]" />
                  
                  {/* Filename with proper truncation */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-extralight text-white/80"
                      title={videoFile ? videoFile.name : 'Video Preview'}
                      data-testid="video-file-name"
                    >
                      {videoFile ? videoFile.name : 'Video Preview'}
                    </p>
                  </div>
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="shrink-0 rounded-[6px] px-3 py-1.5 text-xs font-extralight text-white/70 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
                
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-64 rounded-[8px] bg-black"
                >
                  Votre navigateur ne supporte pas la balise vidéo.
                </video>
              </div>
            )}
            {videoError && (
              <p className="text-sm font-extralight text-red-400 mt-2">{videoError}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploadingVideo || (duplicateNameError && !editingExercise)}
              className="px-5 py-2.5 text-sm font-extralight bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
