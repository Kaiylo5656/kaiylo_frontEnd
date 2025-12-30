import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Settings, Zap, Search, User, CreditCard, Menu } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import MobileNavigationDrawer from './MobileNavigationDrawer';
import NotificationSidebar from './NotificationSidebar';
import { useLocation } from 'react-router-dom';
import useSocket from '../hooks/useSocket';

const Header = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const { onVideoUpload } = useSocket();

  // Listen for video upload events (coach side)
  useEffect(() => {
    if (user?.role !== 'coach' || !onVideoUpload) return;

    const unsubscribe = onVideoUpload((payload) => {
      setNotifications((prev) => {
        const next = [
          {
            id: payload?.id || `${Date.now()}-${Math.random()}`,
            studentName: payload?.studentName || payload?.student?.name || payload?.studentEmail,
            exerciseName: payload?.exerciseName || payload?.exercise?.name,
            setInfo: payload?.setInfo,
            sessionName: payload?.sessionName,
            timestamp: payload?.timestamp || new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50); // cap to 50
        return next;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.role, onVideoUpload]);

  // Determine page title based on current route
  const getPageTitle = () => {
    if (location.pathname.includes('/coach/dashboard') || location.pathname === '/dashboard') {
      return 'Clients';
    }
    // Add more route-based titles as needed
    return 'Clients';
  };

  const renderCoachHeader = () => (
    <div className="flex items-center justify-between w-full">
      {/* Left side - Title and Hamburger menu */}
      <div className="flex items-center gap-4">
        {/* Hamburger menu (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        </Button>
        
        {/* Page Title - "Clients" */}
        <h1 className="text-[32px] text-white leading-[0] not-italic whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: 'rgba(255, 255, 255, 1)' }}>
          <span className="leading-[normal]" style={{ color: 'rgba(255, 255, 255, 1)' }}>{getPageTitle()}</span>
        </h1>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-4">
        {/* Notification icon */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-white/75 hover:text-white hover:bg-white/10"
          onClick={() => setIsNotificationOpen(true)}
        >
          <Bell className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.75)' }} />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#d4845a]" />
          )}
        </Button>

        {/* Settings icon */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/75 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.75)' }} />
        </Button>
      </div>
    </div>
  );

  const renderStudentHeader = () => (
    <div className="flex items-center justify-between space-x-4 w-full">
      {/* Hamburger menu (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-muted-foreground hover:text-foreground"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground">
        <User className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        <Input
          type="search"
          placeholder="Search"
          className="pl-10 border-none placeholder:text-muted-foreground rounded-[15px] font-light"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        />
      </div>
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
        <Bell className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }} fill="currentColor" />
      </Button>
    </div>
  );

  // In a mobile view (e.g., md breakpoint in tailwind), the header is not shown, 
  // because the MainLayout hides it. This Header is for desktop.
  // The student mobile header is part of the StudentDashboard.
  // So we only need to care about coach desktop and student desktop.
  // Wait, the logic is that the sidebar is hidden on mobile, so the header is still visible.
  // The bottom nav bar appears on mobile. The header should adapt.

  // Let's check MainLayout again.
  // Header is inside <main>. Navigation is outside.
  // On mobile (hidden md:flex for Navigation), the header should still be there.
  // So, the header needs to be responsive.

  const isStudent = user?.role === 'student';

  return (
    <>
      <header className="relative px-4 sm:px-6 py-3 z-20 border-0">
        {isStudent ? renderStudentHeader() : renderCoachHeader()}
      </header>
      <MobileNavigationDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      <NotificationSidebar 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        notifications={notifications}
      />
    </>
  );
};

export default Header;
