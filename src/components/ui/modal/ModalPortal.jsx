import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Global portal container to survive StrictMode double mounting
let globalPortalContainer = null;
let globalPortalRefCount = 0;

const ModalPortal = ({ children, zIndex = 50 }) => {
  const [container, setContainer] = useState(() => {
    if (typeof document === 'undefined') return null;
    
    // Reuse existing container if available
    if (globalPortalContainer && globalPortalContainer.parentNode === document.body) {
      globalPortalRefCount++;
      return globalPortalContainer;
    }
    
    // Create new container
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.zIndex = zIndex.toString();
    div.style.pointerEvents = 'auto';
    document.body.appendChild(div);
    globalPortalContainer = div;
    globalPortalRefCount = 1;
    return div;
  });

  // Update zIndex if it changes
  useEffect(() => {
    if (container && container.style.zIndex !== zIndex.toString()) {
      container.style.zIndex = zIndex.toString();
    }
  }, [zIndex, container]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      globalPortalRefCount--;
      
      // Only cleanup if no other modals are using the container
      if (globalPortalRefCount <= 0 && container && container.parentNode === document.body) {
        try {
          document.body.removeChild(container);
          globalPortalContainer = null;
          globalPortalRefCount = 0;
        } catch (e) {
          // Silently handle cleanup errors
        }
      }
    };
  }, [container]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
};

export default ModalPortal;
