/**
 * Safe localStorage utility functions
 * Handles cases where localStorage is not available (service workers, iframes, etc.)
 */

/**
 * Check if storage is available
 */
export const isStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    if (typeof Storage === 'undefined') return false;
    if (!window.localStorage) return false;
    
    // Test write/read
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safely get item from localStorage
 */
export const safeGetItem = (key) => {
  try {
    if (!isStorageAvailable()) {
      console.warn(`localStorage not available, cannot get key: ${key}`);
      return null;
    }
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Error getting localStorage key ${key}:`, error);
    return null;
  }
};

/**
 * Safely set item in localStorage
 */
export const safeSetItem = (key, value) => {
  try {
    if (!isStorageAvailable()) {
      console.warn(`localStorage not available, cannot set key: ${key}`);
      return false;
    }
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Error setting localStorage key ${key}:`, error);
    return false;
  }
};

/**
 * Safely remove item from localStorage
 */
export const safeRemoveItem = (key) => {
  try {
    if (!isStorageAvailable()) {
      console.warn(`localStorage not available, cannot remove key: ${key}`);
      return false;
    }
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Error removing localStorage key ${key}:`, error);
    return false;
  }
};

/**
 * Get safe storage interface for Supabase
 */
export const getSafeStorage = () => {
  return {
    getItem: (key) => safeGetItem(key),
    setItem: (key, value) => safeSetItem(key, value),
    removeItem: (key) => safeRemoveItem(key),
  };
};

