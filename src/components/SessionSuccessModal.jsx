import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

const SessionSuccessModal = ({ 
  isOpen, 
  onClose 
}) => {
  // Auto-close after 2 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-sm mx-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="flex flex-col items-center justify-center px-[26px] py-8 space-y-4">
          {/* Success Icon */}
          <CheckCircle2 className="h-16 w-16 text-[#d4845a]" />

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-normal text-white" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Séance validée !
            </h2>
            <p className="text-sm font-light text-gray-400">
              Votre séance a été enregistrée avec succès
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSuccessModal;
