// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

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

        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        });

        // Connection event handlers
        newSocket.on('connect', () => {
          console.log('✅ WebSocket connected:', newSocket.id);
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
        });

        newSocket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionError(error.message);
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
