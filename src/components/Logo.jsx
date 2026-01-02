import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Logo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    // Navigate to home based on user role
    if (user?.role === 'coach') {
      // Add reset parameter to ensure CoachDashboard resets selectedStudent state
      navigate('/coach/dashboard?reset=true');
    } else if (user?.role === 'student') {
      navigate('/student/dashboard');
    } else {
      // Default to login page if no user role (not logged in or unknown)
      navigate('/login');
    }
  };

  return (
    <div 
      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity relative z-50"
      onClick={handleClick}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white flex-shrink-0"
        style={{ minWidth: '24px', width: '24px', height: '24px' }}
      >
        <path
          d="M6.75 6.75V17.25H8.25V13.5H12.75V17.25H14.25V10.5H8.25V6.75H6.75ZM15.75 6.75V17.25H17.25V6.75H15.75Z"
          fill="currentColor"
        />
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="font-light text-sm text-white leading-none">Kaiylo</span>
    </div>
  );
};

export default Logo;
