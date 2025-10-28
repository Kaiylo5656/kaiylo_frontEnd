import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage video library filter state with URL persistence
 * @returns {Object} Filter state and updater functions
 */
export const useVideoFilters = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Parse URL params on mount
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      status: params.get('status') || 'pending',
      sort: params.get('sort') || 'uploadedAt',
      dir: params.get('dir') || 'desc'
    };
  };

  const [filters, setFilters] = useState(getInitialState);

  // Update URL without reload
  const updateURL = useCallback((newFilters) => {
    const params = new URLSearchParams(window.location.search);
    
    // Update filter params
    params.set('status', newFilters.status);
    params.set('sort', newFilters.sort);
    params.set('dir', newFilters.dir);
    
    // Use replaceState to avoid adding to history stack
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  // Initialize from URL on mount
  useEffect(() => {
    if (!isInitialized) {
      const initialState = getInitialState();
      setFilters(initialState);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update URL when filters change
  useEffect(() => {
    if (isInitialized) {
      updateURL(filters);
    }
  }, [filters, isInitialized, updateURL]);

  // Update status filter
  const setStatus = useCallback((status) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  // Update sort
  const setSort = useCallback((sort, dir = 'desc') => {
    setFilters(prev => ({ ...prev, sort, dir }));
  }, []);

  return {
    status: filters.status,
    sort: filters.sort,
    dir: filters.dir,
    setStatus,
    setSort,
    isInitialized
  };
};

