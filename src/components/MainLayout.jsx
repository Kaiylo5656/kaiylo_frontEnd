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
      <div className="h-screen bg-background text-foreground flex overflow-hidden w-full">
        <Navigation />
        <main className="flex-1 flex flex-col overflow-hidden w-full relative">
          {!isWorkoutSessionOpen && <Header />}
          {/* Linear Gradient at top - creates soft light from top center */}
          <div className="absolute top-0 left-0 right-0 h-[700px] pointer-events-none overflow-visible z-0">
            {/* Main gradient light source from top center */}
            <div className="absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-white/30 via-white/15 to-transparent blur-[80px]" />
            {/* Secondary gradient layers for depth */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[1200px] h-[500px] bg-gradient-to-b from-white/20 via-transparent to-transparent blur-[100px]" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[800px] h-[300px] bg-gradient-to-b from-white/25 via-transparent to-transparent blur-[60px]" />
          </div>
          <div className={`flex-1 relative z-10 ${isChatPage ? 'p-0 overflow-hidden' : 'p-0 overflow-y-auto dashboard-scrollbar w-full'}`}>
            {children}
          </div>
        </main>
      </div>
      {!isWorkoutSessionOpen && <BottomNavBar />}
    </WorkoutSessionContext.Provider>
  );
};

export default MainLayout;

