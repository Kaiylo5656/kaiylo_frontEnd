import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ModalPortal = ({ children, zIndex = 50 }) => {
  const portalRef = useRef(null);

  useEffect(() => {
    if (!portalRef.current) {
      portalRef.current = document.createElement('div');
      portalRef.current.style.position = 'fixed';
      portalRef.current.style.top = '0';
      portalRef.current.style.left = '0';
      portalRef.current.style.width = '100%';
      portalRef.current.style.height = '100%';
      portalRef.current.style.zIndex = zIndex;
      portalRef.current.style.pointerEvents = 'auto';
      document.body.appendChild(portalRef.current);
    }

    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
    };
  }, [zIndex]);

  if (!portalRef.current) return null;

  return createPortal(children, portalRef.current);
};

export default ModalPortal;
