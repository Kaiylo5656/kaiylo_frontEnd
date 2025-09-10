// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getSocketBaseUrl } from '../config/api';

const useSocket = () => {
  const { getAuthToken, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user) return;

    const initializeSocket = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          console.error('No auth token available for WebSocket connection');
          return;
        }

        console.log('🔌 Initializing WebSocket connection...');
        const socketUrl = getSocketBaseUrl();
        console.log('🔌 Socket URL:', socketUrl);

        const newSocket = io(socketUrl, {
          auth: {
            token: token
          },
          transports: ['polling', 'websocket'], // Try polling first, then websocket
          timeout: 45000,
          forceNew: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          maxReconnectionAttempts: 5,
          autoConnect: true,
          upgrade: true,
          rememberUpgrade: false
        });

        // Connection event handlers
        newSocket.on('connect', () => {
          console.log('✅ WebSocket connected:', newSocket.id);
          console.log('🔌 Transport used:', newSocket.io.engine.transport.name);
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttempts.current = 0;
        });

        newSocket.on('disconnect', (reason) => {
          console.log('❌ WebSocket disconnected:', reason);
          setIsConnected(false);
          
          // Attempt to reconnect if not a manual disconnect
          if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              initializeSocket();
            }, delay);
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          setConnectionError(error.message);
          setIsConnected(false);
          
          // If we're trying to connect to network IP and it fails, try localhost as fallback
          const currentUrl = getSocketBaseUrl();
          if (currentUrl.includes('192.168.') && reconnectAttempts.current === 0) {
            console.log('🔄 Network connection failed, trying localhost fallback...');
            reconnectAttempts.current++;
            setTimeout(() => {
              // Temporarily override the URL to use localhost
              const fallbackSocket = io('http://localhost:3001', {
                auth: { token: token },
                transports: ['polling', 'websocket'],
                timeout: 45000,
                forceNew: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                maxReconnectionAttempts: 5,
                autoConnect: true,
                upgrade: true,
                rememberUpgrade: false
              });
              
              // Copy all event handlers to the fallback socket
              fallbackSocket.on('connect', () => {
                console.log('✅ WebSocket connected via localhost fallback:', fallbackSocket.id);
                console.log('🔌 Transport used:', fallbackSocket.io.engine.transport.name);
                setIsConnected(true);
                setConnectionError(null);
                reconnectAttempts.current = 0;
              });
              
              // Copy other event handlers...
              fallbackSocket.on('disconnect', (reason) => {
                console.log('❌ WebSocket disconnected:', reason);
                setIsConnected(false);
              });
              
              setSocket(fallbackSocket);
            }, 1000);
            return;
          }
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`🔄 Connection failed, retrying in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              initializeSocket();
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached');
            setConnectionError('Connection failed after multiple attempts');
          }
        });

        newSocket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionError(error.message);
        });

        newSocket.on('reconnect', (attemptNumber) => {
          console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttempts.current = 0;
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
        });

        newSocket.on('reconnect_error', (error) => {
          console.error('❌ WebSocket reconnection error:', error);
        });

        newSocket.on('reconnect_failed', () => {
          console.error('❌ WebSocket reconnection failed');
          setConnectionError('Failed to reconnect to server');
          setIsConnected(false);
        });

        // Transport upgrade events
        newSocket.io.engine.on('upgrade', () => {
          console.log('🔌 Transport upgraded to:', newSocket.io.engine.transport.name);
        });

        newSocket.io.engine.on('upgradeError', (error) => {
          console.error('❌ Transport upgrade failed:', error);
        });

        setSocket(newSocket);

      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        setConnectionError(error.message);
      }
    };

    initializeSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        console.log('🔌 Disconnecting WebSocket...');
        socket.disconnect();
      }
    };
  }, [user, getAuthToken]);

  // Helper functions
  const joinConversation = (conversationId) => {
    if (socket && isConnected) {
      console.log(`🔌 Joining conversation: ${conversationId}`);
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socket && isConnected) {
      console.log(`🔌 Leaving conversation: ${conversationId}`);
      socket.emit('leave_conversation', conversationId);
    }
  };

  const sendMessage = (conversationId, content, messageType = 'text') => {
    if (socket && isConnected) {
      console.log(`🔌 Sending message via WebSocket to conversation: ${conversationId}`);
      socket.emit('send_message', {
        conversationId,
        content,
        messageType
      });
    }
  };

  const startTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { conversationId });
    }
  };

  const stopTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { conversationId });
    }
  };

  const markMessagesAsRead = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('mark_messages_read', { conversationId });
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead
  };
};

export default useSocket;
