import { useState, useCallback } from 'react';
import { Input, Output, Conversion, BlobSource, BufferTarget, Mp4OutputFormat, ALL_FORMATS } from 'mediabunny';

/**
 * Client-side video trimming using Mediabunny (WebCodecs).
 * Falls back gracefully — returns original file if WebCodecs unavailable or trim fails.
 * Server FFmpeg always re-trims during compression as safety net.
 */
const useVideoTrim = () => {
  const [isTrimming, setIsTrimming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const trimVideo = useCallback(async (file, startTime, endTime) => {
    // Check WebCodecs availability
    if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
      return { file, wasClientTrimmed: false };
    }

    setIsTrimming(true);
    setProgress(0);
    setError(null);

    try {
      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
      const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

      const conversion = await Conversion.init({
        input,
        output,
        trim: { start: startTime, end: endTime },
      });

      if (!conversion.isValid) {
        setIsTrimming(false);
        return { file, wasClientTrimmed: false };
      }

      conversion.onProgress = (p) => setProgress(p);

      await conversion.execute();

      const buffer = output.target.buffer;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const trimmedFile = new File([blob], file.name, { type: 'video/mp4' });

      setIsTrimming(false);
      setProgress(1);

      // Only use trimmed file if it's actually smaller
      if (trimmedFile.size < file.size) {
        return { file: trimmedFile, wasClientTrimmed: true };
      }
      return { file, wasClientTrimmed: false };
    } catch (err) {
      setError(err);
      setIsTrimming(false);
      return { file, wasClientTrimmed: false };
    }
  }, []);

  return { trimVideo, isTrimming, progress, error };
};

export default useVideoTrim;
