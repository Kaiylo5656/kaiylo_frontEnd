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
 * Safely get item from sessionStorage
 */
export const safeGetSessionItem = (key) => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`Error getting sessionStorage key ${key}:`, error);
    return null;
  }
};

/**
 * Safely set item in sessionStorage
 */
export const safeSetSessionItem = (key, value) => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    window.sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Error setting sessionStorage key ${key}:`, error);
    return false;
  }
};

/**
 * Safely remove item from sessionStorage
 */
export const safeRemoveSessionItem = (key) => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return false;
    }
    window.sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Error removing sessionStorage key ${key}:`, error);
    return false;
  }
};

/**
 * Get safe storage interface for Supabase
 * IMPORTANT: With PKCE, Supabase stores the code verifier in sessionStorage automatically
 * Supabase uses keys like: sb-<project-ref>-auth-token-code-verifier for PKCE
 * 
 * The storage adapter must:
 * 1. Check sessionStorage first (for PKCE code verifier)
 * 2. Fall back to localStorage (for session tokens)
 * 3. Store in the appropriate storage based on the key pattern
 */
export const getSafeStorage = () => {
  const storage = {
    getItem: (key) => {
      if (!key) return null;
      
      // Try sessionStorage first (Supabase stores PKCE code verifier here)
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const sessionValue = window.sessionStorage.getItem(key);
          if (sessionValue !== null) {
            return sessionValue;
          }
        }
      } catch (e) {
        // sessionStorage not available or blocked
      }
      
      // Try localStorage (for session tokens and other data)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {
        // localStorage not available or blocked
      }
      
      return null;
    },
    setItem: (key, value) => {
      if (!key) return;
      
      // Supabase uses keys ending with '-code-verifier' for PKCE code verifier
      // These should be stored in sessionStorage
      // All other keys (including session tokens) go to localStorage
      const isPKCECodeVerifier = key && key.endsWith('-code-verifier');
      
      try {
        if (isPKCECodeVerifier) {
          // Store PKCE code verifier in sessionStorage
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(key, value);
            return;
          }
        }
        
        // Default to localStorage for all other keys (sessions, etc.)
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {
        console.warn(`Error setting storage key ${key} (isPKCE: ${isPKCECodeVerifier}):`, e);
      }
    },
    removeItem: (key) => {
      if (!key) return;
      
      // Remove from both storages to ensure cleanup
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn(`Error removing storage key ${key}:`, e);
      }
    },
  };
  
  return storage;
};

