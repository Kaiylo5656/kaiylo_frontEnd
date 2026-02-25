import logger from '../utils/logger';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ImageIcon, VideoIcon, VideoOff } from 'lucide-react';
import { useBackgroundUpload } from '../contexts/BackgroundUploadContext';
import VideoTrimEditor from './VideoTrimEditor';

const WorkoutVideoUploadModal = ({ isOpen, onClose, onUploadSuccess, onDeleteVideo, exerciseInfo, setInfo, existingVideo }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTrimEditor, setShowTrimEditor] = useState(false);
  const [rawSelectedFile, setRawSelectedFile] = useState(null); // Original file before trim
  const [trimMetadata, setTrimMetadata] = useState(null); // { startTime, endTime }
  const { startBackgroundUpload, getUploadForSet } = useBackgroundUpload();
  const initializedRef = useRef(false); // Track if we've already initialized from existingVideo
  const lastVideoUrlRef = useRef(null); // Track the last video URL we initialized to avoid re-initialization
  const fileInputRef = useRef(null); // Keep file input alive for iOS Safari (prevents GC during video compression)

  // Check if there's an active background upload for this set
  const activeUpload = getUploadForSet(exerciseInfo?.exerciseIndex, setInfo?.setIndex);
  const status = activeUpload?.status || 'IDLE';
  const progress = activeUpload?.progress || 0;
  const uploadError = activeUpload?.error || null;
  const videoId = activeUpload?.videoId || null;

  // Maximum file size: 50GB (Upgraded plan)
  const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB

  // Initialize with existing video data when modal opens
  useEffect(() => {
    // Reset initialization flag and submitted state when modal closes
    if (!isOpen) {
      setIsSubmitted(false);
      initializedRef.current = false;
      lastVideoUrlRef.current = null;
      setShowTrimEditor(false);
      setRawSelectedFile(null);
      setTrimMetadata(null);
      return;
    }
    
    if (isOpen && existingVideo) {
      // Get the video URL from existingVideo (prioritize videoUrl)
      const videoUrl = existingVideo.videoUrl || null;
      
      // Check if we've already initialized with this exact video URL
      // BUT: if videoUrl changed from null/undefined to a value, we need to update
      const urlChanged = videoUrl && lastVideoUrlRef.current !== videoUrl;
      const wasNoUrl = !lastVideoUrlRef.current || 
                       lastVideoUrlRef.current === 'uploaded-no-url' || 
                       lastVideoUrlRef.current === 'processing' ||
                       lastVideoUrlRef.current === 'uploaded';
      const shouldSkip = videoUrl && lastVideoUrlRef.current === videoUrl && !wasNoUrl;
      
      if (shouldSkip) {
        logger.debug('⏭️ Already initialized with this video URL, skipping');
        return;
      }
      
      // If URL changed from no-URL to URL, reset initialization flag
      if (urlChanged && wasNoUrl) {
        logger.debug('🔄 Video URL became available, re-initializing');
        initializedRef.current = false;
      }
      
      logger.debug('🔍 WorkoutVideoUploadModal - existingVideo:', {
        file: existingVideo.file,
        fileType: typeof existingVideo.file,
        isFromAPI: existingVideo.isFromAPI,
        videoUrl: existingVideo.videoUrl,
        videoId: existingVideo.videoId,
        status: existingVideo.status,
        lastVideoUrlRef: lastVideoUrlRef.current,
        urlChanged,
        wasNoUrl
      });
      
      // PRIORITY 1: Check for videoUrl first (highest priority - video is ready to display)
      if (existingVideo.videoUrl) {
        // Video has a URL (from any source, even if file === 'uploaded')
        setVideoFile(existingVideo.videoUrl);
        setVideoPreviewUrl(existingVideo.videoUrl);
        logger.debug('📹 Restoring uploaded video from URL:', existingVideo.videoUrl);
        logger.debug('✅ Set videoFile to URL string:', existingVideo.videoUrl);
        logger.debug('✅ Set videoPreviewUrl to URL string:', existingVideo.videoUrl);
        initializedRef.current = true;
        lastVideoUrlRef.current = existingVideo.videoUrl;
      } else if (existingVideo.file === 'no-video') {
        setVideoFile('no-video');
        setVideoPreviewUrl(null);
        initializedRef.current = true;
        lastVideoUrlRef.current = 'no-video';
      } else if (existingVideo.file && typeof existingVideo.file === 'object') {
        setVideoFile(existingVideo.file);
        const url = URL.createObjectURL(existingVideo.file);
        setVideoPreviewUrl(url);
        initializedRef.current = true;
        lastVideoUrlRef.current = url;
      } else if (existingVideo.isFromAPI && !existingVideo.videoUrl) {
        // Video was fetched from API but has no URL (still processing or failed)
        logger.debug('📹 Video from API but no URL yet, status:', existingVideo.status);
        if (existingVideo.status === 'PROCESSING' || existingVideo.status === 'UPLOADING' || existingVideo.status === 'UPLOADED_RAW') {
          // Video is still processing
          setVideoFile('processing');
          setVideoPreviewUrl(null);
          initializedRef.current = true;
          lastVideoUrlRef.current = 'processing';
        } else {
          // Video exists but no URL (might be an error)
          setVideoFile('uploaded');
          setVideoPreviewUrl(null);
          initializedRef.current = true;
          lastVideoUrlRef.current = 'uploaded-no-url';
        }
      } else if (existingVideo.file === 'uploaded' && existingVideo.videoId && !existingVideo.videoUrl) {
        // Video was just uploaded via TUS (has videoId but no videoUrl yet)
        // We need to fetch the signed URL from the API
        logger.debug('📹 Video uploaded but no URL yet, fetching from API...', existingVideo.videoId);
        // For now, mark as uploaded - the video will be fetched from API on next session load
        // Or we could trigger a fetch here, but that's more complex
        setVideoFile('uploaded');
        setVideoPreviewUrl(null);
        initializedRef.current = true;
        lastVideoUrlRef.current = 'uploaded-no-url';
      } else if (existingVideo.status) {
         // Maybe it's a video already uploaded?
         // For now, assume we are handling file objects or fresh uploads.
         logger.debug('⚠️ Video has status but no URL or file:', existingVideo.status);
         initializedRef.current = true;
         lastVideoUrlRef.current = `status-${existingVideo.status}`;
      }
    } else if (isOpen && !existingVideo) {
      logger.debug('🔍 WorkoutVideoUploadModal - No existingVideo, resetting');
      setVideoFile(null);
      setVideoPreviewUrl(null);
      initializedRef.current = true;
      lastVideoUrlRef.current = null;
    }
  }, [isOpen, existingVideo?.videoUrl, existingVideo?.file, existingVideo?.isFromAPI, existingVideo?.videoId]); // Use specific properties instead of entire object
  
  // Debug: Log videoFile and videoPreviewUrl changes
  useEffect(() => {
    logger.debug('🔍 WorkoutVideoUploadModal - State update:', {
      videoFile: videoFile ? (typeof videoFile === 'string' ? `URL (${videoFile.substring(0, 50)}...)` : typeof videoFile === 'object' ? `File (${videoFile.name})` : videoFile) : 'null',
      videoPreviewUrl: videoPreviewUrl ? `URL (${videoPreviewUrl.substring(0, 50)}...)` : 'null',
      isOpen,
      hasExistingVideo: !!existingVideo
    });
  }, [videoFile, videoPreviewUrl, isOpen, existingVideo]);

  // Cleanup preview URL and file input ref
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      if (fileInputRef.current) {
        fileInputRef.current.onchange = null;
        fileInputRef.current = null;
      }
    };
  }, [videoPreviewUrl]);

  // Handle gallery selection — opens file picker, modal stays open until "Terminer"
  const handleGallerySelect = () => {
    // If there's already an active upload for this set, don't start another
    if (activeUpload && (activeUpload.status === 'UPLOADING' || activeUpload.status === 'PENDING')) {
      logger.debug('⚠️ Upload already in progress for this set, not starting another');
      return;
    }

    // Clean up previous input if any
    if (fileInputRef.current) {
      fileInputRef.current.onchange = null;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    fileInputRef.current = input; // Keep alive for iOS (prevents GC during video compression)
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`❌ Vidéo trop volumineuse ! (Max ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB)`);
          return;
        }
        logger.debug('📁 File selected:', { name: file.name, size: file.size, type: file.type });
        // Show trim editor instead of immediately setting video
        setRawSelectedFile(file);
        // Create blob URL for trim editor preview — useEffect cleanup handles old URL revocation
        setVideoPreviewUrl(URL.createObjectURL(file));
        setShowTrimEditor(true);
        setTrimMetadata(null);
      }
    };
    input.click();
  };

  // Called when user confirms trim (or skips to full video)
  // File may be client-trimmed (Mediabunny) or original (fallback)
  const handleTrimConfirm = (resultFile, startTime, endTime) => {
    setShowTrimEditor(false);
    setVideoFile(resultFile);
    // Update blob URL if file changed (client trim produced a new file)
    if (resultFile !== rawSelectedFile) {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideoPreviewUrl(URL.createObjectURL(resultFile));
    }
    // Trim metadata always saved — server uses as backup/precise re-trim
    setTrimMetadata(startTime != null ? { startTime, endTime } : null);
    setRawSelectedFile(null);
  };

  // Called when user skips trim (uses full video)
  const handleSkipTrim = () => {
    setShowTrimEditor(false);
    if (rawSelectedFile) {
      setVideoFile(rawSelectedFile);
      // Keep existing videoPreviewUrl — already valid
    }
    setTrimMetadata(null);
    setRawSelectedFile(null);
  };

  const handleNoVideo = () => {
    setVideoFile('no-video');
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    // Don't call onUploadSuccess or onClose here - wait for "Terminer" button
  };

  const handleDeleteVideo = () => {
    if (onDeleteVideo) {
      onDeleteVideo(exerciseInfo, setInfo);
      onClose();
    }
  };

  const handleSubmit = async () => {
    // If trim editor is open, auto-select full video instead of closing
    if (showTrimEditor && rawSelectedFile) {
      handleSkipTrim();
      return;
    }

    // Allow closing even without video selection
    if (videoFile === null || videoFile === undefined) {
      onClose();
      return;
    }

    // If 'no-video', update state but don't close modal automatically
    if (videoFile === 'no-video') {
        if (onUploadSuccess) {
          onUploadSuccess({
            file: 'no-video',
            videoId: null,
            status: 'SKIPPED',
            exerciseInfo: exerciseInfo,
            setInfo: setInfo
          });
        }
        setIsSubmitted(true);
        // Don't close automatically - user can close manually with "Quitter" button
        return;
    }

    // If video is already uploaded (from API), update state but don't close automatically
    if (videoFile === 'uploaded' && existingVideo?.isFromAPI) {
        logger.debug('✅ Video already uploaded, skipping re-upload');
        if (onUploadSuccess) {
          onUploadSuccess({
            file: 'uploaded',
            videoId: existingVideo.videoId,
            status: existingVideo.status || 'READY',
            videoUrl: existingVideo.videoUrl,
            exerciseInfo: exerciseInfo,
            setInfo: setInfo
          });
        }
        setIsSubmitted(true);
        // Don't close automatically - user can close manually with "Quitter" button
        return;
    }

    // If upload is already in progress or completed, just close
    if (status === 'UPLOADING' || status === 'PENDING' || status === 'READY' || status === 'UPLOADED_RAW') {
      onClose();
      return;
    }

    // A new file was selected — start background upload, then close modal
    if (typeof videoFile === 'object' && videoFile instanceof File) {
      const tusMetadata = {
        assigned_session_id: exerciseInfo.sessionId,
        set_id: setInfo.setId || null,
        exercise_id: exerciseInfo.exerciseId,
        source: 'session_set',
        metadata: {
          exercise_name: exerciseInfo.exerciseName,
          exercise_index: exerciseInfo.exerciseIndex,
          set_number: setInfo.setNumber,
          set_index: setInfo.setIndex,
          weight: setInfo.weight,
          reps: setInfo.reps,
          trim_start_time: trimMetadata?.startTime ?? null,
          trim_end_time: trimMetadata?.endTime ?? null,
        }
      };
      startBackgroundUpload(videoFile, tusMetadata, exerciseInfo, setInfo, onUploadSuccess);
      onClose();
      return;
    }

    onClose();
  };

  // Note: Upload completion is now handled by BackgroundUploadContext
  // which calls the onSuccess callback directly when the TUS upload finishes.


  const getExerciseSubtitle = () => {
    if (exerciseInfo?.exerciseName && setInfo?.setNumber) {
      return `${exerciseInfo.exerciseName} - Série ${setInfo.setNumber}`;
    }
    return exerciseInfo?.exerciseName || 'Exercice';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!grid-cols-1 !gap-0 bg-[#1b1b1b] border-[#262626] rounded-[20px] w-[320px] max-h-[90vh] flex flex-col overflow-hidden !p-0 !translate-x-[-50%] !translate-y-[-50%]" overlayZIndex={95} contentZIndex={110}>
          <DialogHeader className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
            <DialogTitle>Ajouter une vidéo</DialogTitle>
            <DialogDescription>{getExerciseSubtitle()}</DialogDescription>
          </DialogHeader>

          <div className="px-[28px] pt-[22px] pb-0 flex flex-col gap-[9px] items-center">
            <h2 className="text-[20px] font-normal text-[#d4845a] leading-normal text-center">Ajouter une vidéo</h2>
            <p className="text-[11px] font-light text-white/50 leading-normal text-center">{getExerciseSubtitle()}</p>
          </div>

          <div className="px-[28px] pt-[15px] flex gap-[8px]">
            <button type="button" onClick={handleGallerySelect} className={`flex-1 h-[35px] rounded-[5px] flex items-center justify-center gap-[9px] text-white text-[12px] font-normal transition-colors ${videoFile && videoFile !== 'no-video' ? 'bg-[#d4845a]' : 'bg-[#2d2d2d]'}`}>
              <ImageIcon className="w-[18px] h-[18px]" />
              <span>Galerie</span>
            </button>
            <button type="button" onClick={handleNoVideo} className={`flex-1 h-[35px] rounded-[5px] flex items-center justify-center gap-[9px] text-white text-[12px] font-normal transition-colors ${videoFile === 'no-video' ? 'bg-[#d4845a]' : 'bg-[#2d2d2d]'}`}>
              <VideoOff className="w-[18px] h-[18px]" />
              <span>Pas de vidéo</span>
            </button>
          </div>

          {/* Trim Editor */}
          {showTrimEditor && rawSelectedFile && (
            <div className="px-[28px] pt-[12px]">
              <VideoTrimEditor
                file={rawSelectedFile}
                previewUrl={videoPreviewUrl}
                onConfirm={handleTrimConfirm}
                onSkip={handleSkipTrim}
              />
            </div>
          )}

          {(() => {
            const shouldShowVideo = !showTrimEditor && videoFile && videoFile !== 'no-video' && (typeof videoFile === 'object' || typeof videoFile === 'string');
            const hasPreviewUrl = !!videoPreviewUrl;
            
            logger.debug('🔍 Render check:', {
              videoFile: videoFile ? (typeof videoFile === 'string' ? 'URL string' : typeof videoFile === 'object' ? 'File object' : videoFile) : 'null',
              videoPreviewUrl: hasPreviewUrl ? 'Yes' : 'No',
              shouldShowVideo,
              willRender: shouldShowVideo && hasPreviewUrl
            });
            
            return shouldShowVideo && (
             <div className="px-[28px] pt-[12px]">
                {hasPreviewUrl ? (
                    <div className="bg-white/5 border border-white/10 rounded-[5px] overflow-hidden">
                        {(() => {
                          // Check if video is still processing
                          const isProcessing = existingVideo?.status === 'PROCESSING' || 
                                             existingVideo?.status === 'UPLOADING' || 
                                             existingVideo?.status === 'UPLOADED_RAW' ||
                                             existingVideo?.status === 'PENDING';
                          
                          if (isProcessing) {
                            return (
                              <div className="w-full h-[200px] bg-black/50 flex items-center justify-center flex-col gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4845a]"></div>
                                <p className="text-[11px] font-light text-white/60">Vidéo en cours de traitement...</p>
                              </div>
                            );
                          }
                          
                          return (
                            <video
                              src={videoPreviewUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-[200px] bg-black"
                              style={{ aspectRatio: '16/9' }}
                              onError={(e) => {
                                logger.error('❌ Video load error:', e);
                                logger.error('❌ Video URL:', videoPreviewUrl);
                                logger.error('❌ Video element error details:', {
                                  error: e.target?.error,
                                  networkState: e.target?.networkState,
                                  readyState: e.target?.readyState,
                                  src: e.target?.src,
                                  status: existingVideo?.status
                                });
                                // If video fails to load, show a message
                                if (e.target?.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                                    e.target?.error?.code === MediaError.MEDIA_ERR_NETWORK) {
                                  logger.warn('⚠️ Video may not be ready yet or URL expired. Status:', existingVideo?.status);
                                }
                              }}
                              onLoadedData={() => {
                                logger.debug('✅ Video loaded successfully:', videoPreviewUrl);
                              }}
                              onLoadStart={() => {
                                logger.debug('🔄 Video loading started:', videoPreviewUrl);
                              }}
                            />
                          );
                        })()}
                        <div className="px-[12px] py-[8px] flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {typeof videoFile === 'object' ? (
                              <>
                                <p className="text-[11px] font-normal text-white truncate">{videoFile.name}</p>
                                <p className="text-[9px] font-light text-white/40">{formatFileSize(videoFile.size)}</p>
                              </>
                            ) : (
                              <p className="text-[11px] font-normal text-white truncate">Vidéo uploadée</p>
                            )}
                          </div>
                          {onDeleteVideo && (
                            <button
                              type="button"
                              onClick={handleDeleteVideo}
                              className="flex-shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-full transition-colors"
                              title="Supprimer la vidéo"
                              disabled={activeUpload && (activeUpload.status === 'UPLOADING' || activeUpload.status === 'PENDING')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-[14px] h-[14px]" fill="#d4845a">
                                <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                    </div>
                ) : (
                    typeof videoFile === 'object' && (
                      <div className="bg-white/5 border border-white/10 rounded-[5px] px-[12px] py-[8px] flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-normal text-white truncate">{videoFile.name}</p>
                        </div>
                        {onDeleteVideo && (
                          <button
                            type="button"
                            onClick={handleDeleteVideo}
                            className="flex-shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-full transition-colors"
                            title="Supprimer la vidéo"
                            disabled={activeUpload && (activeUpload.status === 'UPLOADING' || activeUpload.status === 'PENDING')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-[14px] h-[14px]" fill="#d4845a">
                              <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                )}
             </div>
            );
          })()}

          {/* Upload Progress UI */}
          {(status === 'UPLOADING' || status === 'PENDING') && (
            <div className="px-[28px] pt-[15px]">
                <div className="w-full bg-[#2d2d2d] rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-[#d4845a] h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center text-[10px] text-white/70 mt-1">{status === 'PENDING' ? 'Préparation...' : `${progress}%`}</p>
            </div>
          )}

          {/* Error Message */}
          {(uploadError) && (
             <div className="px-[28px] pt-3">
               <div className="bg-red-900/20 border border-red-500/30 rounded-[5px] p-3 flex flex-col items-center">
                 <p className="text-red-400 text-[11px] font-medium">{uploadError}</p>
                 <button onClick={() => { /* Retry is handled via the floating indicator */ onClose(); }} className="mt-2 text-[10px] text-white underline">Fermer</button>
               </div>
             </div>
          )}

          <div className="px-[28px] pt-[25px] pb-[22px] flex gap-[10px] items-center justify-center">
            <button type="button" onClick={onClose} className="bg-white/2 border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] text-[12px] text-white">Quitter</button>
            <button 
                type="button" 
                onClick={handleSubmit} 
                className="bg-[#d4845a] border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] text-[12px] text-white disabled:opacity-50"
            >
                {status === 'UPLOADING' ? 'Envoi en cours...' : (status === 'READY' || status === 'UPLOADED_RAW' || isSubmitted ? 'Terminé' : 'Terminer')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
  );
};

export default WorkoutVideoUploadModal;
