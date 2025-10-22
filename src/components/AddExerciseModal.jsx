import React, { useState, useEffect } from 'react';
import { X, Upload, Video, Trash2 } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

const AddExerciseModal = ({ isOpen, onClose, onExerciseCreated, editingExercise, onExerciseUpdated }) => {
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
      }
    }
  }, [isOpen, editingExercise]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = e.target.value.trim();
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        e.target.value = '';
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Exercise Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Exercise Name *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Push-ups"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Step-by-step instructions for performing the exercise..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <input
              type="text"
              onKeyPress={handleTagInput}
              placeholder="Press Enter to add tags..."
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-primary hover:text-primary/80"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Vidéo (optionnelle)
            </label>
            {console.log('Video preview state:', videoPreview)}
            {!videoPreview || videoPreview === null ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
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
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Sélectionner une fichier vidéo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (formats. mp4, mov - max 300 Mo)
                  </span>
                </label>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 max-w-full">
                <div className="flex items-center gap-2 max-w-full overflow-hidden mb-3">
                  {/* Video icon */}
                  <Video className="h-4 w-4 shrink-0 text-[#F2785C]" />
                  
                  {/* Filename with proper truncation */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs text-white/80"
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
                    className="shrink-0 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-64 rounded-lg bg-black"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {videoError && (
              <p className="text-sm text-destructive mt-2">{videoError}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingVideo}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingVideo ? 'Uploading Video...' : loading ? 'Saving...' : (editingExercise ? 'Update Exercise' : 'Create Exercise')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExerciseModal;
