import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { 
  Users, 
  Dumbbell, 
  Video, 
  MessageSquare, 
  FileText, 
  DollarSign,
  LogOut,
  ChevronRight
} from 'lucide-react';

// Custom User Icon Component
const UserIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"/>
  </svg>
);

// Custom Payment Icon Component
const PaymentIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M64 192L64 224L576 224L576 192C576 156.7 547.3 128 512 128L128 128C92.7 128 64 156.7 64 192zM64 272L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 272L64 272zM128 424C128 410.7 138.7 400 152 400L200 400C213.3 400 224 410.7 224 424C224 437.3 213.3 448 200 448L152 448C138.7 448 128 437.3 128 424zM272 424C272 410.7 282.7 400 296 400L360 400C373.3 400 384 410.7 384 424C384 437.3 373.3 448 360 448L296 448C282.7 448 272 437.3 272 424z"/>
  </svg>
);

// Custom Settings Icon Component
const SettingsIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/>
  </svg>
);

const NavLink = ({ to, icon: Icon, children, onClick, onLinkClick, disabled = false }) => {
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
      <Icon className="h-6 w-6" style={{ color: 'inherit' }} />
      <span className="font-normal text-base" style={{ fontWeight: 300, color: 'inherit' }}>{children}</span>
    </Link>
  );
};

const MobileNavigationDrawer = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const handleClientsClick = () => {
    console.log('🔍 Clients button clicked!');
    navigate('/coach/dashboard?reset=true');
    onClose();
  };

  const getNavItems = () => {
    if (user?.role === 'coach') {
      return [
        { name: 'Clients', path: '/coach/dashboard', icon: Users, onClick: handleClientsClick },
        { name: 'Exercices', path: '/coach/exercises', icon: Dumbbell },
        { name: 'Vidéothèque', path: '/coach/videotheque', icon: Video },
        { name: 'Messages', path: '/chat', icon: MessageSquare },
        { name: 'Suivi Financier', path: '/coach/financial', icon: FileText },
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
        className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border/20 z-50 flex flex-col transform transition-transform duration-300 ease-in-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation mobile"
      >
        {/* Header with Logo and Close button */}
        <div className="pt-6 pb-6 pl-6 pr-[10px] flex items-center justify-between">
          <Logo />
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <ChevronRight className="h-5 w-5" />
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
            >
              {item.name}
            </NavLink>
          ))}
          <NavLink to="/profile" icon={UserIcon} onLinkClick={onClose}>
            Profil
          </NavLink>
          <NavLink to="/payment" icon={PaymentIcon} onLinkClick={onClose} disabled>
            Paiement
          </NavLink>
          <NavLink to="/settings" icon={SettingsIcon} onLinkClick={onClose} disabled>
            Paramètres
          </NavLink>
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
            {user?.role === 'coach' && (
              <NavLink to="/billing" icon={DollarSign} onLinkClick={onClose}>
                Facturation
              </NavLink>
            )}
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

