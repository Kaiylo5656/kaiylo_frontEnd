import React from 'react';
import { Bell, Settings, Zap } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Logo/Brand */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-foreground">Kaiylo</h1>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-4">
          {/* Upgrade button */}
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Upgrade</span>
          </button>

          {/* Notification bell */}
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {/* Settings/Parameters */}
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
