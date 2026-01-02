// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getSocketBaseUrl, connectionManager } from '../config/api';

const useSocket = () => {
  const { getAuthToken, user } = useAuth();
  const socketRef = useRef(null);
  const initializingRef = useRef(false);
  const reinitializeTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const initializeSocket = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      console.log('🔌 Socket initialization already in progress. Skipping.');
      return;
    }

    if (socketRef.current && (socketRef.current.connected || socketRef.current.connecting)) {
      console.log('🔌 Socket already initialized and active. Skipping re-initialization.');
      return;
    }

    initializingRef.current = true;

    // Clean up any existing socket
    if (socketRef.current) {
      console.log('🔌 Cleaning up existing socket connection...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No auth token available for WebSocket connection');
        setConnectionError('No authentication token available');
        return;
      }

      console.log('🔌 Initializing WebSocket connection...');
      const socketUrl = connectionManager.getSocketUrl() || getSocketBaseUrl();
      // Check if token looks like a JWT
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // If token is expired, try to refresh it
          if (payload.exp * 1000 < Date.now()) {
            console.warn('⚠️ Token is expired, attempting to refresh...');
            // The token refresh will be handled by the error handler
          }
        } catch (e) {
          console.warn('🔌 Could not parse token payload:', e.message);
        }
      }
      
      // Test token validity with a simple API call
      try {
        const testResponse = await fetch(`${socketUrl.replace('/socket.io', '')}/api/socket-health`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          console.log('✅ Token is valid for API calls');
        } else {
          console.warn('⚠️ Token validation failed:', testResponse.status);
        }
      } catch (testError) {
        console.warn('⚠️ Token validation test failed:', testError.message);
      }

      const newSocket = io(socketUrl, {
        auth: { token },
        // More conservative connection settings for better stability
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        pingTimeout: 60000,
        pingInterval: 25000,
        // Use polling only to avoid WebSocket CORS issues - polling works perfectly for real-time chat
        transports: ['polling'], // Polling only - reliable and avoids CORS WebSocket errors
        upgrade: false, // Disable automatic upgrade to prevent WebSocket connection errors
        rememberUpgrade: false, // Don't remember upgrades
        // Force initial connection attempt
        forceNew: true,
        // Add some debugging
        autoConnect: true,
        // Prevent multiple connections
        multiplex: false,
        // Additional compatibility options
        withCredentials: true,
        // Add query parameters for debugging
        query: {
          timestamp: Date.now(),
          clientType: 'web'
        }
      });

      // Set up event listeners before connecting
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        console.log('✅ Transport:', newSocket.io.engine.transport.name);
        console.log('✅ Connection details:', {
          id: newSocket.id,
          connected: newSocket.connected,
          transport: newSocket.io.engine.transport.name,
          readyState: newSocket.io.engine.readyState
        });
        setIsConnected(true);
        setConnectionError(null);
        
        // DEBUG: Log all incoming socket events
        newSocket.onAny((event, ...args) => {
          console.log('[WS IN]', event, args);
        });
        
        // Upgrade event listener (disabled but kept for debugging if re-enabled)
        // newSocket.io.engine.on('upgrade', () => {
        //   console.log('✅ Transport upgraded to:', newSocket.io.engine.transport.name);
        // });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setIsConnected(false);
        
        // If it's a client-side disconnect, don't try to reconnect immediately
        if (reason === 'io client disconnect') {
          console.log('🔌 Client initiated disconnect, not reconnecting');
        }
      });

      newSocket.on('connect_error', (error) => {
        // Timeout errors are normal - Socket.IO will automatically retry
        if (error.message === 'timeout') {
          console.log('⏳ Socket connection timeout (will retry automatically)');
          return;
        }
        
        // HTTP 400 errors during connection are common - Socket.IO will retry
        if (error.type === 'TransportError' || error.message.includes('Bad Request') || error.message.includes('400')) {
          console.log('⏳ Socket connection attempt failed (will retry automatically)');
          return;
        }
        
        // Only handle authentication errors specifically
        if (error.message.includes('Authentication error') || error.message.includes('Invalid token') || error.message.includes('NO_TOKEN') || error.message.includes('INVALID_TOKEN')) {
          console.error('❌ Authentication failed - token might be invalid or expired');
          setConnectionError(`Authentication failed: ${error.message}`);
        } else if (error.message.includes('WebSocket is closed before the connection is established')) {
          console.log('⚠️ WebSocket connection closed early - Socket.IO will fallback to polling');
          // Socket.IO will automatically fallback to polling, don't trigger re-initialization
          // Just log and let the reconnection logic handle it
        } else {
          // For other errors, log as info (not warning/error) since Socket.IO will retry
          console.log('⏳ Socket connection error (will attempt reconnection):', error.message);
        }
        // Don't set isConnected to false here - let reconnection handle it
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('reconnect_error', (error) => {
        // Timeout errors during reconnection are normal
        if (error.message === 'timeout') {
          console.log('⏳ Socket reconnection timeout (will retry)');
          return;
        }
        // Only log non-timeout reconnection errors
        console.warn('⚠️ Socket reconnection error:', error.message);
        // Only set connection error for non-timeout errors
        if (error.message !== 'timeout') {
        setConnectionError(error.message);
        }
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed after all attempts');
        console.log('🔄 Attempting fallback connection with different transport...');
        
        // Try a fallback connection with different settings
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log('🔄 Creating fallback socket connection...');
            const fallbackSocket = io(socketUrl, {
              auth: { token },
              transports: ['polling'], // Use polling as fallback (more reliable)
              timeout: 10000,
              reconnection: true, // Enable reconnection for fallback
              reconnectionAttempts: 3,
              forceNew: true
            });
            
            fallbackSocket.on('connect', () => {
              console.log('✅ Fallback connection successful');
              // Replace the current socket with the working one
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
              socketRef.current = fallbackSocket;
              setIsConnected(true);
              setConnectionError(null);
            });
            
            fallbackSocket.on('connect_error', (fallbackError) => {
              console.error('❌ Fallback connection also failed:', fallbackError.message);
              setConnectionError('Failed to establish any connection to server');
              setIsConnected(false);
            });
          }
        }, 2000);
      });

      socketRef.current = newSocket;
      
      // Add connection state monitoring
      const connectionMonitor = setInterval(() => {
        if (newSocket) {
          console.log('🔌 Connection state:', {
            connected: newSocket.connected,
            connecting: newSocket.connecting,
            disconnected: newSocket.disconnected,
            transport: newSocket.io?.engine?.transport?.name || 'unknown',
            readyState: newSocket.io?.engine?.readyState || 'unknown'
          });
        }
      }, 2000);
      
      // Clear the monitor after 10 seconds
      setTimeout(() => {
        clearInterval(connectionMonitor);
      }, 10000);
      
      // Give it a moment to establish connection
      setTimeout(() => {
        if (!newSocket.connected && !newSocket.connecting) {
          console.log('🔌 Socket failed to connect, attempting manual connection...');
          newSocket.connect();
        }
      }, 100);

      // Reset initialization flag on success
      initializingRef.current = false;

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setConnectionError(error.message);
      // Reset initialization flag on error
      initializingRef.current = false;
    }
  }, [getAuthToken]);

  // Effect for initializing and tearing down the socket based on user auth
  useEffect(() => {
    // Clear any pending re-initialization timeouts
    if (reinitializeTimeoutRef.current) {
      clearTimeout(reinitializeTimeoutRef.current);
      reinitializeTimeoutRef.current = null;
    }

    const handleConnectionChange = () => {
      // Clear any existing timeout first
      if (reinitializeTimeoutRef.current) {
        clearTimeout(reinitializeTimeoutRef.current);
      }

      // Add a delay to prevent rapid re-initializations
      reinitializeTimeoutRef.current = setTimeout(() => {
        // Double-check we're not already initializing or connected
        if (initializingRef.current) {
          console.log('🔌 Initialization already in progress, skipping...');
          return;
        }

        if (user) {
          // Only re-initialize if socket is truly disconnected (not connecting either)
          const socket = socketRef.current;
          if (!socket || (!socket.connected && !socket.connecting)) {
            console.log('🔌 Socket not connected, re-initializing...');
            initializeSocket();
          } else {
            console.log('🔌 Socket is already connected or connecting, skipping re-initialization');
          }
        }
      }, 500); // Increased delay to prevent loops
    };

    if (!user) {
       // User logged out, clean up socket immediately
      if (socketRef.current) {
        console.log('🔌 User logged out, cleaning up socket...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setConnectionError(null);
      }
    } else {
      // User is present, initialize socket once (don't call handleConnectionChange immediately)
      // Only initialize if socket doesn't exist or is disconnected
      if (!socketRef.current || (!socketRef.current.connected && !socketRef.current.connecting && !initializingRef.current)) {
        console.log('🔌 User authenticated, initializing socket...');
        initializeSocket();
      }
      
      // Listen for network changes (will handle reconnection if needed)
      connectionManager.initialize(); // Initialize manager
      connectionManager.addListener(handleConnectionChange);
    }

    // Cleanup on unmount
    return () => {
      if (reinitializeTimeoutRef.current) {
        clearTimeout(reinitializeTimeoutRef.current);
        reinitializeTimeoutRef.current = null;
      }
      if (socketRef.current) {
        console.log('🔌 Disconnecting WebSocket on component unmount...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connectionManager.removeListener(handleConnectionChange);
    };
  }, [user, initializeSocket]);

  const joinConversation = useCallback((conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  }, [isConnected]);

  const leaveConversation = useCallback((conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, [isConnected]);

  const sendMessage = useCallback((conversationId, content, messageType = 'text', replyToMessageId = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', {
        conversationId,
        content,
        messageType,
        replyToMessageId
      });
    }
  }, [isConnected]);

  const startTyping = useCallback((conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_start', { conversationId });
    }
  }, [isConnected]);

  const stopTyping = useCallback((conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_stop', { conversationId });
    }
  }, [isConnected]);
  
  const markMessagesAsRead = useCallback((conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('mark_messages_read', { conversationId });
    }
  }, [isConnected]);

  // Function to listen for video upload notifications (for coaches)
  const onVideoUpload = useCallback((callback) => {
    let connectHandler = null;
    
    const setupListener = () => {
      if (socketRef.current && isConnected) {
        socketRef.current.on('new_video_upload', callback);
        return true;
      }
      return false;
    };

    // Try to set up listener immediately
    if (!setupListener()) {
      // If socket is not ready, set up a one-time listener for when it connects
      connectHandler = () => {
        setupListener();
        if (socketRef.current && connectHandler) {
          socketRef.current.off('connect', connectHandler);
        }
      };
      
      if (socketRef.current) {
        socketRef.current.on('connect', connectHandler);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_video_upload', callback);
        if (connectHandler) {
          socketRef.current.off('connect', connectHandler);
        }
      }
    };
  }, [isConnected]);

  // Function to listen for feedback notifications (for students)
  const onFeedback = useCallback((callback) => {
    let connectHandler = null;
    
    const setupListener = () => {
      if (socketRef.current && isConnected) {
        socketRef.current.on('new_feedback', callback);
        return true;
      }
      return false;
    };

    // Try to set up listener immediately
    if (!setupListener()) {
      // If socket is not ready, set up a one-time listener for when it connects
      connectHandler = () => {
        setupListener();
        if (socketRef.current && connectHandler) {
          socketRef.current.off('connect', connectHandler);
        }
      };
      
      if (socketRef.current) {
        socketRef.current.on('connect', connectHandler);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_feedback', callback);
        if (connectHandler) {
          socketRef.current.off('connect', connectHandler);
        }
      }
    };
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Manually disconnecting WebSocket...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setConnectionError(null);
    }
  }, []);

  const checkConnection = useCallback(() => {
    if (socketRef.current) {
      return {
        connected: socketRef.current.connected,
        connecting: socketRef.current.connecting,
        id: socketRef.current.id
      };
    }
    return { connected: false, connecting: false, id: null };
  }, []);

  const reconnect = useCallback(() => {
    console.log('🔄 Manually reconnecting WebSocket...');
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    initializeSocket();
  }, [initializeSocket]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    onVideoUpload,
    onFeedback,
    disconnect,
    checkConnection,
    reconnect
  };
};

export default useSocket;
