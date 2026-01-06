import React, { useEffect, useMemo, useState } from 'react';
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

const OneRmHistoryModal = ({ isOpen, onClose, lift, studentName = '', position, mainModalHeight }) => {
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

  return (
    <div
      role="region"
      aria-label="Historique du mouvement"
      className="relative w-[320px] overflow-hidden rounded-2xl shadow-2xl flex flex-col text-white pointer-events-auto"
      style={{
        background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
        opacity: 0.95,
        height: mainModalHeight ? `${mainModalHeight}px` : 'auto',
        maxHeight: mainModalHeight ? `${mainModalHeight}px` : '92vh'
      }}
      onClick={(e) => e.stopPropagation()}
    >
        <div className="shrink-0 pl-6 pr-0 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5" fill="currentColor">
              <path d="M128 0c17.7 0 32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 32 0c35.3 0 64 28.7 64 64l0 288c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l32 0 0-32c0-17.7 14.3-32 32-32zM64 240l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm128 0l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0zM64 368l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0zm112 16l0 32c0 8.8 7.2 16 16 16l32 0c8.8 0 16-7.2 16-16l0-32c0-8.8-7.2-16-16-16l-32 0c-8.8 0-16 7.2-16 16z"/>
            </svg>
            Historique - <span className="font-light">{lift?.name || 'Mouvement'}</span>
          </h2>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 ${historyEntries.length ? 'space-y-1.5' : 'flex items-center justify-center'}`}>
          {historyEntries.length ? (
            historyEntries.map((entry, index) => (
              <div
                key={`${lift?.id || 'lift'}-${index}`}
                className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-base font-normal text-white/75">
                    {entry.value !== undefined && entry.value !== null && !Number.isNaN(Number(entry.value))
                      ? (
                          <>
                            {Number(entry.value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                            <span className="font-light"> {lift?.unit || 'kg'}</span>
                          </>
                        )
                      : formatWeight(entry.value, lift?.unit)
                    }
                  </span>
                </div>
                <span className="text-[14px] font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>{formatDate(entry.date)}</span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl px-6 py-12 text-center text-xs text-white/50 font-thin">
              Aucun historique disponible pour ce mouvement.
            </div>
          )}
        </div>
    </div>
  );
};

export default OneRmHistoryModal;
