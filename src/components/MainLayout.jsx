import React, { createContext, useContext, useState } from 'react';
import Navigation from './Navigation';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import FeedbackModal from './FeedbackModal';
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

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
          <div className={`flex-1 relative z-10 ${isChatPage ? 'p-0 overflow-hidden' : 'pt-0 pb-6 overflow-y-auto dashboard-scrollbar w-full'}`} style={{ marginTop: 0, paddingTop: 0, color: 'rgba(160, 19, 19, 0)' }}>
            {children}
          </div>
        </main>
      </div>
      {!isWorkoutSessionOpen && <BottomNavBar />}
      
      {/* Bouton flottant pour ouvrir le feedback */}
      <button
        onClick={() => setIsFeedbackModalOpen(true)}
        className="fixed bottom-6 right-6 bg-[#d4845a] hover:bg-[#c47850] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center hover:scale-110"
        title="Signaler un problème ou envoyer un feedback"
        style={{ zIndex: 9999, backgroundColor: 'rgba(196, 120, 80, 0.25)', border: 'none' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20" fill="#d4845a" aria-hidden="true">
          <path d="M256 0c14.7 0 28.2 8.1 35.2 21l216 400c6.7 12.4 6.4 27.4-.8 39.5S486.1 480 472 480L40 480c-14.1 0-27.2-7.4-34.4-19.5s-7.5-27.1-.8-39.5l216-400c7-12.9 20.5-21 35.2-21zm0 352a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.5 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"/>
        </svg>
      </button>

      {/* Modal de feedback */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </WorkoutSessionContext.Provider>
  );
};

export default MainLayout;

