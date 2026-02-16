// frontend/src/components/VoiceMessage.jsx
import logger from '../utils/logger';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

const VoiceMessage = ({ message, isOwnMessage = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0); // Use message duration if available
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  // Memoize waveform bars so they don't regenerate on every render
  const waveformBars = useMemo(() => {
    // Generate static random waveform bars (Instagram style), fewer bars = shorter width
    return Array.from({ length: 28 }, () => Math.max(0.3, Math.random()));
  }, []); // Empty dependency array = generate once per component instance

  // Handle Playback Rate
  const togglePlaybackRate = (e) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Use requestAnimationFrame for smooth progress updates
  useEffect(() => {
    if (isPlaying) {
      const updateProgress = () => {
        const audio = audioRef.current;
        if (audio) {
          setCurrentTime(audio.currentTime);
          // Try to update duration if it was missing or Infinity
          if ((!duration || !isFinite(duration)) && audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        }
        rafRef.current = requestAnimationFrame(updateProgress);
      };
      rafRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Audio Event Handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !message.file_url) return;

    const handleLoadedMetadata = () => {
      // Prioritize audio element duration if valid
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Initial load, but we don't want to auto-play
    // Just setting source/loading metadata is handled by the <audio> tag usually, 
    // but calling load() ensures it reads the new src if prop changes.
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [message.file_url]);

  // Effect to sync playbackRate when audio loads or changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isPlaying]); // Sync when playing starts too just in case

  const togglePlayPause = async (e) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      logger.error('Error toggling audio:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = duration > 0 ? duration : currentTime;

  // Instagram-style colors
  // Own message: Darker/Filled bars are white, Empty bars are semi-transparent white
  // Received message: Filled bars are Primary Color (or Dark Grey), Empty bars are Light Grey


  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));

    const newTime = percentage * duration;

    // Only update if valid finite number
    if (isFinite(newTime)) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const filledColor = isOwnMessage ? 'bg-white' : 'bg-[#e87c3e]'; // Primary brand color for filled received
  const emptyColor = isOwnMessage ? 'bg-white/40' : 'bg-white/30'; // Less visible for empty

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-[18px] select-none transition-colors duration-200 min-w-[180px] max-w-[260px] ${isOwnMessage
        ? 'bg-primary text-primary-foreground'
        : 'bg-white/10 text-white' // Glassmorphism for received
        }`}
    >
      <audio
        ref={audioRef}
        src={message.file_url}
        preload="metadata"
        className="hidden"
      />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${isOwnMessage
          ? 'bg-white text-primary hover:bg-white/90'
          : 'bg-white text-black hover:bg-white/90'
          }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualization - Click to seek */}
      <div
        className="flex items-center gap-[2px] h-8 flex-1 min-w-0 max-w-[110px] cursor-pointer touch-none relative"
        onClick={handleSeek}
        title="Click to seek"
      >
        {/* Transparent overlay for easier clicking */}
        <div className="absolute inset-0 z-10" />

        {waveformBars.map((heightScale, index) => {
          // Calculate progress percentage for this bar
          const barPercent = (index / waveformBars.length);
          const currentPercent = duration > 0 ? currentTime / duration : 0;
          const isFilled = barPercent <= currentPercent;

          return (
            <div
              key={index}
              className={`w-[3px] rounded-full transition-all duration-100 ${isFilled ? filledColor : emptyColor
                }`}
              style={{
                height: `${Math.max(20, heightScale * 100)}%`, // Min height 20%, max 100%
                opacity: isFilled ? 1 : 0.5
              }}
            />
          );
        })}
      </div>

      {/* Timer & Speed Control */}
      <div className="flex flex-col items-end gap-0.5 min-w-[32px]">
        <button
          onClick={togglePlaybackRate}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${isOwnMessage
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white/90'
            }`}
        >
          {playbackRate}x
        </button>
        <span className={`text-[10px] ${isOwnMessage ? 'text-white/80' : 'text-white/60'}`}>
          {formatTime(duration > 0 ? duration - currentTime : duration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceMessage;

