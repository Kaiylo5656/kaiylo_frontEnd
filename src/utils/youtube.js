/**
 * Parse YouTube video ID from common URL shapes (watch, embed, shorts, youtu.be).
 * @param {string} raw
 * @returns {string|null}
 */
export function parseYoutubeVideoId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  ) {
    if (url.pathname.startsWith('/embed/')) {
      const id = url.pathname.split('/')[2];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/')[2]?.split('?')[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    return v && /^[\w-]{11}$/.test(v) ? v : null;
  }

  return null;
}

/**
 * @param {string} videoId
 * @returns {string}
 */
export function getYoutubeEmbedSrc(videoId) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
