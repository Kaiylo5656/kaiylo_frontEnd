// frontend/src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import { Button } from './ui/button';

const FileUpload = ({ onFileSelect, onUpload, isUploading = false, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
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

    // Validate file type
    if (!allowedTypes[file.type]) {
      alert(`File type not supported. Allowed types: ${Object.values(allowedTypes).join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      alert('File too large. Maximum size is 50MB.');
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
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
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
      return '🖼️';
    } else if (fileType.startsWith('video/')) {
      return '🎥';
    }
    return '📎';
  };

  return (
    <div className="file-upload-container">
      {!selectedFile ? (
        <div
          className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.keys(allowedTypes).join(',')}
            onChange={handleFileInput}
            style={{ display: 'none' }}
            disabled={disabled || isUploading}
          />
          
          <div className="drop-zone-content">
            <div className="upload-icon">📎</div>
            <p className="upload-text">
              {dragActive ? 'Drop file here' : 'Click or drag to upload'}
            </p>
            <p className="upload-subtext">
              Images: JPEG, PNG, GIF, WebP • Videos: MP4, MOV, AVI, WebM
            </p>
            <p className="upload-subtext">Max size: 50MB</p>
          </div>
        </div>
      ) : (
        <div className="file-preview">
          {preview ? (
            <div className="image-preview">
              <img src={preview} alt="Preview" className="preview-image" />
            </div>
          ) : (
            <div className="file-info">
              <div className="file-icon">{getFileIcon(selectedFile.type)}</div>
              <div className="file-details">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          )}
          
          <div className="file-actions">
            <Button
              type="button"
              variant="outline"
              onClick={clearFile}
              disabled={isUploading}
            >
              Remove
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Send File'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;


