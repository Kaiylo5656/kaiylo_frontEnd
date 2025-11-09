import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Video, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { buildApiUrl } from '../../config/api';
import axios from 'axios';

const ExerciseEditor = ({ 
  exercise, 
  onBack, 
  onSave, 
  onCancel,
  isMobile = false 
}) => {
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
  const [tagInput, setTagInput] = useState('');

  // Initialize form data when exercise changes
  useEffect(() => {
    if (exercise) {
      setFormData({
        title: exercise.title || '',
        instructions: exercise.instructions || '',
        tags: exercise.tags || []
      });
      
      // Set video preview if exercise has a demo video
      if (exercise.demoVideoURL) {
        setVideoPreview(exercise.demoVideoURL);
      } else {
        setVideoPreview(null);
      }
    }
  }, [exercise]);

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
      const tag = tagInput.trim();
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        setTagInput('');
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
      setUploadingVideo(true);
      const token = localStorage.getItem('authToken');
      
      // First, get or create the "exercise" folder
      const folderResponse = await axios.get(buildApiUrl('/resources/folders'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let exerciseFolder = folderResponse.data.data.find(folder => folder.name === 'exercise');
      
      if (!exerciseFolder) {
        // Create the exercise folder
        const createFolderResponse = await axios.post(buildApiUrl('/resources/folders'), {
          name: 'exercise',
          description: 'Exercise demonstration videos'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        exerciseFolder = createFolderResponse.data.data;
      }

      // Upload the video to the exercise folder
      const uploadFormData = new FormData();
      uploadFormData.append('video', videoFile);
      uploadFormData.append('title', `${formData.title} - Demo Video`);
      uploadFormData.append('description', `Demonstration video for ${formData.title} exercise`);
      uploadFormData.append('folderId', exerciseFolder.id);

      const uploadResponse = await axios.post(buildApiUrl('/resources'), uploadFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (uploadResponse.data.success && uploadResponse.data.data) {
        const videoUrl = uploadResponse.data.data.fileUrl;
        return videoUrl;
      } else {
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

  const handleSave = async () => {
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
      } else if (exercise && exercise.demoVideoURL) {
        // Preserve existing video URL when editing
        exerciseData.demoVideoURL = exercise.demoVideoURL;
      }
      
      await onSave(exercise.id, exerciseData);
    } catch (error) {
      console.error('Error saving exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!exercise) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No exercise selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Edit Exercise</h3>
            <p className="text-sm text-white/60">Modify exercise details</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {/* Exercise Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Exercise Name *
          </label>
          <Input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="bg-[#1a1a1a] border-white/20 text-white placeholder-white/50 focus:ring-[#e87c3e] focus:border-[#e87c3e]"
            placeholder="e.g., Push-ups"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Instructions
          </label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#e87c3e] focus:border-[#e87c3e]"
            placeholder="Step-by-step instructions for performing the exercise..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Tags
          </label>
          <Input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagInput}
            placeholder="Press Enter to add tags..."
            className="bg-[#1a1a1a] border-white/20 text-white placeholder-white/50 focus:ring-[#e87c3e] focus:border-[#e87c3e]"
          />
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-[#e87c3e]/20 text-[#e87c3e] px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-[#e87c3e]/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Demo Video (Optional)
          </label>
          {!videoPreview ? (
            <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#e87c3e]/50 transition-colors">
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
                <Upload className="h-8 w-8 text-white/50" />
                <span className="text-sm font-medium text-white">
                  Select a video file
                </span>
                <span className="text-xs text-white/50">
                  (MP4, MOV - max 300MB)
                </span>
              </label>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Video className="h-4 w-4 text-[#e87c3e]" />
                <span className="text-sm text-white/80">
                  {videoFile ? videoFile.name : 'Current video'}
                </span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="ml-auto text-white/70 hover:text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
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
            <p className="text-sm text-red-400 mt-2">{videoError}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || uploadingVideo}
            className="flex-1 bg-[#e87c3e] hover:bg-[#e87c3e]/90 text-white"
          >
            {uploadingVideo ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseEditor;
