import { useState, useEffect } from 'react';

const useSortParams = (defaultSort = 'createdAt', defaultDir = 'desc') => {
  const [sort, setSort] = useState(defaultSort);
  const [dir, setDir] = useState(defaultDir);

  // Initialize from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSort = urlParams.get('sort');
    const urlDir = urlParams.get('dir');
    
    if (urlSort && urlDir) {
      setSort(urlSort);
      setDir(urlDir);
    }
  }, []);

  // Update URL when sort changes
  const updateSort = (newSort, newDir) => {
    setSort(newSort);
    setDir(newDir);
    
    const url = new URL(window.location);
    url.searchParams.set('sort', newSort);
    url.searchParams.set('dir', newDir);
    
    // Use replaceState to avoid adding to browser history
    window.history.replaceState({}, '', url);
  };

  return { sort, dir, updateSort };
};

export default useSortParams;

