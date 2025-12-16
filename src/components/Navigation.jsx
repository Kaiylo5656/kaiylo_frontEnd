import React from 'react';
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
  LogOut
} from 'lucide-react';

const NavLink = ({ to, icon: Icon, children, onClick }) => {
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
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-muted text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{children}</span>
    </Link>
  );
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        { name: 'Clients', path: '/coach/dashboard', icon: Users, onClick: handleClientsClick },
        { name: 'Exercices', path: '/coach/exercises', icon: Dumbbell },
        { name: 'Vidéothèque', path: '/coach/videotheque', icon: Video },
        { name: 'Messages', path: '/chat', icon: MessageSquare },
      ];
    }
    // Add other roles here later if needed
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 bg-card border-r border-border flex-col">
      <div className="p-6">
        <Logo />
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            icon={item.icon}
            onClick={item.onClick}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="space-y-4">
           <NavLink to="/billing" icon={DollarSign}>
            Facturation
          </NavLink>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Navigation;
