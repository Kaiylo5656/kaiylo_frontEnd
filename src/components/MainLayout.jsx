import React from 'react';
import Navigation from './Navigation';
import Header from './Header';
import BottomNavBar from './BottomNavBar';

const MainLayout = ({ children }) => {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground flex">
        <Navigation />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 p-6 lg:p-8 pb-20 md:pb-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNavBar />
    </>
  );
};

export default MainLayout;

