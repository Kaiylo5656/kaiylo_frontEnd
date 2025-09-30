import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { buildApiUrl } from '../config/api';
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
    } else {
      setError('Please select a valid video file.');
    }
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
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to upload video.');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a New Resource</DialogTitle>
          <DialogDescription>
            Fill in the details below to upload a new video resource for your students.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label htmlFor="videoFile" className="block text-sm font-medium mb-1">Video File</label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              required
            />
            {videoFile && <p className="text-xs text-muted-foreground mt-1">{videoFile.name}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
