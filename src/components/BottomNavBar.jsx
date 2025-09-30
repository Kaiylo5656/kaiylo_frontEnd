import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, History, MessageSquare, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const BottomNavBar = () => {
  const { user } = useAuth();

  const getNavItems = () => {
    if (!user) return [];

    if (user.role === 'student') {
      return [
        { to: "/student/dashboard", icon: Home, label: "Accueil" },
        { to: "/student/history", icon: History, label: "Historique" },
        { to: "/chat", icon: MessageSquare, label: "Messages" },
        { to: "/student/videos", icon: Video, label: "Vidéothèque" },
      ];
    }
    // Add coach/admin items here if needed
    return [];
  };

  const navItems = getNavItems();

  if (navItems.length === 0) {
    return null;
  }

  const activeLinkStyle = 'text-primary';
  const inactiveLinkStyle = 'text-muted-foreground';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? activeLinkStyle : inactiveLinkStyle
              )
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;
