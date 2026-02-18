import logger from '../utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { 
  LogOut,
  ChevronRight
} from 'lucide-react';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';

// Custom Users Icon Component (Font Awesome) - same as Navigation.jsx
const UsersIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"/>
  </svg>
);

// Custom Dumbbell Icon Component (Font Awesome) - same as Navigation.jsx
const DumbbellIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z"/>
  </svg>
);

// Custom Video Icon Component (Font Awesome) - same as Navigation.jsx
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

// Custom MessageSquare Icon Component (Font Awesome) - same as Navigation.jsx
const MessageSquareIcon = ({ className, style }) => (
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

// Custom Home Icon - same as BottomNavBar (student Accueil)
const HomeIcon = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={className} style={style} fill="currentColor">
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
  </svg>
);

// Custom History/Calendar Icon - same as BottomNavBar (student Planning)
const HistoryIcon = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} style={style} fill="currentColor">
    <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z" />
  </svg>
);

const NavLink = ({ to, icon: Icon, children, onClick, onLinkClick, disabled = false, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={`flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : isActive
            ? 'bg-muted text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
      style={disabled ? { pointerEvents: 'none' } : {}}
    >
      <div className="relative flex items-center justify-center">
        <Icon className="h-6 w-6" style={{ color: 'inherit', minWidth: '24px' }} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--kaiylo-primary-hex)] text-[9px] font-bold text-white shadow-sm ring-1 ring-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="font-normal text-base flex-1 flex items-center justify-between" style={{ fontWeight: 300, color: 'inherit' }}>
        {children}
        {badge > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--kaiylo-primary-hex)] px-1.5 text-xs font-medium text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
    </Link>
  );
};

// Icon for "Signaler un problème" (same as MainLayout floating button)
const FeedbackIcon = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} style={style} fill="currentColor" aria-hidden="true">
    <path d="M256 0c14.7 0 28.2 8.1 35.2 21l216 400c6.7 12.4 6.4 27.4-.8 39.5S486.1 480 472 480L40 480c-14.1 0-27.2-7.4-34.4-19.5s-7.5-27.1-.8-39.5l216-400c7-12.9 20.5-21 35.2-21zm0 352a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.5 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"/>
  </svg>
);

const MobileNavigationDrawer = ({ isOpen, onClose, onOpenFeedback }) => {
  const { user, logout, getAuthToken } = useAuth();
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerHeight, setDrawerHeight] = useState('100vh');

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
        fetchUnreadCount();
      };

      const handleMessagesRead = () => {
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

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const handleClientsClick = () => {
    logger.debug('🔍 Clients button clicked!');
    navigate('/coach/dashboard?reset=true');
    onClose();
  };

  const getNavItems = () => {
    if (user?.role === 'coach') {
      return [
        { name: 'Clients', path: '/coach/dashboard', icon: UsersIcon, onClick: handleClientsClick },
        { name: 'Exercices', path: '/coach/exercises', icon: DumbbellIcon },
        { name: 'Vidéothèque', path: '/coach/videotheque', icon: VideoIcon },
        { name: 'Messages', path: '/chat', icon: MessageSquareIcon, badge: unreadCount },
      ];
    }
    if (user?.role === 'student') {
      return [
        { name: 'Accueil', path: '/student/dashboard', icon: HomeIcon },
        { name: 'Planning', path: '/student/history', icon: HistoryIcon },
        { name: 'Messages', path: '/chat', icon: MessageSquareIcon, badge: unreadCount },
        { name: 'Vidéothèque', path: '/student/videos', icon: VideoIcon },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  // Close on ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Calculate drawer height to account for mobile browser bars
  useEffect(() => {
    const updateHeight = () => {
      // Use window.innerHeight which excludes browser UI bars
      // This gives us the actual visible viewport height
      const height = window.innerHeight;
      setDrawerHeight(`${height}px`);
    };
    
    if (isOpen) {
      // Initial height calculation
      updateHeight();
      
      // Listen for viewport changes
      window.addEventListener('resize', updateHeight);
      window.addEventListener('orientationchange', updateHeight);
      
      // Use visualViewport API if available (better for mobile browser bars)
      if (window.visualViewport) {
        const handleViewportChange = () => {
          updateHeight();
        };
        window.visualViewport.addEventListener('resize', handleViewportChange);
        window.visualViewport.addEventListener('scroll', handleViewportChange);
        
        return () => {
          window.removeEventListener('resize', updateHeight);
          window.removeEventListener('orientationchange', updateHeight);
          window.visualViewport.removeEventListener('resize', handleViewportChange);
          window.visualViewport.removeEventListener('scroll', handleViewportChange);
        };
      }
    }
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 left-0 w-64 sm:w-72 bg-card border-r border-border/20 z-50 flex flex-col transform transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          height: drawerHeight,
          maxHeight: drawerHeight,
          minHeight: drawerHeight
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation mobile"
      >
        {/* Header with Logo and Close button */}
        <div className="pt-4 pb-4 sm:pt-6 sm:pb-6 pl-4 sm:pl-6 pr-2 sm:pr-[10px] flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0 min-h-[60px]">
          <div className="flex items-center flex-shrink-0" style={{ minWidth: '85px' }}>
            <Logo size="mobile" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Fermer le menu"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              icon={item.icon}
              onClick={item.onClick}
              onLinkClick={onClose}
              badge={item.badge}
            >
              {item.name}
            </NavLink>
          ))}
          {/* Signaler un problème — uniquement pour les coaches, en dessous de Messages */}
          {user?.role === 'coach' && onOpenFeedback && (
            <button
              type="button"
              onClick={() => {
                onOpenFeedback();
                onClose();
              }}
              className="flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full text-left"
              style={{ fontWeight: 300 }}
            >
              <FeedbackIcon className="h-6 w-6" style={{ minWidth: '24px', color: 'var(--kaiylo-primary-hex)' }} />
              <span className="font-normal text-sm flex-1 whitespace-nowrap">Signaler un problème</span>
            </button>
          )}
        </nav>

        {/* Footer with Facturation and User Info */}
        <div 
          className="p-4"
          style={{
            backgroundColor: 'unset',
            background: 'unset'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="font-bold text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-muted-foreground hover:text-foreground flex-shrink-0" 
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default MobileNavigationDrawer;

