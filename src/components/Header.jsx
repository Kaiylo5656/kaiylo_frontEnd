import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Zap, Search, User, CreditCard, Menu } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import MobileNavigationDrawer from './MobileNavigationDrawer';
import { useLocation } from 'react-router-dom';

// Custom Notification Icon Component
const NotificationIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M320 64C302.3 64 288 78.3 288 96L288 99.2C215 114 160 178.6 160 256L160 277.7C160 325.8 143.6 372.5 113.6 410.1L103.8 422.3C98.7 428.6 96 436.4 96 444.5C96 464.1 111.9 480 131.5 480L508.4 480C528 480 543.9 464.1 543.9 444.5C543.9 436.4 541.2 428.6 536.1 422.3L526.3 410.1C496.4 372.5 480 325.8 480 277.7L480 256C480 178.6 425 114 352 99.2L352 96C352 78.3 337.7 64 320 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/>
  </svg>
);

const Header = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

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
      <div className="flex items-center gap-3">
        {/* Hamburger menu (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
        </Button>
        
        {/* Page Title - "Clients" */}
        <h1 className="text-[32px] text-white leading-[0] not-italic whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: 'rgba(255, 255, 255, 1)' }}>
          <span className="leading-[normal]" style={{ color: 'rgba(255, 255, 255, 1)' }}>{getPageTitle()}</span>
        </h1>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-3">
        {/* Settings icon */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/75 hover:text-white hover:bg-white/10 h-9 w-9"
        >
          <Settings style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.75)' }} />
        </Button>
      </div>
    </div>
  );

  const renderStudentHeader = () => (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Hamburger menu (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
      </Button>

      <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground h-9 w-9">
        <User style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
        <Input
          type="search"
          placeholder="Search"
          className="pl-10 border-none placeholder:text-muted-foreground rounded-[15px] font-light"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        />
      </div>
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9">
        <NotificationIcon style={{ color: 'rgba(255, 255, 255, 0.5)', width: '18px', height: '18px' }} />
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
    </>
  );
};

export default Header;
