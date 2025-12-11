import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ImageIcon, VideoIcon, VideoOff } from 'lucide-react';
import { useVideoUpload } from '../hooks/useVideoUpload';

const WorkoutVideoUploadModal = ({ isOpen, onClose, onUploadSuccess, exerciseInfo, setInfo, existingVideo }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [showMissingVideoModal, setShowMissingVideoModal] = useState(false);
  const { uploadVideo, progress, status, error: uploadError, videoId, retry, reset } = useVideoUpload();
  const initializedRef = useRef(false); // Track if we've already initialized from existingVideo
  const lastVideoUrlRef = useRef(null); // Track the last video URL we initialized to avoid re-initialization

  // Maximum file size: 48MB (Supabase free tier 50MB limit with 2MB safety margin)
  // But with TUS we can theoretically handle larger files, check project config.
  // Keeping 48MB limit warning for now, or relax it if TUS handles it well.
  // Relaxing to 500MB for TUS if backend allows it.
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  // Initialize with existing video data when modal opens
  useEffect(() => {
    // Reset initialization flag when modal closes
    if (!isOpen) {
      initializedRef.current = false;
      lastVideoUrlRef.current = null;
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
        console.log('⏭️ Already initialized with this video URL, skipping');
        return;
      }
      
      // If URL changed from no-URL to URL, reset initialization flag
      if (urlChanged && wasNoUrl) {
        console.log('🔄 Video URL became available, re-initializing');
        initializedRef.current = false;
      }
      
      console.log('🔍 WorkoutVideoUploadModal - existingVideo:', {
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
        console.log('📹 Restoring uploaded video from URL:', existingVideo.videoUrl);
        console.log('✅ Set videoFile to URL string:', existingVideo.videoUrl);
        console.log('✅ Set videoPreviewUrl to URL string:', existingVideo.videoUrl);
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
        console.log('📹 Video from API but no URL yet, status:', existingVideo.status);
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
        console.log('📹 Video uploaded but no URL yet, fetching from API...', existingVideo.videoId);
        // For now, mark as uploaded - the video will be fetched from API on next session load
        // Or we could trigger a fetch here, but that's more complex
        setVideoFile('uploaded');
        setVideoPreviewUrl(null);
        initializedRef.current = true;
        lastVideoUrlRef.current = 'uploaded-no-url';
      } else if (existingVideo.status) {
         // Maybe it's a video already uploaded?
         // For now, assume we are handling file objects or fresh uploads.
         console.log('⚠️ Video has status but no URL or file:', existingVideo.status);
         initializedRef.current = true;
         lastVideoUrlRef.current = `status-${existingVideo.status}`;
      }
    } else if (isOpen && !existingVideo) {
      console.log('🔍 WorkoutVideoUploadModal - No existingVideo, resetting');
      setVideoFile(null);
      setVideoPreviewUrl(null);
      reset(); // Reset upload hook state
      initializedRef.current = true;
      lastVideoUrlRef.current = null;
    }
  }, [isOpen, existingVideo?.videoUrl, existingVideo?.file, existingVideo?.isFromAPI, existingVideo?.videoId, reset]); // Use specific properties instead of entire object
  
  // Debug: Log videoFile and videoPreviewUrl changes
  useEffect(() => {
    console.log('🔍 WorkoutVideoUploadModal - State update:', {
      videoFile: videoFile ? (typeof videoFile === 'string' ? `URL (${videoFile.substring(0, 50)}...)` : typeof videoFile === 'object' ? `File (${videoFile.name})` : videoFile) : 'null',
      videoPreviewUrl: videoPreviewUrl ? `URL (${videoPreviewUrl.substring(0, 50)}...)` : 'null',
      isOpen,
      hasExistingVideo: !!existingVideo
    });
  }, [videoFile, videoPreviewUrl, isOpen, existingVideo]);

  // Cleanup preview URL (only for blob URLs, not for signed URLs from Supabase)
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Handle gallery selection
  const handleGallerySelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`❌ Vidéo trop volumineuse ! (Max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
          return;
        }
        setVideoFile(file);
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const handleNoVideo = () => {
    setVideoFile('no-video');
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (videoFile === null || videoFile === undefined) {
      setShowMissingVideoModal(true);
      return;
    }

    // If 'no-video', just close with success (no upload needed)
    if (videoFile === 'no-video') {
        onUploadSuccess({ file: 'no-video', videoId: null, status: 'SKIPPED' });
        onClose();
        return;
    }

    // If video is already uploaded (from API), just close with success
    if (videoFile === 'uploaded' && existingVideo?.isFromAPI) {
        console.log('✅ Video already uploaded, skipping re-upload');
        onUploadSuccess({ 
          file: 'uploaded', 
          videoId: existingVideo.videoId, 
          status: existingVideo.status || 'READY',
          videoUrl: existingVideo.videoUrl
        });
        onClose();
        return;
    }

    // Start TUS upload
    if (videoFile && typeof videoFile === 'object') {
         await uploadVideo(videoFile, {
            assigned_session_id: exerciseInfo.sessionId, // Ensure these props exist
            set_id: setInfo.setId || null, // Assuming setInfo has ID or we might need to pass it
            exercise_id: exerciseInfo.exerciseId,
            source: 'session_set',
            // Add metadata for context
            metadata: {
                exercise_name: exerciseInfo.exerciseName,
                exercise_index: exerciseInfo.exerciseIndex,
                set_number: setInfo.setNumber,
                set_index: setInfo.setIndex,
                weight: setInfo.weight,
                reps: setInfo.reps,
                // Add any available RPE/comment if passed in props (currently not passed, but prepared for)
            }
         });
    }
  };

  // Track if we've already called onUploadSuccess for this upload
  const hasCalledSuccessRef = useRef(false);
  
  // Reset the flag when modal opens/closes or when upload starts
  useEffect(() => {
    if (isOpen) {
      hasCalledSuccessRef.current = false;
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (status === 'UPLOADING' || status === 'PENDING') {
      hasCalledSuccessRef.current = false;
    }
  }, [status]);
  
  // Watch for upload completion
  useEffect(() => {
    if ((status === 'READY' || status === 'UPLOADED_RAW') && !hasCalledSuccessRef.current && videoId) {
        // Success! Only call once per upload
        hasCalledSuccessRef.current = true;
        onUploadSuccess({ 
            file: 'uploaded', // Mark as uploaded instead of passing File object
            videoId: videoId, 
            status: status,
            exerciseInfo: exerciseInfo,
            setInfo: setInfo
        });
        // We can close or show a success message
        // Maybe auto-close after a second?
        const timer = setTimeout(() => {
            onClose();
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [status, videoId, videoFile, onUploadSuccess, onClose, exerciseInfo, setInfo]);


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
    <React.Fragment>
       {/* Modal d'erreur pour vidéos manquantes - Same as before */}
       <Dialog open={showMissingVideoModal} onOpenChange={setShowMissingVideoModal}>
        <DialogContent 
          className="!grid-cols-1 !gap-0 bg-[#1b1b1b] border-[#262626] rounded-[20px] w-[270px] flex flex-col overflow-hidden !p-0 !translate-x-[-50%] !translate-y-[-50%]"
          overlayZIndex={96}
          contentZIndex={111}
        >
          <DialogHeader className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
            <DialogTitle>Vidéos manquantes</DialogTitle>
          </DialogHeader>
          <div className="px-[5px] pt-[17px] pb-[10px] flex flex-col gap-[15px] items-center">
            <h2 className="text-[17px] font-light text-[#d4845a] leading-normal text-center whitespace-pre-wrap">Vidéos manquantes</h2>
            <p className="text-[12px] font-light text-white/75 leading-normal text-center w-[227px] whitespace-pre-wrap">
              Certaines séries demandent une vidéo. Si vous quittez, votre séance ne sera pas complète.
            </p>
          </div>
          <div className="px-[27px] pb-[10px] flex flex-col gap-[8px]">
            <button onClick={() => setShowMissingVideoModal(false)} className="bg-[#d4845a] border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] text-[10px] text-white">Rester sur la page</button>
            <button onClick={() => { setShowMissingVideoModal(false); onClose(); }} className="bg-white/2 border-[0.5px] border-white/10 h-[25px] rounded-[5px] flex items-center justify-center px-[14px] py-[4px] text-[10px] text-white">Quitter quand même</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!grid-cols-1 !gap-0 bg-[#1b1b1b] border-[#262626] rounded-[20px] w-[320px] max-h-[90vh] flex flex-col overflow-hidden !p-0 !translate-x-[-50%] !translate-y-[-50%]" overlayZIndex={95} contentZIndex={110}>
          <DialogHeader className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
            <DialogTitle>Ajouter une vidéo</DialogTitle>
            <DialogDescription>{getExerciseSubtitle()}</DialogDescription>
          </DialogHeader>

          <div className="px-[28px] pt-[22px] pb-0 flex flex-col gap-[9px] items-center">
            <h2 className="text-[20px] font-light text-[#d4845a] leading-normal text-center">Ajouter une vidéo</h2>
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

          {(() => {
            const shouldShowVideo = videoFile && videoFile !== 'no-video' && (typeof videoFile === 'object' || typeof videoFile === 'string');
            const hasPreviewUrl = !!videoPreviewUrl;
            
            console.log('🔍 Render check:', {
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
                              className="w-full max-h-[200px] bg-black" 
                              style={{ aspectRatio: '16/9' }}
                              onError={(e) => {
                                console.error('❌ Video load error:', e);
                                console.error('❌ Video URL:', videoPreviewUrl);
                                console.error('❌ Video element error details:', {
                                  error: e.target?.error,
                                  networkState: e.target?.networkState,
                                  readyState: e.target?.readyState,
                                  src: e.target?.src,
                                  status: existingVideo?.status
                                });
                                // If video fails to load, show a message
                                if (e.target?.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                                    e.target?.error?.code === MediaError.MEDIA_ERR_NETWORK) {
                                  console.warn('⚠️ Video may not be ready yet or URL expired. Status:', existingVideo?.status);
                                }
                              }}
                              onLoadedData={() => {
                                console.log('✅ Video loaded successfully:', videoPreviewUrl);
                              }}
                              onLoadStart={() => {
                                console.log('🔄 Video loading started:', videoPreviewUrl);
                              }}
                            />
                          );
                        })()}
                        <div className="px-[12px] py-[8px]">
                           {typeof videoFile === 'object' ? (
                             <>
                               <p className="text-[11px] font-normal text-white truncate">{videoFile.name}</p>
                               <p className="text-[9px] font-light text-white/40">{formatFileSize(videoFile.size)}</p>
                             </>
                           ) : (
                             <p className="text-[11px] font-normal text-white truncate">Vidéo uploadée</p>
                           )}
                        </div>
                    </div>
                ) : (
                    typeof videoFile === 'object' && (
                      <div className="bg-white/5 border border-white/10 rounded-[5px] px-[12px] py-[8px]">
                          <p className="text-[11px] font-normal text-white truncate">{videoFile.name}</p>
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
                 <button onClick={retry} className="mt-2 text-[10px] text-white underline">Réessayer</button>
               </div>
             </div>
          )}

          <div className="px-[28px] pt-[25px] pb-[22px] flex gap-[10px] items-center justify-center">
            <button type="button" onClick={onClose} className="bg-white/2 border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] text-[12px] text-white" disabled={status === 'UPLOADING'}>Quitter</button>
            <button 
                type="button" 
                onClick={handleSubmit} 
                className="bg-[#d4845a] border-[0.5px] border-white/10 h-[32px] flex-1 rounded-[5px] text-[12px] text-white disabled:opacity-50"
                disabled={status === 'UPLOADING' || status === 'PENDING' || !videoFile}
            >
                {status === 'UPLOADING' ? 'Envoi...' : (status === 'READY' || status === 'UPLOADED_RAW' ? 'Terminé' : 'Terminer')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default WorkoutVideoUploadModal;
