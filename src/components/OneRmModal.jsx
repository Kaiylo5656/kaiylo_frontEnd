import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { TrendingUp, CalendarDays, BarChart3, List } from 'lucide-react';
import OneRmHistoryModal from './OneRmHistoryModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DEFAULT_ONE_RM_DATA = [
  {
    id: 'muscle-up',
    name: 'Muscle-up',
    color: '#e87c3e',
    current: 37.5,
    best: 42.5,
    unit: 'kg',
    delta: 2.5,
    goal: 'Atteindre 45 kg d’ici 3 mois',
    weeklyVolume: '18 séries',
    totalReps: '64 reps',
    lastSession: 'Bloc 4 • Semaine 2',
    history: [
      { value: 37.5, date: '2025-11-03', label: 'Bloc 4 • Semaine 2' },
      { value: 36, date: '2025-10-27', label: 'Bloc 4 • Semaine 1' },
      { value: 34.5, date: '2025-10-13', label: 'Bloc 3 • Semaine 4' },
      { value: 32, date: '2025-09-29', label: 'Bloc 3 • Semaine 2' }
    ]
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    color: '#3b82f6',
    current: 80,
    best: 82.5,
    unit: 'kg',
    delta: 1.5,
    goal: 'Stabiliser à 85 kg sur 3 reps',
    weeklyVolume: '12 séries',
    totalReps: '48 reps',
    lastSession: 'Bloc 4 • Semaine 1',
    history: [
      { value: 80, date: '2025-10-30', label: 'Bloc 4 • Semaine 1' },
      { value: 78.5, date: '2025-10-16', label: 'Bloc 3 • Semaine 4' },
      { value: 77, date: '2025-10-02', label: 'Bloc 3 • Semaine 2' },
      { value: 75, date: '2025-09-18', label: 'Bloc 3 • Semaine 0' }
    ]
  },
  {
    id: 'dips',
    name: 'Dips',
    color: '#22c55e',
    current: 100,
    best: 102.5,
    unit: 'kg',
    delta: 2,
    goal: 'Établir un nouveau record à 105 kg',
    weeklyVolume: '15 séries',
    totalReps: '52 reps',
    lastSession: 'Bloc 4 • Semaine 2',
    history: [
      { value: 100, date: '2025-11-02', label: 'Bloc 4 • Semaine 2' },
      { value: 98, date: '2025-10-20', label: 'Bloc 4 • Semaine 0' },
      { value: 95, date: '2025-10-06', label: 'Bloc 3 • Semaine 3' },
      { value: 93, date: '2025-09-23', label: 'Bloc 3 • Semaine 1' }
    ]
  },
  {
    id: 'squat',
    name: 'Squat',
    color: '#a855f7',
    current: 190,
    best: 195,
    unit: 'kg',
    delta: 5,
    goal: 'Passer 200 kg d’ici fin d’année',
    weeklyVolume: '9 séries',
    totalReps: '36 reps',
    lastSession: 'Bloc 4 • Semaine 1',
    history: [
      { value: 190, date: '2025-11-01', label: 'Bloc 4 • Semaine 1' },
      { value: 188, date: '2025-10-15', label: 'Bloc 3 • Semaine 4' },
      { value: 185, date: '2025-09-30', label: 'Bloc 3 • Semaine 2' },
      { value: 180, date: '2025-09-16', label: 'Bloc 3 • Semaine 0' }
    ]
  }
];

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

const OneRmModal = ({
  isOpen,
  onClose,
  data = [],
  studentName = '',
  risScore = null,
  onSave,
  onSaveAndClose,
  onViewEvolution,
}) => {
  const lifts = useMemo(() => (data.length ? data : DEFAULT_ONE_RM_DATA), [data]);
  const [selectedLiftId, setSelectedLiftId] = useState(lifts[0]?.id ?? null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  // Initialize with default position (relative to modal, positioned to the right)
  const [historyPosition, setHistoryPosition] = useState({ 
    top: 0, 
    left: 800, // Approx modal width + gap
    width: 340 
  });
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const fallbackId = lifts[0]?.id ?? null;
      if (!lifts.some((lift) => lift.id === selectedLiftId)) {
        setSelectedLiftId(fallbackId);
      }
      if (!selectedLiftId && fallbackId) {
        setSelectedLiftId(fallbackId);
      }
    } else {
      setIsHistoryModalOpen(false);
    }
  }, [isOpen, lifts, selectedLiftId]);

  const selectedLift = useMemo(
    () => lifts.find((lift) => lift.id === selectedLiftId) || lifts[0] || null,
    [lifts, selectedLiftId]
  );

  const updateHistoryPosition = useCallback(() => {
    if (!contentRef.current) return;
    
    const modalRect = contentRef.current.getBoundingClientRect();
    const gap = 20;
    const panelWidth = 340;

    // Position relative to the modal container (using absolute positioning)
    // Place to the right of the modal by default
    let left = modalRect.width + gap;
    let top = 0; // Align with top of modal

    // Check if panel would overflow on the right
    const panelRightEdge = modalRect.left + left + panelWidth;
    if (panelRightEdge > window.innerWidth - 20) {
      // Position to the left instead
      left = -(panelWidth + gap);
    }

    setHistoryPosition({ top, left, width: panelWidth });
  }, []);

  useEffect(() => {
    if (!isHistoryModalOpen) return;
    updateHistoryPosition();

    const handlers = [
      ['resize', updateHistoryPosition],
      ['scroll', updateHistoryPosition, true],
    ];

    handlers.forEach(([event, handler, useCapture]) => {
      window.addEventListener(event, handler, useCapture);
    });

    return () => {
      handlers.forEach(([event, handler, useCapture]) => {
        window.removeEventListener(event, handler, useCapture);
      });
    };
  }, [isHistoryModalOpen, updateHistoryPosition]);

  const totalCurrent = useMemo(
    () => lifts.reduce((acc, item) => acc + (Number(item.current) || 0), 0),
    [lifts]
  );

  const lastUpdatedAt = useMemo(() => selectedLift?.history?.[0]?.date || lifts[0]?.history?.[0]?.date || null, [selectedLift, lifts]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(selectedLift || null);
    }
  }, [onSave, selectedLift]);

  const handleSaveAndClose = useCallback(() => {
    if (onSaveAndClose) {
      onSaveAndClose(selectedLift || null);
    }
    onClose();
  }, [onSaveAndClose, selectedLift, onClose]);

  const handleViewEvolution = useCallback(() => {
    if (onViewEvolution) {
      onViewEvolution(selectedLift || null);
    }
  }, [onViewEvolution, selectedLift]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={contentRef} className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-3xl w-full border-none bg-transparent p-0 text-white overflow-visible">
        <div className="relative overflow-hidden rounded-[28px] border border-[#2c2c2c] bg-gradient-to-br from-[#181818]/95 via-[#121212]/95 to-[#0d0d0d]/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#242424]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full border border-[#e87c3e]/70 bg-[#1a1a1a] flex items-center justify-center text-[#e87c3e] shadow-[0_0_15px_rgba(232,124,62,0.2)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-semibold tracking-wide">
                    <span className="text-[#e87c3e]">1 RM</span>
                    <span className="text-white"> — {studentName || 'Athlète'}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-400 mt-1">
                    Dernière mise à jour&nbsp;
                    <span className="text-gray-200 font-medium">{formatDate(lastUpdatedAt)}</span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {selectedLift?.history?.[0]?.label && (
                  <div className="hidden sm:flex flex-col items-end text-[11px] text-gray-500">
                    <span className="uppercase tracking-wider text-gray-500">Bloc actuel</span>
                    <span className="text-gray-300 font-medium">{selectedLift.history[0].label}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsHistoryModalOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        // Use setTimeout to ensure contentRef is available after render
                        setTimeout(() => updateHistoryPosition(), 0);
                      }
                      return next;
                    });
                  }}
                  aria-expanded={isHistoryModalOpen}
                  aria-label={isHistoryModalOpen ? "Masquer l'historique" : "Voir l'historique du mouvement"}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e87c3e]/60 bg-[#e87c3e] text-black transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e87c3e]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] shadow-[0_10px_24px_rgba(232,124,62,0.25)] ${
                    isHistoryModalOpen ? 'scale-95' : 'hover:scale-105'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="flex-1 space-y-4">
              <div className="rounded-2xl border border-[#262626] bg-[#151515]/85 divide-y divide-[#1e1e1e] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                {lifts.map((lift) => {
                  const isActive = lift.id === selectedLift?.id;
                  return (
                    <button
                      key={lift.id}
                      type="button"
                      onClick={() => setSelectedLiftId(lift.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-all duration-150 ${
                        isActive
                          ? 'bg-[#1f1f1f]/90 border-l-2 border-[#e87c3e] shadow-[0_0_0_1px_rgba(232,124,62,0.35)]'
                          : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className="inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: lift.color || '#e87c3e' }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{lift.name}</span>
                          <span className="text-[11px] text-gray-500">{lift.goal || 'Objectif à définir'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatWeight(lift.current, lift.unit)}</p>
                        <p className="text-[11px] text-gray-500">{formatDate(lift.history?.[0]?.date)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-[#262626] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#141414]">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-white">{formatWeight(totalCurrent)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-t border-[#262626]">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500">RIS</span>
                  <span className="text-sm font-semibold text-[#e87c3e]">
                    {risScore !== null && risScore !== undefined
                      ? Number(risScore).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                      : '95,99'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={handleViewEvolution}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#262626] bg-[#161616] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-[#1f1f1f]"
            >
              <BarChart3 className="h-4 w-4 text-[#e87c3e]" />
              Voir l'évolution
            </button>
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl border border-[#2d2d2d] bg-[#171717] px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-[#1f1f1f]"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="rounded-xl bg-[#e87c3e] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#d66d35]"
              >
                Enregistrer & fermer
              </button>
            </div>
          </div>
        </div>

        {/* History panel rendered inside DialogContent to prevent click-outside detection */}
        {isHistoryModalOpen && (
          <OneRmHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            lift={selectedLift}
            studentName={studentName}
            position={historyPosition}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OneRmModal;
