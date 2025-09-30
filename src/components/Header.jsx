import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Settings, Zap, Search, User, CreditCard } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const Header = () => {
  const { user } = useAuth();

  const renderCoachHeader = () => (
    <div className="flex items-center justify-end">
      {/* Right side - Action buttons */}
      <div className="flex items-center space-x-4">
        {/* Upgrade button */}
        <Button size="sm" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600">
          <Zap className="h-4 w-4 mr-2" />
          Upgrade
        </Button>

        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Settings/Parameters */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderStudentHeader = () => (
    <div className="flex items-center justify-between space-x-4">
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
        <User className="h-6 w-6" />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search"
          className="pl-10 bg-muted border-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <CreditCard className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-6 w-6" />
        </Button>
      </div>
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
    <header className="bg-card border-b border-border px-4 sm:px-6 py-3">
       {isStudent ? renderStudentHeader() : renderCoachHeader()}
    </header>
  );
};

export default Header;
