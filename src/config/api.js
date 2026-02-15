import logger from '../utils/logger';

// API Configuration with automatic IP detection
const getApiBaseUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // If we have a custom API URL set, use it
    if (import.meta.env.VITE_API_URL) {
      logger.debug('🔧 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    }
    
    // Check if we're accessing from a network device
    const hostname = window.location.hostname;
    
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // We're on a network device, use the network IP
      const networkUrl = `http://${hostname}:3001`;
      logger.debug('🔧 Using network API URL:', networkUrl);
      return networkUrl;
    }
    
    // We're on localhost, use localhost
    return 'http://localhost:3001';
  }
  
  // Production mode - use environment variable or default
  return import.meta.env.VITE_API_URL || '';
};

// Enhanced API URL detection with fallback
const detectApiUrl = async () => {
  const hostname = window.location.hostname;
  
  // If we're on localhost, try localhost first
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If we're on a network device, use the current hostname
  return `http://${hostname}:3001`;
};

// Test API connectivity
const testApiConnectivity = async (url) => {
  try {
    const response = await fetch(`${url}/api/test-connection`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    logger.debug(`❌ API test failed for ${url}:`, error.message);
    return false;
  }
};

// Auto-detect working API URL with fallbacks
export const getWorkingApiUrl = async () => {
  // In production, prioritize VITE_API_URL if set
  if (!import.meta.env.DEV && import.meta.env.VITE_API_URL) {
    logger.debug('🔧 Using VITE_API_URL in production:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // In development or if VITE_API_URL not set, try auto-detection
  const possibleUrls = [
    // First try VITE_API_URL if available
    ...(import.meta.env.VITE_API_URL ? [import.meta.env.VITE_API_URL] : []),
    // Current hostname (most likely to work)
    `http://${window.location.hostname}:3001`,
    // Common localhost alternatives (only in dev)
    ...(import.meta.env.DEV ? ['http://localhost:3001', 'http://127.0.0.1:3001'] : []),
    // Common network ranges (only in dev)
    ...(import.meta.env.DEV ? [
      'http://192.168.1.100:3001',
      'http://192.168.0.100:3001',
      'http://10.0.0.100:3001'
    ] : [])
  ];
  
  // Remove duplicates and empty values
  const uniqueUrls = [...new Set(possibleUrls.filter(url => url))];
  
  for (const url of uniqueUrls) {
    const isWorking = await testApiConnectivity(url);
    if (isWorking) {
      logger.debug(`✅ Working API URL found: ${url}`);
      return url;
    }
  }
  
  logger.debug('❌ No working API URL found, using fallback');
  // In production, return VITE_API_URL if set, otherwise return empty string
  if (!import.meta.env.DEV && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return uniqueUrls[0] || ''; // Return the first one as fallback, or empty string
};

const getSocketUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // If we have a custom socket URL set, use it
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    
    // Check if we're accessing from a network device
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // We're on a network device, use the network IP
      return `http://${hostname}:3001`;
    }
    
    // We're on localhost, use localhost
    return 'http://localhost:3001';
  }
  
  // Production mode - use environment variable, don't fallback to localhost
  return import.meta.env.VITE_SOCKET_URL || '';
};

// Don't export static values - they need to be called dynamically
// export const API_BASE_URL = getApiBaseUrl();
// export const SOCKET_URL = getSocketUrl();

// Helper function to get API base URL with /api
export const getApiBaseUrlWithApi = () => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/api` : '/api';
};

// Helper function to build API URLs
export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with a slash
  let finalPath = path.startsWith('/') ? path : `/${path}`;
  
  // Prepend /api only if it's not already there
  if (!finalPath.startsWith('/api')) {
    finalPath = `/api${finalPath}`;
  }
  
  return baseUrl ? `${baseUrl}${finalPath}` : finalPath;
};

// Helper function to get socket URL
export const getSocketBaseUrl = () => getSocketUrl();

// Connection Manager for handling IP changes
class ConnectionManager {
  constructor() {
    this.currentApiUrl = null;
    this.currentSocketUrl = null;
    this.connectionCheckInterval = null;
    this.listeners = [];
  }

  // Initialize connection manager
  async initialize() {
    await this.detectAndSetUrls();
    this.startConnectionMonitoring();
  }

  // Detect and set working URLs
  async detectAndSetUrls() {
    try {
      // In production with VITE_API_URL set, use it directly without auto-detection
      if (!import.meta.env.DEV && import.meta.env.VITE_API_URL) {
        const envApiUrl = import.meta.env.VITE_API_URL;
        if (envApiUrl !== this.currentApiUrl) {
          this.currentApiUrl = envApiUrl;
          this.currentSocketUrl = import.meta.env.VITE_SOCKET_URL || envApiUrl;
          logger.debug('✅ Using production API URL from environment:', this.currentApiUrl);
          this.notifyListeners();
        }
        return;
      }

      // Only run auto-detection in development
      const newApiUrl = await getWorkingApiUrl();
      // Only update and notify if the URL has changed
      if (newApiUrl !== this.currentApiUrl) {
        this.currentApiUrl = newApiUrl;
        this.currentSocketUrl = this.currentApiUrl; // Socket uses same URL as API
        logger.debug('✅ New working API URL detected:', this.currentApiUrl);
        this.notifyListeners();
      }
    } catch (error) {
      logger.error('❌ Failed to detect working API URL:', error);
    }
  }

  // Start monitoring connection
  startConnectionMonitoring() {
    // Check connection every 30 seconds
    this.connectionCheckInterval = setInterval(async () => {
      await this.checkConnection();
    }, 30000);
  }

  // Check if current connection is still working
  async checkConnection() {
    if (!this.currentApiUrl) return;

    const isWorking = await testApiConnectivity(this.currentApiUrl);
    if (!isWorking) {
      logger.debug('🔄 Connection lost, attempting to reconnect...');
      await this.detectAndSetUrls();
    }
  }

  // Get current API URL
  getApiUrl() {
    return this.currentApiUrl || getApiBaseUrl();
  }

  // Get current Socket URL
  getSocketUrl() {
    return this.currentSocketUrl || getSocketUrl();
  }

  // Add listener for connection changes
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners of URL changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          apiUrl: this.currentApiUrl,
          socketUrl: this.currentSocketUrl
        });
      } catch (error) {
        logger.error('❌ Error in connection listener:', error);
      }
    });
  }

  // Force reconnection
  async reconnect() {
    logger.debug('🔄 Forcing reconnection...');
    await this.detectAndSetUrls();
  }

  // Cleanup
  destroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    this.listeners = [];
  }
}

// Create global connection manager instance
export const connectionManager = new ConnectionManager();

// Enhanced API URL getter that uses connection manager
export const getApiBaseUrlWithApiEnhanced = () => {
  const baseUrl = connectionManager.getApiUrl();
  return baseUrl ? `${baseUrl}/api` : '/api';
};

// Enhanced Socket URL getter
export const getSocketBaseUrlEnhanced = () => {
  return connectionManager.getSocketUrl();
};
