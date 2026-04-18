export function getExpiryLabel(video) {
  const now = Date.now();
  let expiryDate;

  if (video.expires_at) {
    expiryDate = new Date(video.expires_at);
  } else if (video.created_at) {
    expiryDate = new Date(new Date(video.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
  } else {
    return null;
  }

  const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'Expire bientôt';
  return `Expire dans ${daysLeft}j`;
}
