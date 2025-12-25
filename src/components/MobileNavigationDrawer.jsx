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
  ChevronRight,
  CreditCard,
  Settings,
  User
} from 'lucide-react';

const NavLink = ({ to, icon: Icon, children, onClick, onLinkClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
    if (onLinkClick) {
      onLinkClick();
    }
  };

  // All icons use the same semi-transparent fill
  const iconFill = 'rgba(255, 255, 255, 0.2)';

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-muted text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <Icon className="h-5 w-5" style={{ fill: iconFill }} />
      <span className="font-normal" style={{ fontWeight: 300, color: 'rgba(255, 255, 255, 1)' }}>{children}</span>
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
        <div className="p-6 flex items-center justify-between border-b border-border/20">
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
          <NavLink to="/profile" icon={User} onLinkClick={onClose}>
            Profil
          </NavLink>
          <NavLink to="/payment" icon={CreditCard} onLinkClick={onClose}>
            Paiement
          </NavLink>
          <NavLink to="/settings" icon={Settings} onLinkClick={onClose}>
            Paramètres
          </NavLink>
        </nav>

        {/* Footer with Facturation and User Info */}
        <div 
          className="p-4 border-t border-border/20"
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

