import React, { useState } from 'react';
import { Check } from 'lucide-react';

const ValidatedTick = ({
  checked = false,
  onChange,
  size = 'md',
  disabled = false,
  ariaLabel = 'Marquer comme validé',
  className = '',
  showTooltip = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-7 h-7',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs'
    },
    md: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const getTooltipText = () => {
    return checked ? 'Marqué comme validé' : 'Marquer comme validé';
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`
          ${config.container}
          rounded-[10px] 
          border 
          transition-all 
          duration-120 
          ease-out
          focus-visible:outline-none 
          focus-visible:ring-2 
          focus-visible:ring-emerald-400/60 
          focus-visible:ring-offset-2 
          focus-visible:ring-offset-black
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        style={{
          transform: checked ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 120ms ease-out'
        }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {/* Base styling */}
        <div
          className={`
            w-full h-full rounded-[10px] 
            flex items-center justify-center
            transition-all duration-120 ease-out
            ${checked
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/60 shadow-[0_0_0_3px_rgba(16,185,129,.15)] ring-1 ring-emerald-400/30'
              : 'bg-[#0f0f10] border-white/15'
            }
            ${isHovered && !checked && !disabled ? 'border-white/25 ring-1 ring-white/10' : ''}
            ${isFocused ? 'ring-2 ring-emerald-400/60' : ''}
          `}
        >
          {/* Check icon with animation */}
          {checked && (
            <Check
              className={`
                ${config.icon} 
                text-white 
                transition-all duration-160 ease-out
                ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
              `}
              style={{
                strokeDasharray: checked ? '20' : '0',
                strokeDashoffset: checked ? '0' : '20',
                transition: 'stroke-dasharray 160ms ease-out, stroke-dashoffset 160ms ease-out'
              }}
            />
          )}
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && !disabled && (isHovered || isFocused) && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded-md whitespace-nowrap z-50"
          role="tooltip"
        >
          {getTooltipText()}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
        </div>
      )}
    </div>
  );
};

export default ValidatedTick;
