import React from 'react';
import { Download, Smartphone, RefreshCw, Check } from 'lucide-react';

const PWAInstallButton = ({ isInstallable, isInstalled, needRefresh, onInstall, onUpdate }) => {
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">App Installed</span>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <button
        onClick={onUpdate}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="text-sm font-medium">Update Available</span>
      </button>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={onInstall}
        className="flex items-center gap-2 px-4 py-2 bg-[#e87c3e] hover:bg-[#d66d35] text-white rounded-lg transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="text-sm font-medium">Install App</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-300 rounded-lg">
      <Smartphone className="h-4 w-4" />
      <span className="text-sm">Install not available</span>
    </div>
  );
};

export default PWAInstallButton;
