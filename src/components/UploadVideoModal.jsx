import React, { useState } from 'react';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';

const UploadVideoModal = ({ isOpen, onClose, onUploadSuccess, folders }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(''); // Can be folder ID or 'new_folder'
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !title) {
      setError('Un fichier vidéo et un titre sont requis.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
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

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Réponse serveur invalide.'));
            }
          } else {
            let errorMessage = 'Échec du téléchargement de la vidéo.';
            try {
              const errData = JSON.parse(xhr.responseText);
              errorMessage = errData.message || errData.error || errorMessage;
            } catch {
              // keep default
            }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => reject(new Error('Erreur réseau.'));
        xhr.ontimeout = () => reject(new Error('Le téléchargement a expiré.'));

        xhr.open('POST', buildApiUrl('/resources'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 600000; // 10 min timeout for large videos
        xhr.send(formData);
      });

      onUploadSuccess(result.data);
      handleClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setSelectedFolder('');
    setNewFolderName('');
    setError(null);
    setIsUploading(false);
    setUploadProgress(0);
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
            className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
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
            className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] resize-none"
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
              className="select-dark-kaiylo w-full px-[14px] py-3 pr-10 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] appearance-none"
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
          <input
            id="videoFile"
            type="file"
            accept="video/mp4,video/mov,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />
          {!videoFile ? (
            <label
              htmlFor="videoFile"
              className="border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] p-6 text-center hover:border-[rgba(255,255,255,0.1)] transition-colors bg-[rgba(0,0,0,0.5)] cursor-pointer flex flex-col items-center space-y-2"
            >
              <span className="text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                Sélectionner un fichier vidéo
              </span>
              <span className="text-xs font-extralight text-[rgba(255,255,255,0.5)]">
                (formats: mp4, mov - max 50 GB)
              </span>
            </label>
          ) : (
            <div className="border-[0.5px] border-[rgba(255,255,255,0.08)] rounded-[10px] overflow-hidden bg-[rgba(0,0,0,0.5)]">
              {/* Video preview */}
              <video
                src={videoPreviewUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[220px] object-contain bg-black"
              />
              {/* File info bar */}
              <div className="px-4 py-2.5 flex items-center gap-3 border-t border-white/5">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="w-3.5 h-3.5" fill="#d4845a">
                    <path d="M0 128C0 92.7 28.7 64 64 64l256 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128zM559.1 99.8c10.4 5.6 16.9 16.4 16.9 28.2l0 256c0 11.8-6.5 22.6-16.9 28.2s-23 5-32.9-1.6l-96-64L430.2 346.6l0-181.2 0 0 96-64c9.8-6.5 22.4-7.2 32.9-1.6z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-white truncate">{videoFile.name}</p>
                  <p className="text-xs font-extralight text-white/50">{formatFileSize(videoFile.size)}</p>
                </div>
                <label
                  htmlFor="videoFile"
                  className="flex-shrink-0 text-xs font-normal cursor-pointer px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
                  style={{ color: '#d4845a' }}
                  title="Changer de fichier"
                >
                  Changer
                </label>
                <button
                  type="button"
                  onClick={() => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoFile(null); setVideoPreviewUrl(null); }}
                  className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  title="Retirer le fichier"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
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

        {/* Upload Progress Bar */}
        {isUploading && (
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
