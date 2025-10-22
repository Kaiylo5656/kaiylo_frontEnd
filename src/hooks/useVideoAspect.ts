import { useEffect, useState } from "react";

export function useVideoAspect() {
  const [ratio, setRatio] = useState<number | null>(null);
  const onLoaded = (el: HTMLVideoElement | null) => {
    if (!el) return;
    const handler = () => {
      const w = el.videoWidth || 0;
      const h = el.videoHeight || 0;
      if (w && h) setRatio(w / h);
    };
    el.addEventListener("loadedmetadata", handler, { once: true });
  };
  return { ratio, onLoaded };
}
