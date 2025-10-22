import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import useSocket from '../hooks/useSocket';

const WebSocketDebugger = () => {
  const { socket, isConnected, connectionError, checkConnection, reconnect } = useSocket();
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateDebugInfo = () => {
      const connectionStatus = checkConnection();
      setDebugInfo({
        socketExists: !!socket,
        isConnected,
        connectionError,
        connectionDetails: connectionStatus,
        timestamp: new Date().toISOString()
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, [socket, isConnected, connectionError, checkConnection]);

  const testSocketConnection = async () => {
    try {
      const response = await fetch('/api/socket-health');
      const data = await response.json();
      setTestResults(prev => [...prev, {
        type: 'health-check',
        success: data.success,
        message: data.message,
        connectedSockets: data.connectedSockets,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'health-check',
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const testSocketEmit = () => {
    if (socket && isConnected) {
      socket.emit('test_ping', { message: 'Test ping from debugger' });
      setTestResults(prev => [...prev, {
        type: 'emit-test',
        success: true,
        message: 'Test ping emitted',
        timestamp: new Date().toISOString()
      }]);
    } else {
      setTestResults(prev => [...prev, {
        type: 'emit-test',
        success: false,
        message: 'Socket not connected',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-lg transition-colors"
          title="Show WebSocket Debugger"
        >
          <Eye className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">🔌 WebSocket Debugger</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Hide WebSocket Debugger"
          >
            <EyeOff className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close WebSocket Debugger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm space-y-1">
          <div>Status: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>{isConnected ? 'Connected' : 'Disconnected'}</span></div>
          <div>Socket: <span className={socket ? 'text-green-400' : 'text-red-400'}>{socket ? 'Exists' : 'Missing'}</span></div>
          {connectionError && <div className="text-red-400">Error: {connectionError}</div>}
          {debugInfo.connectionDetails?.id && <div>Socket ID: {debugInfo.connectionDetails.id}</div>}
          {debugInfo.connectionDetails?.transport && <div>Transport: {debugInfo.connectionDetails.transport}</div>}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={testSocketConnection}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Test Server Health
        </button>
        
        <button
          onClick={testSocketEmit}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
          disabled={!isConnected}
        >
          Test Socket Emit
        </button>
        
        <button
          onClick={reconnect}
          className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-sm"
        >
          Force Reconnect
        </button>
        
        <button
          onClick={clearResults}
          className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
        >
          Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="mt-4 max-h-32 overflow-y-auto">
          <h4 className="text-sm font-semibold mb-2">Test Results:</h4>
          {testResults.slice(-5).map((result, index) => (
            <div key={index} className={`text-xs p-2 rounded mb-1 ${
              result.success ? 'bg-green-900' : 'bg-red-900'
            }`}>
              <div className="font-semibold">{result.type}</div>
              <div>{result.message}</div>
              {result.connectedSockets !== undefined && (
                <div>Connected Sockets: {result.connectedSockets}</div>
              )}
              <div className="text-gray-400">{new Date(result.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebSocketDebugger;
