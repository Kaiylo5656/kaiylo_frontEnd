import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
    <path d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z" />
  </svg>
);

// Custom Calendar Icon Component
const HistoryIcon = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z" />
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
    <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z" />
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
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
  </svg>
);

// Custom Users Icon Component (Font Awesome)
const UsersIcon = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z" />
  </svg>
);

// Custom Dumbbell Icon Component (Font Awesome)
const DumbbellIcon = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z" />
  </svg>
);

const BottomNavBar = ({ relative = false }) => {
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
      logger.error('Error fetching unread count:', error);
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

    if (user.role === 'coach') {
      return [
        { to: "/coach/dashboard", icon: UsersIcon, label: "Clients" },
        { to: "/coach/exercises", icon: DumbbellIcon, label: "Exercices" },
        { to: "/coach/videotheque", icon: VideoIcon, label: "Vidéos" },
        { to: "/chat", icon: MessageIcon, label: "Messages" },
      ];
    }

    if (user.role === 'student') {
      return [
        { to: "/student/dashboard", icon: HomeIcon, label: "Accueil" },
        { to: "/student/history", icon: HistoryIcon, label: "Planning" },
        { to: "/chat", icon: MessageIcon, label: "Messages" },
        { to: "/student/videos", icon: VideoIcon, label: "Vidéothèque" },
      ];
    }
    // Add admin items here if needed
    return [];
  };

  const navItems = getNavItems();

  if (navItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={relative ? "md:hidden relative bg-background" : "md:hidden fixed bottom-0 left-0 right-0 bg-background z-50"}
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
          const inactiveColor = 'rgba(255, 255, 255, 0.25)';

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
                  fontWeight: 400
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
