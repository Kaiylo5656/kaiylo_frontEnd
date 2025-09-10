// API Configuration
const getApiBaseUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // If we have a custom API URL set, use it
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // For now, always use localhost in development to avoid network issues
    // This will work when accessing from the same machine
    return 'http://localhost:3001';
    
    // TODO: Re-enable network detection once network connectivity is fixed
    // Check if we're accessing from a network device
    // const hostname = window.location.hostname;
    // if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    //   // We're on a network device, use the network IP
    //   return `http://${hostname}:3001`;
    // }
    
    // We're on localhost, use relative URLs (will be proxied by Vite)
    // return '';
  }
  
  // Production mode - use environment variable or default
  return import.meta.env.VITE_API_URL || '';
};

const getSocketUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // If we have a custom socket URL set, use it
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }
    
    // For now, always use localhost in development to avoid network issues
    return 'http://localhost:3001';
    
    // TODO: Re-enable network detection once network connectivity is fixed
    // Check if we're accessing from a network device
    // const hostname = window.location.hostname;
    // if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    //   // We're on a network device, use the network IP
    //   return `http://${hostname}:3001`;
    // }
    
    // We're on localhost, use localhost
    // return 'http://localhost:3001';
  }
  
  // Production mode - use environment variable or default
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

// Helper function to build API URLs
export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
};

// Helper function to get socket URL
export const getSocketBaseUrl = () => getSocketUrl();
