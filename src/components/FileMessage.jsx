// frontend/src/components/FileMessage.jsx
import logger from '../utils/logger';
import React, { useState } from 'react';
import VoiceMessage from './VoiceMessage';

const FileMessage = ({ message, isOwnMessage = false }) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

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
    } else if (fileType.startsWith('audio/')) {
      return '🎤';
    }
    return '📎';
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleDownload = async () => {
    if (!message.file_url) {
      logger.error('No file URL available');
      return;
    }

    try {
      // Try to fetch the file first to check if it's accessible
      const response = await fetch(message.file_url, {
        method: 'HEAD', // Just check if file exists
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`File not accessible: ${response.status}`);
      }

      // Create download link
      const link = document.createElement('a');
      link.href = message.file_url;
      link.download = message.file_name || 'download';
      link.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(message.file_url, '_blank');
    }
  };

  // Audio messages - render directly without wrapper (WhatsApp style)
  if (message.message_type === 'audio' || message.file_type?.startsWith('audio/')) {
    return <VoiceMessage message={message} isOwnMessage={isOwnMessage} />;
  }

  const renderFileContent = () => {
    if (!message.file_url) {
      return (
        <div className="file-message-error">
          <span className="file-icon">❌</span>
          <span>File not available</span>
        </div>
      );
    }

    // Image files
    if (message.file_type?.startsWith('image/') && !imageError) {
      return (
        <div className="file-image-container">
          <img
            src={message.file_url}
            alt={message.file_name || 'Shared image'}
            className="file-image"
            onError={handleImageError}
            onClick={() => window.open(message.file_url, '_blank')}
          />
          <div className="file-overlay">
            <button
              className="file-download-btn"
              onClick={handleDownload}
              title="Download image"
            >
              ⬇️
            </button>
          </div>
        </div>
      );
    }

    // Video files
    if (message.file_type?.startsWith('video/') && !videoError) {
      return (
        <div className="file-video-container">
          <video
            src={message.file_url}
            controls
            playsInline
            className="file-video"
            onError={handleVideoError}
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
          <div className="file-overlay">
            <button
              className="file-download-btn"
              onClick={handleDownload}
              title="Download video"
            >
              ⬇️
            </button>
          </div>
        </div>
      );
    }

    // Fallback for unsupported files or errors
    return (
      <div className="file-fallback">
        <div className="file-icon-large">{getFileIcon(message.file_type)}</div>
        <div className="file-details">
          <div className="file-name">{message.file_name || 'Unknown file'}</div>
          <div className="file-size">{formatFileSize(message.file_size || 0)}</div>
        </div>
        <button
          className="file-download-btn-large"
          onClick={handleDownload}
          title="Download file"
        >
          Download
        </button>
      </div>
    );
  };

  return (
    <div className={`file-message ${isOwnMessage ? 'own-message' : 'other-message'} max-w-[85%] sm:max-w-lg lg:max-w-2xl`}>
      {renderFileContent()}
      
      {/* Message content (caption) */}
      {message.content && message.content !== `📎 ${message.file_name}` && (
        <div className="file-message-caption text-xs md:text-sm">
          {message.content}
        </div>
      )}
    </div>
  );
};

export default FileMessage;
