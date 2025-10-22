import React from 'react';
import Navigation from './Navigation';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { useLocation } from 'react-router-dom'; // Import useLocation

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

  return (
    <>
      <div className="h-screen bg-background text-foreground flex overflow-hidden">
        <Navigation />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className={`flex-1 ${isChatPage ? 'p-0 overflow-hidden' : 'p-6 lg:p-8 pb-20 md:pb-6 overflow-y-auto dashboard-scrollbar'}`}>
            {children}
          </div>
        </main>
      </div>
      <BottomNavBar />
    </>
  );
};

export default MainLayout;

