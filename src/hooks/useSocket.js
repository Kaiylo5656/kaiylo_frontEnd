// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getSocketBaseUrl, connectionManager } from '../config/api';

const useSocket = () => {
  const { getAuthToken, user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const initializeSocket = useCallback(async () => {
    if (socketRef.current) {
      console.log('🔌 Socket already initialized. Disconnecting before creating a new one.');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No auth token available for WebSocket connection');
        return;
      }

      console.log('🔌 Initializing WebSocket connection...');
      const socketUrl = connectionManager.getSocketUrl() || getSocketBaseUrl();
      console.log('🔌 Socket URL:', socketUrl);

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 15000,
        timeout: 20000,
        pingTimeout: 60000,
        pingInterval: 25000,
        upgrade: false,
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      socketRef.current = newSocket;
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setConnectionError(error.message);
    }
  }, [getAuthToken]);

  useEffect(() => {
    if (user && !socketRef.current) {
      connectionManager.initialize();
      initializeSocket();
    }

    const handleConnectionChange = () => {
      console.log('🔄 Network connection changed, re-initializing socket...');
      initializeSocket();
    };

    connectionManager.addListener(handleConnectionChange);

    return () => {
      connectionManager.removeListener(handleConnectionChange);
      if (socketRef.current) {
        console.log('🔌 Disconnecting WebSocket on cleanup...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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

  return {
    socket: socketRef.current,
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
