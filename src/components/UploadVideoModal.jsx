import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { buildApiUrl } from '../config/api';
import { truncateMiddle } from '../utils/text';
import { useAuth } from '../contexts/AuthContext';

const UploadVideoModal = ({ isOpen, onClose, onUploadSuccess, folders }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(''); // Can be folder ID or 'new_folder'
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { getAuthToken } = useAuth();

  // Maximum file size: 300MB (matches backend limit)
  const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB in bytes

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      setVideoFile(null);
      return;
    }
    
    // Validate file size BEFORE setting state
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is 300 MB. Your file is ${formatFileSize(file.size)}.`);
      setVideoFile(null);
      return;
    }
    
    // File is valid
    setError(null);
    setVideoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !title) {
      setError('A video file and a title are required.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('video', videoFile);
    
    // Append folderId if a folder is selected
    if (selectedFolder && selectedFolder !== 'new_folder') {
      formData.append('folderId', selectedFolder);
    }
    
    // Note: Creating a new folder and then uploading would require a two-step process.
    // For simplicity, this modal will only assign to existing folders.
    // The main page handles new folder creation.

    try {
      const token = getAuthToken();
      const response = await fetch(buildApiUrl('/resources'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload video.';
        try {
          const errData = await response.json();
          errorMessage = errData.message || errData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const errorText = await response.text();
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              errorMessage = parsed.message || parsed.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      onUploadSuccess(result.data);
      handleClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setVideoFile(null);
    setSelectedFolder('');
    setNewFolderName('');
    setError(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-full max-w-xl sm:max-w-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle>Upload a New Resource</DialogTitle>
          <DialogDescription>
            Fill in the details below to upload a new video resource for your students.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-full">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How to perform a squat"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Optional)</label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the video content"
            />
          </div>
          <div>
            <label htmlFor="folder" className="block text-sm font-medium mb-1">Folder (Optional)</label>
            <select
              id="folder"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full p-2 bg-input border border-border rounded-md"
            >
              <option value="">Select a folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <div className="max-w-full">
            <label htmlFor="videoFile" className="block text-sm font-medium mb-1 shrink-0">Video File</label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              required
              className="max-w-full"
            />
            {videoFile && (
              <div className="mt-2 max-w-full overflow-hidden space-y-1">
                <p
                  className="text-xs text-white/90 truncate font-medium"
                  title={videoFile.name}
                  data-testid="upload-file-meta"
                >
                  {truncateMiddle(videoFile.name, 56)}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/60">
                    Size: {formatFileSize(videoFile.size)}
                  </p>
                  {videoFile.size > MAX_FILE_SIZE * 0.8 && (
                    <span className="text-xs text-yellow-500">
                      (Large file, longer upload time)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadVideoModal;
