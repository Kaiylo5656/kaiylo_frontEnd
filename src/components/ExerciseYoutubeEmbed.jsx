import React from 'react';
import { getYoutubeEmbedSrc } from '../utils/youtube';

/**
 * Inline YouTube player for exercise demos (privacy-enhanced domain).
 */
const ExerciseYoutubeEmbed = ({ videoId, title = 'Démonstration YouTube' }) => {
  if (!videoId) return null;
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={getYoutubeEmbedSrc(videoId)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};

export default ExerciseYoutubeEmbed;
