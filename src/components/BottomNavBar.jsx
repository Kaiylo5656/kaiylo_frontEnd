import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';

// Custom Message Icon Component
const MessageIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z"/>
  </svg>
);

// Custom Video Icon Component
const VideoIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z"/>
  </svg>
);

// Custom Home Icon Component
const HomeIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z"/>
  </svg>
);

const BottomNavBar = () => {
  const { user, getAuthToken } = useAuth();
  const location = useLocation();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
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
        const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (socket) {
      const handleNewMessage = () => {
        // Refresh count on new message
        fetchUnreadCount();
      };

      const handleMessagesRead = () => {
        // Refresh count when messages are read
        fetchUnreadCount();
      };

      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [user, socket, getAuthToken]);

  const getNavItems = () => {
    if (!user) return [];

    if (user.role === 'student') {
      return [
        { to: "/student/dashboard", icon: HomeIcon, label: "Accueil" },
        { to: "/student/history", icon: History, label: "Historique" },
        { to: "/chat", icon: MessageIcon, label: "Messages" },
        { to: "/student/videos", icon: VideoIcon, label: "Vidéothèque" },
      ];
    }
    // Add coach/admin items here if needed
    return [];
  };

  const navItems = getNavItems();

  if (navItems.length === 0) {
    return null;
  }

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background z-50"
      style={{
        backgroundColor: 'rgba(13, 13, 13, 1)',
        borderTopWidth: '0px',
        borderTopColor: 'rgba(0, 0, 0, 0)',
        borderTopStyle: 'none',
        borderImage: 'none'
      }}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const activeColor = 'rgba(255, 255, 255, 1)';
          const inactiveColor = 'rgba(134, 134, 134, 1)';
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 transition-colors relative"
              style={{ color: isActive ? activeColor : inactiveColor }}
            >
              <div className="relative">
                <item.icon 
                  className="h-6 w-6" 
                  style={{ 
                    color: isActive ? activeColor : inactiveColor
                  }} 
                />
                {item.label === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--kaiylo-primary-hex)] text-[9px] font-bold text-white shadow-sm ring-1 ring-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span 
                className="text-xs"
                style={{ 
                  color: isActive ? activeColor : inactiveColor,
                  fontWeight: 300
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
