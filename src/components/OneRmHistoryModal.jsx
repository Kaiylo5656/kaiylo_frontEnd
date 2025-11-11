import React, { useEffect, useMemo } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy', { locale: fr });
  } catch (error) {
    return value;
  }
};

const formatWeight = (value, unit = 'kg') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
};

const OneRmHistoryModal = ({ isOpen, onClose, lift, studentName = '', position }) => {
  const historyEntries = useMemo(() => lift?.history || [], [lift]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = position
    ? {
        top: position.top ?? 0,
        left: position.left ?? 800,
        width: position.width ?? 340,
      }
    : { top: 0, left: 800, width: 340 };

  return (
    <div
      role="region"
      aria-label="Historique du mouvement"
      className="absolute z-[1001] text-white pointer-events-auto"
      style={style}
    >
      <div className="rounded-[28px] border border-[#2c2c2c] bg-gradient-to-br from-[#181818]/95 via-[#121212]/95 to-[#0d0d0d]/95 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[#242424] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f1f1f] text-[#d4845a] border border-[#2d2d2d]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base sm:text-lg font-semibold tracking-wide">
                Historique — {lift?.name || 'Mouvement'}
              </p>
              <p className="text-xs text-gray-400 mt-1">{studentName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'historique"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1f1f]/70 text-gray-300 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[420px] overflow-y-auto">
          {historyEntries.length ? (
            historyEntries.map((entry, index) => (
              <div
                key={`${lift?.id || 'lift'}-${index}`}
                className="flex items-center justify-between rounded-2xl border border-[#262626] bg-[#1c1c1c] px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {formatWeight(entry.value, lift?.unit)}
                  </span>
                  <span className="text-[11px] text-gray-500">{entry.label || 'Séance'}</span>
                </div>
                <span className="text-[11px] text-gray-400">{formatDate(entry.date)}</span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#2c2c2c] bg-[#181818] px-6 py-12 text-center text-xs text-gray-500">
              Aucun historique disponible pour ce mouvement.
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-[#d4845a] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#bf7348]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default OneRmHistoryModal;
