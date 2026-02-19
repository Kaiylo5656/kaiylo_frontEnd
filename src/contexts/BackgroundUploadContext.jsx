import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { buildApiUrl } from '../config/api';
import logger from '../utils/logger';

const BackgroundUploadContext = createContext(null);

// Action types
const START_UPLOAD = 'START_UPLOAD';
const START_SELECTION = 'START_SELECTION';
const CANCEL_SELECTION = 'CANCEL_SELECTION';
const SET_PROGRESS = 'SET_PROGRESS';
const SET_STATUS = 'SET_STATUS';
const SET_VIDEO_ID = 'SET_VIDEO_ID';
const SET_ERROR = 'SET_ERROR';
const DISMISS = 'DISMISS';

function uploadReducer(state, action) {
  switch (action.type) {
    case START_SELECTION:
      return {
        ...state,
        [action.payload.id]: {
          id: action.payload.id,
          exerciseInfo: action.payload.exerciseInfo,
          setInfo: action.payload.setInfo,
          status: 'SELECTING',
          progress: 0,
          error: null,
          videoId: null,
        },
      };
    case CANCEL_SELECTION:
      if (!state[action.payload.id] || state[action.payload.id].status !== 'SELECTING') return state;
      {
        const { [action.payload.id]: _, ...rest } = state;
        return rest;
      }
    case START_UPLOAD:
      return {
        ...state,
        [action.payload.id]: {
          ...(state[action.payload.id] || {}),
          id: action.payload.id,
          exerciseInfo: action.payload.exerciseInfo || state[action.payload.id]?.exerciseInfo,
          setInfo: action.payload.setInfo || state[action.payload.id]?.setInfo,
          status: 'PENDING',
          progress: 0,
          error: null,
          videoId: null,
        },
      };
    case SET_PROGRESS:
      if (!state[action.payload.id]) return state;
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          progress: action.payload.progress,
        },
      };
    case SET_STATUS:
      if (!state[action.payload.id]) return state;
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          status: action.payload.status,
        },
      };
    case SET_VIDEO_ID:
      if (!state[action.payload.id]) return state;
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          videoId: action.payload.videoId,
        },
      };
    case SET_ERROR:
      if (!state[action.payload.id]) return state;
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          error: action.payload.error,
          status: 'FAILED',
        },
      };
    case DISMISS:
      const { [action.payload.id]: _, ...rest } = state;
      return rest;
    default:
      return state;
  }
}

export function BackgroundUploadProvider({ children }) {
  const [uploads, dispatch] = useReducer(uploadReducer, {});
  const tusInstancesRef = useRef({}); // Map of upload id -> tus.Upload instance
  const fileRefs = useRef({}); // Map of upload id -> File object (for retry)
  const metadataRefs = useRef({}); // Map of upload id -> TUS metadata (for retry)
  const callbackRefs = useRef({}); // Map of upload id -> onSuccess callback
  const fileInputRefs = useRef({}); // Map of upload id -> <input> element (survives modal unmount)
  const { getAuthToken } = useAuth();

  const startBackgroundUpload = useCallback(async (file, tusMetadata, exerciseInfo, setInfo, onSuccess) => {
    const id = `${exerciseInfo.exerciseIndex}-${setInfo.setIndex}`;

    // Store file, metadata, and callback for potential retry
    fileRefs.current[id] = file;
    callbackRefs.current[id] = onSuccess;

    dispatch({ type: START_UPLOAD, payload: { id, exerciseInfo, setInfo } });

    try {
      const token = await getAuthToken();

      // 1. Create placeholder video record
      const response = await axios.post(
        buildApiUrl('/videos'),
        tusMetadata,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { videoId, bucket, objectName, uploadUrl } = response.data;

      dispatch({ type: SET_VIDEO_ID, payload: { id, videoId } });
      dispatch({ type: SET_STATUS, payload: { id, status: 'UPLOADING' } });

      // Store full upload metadata for retry
      const fullUploadMeta = { videoId, bucket, objectName, uploadUrl };
      metadataRefs.current[id] = fullUploadMeta;

      // 2. Start TUS upload
      const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          Authorization: `Bearer ${token}`,
          'x-upsert': 'true',
        },
        metadata: {
          bucketName: bucket,
          objectName: objectName,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (err) => {
          logger.error('Background TUS Upload failed:', err);
          dispatch({ type: SET_ERROR, payload: { id, error: 'Upload failed: ' + err.message } });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          dispatch({ type: SET_PROGRESS, payload: { id, progress: percentage } });
        },
        onSuccess: async () => {
          dispatch({ type: SET_STATUS, payload: { id, status: 'UPLOADED_RAW' } });
          // Confirm upload to backend
          try {
            const freshToken = await getAuthToken();
            await axios.patch(
              buildApiUrl(`/videos/${videoId}`),
              {
                status: 'UPLOADED_RAW',
                raw_storage_path: objectName,
                size_bytes_raw: file.size,
                duration_ms: 0,
              },
              { headers: { Authorization: `Bearer ${freshToken}` } }
            );
            dispatch({ type: SET_STATUS, payload: { id, status: 'READY' } });

            // Call the onSuccess callback with the same payload shape as the modal used to
            const cb = callbackRefs.current[id];
            if (cb) {
              cb({
                file: 'uploaded',
                videoId: videoId,
                status: 'READY',
                exerciseInfo,
                setInfo,
              });
            }
          } catch (confirmErr) {
            logger.error('Failed to confirm background upload:', confirmErr);
            dispatch({ type: SET_ERROR, payload: { id, error: 'Upload completed but confirmation failed.' } });
          }
        },
      });

      tusInstancesRef.current[id] = upload;
      upload.start();
    } catch (err) {
      logger.error('Background upload flow failed:', err);
      dispatch({
        type: SET_ERROR,
        payload: { id, error: err instanceof Error ? err.message : 'Upload initialization failed' },
      });
    }

    return id;
  }, [getAuthToken]);

  // Start file selection: creates SELECTING entry, triggers file picker, handles cancellation
  // This lives in the context so the <input> and callbacks survive modal unmount.
  const triggerBackgroundFileSelect = useCallback((exerciseInfo, setInfo, onSuccess, tusMetadataTemplate, maxFileSize) => {
    const id = `${exerciseInfo.exerciseIndex}-${setInfo.setIndex}`;

    // Create SELECTING entry
    dispatch({ type: START_SELECTION, payload: { id, exerciseInfo, setInfo } });
    callbackRefs.current[id] = onSuccess;

    // Clean up previous input if any
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].onchange = null;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    fileInputRefs.current[id] = input;

    let fileSelected = false;

    input.onchange = (e) => {
      fileSelected = true;
      const file = e.target.files[0];
      if (file) {
        if (maxFileSize && file.size > maxFileSize) {
          alert(`❌ Vidéo trop volumineuse ! (Max ${maxFileSize / 1024 / 1024 / 1024}GB)`);
          dispatch({ type: CANCEL_SELECTION, payload: { id } });
          return;
        }
        logger.debug('📁 File selected via context picker:', { name: file.name, size: file.size, type: file.type });

        // Transition SELECTING → start upload
        fileRefs.current[id] = file;
        startBackgroundUpload(file, tusMetadataTemplate, exerciseInfo, setInfo, onSuccess);
      } else {
        // No file in the event — treat as cancellation
        dispatch({ type: CANCEL_SELECTION, payload: { id } });
      }
    };

    // Detect picker cancellation via visibilitychange
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again (picker closed). Wait a bit for onchange to fire.
        setTimeout(() => {
          if (!fileSelected) {
            logger.debug('📁 File picker cancelled (no file selected)');
            dispatch({ type: CANCEL_SELECTION, payload: { id } });
          }
          document.removeEventListener('visibilitychange', handleVisibility);
        }, 500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also detect via focus for desktop browsers where visibilitychange may not fire
    const handleFocus = () => {
      setTimeout(() => {
        if (!fileSelected) {
          logger.debug('📁 File picker cancelled via focus (no file selected)');
          dispatch({ type: CANCEL_SELECTION, payload: { id } });
        }
        window.removeEventListener('focus', handleFocus);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);

    // Trigger the file picker
    input.click();

    return id;
  }, [startBackgroundUpload]);

  const cancelSelection = useCallback((id) => {
    dispatch({ type: CANCEL_SELECTION, payload: { id } });
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].onchange = null;
      delete fileInputRefs.current[id];
    }
  }, []);

  const getUploadForSet = useCallback((exerciseIndex, setIndex) => {
    const id = `${exerciseIndex}-${setIndex}`;
    return uploads[id] || null;
  }, [uploads]);

  const dismissUpload = useCallback((id) => {
    // Cleanup refs
    delete tusInstancesRef.current[id];
    delete fileRefs.current[id];
    delete metadataRefs.current[id];
    delete callbackRefs.current[id];
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].onchange = null;
      delete fileInputRefs.current[id];
    }
    dispatch({ type: DISMISS, payload: { id } });
  }, []);

  const retryUpload = useCallback(async (id) => {
    const file = fileRefs.current[id];
    const meta = metadataRefs.current[id];
    const upload = uploads[id];

    if (!file || !upload) return;

    // If we have an existing TUS instance with a videoId, try resuming
    if (meta && tusInstancesRef.current[id]) {
      dispatch({ type: SET_STATUS, payload: { id, status: 'UPLOADING' } });
      dispatch({ type: SET_ERROR, payload: { id, error: null } });
      // Fix error state manually since SET_ERROR forces FAILED
      dispatch({ type: SET_STATUS, payload: { id, status: 'UPLOADING' } });
      tusInstancesRef.current[id].start();
    } else if (upload.exerciseInfo && upload.setInfo) {
      // Full restart
      const cb = callbackRefs.current[id];
      const tusMetadata = {
        assigned_session_id: upload.exerciseInfo.sessionId,
        set_id: upload.setInfo.setId || null,
        exercise_id: upload.exerciseInfo.exerciseId,
        source: 'session_set',
        metadata: {
          exercise_name: upload.exerciseInfo.exerciseName,
          exercise_index: upload.exerciseInfo.exerciseIndex,
          set_number: upload.setInfo.setNumber,
          set_index: upload.setInfo.setIndex,
          weight: upload.setInfo.weight,
          reps: upload.setInfo.reps,
        },
      };
      await startBackgroundUpload(file, tusMetadata, upload.exerciseInfo, upload.setInfo, cb);
    }
  }, [uploads, startBackgroundUpload]);

  const activeUploads = Object.values(uploads);

  const value = {
    startBackgroundUpload,
    triggerBackgroundFileSelect,
    cancelSelection,
    getUploadForSet,
    activeUploads,
    dismissUpload,
    retryUpload,
  };

  return (
    <BackgroundUploadContext.Provider value={value}>
      {children}
    </BackgroundUploadContext.Provider>
  );
}

export function useBackgroundUpload() {
  const context = useContext(BackgroundUploadContext);
  if (!context) {
    throw new Error('useBackgroundUpload must be used within a BackgroundUploadProvider');
  }
  return context;
}
