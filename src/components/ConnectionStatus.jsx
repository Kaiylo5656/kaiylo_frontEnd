import React, { useState, useEffect } from 'react';
import { connectionManager } from '../config/api';

const ConnectionStatus = () => {
  const [connectionInfo, setConnectionInfo] = useState({
    apiUrl: null,
    socketUrl: null,
    isConnected: false,
    lastChecked: null
  });
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Listen for connection changes
    const handleConnectionChange = ({ apiUrl, socketUrl }) => {
      setConnectionInfo(prev => ({
        ...prev,
        apiUrl,
        socketUrl,
        isConnected: true,
        lastChecked: new Date().toLocaleTimeString()
      }));
    };

    connectionManager.addListener(handleConnectionChange);

    // Initial check
    const checkConnection = async () => {
      try {
        const apiUrl = connectionManager.getApiUrl();
        const socketUrl = connectionManager.getSocketUrl();
        
        if (apiUrl) {
          const response = await fetch(`${apiUrl}/api/test-connection`);
          setConnectionInfo({
            apiUrl,
            socketUrl,
            isConnected: response.ok,
            lastChecked: new Date().toLocaleTimeString()
          });
        }
      } catch (error) {
        setConnectionInfo(prev => ({
          ...prev,
          isConnected: false,
          lastChecked: new Date().toLocaleTimeString()
        }));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds

    return () => {
      connectionManager.removeListener(handleConnectionChange);
      clearInterval(interval);
    };
  }, []);

  const handleReconnect = async () => {
    await connectionManager.reconnect();
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!connectionInfo.apiUrl) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-100 border border-gray-300 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span>Detecting connection...</span>
        </div>
      </div>
    );
  }

  // Minimized view - just a small status indicator
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-2 text-sm shadow-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionInfo.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <button
            onClick={toggleMinimize}
            className="text-gray-600 hover:text-gray-800 text-xs"
            title="Show connection details"
          >
            {connectionInfo.isConnected ? 'Connected' : 'Disconnected'}
          </button>
        </div>
      </div>
    );
  }

  // Full view - complete connection information
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-3 text-sm shadow-lg max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionInfo.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">
            {connectionInfo.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReconnect}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Reconnect
          </button>
          <button
            onClick={toggleMinimize}
            className="text-gray-600 hover:text-gray-800 text-xs"
            title="Hide connection details"
          >
            −
          </button>
        </div>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div>
          <span className="font-medium">API:</span> {connectionInfo.apiUrl}
        </div>
        <div>
          <span className="font-medium">Socket:</span> {connectionInfo.socketUrl}
        </div>
        <div>
          <span className="font-medium">Last check:</span> {connectionInfo.lastChecked}
        </div>
      </div>
      
      {!connectionInfo.isConnected && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          Connection lost. The app will automatically try to reconnect.
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
