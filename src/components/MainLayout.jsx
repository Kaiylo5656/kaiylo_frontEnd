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
        <main className="flex-1 flex flex-col overflow-hidden w-full">
          {!isWorkoutSessionOpen && <Header />}
          <div className={`flex-1 ${isChatPage ? 'p-0 overflow-hidden' : 'p-0 overflow-y-auto dashboard-scrollbar w-full'}`}>
            {children}
          </div>
        </main>
      </div>
      {!isWorkoutSessionOpen && <BottomNavBar />}
    </WorkoutSessionContext.Provider>
  );
};

export default MainLayout;

