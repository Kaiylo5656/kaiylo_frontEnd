import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { TrendingUp, CalendarDays, BarChart3, List, ChevronUp, ChevronDown } from 'lucide-react';
import OneRmHistoryModal from './OneRmHistoryModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const DEFAULT_ONE_RM_DATA = [
  {
    id: 'muscle-up',
    name: 'Muscle-up',
    color: '#d4845a',
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
  // État local pour stocker les valeurs modifiées
  const [editedLifts, setEditedLifts] = useState(() => {
    return lifts.map(lift => ({ ...lift }));
  });
  // État pour gérer les valeurs en cours de saisie dans les inputs
  const [inputValues, setInputValues] = useState({});
  // Initialize with default position (relative to modal, positioned to the right)
  const [historyPosition, setHistoryPosition] = useState({ 
    top: 0, 
    left: 800, // Approx modal width + gap
    width: 340 
  });
  const contentRef = useRef(null);

  // Synchroniser editedLifts quand lifts change
  useEffect(() => {
    setEditedLifts(lifts.map(lift => ({ ...lift })));
  }, [lifts]);

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
    () => editedLifts.find((lift) => lift.id === selectedLiftId) || editedLifts[0] || null,
    [editedLifts, selectedLiftId]
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
    () => editedLifts.reduce((acc, item) => acc + (Number(item.current) || 0), 0),
    [editedLifts]
  );

  // Fonction pour mettre à jour la valeur d'un lift
  const updateLiftValue = useCallback((liftId, newValue) => {
    setEditedLifts(prev => prev.map(lift => 
      lift.id === liftId 
        ? { ...lift, current: Number(newValue) || 0 }
        : lift
    ));
  }, []);

  // Fonction pour gérer le changement de valeur via input
  const handleInputChange = useCallback((liftId, value) => {
    // Ne garder que les chiffres et le point/virgule pour les décimales
    // Permettre un seul point ou virgule
    let cleanedValue = value.replace(/[^0-9.,]/g, '');
    
    // Remplacer la virgule par un point
    cleanedValue = cleanedValue.replace(',', '.');
    
    // S'assurer qu'il n'y a qu'un seul point
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Mettre à jour l'état local de l'input
    setInputValues(prev => ({
      ...prev,
      [liftId]: cleanedValue
    }));
    
    // Mettre à jour la valeur si elle est valide
    if (cleanedValue === '' || cleanedValue === '.') {
      updateLiftValue(liftId, 0);
    } else {
      const numValue = parseFloat(cleanedValue);
      if (!isNaN(numValue) && numValue >= 0) {
        updateLiftValue(liftId, numValue);
      }
    }
  }, [updateLiftValue]);

  // Fonction pour incrémenter/décrémenter la valeur
  const adjustLiftValue = useCallback((liftId, delta) => {
    setEditedLifts(prev => prev.map(lift => {
      if (lift.id === liftId) {
        const currentValue = Number(lift.current) || 0;
        const newValue = Math.max(0, currentValue + delta);
        return { ...lift, current: newValue };
      }
      return lift;
    }));
  }, []);

  // Fonction pour mettre à jour l'objectif d'un lift
  const updateLiftGoal = useCallback((liftId, newGoal) => {
    setEditedLifts(prev => prev.map(lift => 
      lift.id === liftId 
        ? { ...lift, goal: newGoal }
        : lift
    ));
  }, []);

  const lastUpdatedAt = useMemo(() => selectedLift?.history?.[0]?.date || lifts[0]?.history?.[0]?.date || null, [selectedLift, lifts]);

  const handleSave = useCallback(() => {
    if (onSave) {
      // Envoyer tous les lifts modifiés
      onSave(editedLifts);
    }
  }, [onSave, editedLifts]);

  const handleSaveAndClose = useCallback(() => {
    if (onSaveAndClose) {
      // Envoyer tous les lifts modifiés
      onSaveAndClose(editedLifts);
    }
    onClose();
  }, [onSaveAndClose, editedLifts, onClose]);

  const handleViewEvolution = useCallback(() => {
    if (onViewEvolution) {
      onViewEvolution(selectedLift || null);
    }
  }, [onViewEvolution, selectedLift]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={contentRef} className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-xl w-full border-none bg-transparent p-0 text-white overflow-visible">
        <div className="relative overflow-hidden rounded-[28px] border border-[#2c2c2c] bg-gradient-to-br from-[#181818]/95 via-[#121212]/95 to-[#0d0d0d]/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#242424]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full border border-[#d4845a]/70 bg-[#1a1a1a] flex items-center justify-center text-[#d4845a] shadow-[0_0_15px_rgba(212,132,90,0.2)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-semibold tracking-wide">
                    <span className="text-[#d4845a]">1 RM</span>
                    <span className="text-white"> — {studentName || 'Athlète'}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-400 mt-1">
                    Dernière mise à jour&nbsp;
                    <span className="text-gray-200 font-medium">{formatDate(lastUpdatedAt)}</span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-start gap-3">
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
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4845a]/60 bg-[#d4845a] text-black transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4845a]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] shadow-[0_10px_24px_rgba(212,132,90,0.25)] ${
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
                {editedLifts.map((lift) => {
                  const isActive = lift.id === selectedLift?.id;
                  const editedLift = editedLifts.find(l => l.id === lift.id) || lift;
                  return (
                    <div
                      key={lift.id}
                      className={`w-full flex items-center gap-4 px-4 py-3 transition-all duration-150 ${
                        isActive
                          ? 'bg-[#1f1f1f]/90 border-l-2 border-[#d4845a] shadow-[0_0_0_1px_rgba(212,132,90,0.35)]'
                          : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedLiftId(lift.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span
                          className="inline-flex h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: lift.color || '#d4845a' }}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-white">{lift.name}</span>
                          <input
                            type="text"
                            value={editedLift.goal || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateLiftGoal(lift.id, e.target.value);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            placeholder="Objectif à définir"
                            className="text-[11px] text-gray-500 bg-transparent border-none outline-none p-0 m-0 focus:text-white transition-colors w-full"
                            style={{ caretColor: '#d4845a' }}
                          />
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <p className="text-[11px] text-gray-500">{formatDate(lift.history?.[0]?.date)}</p>
                        </div>
                        {/* Champ de valeur RM éditable */}
                        <div className="relative bg-[#151517] border-[0.5px] border-[#36383a] rounded-[5px] h-[36px] w-[99px] flex items-center justify-center pr-[20px]">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={inputValues[lift.id] !== undefined 
                              ? inputValues[lift.id] 
                              : Number(editedLift.current).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleInputChange(lift.id, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              // Permettre les touches de navigation et suppression
                              if (!/[0-9.,]/.test(e.key) && 
                                  !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key) &&
                                  !(e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                                e.preventDefault();
                              }
                            }}
                            onFocus={(e) => {
                              e.stopPropagation();
                              // Afficher la valeur brute sans formatage au focus
                              const rawValue = Number(editedLift.current);
                              setInputValues(prev => ({
                                ...prev,
                                [lift.id]: rawValue.toString()
                              }));
                              // Sélectionner tout le texte au focus pour faciliter la modification
                              e.target.select();
                            }}
                            onBlur={(e) => {
                              e.stopPropagation();
                              // Valider et reformater la valeur au blur
                              const numValue = parseFloat(e.target.value) || 0;
                              updateLiftValue(lift.id, numValue);
                              // Réinitialiser l'état de l'input pour afficher la valeur formatée
                              setInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[lift.id];
                                return newValues;
                              });
                            }}
                            className="text-[18px] font-normal text-white text-center bg-transparent border-none outline-none w-full pr-[25px]"
                            style={{ caretColor: '#d4845a' }}
                          />
                          <span className="absolute right-[20px] text-[18px] font-normal text-white pointer-events-none">
                            {editedLift.unit}
                          </span>
                          {/* Boutons de flèches */}
                          <div className="absolute right-0 top-0 bottom-0 w-[20px] flex flex-col">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustLiftValue(lift.id, 0.5);
                              }}
                              className="flex-1 flex items-center justify-center hover:bg-[#2c2e31] transition-colors"
                            >
                              <ChevronUp className="w-[13px] h-[13px] text-[#717171]" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustLiftValue(lift.id, -0.5);
                              }}
                              className="flex-1 flex items-center justify-center hover:bg-[#2c2e31] transition-colors"
                            >
                              <ChevronDown className="w-[13px] h-[13px] text-[#717171]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  <span className="text-sm font-semibold text-[#d4845a]">
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
              <BarChart3 className="h-4 w-4 text-[#d4845a]" />
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
                className="rounded-xl bg-[#d4845a] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#bf7348]"
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
