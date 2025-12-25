import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, History, MessageSquare, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const BottomNavBar = () => {
  const { user } = useAuth();
  const location = useLocation();

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
              className="flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: isActive ? activeColor : inactiveColor }}
            >
              <item.icon 
                className="h-6 w-6" 
                style={{ 
                  color: isActive ? activeColor : inactiveColor
                }} 
              />
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
