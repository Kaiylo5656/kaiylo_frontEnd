// frontend/src/components/VoiceMessage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const VoiceMessage = ({ message, isOwnMessage = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const audioRef = useRef(null);

  // Generate waveform data (simulated - in a real app, you'd analyze the audio file)
  useEffect(() => {
    if (message.file_url) {
      // Generate random waveform bars for visual effect
      // In production, you could use Web Audio API to analyze the actual audio
      const bars = Array.from({ length: 35 }, () => Math.random() * 60 + 10);
      setWaveformData(bars);
    }
  }, [message.file_url]);

  // Load audio metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !message.file_url) return;

    const handleLoadedMetadata = () => {
      // Check if duration is valid (not Infinity or NaN)
      const duration = audio.duration;
      if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
        setDuration(duration);
      } else if (duration === Infinity) {
        // For streaming audio (WebM), duration might be Infinity
        // We'll try to get it during playback or from other events
        // Set to 0 for now, will try to update during playback
        setDuration(0);
      } else {
        // Duration is NaN or invalid, set to 0
        setDuration(0);
      }
    };

    const handleLoadedData = () => {
      // Also try to get duration when data is loaded
      const duration = audio.duration;
      if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
        setDuration(duration);
      }
    };

    const handleCanPlay = () => {
      // Try again when audio can play - sometimes duration is available here
      const duration = audio.duration;
      if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
        setDuration(duration);
      }
    };

    const handleDurationChange = () => {
      // Listen for duration changes (happens with streaming audio)
      const duration = audio.duration;
      if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
        setDuration(duration);
      }
    };

    const handleTimeUpdate = () => {
      // Always update currentTime if it's a valid number (including 0)
      const current = audio.currentTime;
      if (isFinite(current) && !isNaN(current) && current >= 0) {
        setCurrentTime(current);
      }
      
      // For streaming audio, try to update duration as we play
      // Sometimes duration becomes available during playback
      if (duration === 0 || !isFinite(duration)) {
        const newDuration = audio.duration;
        if (newDuration && isFinite(newDuration) && !isNaN(newDuration) && newDuration > 0) {
          setDuration(newDuration);
        }
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    const handleError = (e) => {
      console.error('Error loading audio:', message.file_url, e);
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
    };

    // Reset state when URL changes
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Force load metadata
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [message.file_url]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    // Handle NaN, Infinity, and negative values
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress, handling Infinity/NaN cases
  const validDuration = isFinite(duration) && !isNaN(duration) && duration > 0 ? duration : 0;
  
  // Calculate progress percentage
  // If duration is not available, we can't show accurate progress, but we can still show current time
  const progress = validDuration > 0 && currentTime > 0 
    ? Math.min((currentTime / validDuration) * 100, 100) 
    : 0;
  
  // Use valid duration or current time as fallback for display
  const displayDuration = validDuration > 0 ? validDuration : currentTime;

  // Use the same theme colors as text messages in ChatWindow
  // For own messages: bg-primary text-primary-foreground
  // For others: bg-white/15 text-card-foreground

  return (
    <div
      className={`min-w-[200px] max-w-[300px] px-3 py-2.5 rounded-full flex items-center gap-3 cursor-pointer select-none relative ${
        isOwnMessage
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-white/15 text-card-foreground border-0'
      }`}
      onClick={togglePlayPause}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={message.file_url}
        preload="metadata"
        style={{ display: 'none' }}
      />

      {/* Play/Pause Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlayPause();
        }}
        className={`w-10 h-10 rounded-full border-none flex items-center justify-center cursor-pointer flex-shrink-0 transition-all duration-200 outline-none ${
          isOwnMessage
            ? 'bg-white/25 hover:bg-white/35'
            : 'bg-black/15 hover:bg-black/25'
        }`}
      >
        {isPlaying ? (
          <Pause 
            size={18} 
            className={isOwnMessage ? 'text-primary-foreground' : 'text-card-foreground'}
            fill="currentColor"
          />
        ) : (
          <Play 
            size={18} 
            className={`${isOwnMessage ? 'text-primary-foreground' : 'text-card-foreground'} ml-0.5`}
            fill="currentColor"
          />
        )}
      </button>

      {/* Waveform Animation */}
      <div className="flex items-center gap-0.5 flex-1 h-10 justify-center">
        {waveformData.length > 0 ? (
          waveformData.map((height, index) => {
            const barProgress = (index / waveformData.length) * 100;
            const isActive = barProgress <= progress;
            const animationDelay = isPlaying ? `${index * 0.05}s` : '0s';
            
            return (
              <div
                key={index}
                className={`w-[3px] rounded-sm ${
                  isActive 
                    ? isOwnMessage ? 'bg-primary-foreground' : 'bg-card-foreground'
                    : isOwnMessage ? 'bg-primary-foreground/50' : 'bg-card-foreground/50'
                }`}
                style={{
                  height: isActive && isPlaying 
                    ? `${Math.max(height * 0.3, height * 0.6)}px` 
                    : `${height * 0.3}px`,
                  transition: isPlaying 
                    ? `height 0.1s ease ${animationDelay}, background-color 0.2s ease` 
                    : 'height 0.3s ease, background-color 0.2s ease',
                  animation: isPlaying && isActive
                    ? 'waveformPulse 0.8s ease-in-out infinite'
                    : 'none'
                }}
              />
            );
          })
        ) : (
          // Fallback: microphone icon if no waveform data
          <div className={`flex items-center justify-center w-full ${isPlaying ? 'opacity-100' : 'opacity-70'}`}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 384 512" 
              className={isOwnMessage ? 'text-primary-foreground' : 'text-card-foreground'}
              style={{
                width: '20px',
                height: '20px',
                fill: 'var(--kaiylo-primary-hex)',
                color: 'var(--kaiylo-primary-hex)',
                animation: isPlaying ? 'micPulse 1s ease-in-out infinite' : 'none'
              }}
            >
              <path d="M192 0C139 0 96 43 96 96l0 128c0 53 43 96 96 96s96-43 96-96l0-128c0-53-43-96-96-96zM48 184c0-13.3-10.7-24-24-24S0 170.7 0 184l0 40c0 97.9 73.3 178.7 168 190.5l0 49.5-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-49.5c94.7-11.8 168-92.6 168-190.5l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 79.5-64.5 144-144 144S48 303.5 48 224l0-40z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className={`text-[13px] font-medium min-w-[45px] text-right tabular-nums ${
        isOwnMessage ? 'text-primary-foreground' : 'text-card-foreground'
      }`}>
        {validDuration > 0 
          ? `${formatTime(currentTime)} / ${formatTime(displayDuration)}`
          : formatTime(currentTime)
        }
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes waveformPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.2); }
        }
        @keyframes micPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default VoiceMessage;

