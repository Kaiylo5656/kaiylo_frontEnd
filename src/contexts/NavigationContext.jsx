import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [navigationCallbacks, setNavigationCallbacks] = useState({});

  const registerCallback = (key, callback) => {
    setNavigationCallbacks(prev => ({
      ...prev,
      [key]: callback
    }));
  };

  const unregisterCallback = (key) => {
    setNavigationCallbacks(prev => {
      const newCallbacks = { ...prev };
      delete newCallbacks[key];
      return newCallbacks;
    });
  };

  const triggerCallback = (key) => {
    if (navigationCallbacks[key]) {
      navigationCallbacks[key]();
    }
  };

  return (
    <NavigationContext.Provider value={{
      registerCallback,
      unregisterCallback,
      triggerCallback
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
