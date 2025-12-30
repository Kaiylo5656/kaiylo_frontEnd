import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { X, Image as ImageIcon, Video, File, Upload } from 'lucide-react';

const FileUpload = ({ onFileSelect, onUpload, isUploading = false, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Allowed file types
  const allowedTypes = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'video/mp4': 'MP4',
    'video/mov': 'MOV',
    'video/avi': 'AVI',
    'video/quicktime': 'QuickTime',
    'video/webm': 'WebM'
  };

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const handleFile = (file) => {
    if (!file) return;

    setError(null);

    // Validate file type
    if (!allowedTypes[file.type]) {
      setError(`Type de fichier non supporté. Types autorisés: ${Object.values(allowedTypes).join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError('Fichier trop volumineux. Taille maximale: 50MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (disabled || isUploading) return;

    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile && onUpload && !error) {
      onUpload(selectedFile);
      // Reset after upload starts
      setSelectedFile(null);
      setPreview(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-primary" />;
    } else if (fileType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-primary" />;
    }
    return <File className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={Object.keys(allowedTypes).join(',')}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      {!selectedFile ? (
        // WhatsApp-style drop zone - compact and clean
        <div
          className={`relative rounded-xl transition-all duration-200 ${
            dragActive
              ? 'border-2 border-primary bg-primary/10'
              : 'border border-white/10 bg-white/5 hover:bg-white/10'
          } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-center p-3 md:p-8">
            <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
              <div className="p-2 md:p-3 rounded-full bg-primary/10">
                <Upload className="h-5 w-5 md:h-7 md:w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm md:text-base font-medium text-white mb-1">
                  {dragActive ? 'Déposer le fichier ici' : 'Cliquez ou glissez-déposez pour téléverser'}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground font-light" style={{ color: 'rgba(175, 175, 182, 1)', fontSize: '11px' }}>
                  Images: JPEG, PNG, GIF, WebP • Vidéos: MP4, MOV, AVI, WebM
                </p>
                <p className="text-xs text-muted-foreground mt-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  Taille max: 50MB
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // WhatsApp-style preview with image/file info
        <div className="space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
            {preview ? (
              // Image preview - WhatsApp style
              <div className="relative group">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto max-h-[300px] md:max-h-[400px] object-cover"
                />
                <button
                  onClick={clearFile}
                  disabled={isUploading}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors disabled:opacity-50"
                  aria-label="Supprimer"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              // Video/File info - WhatsApp style
              <div className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0">
                  {getFileIcon(selectedFile.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  disabled={isUploading}
                  className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                  aria-label="Supprimer"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Action buttons - WhatsApp style */}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={clearFile}
              disabled={isUploading}
              className="text-muted-foreground hover:text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !!error}
              className="bg-primary hover:bg-primary/90 text-white px-6"
            >
              {isUploading ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
