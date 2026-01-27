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
      console.error('Error formatting date:', e);
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
    <div 
      className={`px-2 py-2 transition-all duration-200 cursor-pointer rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] border-none text-left w-full max-w-xl ${isOwnMessage ? 'ml-auto' : ''}`}
      style={{ 
        borderWidth: '0px',
        borderColor: 'rgba(0, 0, 0, 0)',
        borderStyle: 'none',
        borderImage: 'none'
      }}
      onClick={handleVideoClick}
    >
      <div className="flex items-center gap-4">
        {/* Video Thumbnail - Left */}
        <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden group">
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
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <FileVideo size={32} className="text-white/50" />
            </div>
          )}
        </div>
        
        {/* Video Info - Right */}
        <div className="flex-1 min-w-0">
          {/* Exercise Tag and Date */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            <span className="text-white font-light text-base truncate max-w-[200px]">
              {exerciseName}
            </span>
            {formattedDate && (
                <>
                    <span className="text-white/50">-</span>
                    <span className="text-white/50 text-base font-extralight whitespace-nowrap">
                    {formattedDate}
                    </span>
                </>
            )}
            {rating && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isOwnMessage ? 'bg-white/20 text-white' : 'bg-[#D4845A] text-white'
              }`}>
                {rating}/10
              </span>
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
        <div className="mt-2 pt-2 flex flex-col gap-1 border-t border-white/10">
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
            <div className="flex items-start gap-2">
               <div className="text-white/90 text-sm font-light leading-relaxed whitespace-pre-wrap">
                 {feedback}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoFeedbackMessage;
