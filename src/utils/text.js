// frontend/src/utils/text.js
// Small helpers for text formatting

/**
 * Truncate a string in the middle preserving both start and end.
 * Example: verylongfilename.mp4 -> verylongfi...name.mp4
 */
export function truncateMiddle(s, max = 48) {
  if (!s || typeof s !== 'string') return s;
  if (s.length <= max) return s;
  const half = Math.floor((max - 3) / 2);
  return `${s.slice(0, half)}...${s.slice(-half)}`;
}


