import React, { useState } from 'react';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';

const UploadVideoModal = ({ isOpen, onClose, onUploadSuccess, folders }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(''); // Can be folder ID or 'new_folder'
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { getAuthToken } = useAuth();

  // Modal management
  const { isTopMost } = useModalManager();
  const modalId = 'upload-video-modal';

  // Maximum file size: 50GB (Upgraded plan)
  const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB in bytes

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
      setError('Veuillez sélectionner un fichier vidéo valide.');
      setVideoFile(null);
      return;
    }
    
    // Validate file size BEFORE setting state
    if (file.size > MAX_FILE_SIZE) {
      setError(`❌ Vidéo trop volumineuse !\n\n📏 Taille maximale : 50 GB\n📦 Votre fichier : ${formatFileSize(file.size)}\n\n💡 Conseil : Utilisez une application de compression vidéo ou enregistrez en qualité réduite.`);
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
      setError('Un fichier vidéo et un titre sont requis.');
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
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Vous n\'êtes pas authentifié. Veuillez vous reconnecter.');
      }
      
      const response = await fetch(buildApiUrl('/resources'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Échec du téléchargement de la vidéo.';
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

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      modalId={modalId}
      zIndex={80}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="md"
      title={
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" fill="currentColor">
            <path d="M144 480c-79.5 0-144-64.5-144-144 0-63.4 41-117.2 97.9-136.5-1.3-7.7-1.9-15.5-1.9-23.5 0-79.5 64.5-144 144-144 55.4 0 103.5 31.3 127.6 77.1 14.2-8.3 30.8-13.1 48.4-13.1 53 0 96 43 96 96 0 15.7-3.8 30.6-10.5 43.7 44 20.3 74.5 64.7 74.5 116.3 0 70.7-57.3 128-128 128l-304 0zM377 313c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-31 31 0-102.1c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 102.1-31-31c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l72 72c9.4 9.4 24.6 9.4 33.9 0l72-72z"/>
          </svg>
          Télécharger une nouvelle ressource
        </>
      }
      titleClassName="text-xl font-normal text-white"
      borderRadius="16px"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
            Titre *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex: Comment effectuer un squat"
            required
            className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
            Description (optionnelle)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Une courte description du contenu vidéo"
            rows={3}
            className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] resize-none"
          />
        </div>

        {/* Folder Selection */}
        <div className="space-y-2">
          <label htmlFor="folder" className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
            Dossier (optionnel)
          </label>
          <div className="relative">
            <select
              id="folder"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="select-dark-kaiylo w-full px-[14px] py-3 pr-10 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] appearance-none"
              style={{ 
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                colorScheme: 'dark'
              }}
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id} className="bg-[#131416]">
                  {folder.name}
                </option>
              ))}
            </select>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 384 512" 
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: '16px', height: '16px', opacity: '0.75' }}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
            </svg>
          </div>
        </div>

        {/* Video File Upload */}
        <div className="space-y-2">
          <label htmlFor="videoFile" className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
            Fichier vidéo *
          </label>
          <div className="border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] p-6 text-center hover:border-[rgba(255,255,255,0.1)] transition-colors bg-[rgba(0,0,0,0.5)]">
            <input
              id="videoFile"
              type="file"
              accept="video/mp4,video/mov,video/quicktime"
              onChange={handleFileChange}
              required
              className="hidden"
            />
            <label
              htmlFor="videoFile"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <span className="text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                Sélectionner un fichier vidéo
              </span>
              <span className="text-xs font-extralight text-[rgba(255,255,255,0.5)]">
                (formats: mp4, mov - max 50 GB)
              </span>
            </label>
          </div>
          {videoFile && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extralight text-white/60">
                  Taille : {formatFileSize(videoFile.size)}
                </p>
                {videoFile.size > MAX_FILE_SIZE * 0.8 && (
                  <span className="text-xs font-extralight text-yellow-500">
                    (Fichier volumineux, temps de téléchargement plus long)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-[10px] p-3">
            <p className="text-sm font-extralight text-red-400 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
          >
            {isUploading ? 'Téléchargement...' : 'Télécharger'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default UploadVideoModal;
