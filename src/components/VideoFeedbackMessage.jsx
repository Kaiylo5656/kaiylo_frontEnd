import logger from '../utils/logger';
import React from 'react';
import VoiceMessage from './VoiceMessage';
import { PlayCircle, FileVideo } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const VideoFeedbackMessage = ({ message, isOwnMessage = false, onVideoClick }) => {
  const metadata = message.metadata || {};
  const { 
    exerciseName = 'Exercice', 
    feedback, 
    audioUrl, 
    rating, 
    videoUrl, 
    thumbnailUrl,
    setNumber,
    totalSets,
    weight,
    reps,
    videoDate,
    rpe
  } = metadata;

  // Handle click on video preview to open video player
  const handleVideoClick = (e) => {
    e.stopPropagation();
    if (onVideoClick) {
      onVideoClick(metadata);
    } else if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  // Format date
  let formattedDate = '';
  if (videoDate) {
    try {
      formattedDate = format(new Date(videoDate), 'd MMM yyyy', { locale: fr });
    } catch (e) {
      logger.error('Error formatting date:', e);
    }
  }

  // Format series/reps/weight string matching StudentDetailView logic
  const getSeriesInfo = () => {
    const seriesText = `Série ${setNumber || 1}${totalSets ? `/${totalSets}` : ''}`;
    const repsText = reps > 0 ? `${reps} reps` : null;
    const weightText = weight > 0 ? `${weight}kg` : null;
    
    if (repsText && weightText) {
      return (
        <>
          {seriesText} • {repsText}{' '}
          <span style={{ color: 'var(--kaiylo-primary-hex, #D4845A)', fontWeight: 400 }}>@{weightText}</span>
        </>
      );
    } else if (repsText) {
      return (
        <>
          {seriesText} • {repsText}
        </>
      );
    } else if (weightText) {
      return (
        <>
          {seriesText} •{' '}
          <span style={{ color: 'var(--kaiylo-primary-hex, #D4845A)', fontWeight: 400 }}>@{weightText}</span>
        </>
      );
    }
    return seriesText;
  };

  return (
    <>
      {/* Feedback Coach Label - Outside the main card */}
      {(feedback || audioUrl) && (
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
            <path d="M32 32C32 14.3 46.3 0 64 0L320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-29.5 0 10.3 134.1c37.1 21.2 65.8 56.4 78.2 99.7l3.8 13.4c2.8 9.7 .8 20-5.2 28.1S362 352 352 352L32 352c-10 0-19.5-4.7-25.5-12.7s-8-18.4-5.2-28.1L5 297.8c12.4-43.3 41-78.5 78.2-99.7L93.5 64 64 64C46.3 64 32 49.7 32 32zM160 400l64 0 0 112c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-112z"/>
          </svg>
          <span className="text-xs font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
            Feedback coach
          </span>
        </div>
      )}
      <div 
        className={`px-2 pt-2 transition-all duration-200 cursor-pointer rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] text-left w-full max-w-xl ${isOwnMessage ? 'ml-auto' : ''}`}
        style={{ 
          borderWidth: '0px',
          borderColor: 'rgba(0, 0, 0, 0)',
          borderStyle: 'none',
          borderImage: 'none',
          paddingBottom: '10px'
        }}
        onClick={handleVideoClick}
      >
      <div className="flex items-center gap-4">
        {/* Video Thumbnail - Left */}
        <div className="relative w-32 h-20 bg-white/5 rounded-[10px] flex-shrink-0 overflow-hidden group border border-white/10">
          {videoUrl ? (
            <>
              {thumbnailUrl ? (
                 <img 
                   src={thumbnailUrl} 
                   alt={exerciseName} 
                   className="w-full h-full object-cover"
                 />
              ) : (
                 <video 
                   src={videoUrl}
                   className="w-full h-full object-cover"
                   preload="metadata"
                   muted
                 />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                <PlayCircle size={24} className="text-white opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <FileVideo size={32} className="text-white/50" />
            </div>
          )}
        </div>
        
        {/* Video Info - Right */}
        <div className="flex-1 min-w-0 mr-2.5">
          {/* Exercise Tag and Date */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <span className="text-white font-light text-base truncate max-w-[200px]">
              {exerciseName}
            </span>
            {formattedDate && (
                <>
                    <span className="text-white/50">-</span>
                    <span className="text-white/50 text-xs font-extralight whitespace-nowrap">
                    {formattedDate}
                    </span>
                </>
            )}
          </div>
          
          {/* Series */}
          <div className="text-white/75 text-sm font-extralight">
            {getSeriesInfo()}
          </div>
          
          {/* RPE */}
          {rpe && (
            <div className="text-white/50 text-xs font-extralight mt-0.5">
              RPE {rpe}
            </div>
          )}
        </div>
      </div>
      
      {/* Coach Feedback Section */}
      {(feedback || audioUrl) && (
        <div className="mt-3 pt-3 flex flex-col gap-2 border-t border-white/10">
          {audioUrl && (
            <div className="text-xs">
              <VoiceMessage 
                message={{
                  file_url: audioUrl,
                  message_type: 'audio',
                  file_type: 'audio/webm'
                }} 
                isOwnMessage={false}
              />
            </div>
          )}
          {feedback && (
            <div className="flex items-start gap-2" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                <path d="M512 240c0 132.5-114.6 240-256 240-37.1 0-72.3-7.4-104.1-20.7L33.5 510.1c-9.4 4-20.2 1.7-27.1-5.8S-2 485.8 2.8 476.8l48.8-92.2C19.2 344.3 0 294.3 0 240 0 107.5 114.6 0 256 0S512 107.5 512 240z"/>
              </svg>
              <div className="text-xs font-normal line-clamp-2 flex-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                {feedback}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default VideoFeedbackMessage;
