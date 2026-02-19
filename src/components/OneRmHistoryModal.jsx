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

const OneRmHistoryModal = ({ isOpen, onClose, lift, studentName = '', position, mainModalHeight, isEmbedded = false }) => {
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
      className={`relative flex flex-col text-white pointer-events-auto ${isEmbedded ? 'w-full h-full bg-transparent shadow-none rounded-none' : 'w-[320px] overflow-hidden rounded-2xl shadow-2xl'}`}
      style={{
        background: isEmbedded ? 'transparent' : 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
        opacity: 0.95,
        height: mainModalHeight ? `${mainModalHeight}px` : 'auto',
        maxHeight: mainModalHeight ? `${mainModalHeight}px` : '92vh'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!isEmbedded && (
        <div className="shrink-0 pl-6 pr-0 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }} aria-hidden="true">
              <path d="M288 64c106 0 192 86 192 192S394 448 288 448c-65.2 0-122.9-32.5-157.6-82.3-10.1-14.5-30.1-18-44.6-7.9s-18 30.1-7.9 44.6C124.1 468.6 201 512 288 512 429.4 512 544 397.4 544 256S429.4 0 288 0C202.3 0 126.5 42.1 80 106.7L80 80c0-17.7-14.3-32-32-32S16 62.3 16 80l0 112c0 17.7 14.3 32 32 32l24.6 0c.5 0 1 0 1.5 0l86 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-38.3 0C154.9 102.6 217 64 288 64zm24 88c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 104c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65 0-94.1z" />
            </svg>
            Historique - <span className="font-light">{lift?.name || 'Mouvement'}</span>
          </h2>
        </div>
      )}
      <div className="border-b border-white/10 mx-6"></div>

      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 ${historyEntries.length ? 'space-y-1.5' : 'flex items-center justify-center'}`}>
        {historyEntries.length ? (
          historyEntries.map((entry, index) => (
            <div
              key={`${lift?.id || 'lift'}-${index}`}
              className="flex items-center justify-between rounded-[14px] bg-black/25 px-4 py-3"
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
