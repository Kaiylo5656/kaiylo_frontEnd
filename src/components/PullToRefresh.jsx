import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const PULL_THRESHOLD = 50;
const MAX_PULL = 130;
const FOLLOW_FACTOR = 0.75; // Content follows finger (0.75 = 75% of finger movement)
const PREVENT_DEFAULT_THRESHOLD = 12; // Only block scroll when clearly pulling
const MIN_VERTICAL_RATIO = 1.5; // deltaY must be >= 1.5 * |deltaX| (predominantly vertical)

/**
 * Pull-to-refresh wrapper for mobile - like Instagram messages.
 * When user is at top and pulls down, triggers onRefresh.
 */
const PullToRefresh = ({ children, onRefresh, disabled = false, className = '', style = {} }) => {
  const containerRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const scrollTopAtStart = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    scrollTopAtStart.current = containerRef.current?.scrollTop ?? 0;
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(0);
      const start = Date.now();
      const minDisplayMs = 400; // Minimum time to show loading for feedback
      try {
        const result = onRefresh();
        await Promise.resolve(result);
      } catch (err) {
        // Ignore refresh errors
      } finally {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, minDisplayMs - elapsed);
        setTimeout(() => setIsRefreshing(false), remaining);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  // Use addEventListener with { passive: false } for touchmove - allows preventDefault
  // (React's onTouchMove registers as passive, which causes "Unable to preventDefault" errors)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (disabled || isRefreshing) return;
      if (el.scrollTop > 0) {
        setPullDistance(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY.current;
      const deltaX = Math.abs(currentX - touchStartX.current);
      const isPredominantlyVertical = deltaY > 0 && deltaY >= deltaX * MIN_VERTICAL_RATIO;
      if (isPredominantlyVertical) {
        const followed = Math.min(deltaY * FOLLOW_FACTOR, MAX_PULL);
        setPullDistance(followed);
        if (deltaY > PREVENT_DEFAULT_THRESHOLD) e.preventDefault();
      } else {
        setPullDistance(0);
      }
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [disabled, isRefreshing]);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const opacity = Math.min(pullDistance / 50, 1);
  const topGap = 28; // Gap between page top and top of loading animation
  const peelHeight = showIndicator ? (isRefreshing ? topGap + 56 : pullDistance) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y', ...style }}
    >
      {/* Content wrapper - "peels" from top when pulling (like Instagram) */}
      <div
        className="relative min-h-full transition-[padding-top] ease-out"
        style={{
          paddingTop: peelHeight,
          transitionDuration: isRefreshing ? '0.2s' : '0.1s',
          transitionProperty: isRefreshing ? 'padding-top' : 'none'
        }}
      >
        {/* Indicator in the peel gap - show icon when enough space or refreshing */}
        {showIndicator && (pullDistance >= 35 || isRefreshing) && (
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-20"
            style={{
              top: 0,
              height: peelHeight,
              paddingTop: topGap,
              opacity: isRefreshing ? 1 : opacity
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            >
              {isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
              ) : (
                <svg
                  className="w-5 h-5"
                  style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              )}
            </div>
            <span
              className="text-[10px] mt-1 font-light whitespace-nowrap"
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: isRefreshing ? 1 : opacity
              }}
            >
              {isRefreshing ? 'Actualisation...' : pullDistance >= PULL_THRESHOLD ? 'Lâchez pour recharger' : 'Tirez pour actualiser'}
            </span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
