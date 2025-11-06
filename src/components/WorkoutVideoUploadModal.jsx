import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { ImageIcon, VideoIcon, X } from 'lucide-react';

const WorkoutVideoUploadModal = ({ isOpen, onClose, onUploadSuccess, exerciseInfo, setInfo }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [comment, setComment] = useState('');
  const [rpeRating, setRpeRating] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { getAuthToken } = useAuth();

  // RPE scale options (1-10)
  const rpeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleFileSelect = (source) => {
    if (source === 'gallery') {
      // Create a file input for gallery selection
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          setVideoFile(file);
        }
      };
      input.click();
    } else if (source === 'no-video') {
      // Student chooses not to upload a video
      setVideoFile('no-video'); // Special marker for no video
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Veuillez choisir une option.');
      return;
    }

    if (!rpeRating) {
      setError('Veuillez évaluer votre effort (RPE).');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Store video data locally instead of uploading immediately
      const videoData = {
        file: videoFile,
        comment: comment,
        rpeRating: rpeRating,
        exerciseInfo: exerciseInfo,
        setInfo: setInfo,
        timestamp: new Date().toISOString()
      };

      // Return video data to parent component for local storage
      onUploadSuccess(videoData);
      handleClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setVideoFile(null);
    setComment('');
    setRpeRating(null);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="dialog-content bg-[#121212] border-[#262626] max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="workout-modal-header shrink-0">
          <DialogTitle className="text-[#e87c3e] text-lg font-medium text-center">
            Ajouter une vidéo
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center text-sm">
            {exerciseInfo?.exerciseName} - {setInfo?.setNumber && `Série ${setInfo.setNumber}`}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
          {/* Video Source Selection */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleFileSelect('gallery')}
              className="flex-1 bg-[#262626] hover:bg-[#333] text-white py-4 px-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
            >
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Galerie</span>
            </button>
            <button
              type="button"
              onClick={() => handleFileSelect('no-video')}
              className="flex-1 bg-[#262626] hover:bg-[#333] text-white py-4 px-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
            >
              <X className="h-8 w-8" />
              <span className="text-sm font-medium">Pas de vidéo</span>
            </button>
          </div>

          {/* Selected Video Preview */}
          {videoFile && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-3">
              {videoFile === 'no-video' ? (
                <>
                  <X className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <span className="text-white text-sm flex-1 min-w-0">Pas de vidéo sélectionné</span>
                </>
              ) : (
                <>
                  <VideoIcon className="h-5 w-5 text-[#e87c3e] flex-shrink-0" />
                  <span className="text-white text-sm flex-1 min-w-0 truncate">{videoFile.name}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Commentaire
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire ..."
              className="w-full bg-[#262626] border border-[#404040] text-white placeholder-gray-500 rounded-lg px-3 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
            />
          </div>

          {/* RPE Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              RPE :
            </label>
            <div className="flex gap-2 flex-wrap">
              {rpeOptions.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setRpeRating(rating)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    rpeRating === rating
                      ? 'bg-[#e87c3e] text-white'
                      : 'bg-[#262626] text-gray-400 hover:bg-[#333] hover:text-white'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Très facile</span>
              <span>Très difficile</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="workout-modal-footer shrink-0 border-t border-[#262626] pt-4 mt-4">
          <div className="flex gap-3 px-4">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-[#262626] hover:bg-[#333] text-white py-3 rounded-lg transition-colors font-medium"
              disabled={isUploading}
            >
              Quitter
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-[#e87c3e] hover:bg-[#d66d35] text-white py-3 rounded-lg transition-colors font-medium"
              disabled={isUploading || !videoFile || !rpeRating}
            >
              {isUploading ? 'Enregistrement...' : 'Terminer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutVideoUploadModal;
