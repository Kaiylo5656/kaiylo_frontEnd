import React, { useRef, forwardRef, useImperativeHandle } from "react";

const VideoPlayer = forwardRef(({ src, poster, onLoadedMetadata, onPlay, onPause, onTimeUpdate, onError, tabIndex = -1, onKeyDown }, ref) => {
  const videoRef = useRef(null);

  useImperativeHandle(ref, () => videoRef.current);

  return (
    <div
      className="
        w-full max-w-full
        bg-black/90 rounded-md
        border border-white/10
        overflow-hidden
        max-h-[30vh] md:max-h-[70vh]
      "
    >
      <video
        ref={(el) => {
          videoRef.current = el;
        }}
        src={src}
        poster={poster}
        controls
        playsInline
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onError={onError}
        className="
          w-full h-auto
          max-h-[30vh] md:max-h-[70vh]
          object-contain
        "
      />
    </div>
  );
});

export default VideoPlayer;
