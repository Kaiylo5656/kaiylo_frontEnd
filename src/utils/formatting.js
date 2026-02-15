import logger from './logger';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Format a date to relative time (e.g., "3 days ago")
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted relative time
 */
export const formatRelative = (date) => {
  if (!date) return 'Unknown';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: fr 
    });
  } catch (error) {
    logger.error('Error formatting relative date:', error);
    return 'Unknown';
  }
};

/**
 * Format a date to absolute time for tooltips
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted absolute time
 */
export const formatAbsolute = (date) => {
  if (!date) return 'Unknown';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    return format(dateObj, 'PPP p', { locale: fr });
  } catch (error) {
    logger.error('Error formatting absolute date:', error);
    return 'Unknown';
  }
};

/**
 * Format video duration from seconds to mm:ss
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g., "2:30")
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return 'Unknown';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Copy text to clipboard with user feedback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format pluralization
 * @param {number} count - Number to format
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} - Formatted text
 */
export const formatPlural = (count, singular, plural = null) => {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

