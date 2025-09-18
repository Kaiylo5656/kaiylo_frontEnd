import React from 'react';

const Logo = () => {
  return (
    <div className="flex items-center space-x-2">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        <path
          d="M6.75 6.75V17.25H8.25V13.5H12.75V17.25H14.25V10.5H8.25V6.75H6.75ZM15.75 6.75V17.25H17.25V6.75H15.75Z"
          fill="currentColor"
        />
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="font-semibold text-lg text-white">Kaiylo</span>
    </div>
  );
};

export default Logo;
