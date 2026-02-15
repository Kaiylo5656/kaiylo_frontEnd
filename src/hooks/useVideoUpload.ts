import logger from '../utils/logger';
import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

export type UploadStatus = 'IDLE' | 'PENDING' | 'UPLOADING' | 'UPLOADED_RAW' | 'READY' | 'FAILED';

interface UseVideoUploadResult {
  uploadVideo: (file: File, metadata: any) => Promise<void>;
  progress: number;
  status: UploadStatus;
  error: string | null;
  videoId: string | null;
  retry: () => void;
  reset: () => void;
}

export const useVideoUpload = (): UseVideoUploadResult => {
  const [status, setStatus] = useState<UploadStatus>('IDLE');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const fileRef = useRef<File | null>(null);
  const metadataRef = useRef<any>(null);
  const { getAuthToken } = useAuth();

  const startTusUpload = useCallback(async (file: File, uploadMetadata: any) => {
    try {
      const token = await getAuthToken();
      
      const upload = new tus.Upload(file, {
        endpoint: uploadMetadata.uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
            Authorization: `Bearer ${token}`, // Required for RLS policies
            'x-upsert': 'true', // Allow overwriting if upload resumes
        },
        metadata: {
          bucketName: uploadMetadata.bucket,
          objectName: uploadMetadata.objectName,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (err) => {
          logger.error('TUS Upload failed:', err);
          setError('Upload failed: ' + err.message);
          setStatus('FAILED');
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal) * 100;
          setProgress(Math.round(percentage));
        },
        onSuccess: async () => {
          setStatus('UPLOADED_RAW');
          // Confirm upload to backend
          try {
            await axios.patch(
              buildApiUrl(`/videos/${uploadMetadata.videoId}`),
              {
                status: 'UPLOADED_RAW',
                raw_storage_path: uploadMetadata.objectName,
                size_bytes_raw: file.size,
                duration_ms: 0 // Ideally get from metadata or separate check
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('READY'); // Or 'PROCESSING' if we want to show that state
          } catch (confirmErr) {
            logger.error('Failed to confirm upload:', confirmErr);
            setError('Upload completed but confirmation failed.');
            setStatus('FAILED');
          }
        },
      });

      uploadRef.current = upload;
      upload.start();
      setStatus('UPLOADING');

    } catch (err) {
      logger.error('Failed to initialize TUS upload:', err);
      setError('Failed to start upload.');
      setStatus('FAILED');
    }
  }, [getAuthToken]);

  const uploadVideo = useCallback(async (file: File, metadata: any) => {
    setStatus('PENDING');
    setError(null);
    setProgress(0);
    fileRef.current = file;
    metadataRef.current = metadata;

    try {
        const token = await getAuthToken();
      // 1. Create placeholder
      const response = await axios.post(
        buildApiUrl('/videos'),
        metadata,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { videoId, bucket, objectName, uploadUrl } = response.data;
      setVideoId(videoId);

      // 2. Start TUS upload
      await startTusUpload(file, { videoId, bucket, objectName, uploadUrl });

    } catch (err) {
      logger.error('Upload flow failed:', err);
      setError(err instanceof Error ? err.message : 'Upload initialization failed');
      setStatus('FAILED');
    }
  }, [getAuthToken, startTusUpload]);

  const retry = useCallback(() => {
    if (fileRef.current && metadataRef.current) {
        // If we have an existing upload object that failed, we might want to try resuming it?
        // Or if it failed at the placeholder stage, restart the whole thing.
        // For simplicity, if we have a videoId, try to resume/restart TUS.
        if (videoId && uploadRef.current) {
            setStatus('UPLOADING');
            setError(null);
            uploadRef.current.start();
        } else {
            // Full restart
            uploadVideo(fileRef.current, metadataRef.current);
        }
    }
  }, [videoId, uploadVideo]);

  const reset = useCallback(() => {
    setStatus('IDLE');
    setProgress(0);
    setError(null);
    setVideoId(null);
    if (uploadRef.current) {
        uploadRef.current.abort();
        uploadRef.current = null;
    }
    fileRef.current = null;
    metadataRef.current = null;
  }, []);

  return { uploadVideo, progress, status, error, videoId, retry, reset };
};

