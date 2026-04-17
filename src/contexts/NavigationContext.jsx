import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import logger from '../utils/logger';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    return { registerCallback: () => {}, unregisterCallback: () => {}, triggerCallback: () => {}, unreadCount: 0, refreshUnreadCount: () => {} };
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [navigationCallbacks, setNavigationCallbacks] = useState({});
  const { user, getAuthToken } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/chat/conversations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const conversations = data.data || [];
        const total = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      logger.error('Error fetching unread count:', error);
    }
  }, [user, getAuthToken]);

  useEffect(() => {
    refreshUnreadCount();
    if (socket) {
      socket.on('new_message', refreshUnreadCount);
      socket.on('messages_read', refreshUnreadCount);
      return () => {
        socket.off('new_message', refreshUnreadCount);
        socket.off('messages_read', refreshUnreadCount);
      };
    }
  }, [user, socket, refreshUnreadCount]);

  const registerCallback = (key, callback) => {
    setNavigationCallbacks(prev => ({
      ...prev,
      [key]: callback
    }));
  };

  const unregisterCallback = (key) => {
    setNavigationCallbacks(prev => {
      const newCallbacks = { ...prev };
      delete newCallbacks[key];
      return newCallbacks;
    });
  };

  const triggerCallback = (key) => {
    if (navigationCallbacks[key]) {
      navigationCallbacks[key]();
    }
  };

  return (
    <NavigationContext.Provider value={{
      registerCallback,
      unregisterCallback,
      triggerCallback,
      unreadCount,
      refreshUnreadCount
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
