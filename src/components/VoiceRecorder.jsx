import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, X, Send, Play, Pause } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel, conversationId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioElementRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || isTouchDevice);
    };
    checkMobile();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, we'll start recording separately
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    // Check permission first
    if (hasPermission === false) {
      alert('Permission d\'accès au microphone requise pour enregistrer des messages vocaux.');
      return;
    }

    // Request permission if not yet checked
    if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        alert('L\'enregistrement audio n\'est pas supporté sur votre navigateur.');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Create MediaRecorder with WebM format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'; // Fallback

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Erreur lors du démarrage de l\'enregistrement. Veuillez vérifier les permissions du microphone.');
      setHasPermission(false);
    }
  }, [hasPermission, requestPermission]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (onCancel) {
      onCancel();
    }
  }, [isRecording, audioUrl, onCancel]);

  // Handle send
  const handleSend = useCallback(() => {
    if (audioBlob && onSend) {
      // Get the MIME type from the blob (preserves the original type from MediaRecorder)
      const mimeType = audioBlob.type || 'audio/webm';
      console.log('🎤 Sending voice message:', { 
        size: audioBlob.size, 
        type: mimeType,
        duration: recordingTime 
      });
      
      // Create a File object from the blob with the correct MIME type
      const fileName = `voice-message-${Date.now()}.webm`;
      const audioFile = new File([audioBlob], fileName, { type: mimeType });
      onSend(audioFile);
      
      // Cleanup
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setIsPlaying(false);
    }
  }, [audioBlob, audioUrl, onSend, recordingTime]);

  // Handle play/pause preview
  const togglePlayback = useCallback(() => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mobile: Handle touch events for press-and-hold
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (!isRecording && !audioBlob) {
      startRecording();
    }
  }, [isRecording, audioBlob, startRecording]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // Desktop: Handle click for start/stop
  const handleClick = useCallback(() => {
    if (!isRecording && !audioBlob) {
      startRecording();
    } else if (isRecording) {
      stopRecording();
    }
  }, [isRecording, audioBlob, startRecording, stopRecording]);

  return (
    <div className="flex items-center px-3 py-2 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
      {!audioBlob ? (
        // Recording interface
        <div className="flex items-center gap-3">
          {isMobile ? (
            // Mobile: Press-and-hold button
            <button
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center justify-center w-10 h-10 rounded-full relative transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isRecording ? 'rgba(239, 68, 68, 1)' : 'rgba(212, 132, 89, 1)',
                transform: isRecording ? 'scale(1)' : 'scale(1)',
                animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isRecording && !hasPermission === false) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.9)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
              disabled={hasPermission === false}
            >
              <Mic className="w-5 h-5 relative z-10" />
              {isRecording && (
                <span 
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.4)',
                    animation: 'ripple 1.5s ease-out infinite'
                  }}
                ></span>
              )}
              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
                @keyframes ripple {
                  0% { transform: scale(1); opacity: 1; }
                  100% { transform: scale(1.5); opacity: 0; }
                }
              `}</style>
            </button>
          ) : (
            // Desktop: Click to start/stop
            <button
              onClick={handleClick}
              className="flex items-center justify-center w-10 h-10 rounded-full relative transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isRecording ? 'rgba(239, 68, 68, 1)' : 'rgba(212, 132, 89, 1)',
                transform: isRecording ? 'scale(1)' : 'scale(1)',
                animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isRecording && !hasPermission === false) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.9)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
              disabled={hasPermission === false}
            >
              <Mic className="w-5 h-5 relative z-10" />
              {isRecording && (
                <span 
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.4)',
                    animation: 'ripple 1.5s ease-out infinite'
                  }}
                ></span>
              )}
            </button>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 1)',
                      animation: 'blink 1s ease-in-out infinite'
                    }}
                  ></div>
                </div>
                <span className="text-sm text-white/70">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={cancelRecording}
                className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
              <style>{`
                @keyframes blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            </>
          )}

          {!isRecording && recordingTime === 0 && (
            <span className="text-xs text-white/50">
              {isMobile ? 'Maintenez pour enregistrer' : 'Cliquez pour enregistrer'}
            </span>
          )}
        </div>
      ) : (
        // Preview interface
        <div className="flex items-center gap-3 w-full">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            preload="metadata"
          />
          <button
            onClick={togglePlayback}
            className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 text-white"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Mic className="w-4 h-4 text-white/50" />
            <span className="text-sm text-white/70">{formatTime(recordingTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 text-white"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 text-white"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 1)'}
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default VoiceRecorder;

