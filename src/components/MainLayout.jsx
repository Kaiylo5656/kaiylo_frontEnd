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
      <div className="h-screen bg-background text-foreground flex overflow-hidden w-full relative" style={{ backgroundColor: '#0a0a0a' }}>
        {/* Image de fond */}
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundImage: 'url(/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            backgroundColor: '#0a0a0a'
          }}
        />
        
        {/* Layer blur sur l'écran */}
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(100px)',
            backgroundColor: 'rgba(0, 0, 0, 0.01)',
            zIndex: 6,
            pointerEvents: 'none',
            opacity: 1
          }}
        />
        
        {/* Gradient conique Figma - partie droite */}
        <div 
          style={{
            position: 'absolute',
            top: '-175px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '600px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.25)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.75,
            animation: 'organicGradient 15s ease-in-out infinite'
          }}
        />
        
        {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
        <div 
          style={{
            position: 'absolute',
            top: '-175px',
            left: '50vw',
            transform: 'translateY(-50%) scaleX(-1)',
            width: '50vw',
            height: '600px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.25)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.75,
            animation: 'organicGradient 15s ease-in-out infinite 1.5s'
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

