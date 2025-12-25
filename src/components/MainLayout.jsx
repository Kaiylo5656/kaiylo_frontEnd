import React, { createContext, useContext, useState } from 'react';
import Navigation from './Navigation';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { useLocation } from 'react-router-dom'; // Import useLocation

// Context to track if WorkoutSessionExecution is open
const WorkoutSessionContext = createContext({
  isWorkoutSessionOpen: false,
  setIsWorkoutSessionOpen: () => {}
});

export const useWorkoutSession = () => useContext(WorkoutSessionContext);

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');
  const [isWorkoutSessionOpen, setIsWorkoutSessionOpen] = useState(false);

  return (
    <WorkoutSessionContext.Provider value={{ isWorkoutSessionOpen, setIsWorkoutSessionOpen }}>
      <div className="h-screen bg-background text-foreground flex overflow-hidden w-full relative" style={{ backgroundColor: 'unset', background: 'unset' }}>
        {/* Carré supérieur avec blur - Transition entre lumière et fond noir */}
        <div 
          className="absolute pointer-events-none"
          style={{
            width: '100vw',
            height: '100vh',
            left: '0',
            top: '0',
            backgroundColor: 'unset',
            background: 'unset',
            backdropFilter: 'none',
            filter: 'none',
            zIndex: 1
          }}
        />
        
        <Navigation />
        <main className="flex-1 flex flex-col overflow-hidden w-full relative z-10" style={{ gap: 0 }}>
          {!isWorkoutSessionOpen && <Header />}
          <div className={`flex-1 relative z-10 ${isChatPage ? 'p-0 overflow-hidden' : 'p-0 overflow-y-auto dashboard-scrollbar w-full'}`} style={{ marginTop: 0, paddingTop: 0, color: 'rgba(160, 19, 19, 0)' }}>
            {children}
          </div>
        </main>
      </div>
      {!isWorkoutSessionOpen && <BottomNavBar />}
    </WorkoutSessionContext.Provider>
  );
};

export default MainLayout;

