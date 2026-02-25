import React, { useState, useRef, useEffect, useCallback } from 'react';
import useVideoTrim from '../hooks/useVideoTrim';

/**
 * Mobile-first video trim editor.
 * Shows after video selection — lets students drag start/end markers to trim.
 * Video loops the selected segment for preview.
 * Trims client-side via Mediabunny (WebCodecs) when available, else server-only.
 */
const VideoTrimEditor = ({ file, previewUrl, onConfirm, onSkip }) => {
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const isDraggingRef = useRef(null); // 'start' | 'end' | null
  const animationFrameRef = useRef(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const { trimVideo, isTrimming, progress } = useVideoTrim();

  // Min trim duration in seconds
  const MIN_TRIM_DURATION = 1;

  // Use the previewUrl passed from parent (avoids creating/revoking duplicate blob URLs)
  const blobUrl = previewUrl;

  // Get duration from video element loadedmetadata
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && !isReady) {
      setVideoDuration(video.duration);
      setEndTime(video.duration);
      setIsReady(true);
    }
  }, [isReady]);

  // Loop: use timeupdate (fires ~4x/sec) for seek-back — safe on iOS Safari.
  // rAF only updates the visual playhead position (no seeking).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    let isSeeking = false;

    const handleTimeUpdate = () => {
      if (isSeeking) return;
      if (video.currentTime >= endTime - 0.05) {
        isSeeking = true;
        video.currentTime = startTime;
      }
    };

    const handleSeeked = () => {
      isSeeking = false;
      if (video.paused && isPlaying) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [startTime, endTime, isReady, isPlaying]);

  // Visual playhead update via rAF (no seeking, display only)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    const updatePlayhead = () => {
      setCurrentTime(video.currentTime);
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    animationFrameRef.current = requestAnimationFrame(updatePlayhead);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReady]);

  // When start handle changes, seek video to new start
  useEffect(() => {
    const video = videoRef.current;
    if (video && isReady) {
      video.currentTime = startTime;
    }
  }, [startTime, isReady]);

  // Play/pause toggle
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.currentTime = startTime;
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [startTime]);

  // Track play/pause state from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  // Format seconds to MM:SS.s
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  // Calculate position percentages for the timeline
  const startPercent = videoDuration > 0 ? (startTime / videoDuration) * 100 : 0;
  const endPercent = videoDuration > 0 ? (endTime / videoDuration) * 100 : 100;
  const currentPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  // Convert a clientX position to a time value on the timeline
  const clientXToTime = useCallback((clientX) => {
    const timeline = timelineRef.current;
    if (!timeline || videoDuration <= 0) return 0;
    const rect = timeline.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * videoDuration;
  }, [videoDuration]);

  // Handle drag events (mouse + touch)
  const handlePointerDown = useCallback((handle) => (e) => {
    // Don't call e.preventDefault() here — React touch events are passive.
    // Scrolling is blocked via the touchmove listener below (which uses { passive: false }).
    if (e.type === 'mousedown') e.preventDefault();
    isDraggingRef.current = handle;

    const handleMove = (moveEvent) => {
      // Prevent page scroll while dragging trim handles
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const time = clientXToTime(clientX);

      if (isDraggingRef.current === 'start') {
        const maxStart = endTime - MIN_TRIM_DURATION;
        setStartTime(Math.max(0, Math.min(time, maxStart)));
      } else if (isDraggingRef.current === 'end') {
        const minEnd = startTime + MIN_TRIM_DURATION;
        setEndTime(Math.max(minEnd, Math.min(time, videoDuration)));
      }
    };

    const handleUp = () => {
      isDraggingRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  }, [clientXToTime, startTime, endTime, videoDuration]);

  // Handle trim confirmation — tries client-side trim via Mediabunny, falls back to server
  const handleTrimConfirm = async () => {
    const isFullVideo = startTime < 0.5 && endTime > videoDuration - 0.5;
    if (isFullVideo) {
      onConfirm(file, null, null);
      return;
    }

    const result = await trimVideo(file, startTime, endTime);
    if (result.wasClientTrimmed) {
      onConfirm(result.file, null, null);
    } else {
      onConfirm(result.file, startTime, endTime);
    }
  };

  const trimmedDuration = endTime - startTime;

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Video Preview */}
      {blobUrl && (
        <div className="bg-black rounded-[5px] overflow-hidden relative group">
          <video
            ref={videoRef}
            src={blobUrl}
            playsInline
            muted
            autoPlay
            loop={false}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full max-h-[200px] bg-black"
            style={{ aspectRatio: '16/9' }}
          />
          {/* Play/Pause overlay button */}
          {isReady && (
            <button
              type="button"
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors"
            >
              <div className={`w-[40px] h-[40px] rounded-full bg-black/50 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-[18px] h-[18px]">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-[18px] h-[18px] ml-[2px]">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Duration display */}
      {isReady && (
        <div className="text-center">
          <p className="text-[11px] text-white/60">
            Durée sélectionnée:{' '}
            <span className="text-white font-medium">{formatTime(trimmedDuration)}</span>
            <span className="text-white/30"> / {formatTime(videoDuration)}</span>
          </p>
        </div>
      )}

      {/* Timeline with draggable handles */}
      {isReady && (
        <div className="px-[4px]">
          <div
            ref={timelineRef}
            className="relative h-[40px] bg-[#2d2d2d] rounded-[4px] overflow-hidden select-none"
            style={{ touchAction: 'none' }}
          >
            {/* Dimmed areas outside selection */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/50"
              style={{ width: `${startPercent}%` }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/50"
              style={{ width: `${100 - endPercent}%` }}
            />

            {/* Selected range highlight */}
            <div
              className="absolute top-0 bottom-0 bg-[#d4845a]/20 border-y border-[#d4845a]/40"
              style={{
                left: `${startPercent}%`,
                width: `${endPercent - startPercent}%`,
              }}
            />

            {/* Current playback position */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none z-10"
              style={{ left: `${currentPercent}%` }}
            />

            {/* Start handle */}
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center cursor-ew-resize z-20"
              style={{
                left: `${startPercent}%`,
                transform: 'translateX(-50%)',
                width: '44px', // 44px touch target
              }}
              onMouseDown={handlePointerDown('start')}
              onTouchStart={handlePointerDown('start')}
            >
              <div className="w-[4px] h-[28px] bg-[#d4845a] rounded-full shadow-lg" />
            </div>

            {/* End handle */}
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center cursor-ew-resize z-20"
              style={{
                left: `${endPercent}%`,
                transform: 'translateX(-50%)',
                width: '44px', // 44px touch target
              }}
              onMouseDown={handlePointerDown('end')}
              onTouchStart={handlePointerDown('end')}
            >
              <div className="w-[4px] h-[28px] bg-[#d4845a] rounded-full shadow-lg" />
            </div>
          </div>

          {/* Time labels */}
          <div className="flex justify-between mt-[4px]">
            <span className="text-[9px] text-white/40">{formatTime(startTime)}</span>
            <span className="text-[9px] text-white/40">{formatTime(endTime)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-[8px]">
        <button
          type="button"
          onClick={onSkip}
          disabled={isTrimming}
          className="flex-1 h-[35px] rounded-[5px] bg-[#2d2d2d] text-white text-[12px] font-normal transition-colors disabled:opacity-50"
        >
          Vidéo complète
        </button>
        <button
          type="button"
          onClick={handleTrimConfirm}
          disabled={!isReady || isTrimming}
          className="flex-1 h-[35px] rounded-[5px] bg-[#d4845a] text-white text-[12px] font-normal transition-colors disabled:opacity-50"
        >
          {isTrimming ? `Découpage... ${Math.round(progress * 100)}%` : 'Découper ✓'}
        </button>
      </div>
    </div>
  );
};

export default VideoTrimEditor;
