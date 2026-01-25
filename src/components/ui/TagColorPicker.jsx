import React from 'react';
import { Check } from 'lucide-react';
import { getAvailableColors } from '../../utils/tagColors';

const TagColorPicker = ({ currentColor, onSelectColor, onClose }) => {
  const colors = getAvailableColors();
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-medium mb-3">Couleur du tag</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.map(({ name, hex }) => (
            <button
              key={name}
              onClick={() => {
                onSelectColor(hex);
                onClose();
              }}
              className="relative w-10 h-10 rounded-lg hover:scale-110 transition-transform"
              style={{ backgroundColor: hex }}
              title={name}
            >
              {currentColor === hex && (
                <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagColorPicker;
