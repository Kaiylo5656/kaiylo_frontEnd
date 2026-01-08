import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { 
  FileText, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';

// Custom Users Icon Component (Font Awesome)
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

// Custom Dumbbell Icon Component (Font Awesome)
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

// Custom Video Icon Component (Font Awesome)
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

// Custom MessageSquare Icon Component (Font Awesome)
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

// Custom DollarSign Icon Component (Font Awesome)
const DollarSignIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M296 88C296 74.7 306.7 64 320 64C333.3 64 344 74.7 344 88L344 128L400 128C417.7 128 432 142.3 432 160C432 177.7 417.7 192 400 192L285.1 192C260.2 192 240 212.2 240 237.1C240 259.6 256.5 278.6 278.7 281.8L370.3 294.9C424.1 302.6 464 348.6 464 402.9C464 463.2 415.1 512 354.9 512L344 512L344 552C344 565.3 333.3 576 320 576C306.7 576 296 565.3 296 552L296 512L224 512C206.3 512 192 497.7 192 480C192 462.3 206.3 448 224 448L354.9 448C379.8 448 400 427.8 400 402.9C400 380.4 383.5 361.4 361.3 358.2L269.7 345.1C215.9 337.5 176 291.4 176 237.1C176 176.9 224.9 128 285.1 128L296 128L296 88z"/>
  </svg>
);

const NavLink = ({ to, icon: Icon, children, onClick, isCollapsed, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start space-x-3'} px-4 py-2.5 rounded-lg transition-colors relative ${
        isActive
          ? 'bg-[rgba(255,255,255,0.1)] text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
      title={isCollapsed ? children : undefined}
    >
      <div className="relative flex items-center justify-center">
        <Icon className="h-5 w-5 flex-shrink-0" style={{ minWidth: '20px' }} />
        {isCollapsed && badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--kaiylo-primary-hex)] text-[8px] font-bold text-white shadow-sm ring-1 ring-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <span className="font-light text-base leading-none flex-1 flex items-center justify-between">
          {children}
          {badge > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--kaiylo-primary-hex)] px-1.5 text-xs font-medium text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
};

const Navigation = () => {
  const { user, logout, getAuthToken } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false; // Default to not collapsed
  });
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved ? JSON.parse(saved) : true; // Default to pinned (true) so menu stays open
  });

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

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  // Keep menu open when navigating - don't collapse on route change
  const location = useLocation();
  useEffect(() => {
    // When route changes, ensure menu stays open if pinned
    if (isPinned && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [location.pathname, isPinned]);

  const handleMouseEnter = () => {
    if (!isPinned && isCollapsed) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    // Only collapse if not pinned - but since we default to pinned, menu will stay open
    if (!isPinned && !isCollapsed) {
      setIsCollapsed(true);
    }
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleLogoClick = () => {
    if (user?.role === 'coach') {
      navigate('/coach/dashboard?reset=true');
    } else if (user?.role === 'student') {
      navigate('/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClientsClick = () => {
    console.log('🔍 Clients button clicked!');
    // Navigate to coach dashboard with a reset parameter
    navigate('/coach/dashboard?reset=true');
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
    // Add other roles here later if needed
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside 
      className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-card border-r border-white/10 flex-col relative transition-all duration-300 ease-in-out`} 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', background: 'unset', zIndex: 10 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`py-5 px-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-start px-4 h-full">
              <Logo />
            </div>
            <button
              onClick={togglePin}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                isPinned 
                  ? 'text-foreground hover:bg-muted/50' 
                  : 'text-muted-foreground/50 opacity-50'
              }`}
              title={isPinned ? "Désépingler le menu" : "Épingler le menu"}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity h-full"
              onClick={handleLogoClick}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white flex-shrink-0"
                style={{ minWidth: '24px', width: '24px', height: '24px' }}
              >
                <path
                  d="M6.75 6.75V17.25H8.25V13.5H12.75V17.25H14.25V10.5H8.25V6.75H6.75ZM15.75 6.75V17.25H17.25V6.75H15.75Z"
                  fill="currentColor"
                />
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </>
        )}
      </div>

      <nav className={`flex-1 px-4 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            icon={item.icon}
            onClick={item.onClick}
            isCollapsed={isCollapsed}
            badge={item.badge}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-5 border-t border-border" style={{ borderTopWidth: '0px', borderTopColor: 'rgba(0, 0, 0, 0)', borderTopStyle: 'none', borderImage: 'none', borderWidth: '0px', borderColor: 'rgba(0, 0, 0, 0)', borderStyle: 'none' }}>
        <div className="space-y-1">
          {!isCollapsed ? (
            <div className="flex items-center justify-start space-x-3 pl-2 pr-4 py-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.1)' }}>
                <span className="font-semibold text-sm text-primary-foreground leading-none">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-light text-sm text-foreground truncate leading-tight">{user?.name || user?.email}</p>
              </div>
              <button onClick={handleLogout} className="text-muted-foreground flex-shrink-0 p-1 rounded transition-colors hover:bg-muted/50 group" title="Logout" style={{ backgroundColor: 'unset', background: 'unset' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 transition-colors group-hover:text-[#d4845a]" fill="currentColor">
                  <path d="M224 160C241.7 160 256 145.7 256 128C256 110.3 241.7 96 224 96L160 96C107 96 64 139 64 192L64 448C64 501 107 544 160 544L224 544C241.7 544 256 529.7 256 512C256 494.3 241.7 480 224 480L160 480C142.3 480 128 465.7 128 448L128 192C128 174.3 142.3 160 160 160L224 160zM566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L438.6 169.3C426.1 156.8 405.8 156.8 393.3 169.3C380.8 181.8 380.8 202.1 393.3 214.6L466.7 288L256 288C238.3 288 224 302.3 224 320C224 337.7 238.3 352 256 352L466.7 352L393.3 425.4C380.8 437.9 380.8 458.2 393.3 470.7C405.8 483.2 426.1 483.2 438.6 470.7L566.6 342.7z"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center px-4 py-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.1)' }}>
                <span className="font-semibold text-sm text-primary-foreground leading-none">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Navigation;
