// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getSocketBaseUrl, connectionManager } from '../config/api';

const useSocket = () => {
  const { getAuthToken, user } = useAuth();
  const socketRef = useRef(null);
  const initializingRef = useRef(false);
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
        reconnectionAttempts: 3, // Reduced from 5
        reconnectionDelay: 5000, // Increased from 3000
        reconnectionDelayMax: 20000, // Increased from 15000
        timeout: 15000, // Reduced from 20000
        pingTimeout: 30000, // Reduced from 60000
        pingInterval: 20000, // Reduced from 25000
        // Transport configuration - allow both polling and websocket
        transports: ['polling', 'websocket'],
        upgrade: true, // Enable upgrade to WebSocket
        rememberUpgrade: true,
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
        setIsConnected(true);
        setConnectionError(null);
        
        // After successful connection, try to upgrade to WebSocket
        newSocket.io.engine.on('upgrade', () => {
          console.log('✅ Transport upgraded to:', newSocket.io.engine.transport.name);
        });
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
        console.error('❌ Socket connection error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          transport: error.transport,
          stack: error.stack
        });
        
        // Only handle authentication errors specifically
        if (error.message.includes('Authentication error') || error.message.includes('Invalid token')) {
          console.error('❌ Authentication failed - token might be invalid or expired');
          console.log('🔄 Attempting to refresh token and reconnect...');
          
          // Try to refresh the token and reconnect
          setTimeout(async () => {
            try {
              console.log('🔄 Refreshing token...');
              const newToken = await getAuthToken();
              if (newToken && newToken !== token) {
                console.log('✅ Token refreshed, attempting reconnection...');
                // Disconnect current socket and try again
                if (socketRef.current) {
                  socketRef.current.disconnect();
                  socketRef.current = null;
                }
                // Re-initialize with new token
                initializeSocket();
              } else {
                console.log('⚠️ Token refresh failed or same token returned');
                setConnectionError(`Authentication failed: ${error.message}`);
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              setConnectionError(`Authentication failed: ${error.message}`);
            }
          }, 3000); // Increased delay
        } else {
          // For other errors, just log them but don't set connection error
          // Let the reconnection logic handle it
          console.log('⚠️ Connection error (will attempt reconnection):', error.message);
        }
        setIsConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ WebSocket reconnection error:', error);
        setConnectionError(error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed after all attempts');
        setConnectionError('Failed to reconnect to server');
        setIsConnected(false);
      });

      socketRef.current = newSocket;
      
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
    if (user) {
      console.log('🔌 User authenticated, initializing socket...');
      initializeSocket();
    } else {
      // User logged out, clean up socket
      if (socketRef.current) {
        console.log('🔌 User logged out, cleaning up socket...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setConnectionError(null);
      }
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting WebSocket on component unmount...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, initializeSocket]);

  // Effect for handling network connection changes
  useEffect(() => {
    const handleConnectionChange = () => {
      // Add a small delay to prevent rapid re-initializations
      setTimeout(() => {
        console.log('🔄 Network connection changed, checking socket status...');
        
        if (!user) {
          console.log('🔌 No user, skipping socket re-initialization.');
          return;
        }

        // Only re-initialize if socket is not connected or has an error
        if (!socketRef.current || (!socketRef.current.connected && !socketRef.current.connecting)) {
          console.log('🔌 Socket not connected, re-initializing...');
          initializeSocket();
        } else {
          console.log('🔌 Socket is already connected or connecting, skipping re-initialization');
        }
      }, 250); // Increased delay to allow for stabilization
    };
    
    connectionManager.initialize(); // Initialize manager
    connectionManager.addListener(handleConnectionChange);

    return () => {
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
    disconnect,
    checkConnection,
    reconnect
  };
};

export default useSocket;
