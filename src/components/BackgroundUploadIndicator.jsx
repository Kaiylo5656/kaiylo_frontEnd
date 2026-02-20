import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, AlertCircle, X, RotateCcw, Video } from 'lucide-react';
import { useBackgroundUpload } from '../contexts/BackgroundUploadContext';

const BackgroundUploadIndicator = () => {
  const { activeUploads, dismissUpload, retryUpload } = useBackgroundUpload();
  const autoDismissTimers = useRef({});

  // Auto-dismiss completed uploads after 3 seconds
  useEffect(() => {
    activeUploads.forEach((upload) => {
      if (upload.status === 'READY' && !autoDismissTimers.current[upload.id]) {
        autoDismissTimers.current[upload.id] = setTimeout(() => {
          dismissUpload(upload.id);
          delete autoDismissTimers.current[upload.id];
        }, 3000);
      }
    });

    // Cleanup timers for dismissed uploads
    return () => {
      Object.keys(autoDismissTimers.current).forEach((id) => {
        if (!activeUploads.find((u) => u.id === id)) {
          clearTimeout(autoDismissTimers.current[id]);
          delete autoDismissTimers.current[id];
        }
      });
    };
  }, [activeUploads, dismissUpload]);

  // Don't render anything if no uploads
  if (activeUploads.length === 0) return null;

  const getLabel = (upload) => {
    const name = upload.exerciseInfo?.exerciseName || 'Exercice';
    const setNum = upload.setInfo?.setNumber || '?';
    return `${name} - Serie ${setNum}`;
  };

  const getStatusInfo = (upload) => {
    switch (upload.status) {
      case 'SELECTING':
        return { text: 'Sélection de la vidéo...', color: 'text-white/60' };
      case 'PENDING':
        return { text: 'Preparation...', color: 'text-white/60' };
      case 'UPLOADING':
        return { text: `${upload.progress}%`, color: 'text-white/80' };
      case 'UPLOADED_RAW':
        return { text: 'Finalisation...', color: 'text-white/80' };
      case 'READY':
        return { text: 'Termine', color: 'text-green-400' };
      case 'FAILED':
        return { text: 'Echec', color: 'text-red-400' };
      default:
        return { text: '', color: 'text-white/60' };
    }
  };

  return createPortal(
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[101] flex flex-col gap-2 w-[calc(100%-32px)] max-w-[360px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeUploads.map((upload) => {
          const statusInfo = getStatusInfo(upload);
          const isComplete = upload.status === 'READY';
          const isFailed = upload.status === 'FAILED';
          const isSelecting = upload.status === 'SELECTING';
          const isUploading = upload.status === 'UPLOADING' || upload.status === 'PENDING' || upload.status === 'UPLOADED_RAW';

          return (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto bg-[#1b1b1b] border border-white/10 rounded-[12px] px-4 py-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isComplete && <Check className="w-4 h-4 text-green-400" />}
                  {isFailed && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {isSelecting && <Video className="w-4 h-4 text-[#d4845a] animate-pulse" />}
                  {isUploading && <Upload className="w-4 h-4 text-[#d4845a] animate-pulse" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-white truncate">{getLabel(upload)}</p>
                  <p className={`text-[10px] ${statusInfo.color}`}>{statusInfo.text}</p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {isFailed && (
                    <button
                      onClick={() => retryUpload(upload.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  )}
                  {(isComplete || isFailed) && (
                    <button
                      onClick={() => dismissUpload(upload.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selecting indicator - pulsing bar */}
              {isSelecting && (
                <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-[#d4845a]/60 h-full rounded-full w-1/3"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}

              {/* Progress bar */}
              {isUploading && (
                <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-[#d4845a] h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${upload.progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default BackgroundUploadIndicator;
