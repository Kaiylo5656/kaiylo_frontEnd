import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
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

// Fonction pour calculer le RIS (Relative Intensity Score)
export const calculateRIS = (total, bodyWeight, gender) => {
  // Si une des 3 variables manque, retourner 0
  if (total === null || total === undefined || bodyWeight === null || bodyWeight === undefined || !gender) {
    return 0;
  }

  // Déterminer les constantes selon le genre
  let A, K, B, v, Q;
  
  if (gender === 'Homme' || gender === 'M' || gender === 'male' || gender === 'Male') {
    A = 338;
    K = 549;
    B = 0.11354;
    v = 74.777;
    Q = 0.53096;
  } else if (gender === 'Femme' || gender === 'F' || gender === 'female' || gender === 'Female') {
    A = 164;
    K = 270;
    B = 0.13776;
    v = 57.855;
    Q = 0.37089;
  } else {
    // Genre non reconnu
    return 0;
  }

  // Calculer le RIS selon la formule
  // RIS = Total × 100 / (A + (K - A) / (1 + Q × e^(-B × (BW - v))))
  const exponent = -B * (bodyWeight - v);
  const denominator = A + (K - A) / (1 + Q * Math.exp(exponent));
  const ris = (total * 100) / denominator;

  return ris;
};

const OneRmModal = ({
  isOpen,
  onClose,
  data = [],
  studentName = '',
  risScore = null,
  bodyWeight = null,
  gender = null,
  onSave,
  onSaveAndClose,
  onViewEvolution,
}) => {
  const lifts = useMemo(() => (data.length ? data : DEFAULT_ONE_RM_DATA), [data]);
  const [selectedLiftId, setSelectedLiftId] = useState(lifts[0]?.id ?? null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(true);
  // État local pour stocker les valeurs modifiées
  const [editedLifts, setEditedLifts] = useState(() => {
    return lifts.map(lift => ({ ...lift }));
  });
  // État pour gérer les valeurs en cours de saisie dans les inputs
  const [inputValues, setInputValues] = useState({});
  const contentRef = useRef(null);
  const historyButtonRef = useRef(null);
  const containerRef = useRef(null);
  const [mainModalHeight, setMainModalHeight] = useState(null);

  // Synchroniser editedLifts quand lifts change
  useEffect(() => {
    setEditedLifts(lifts.map(lift => ({ ...lift })));
  }, [lifts]);

  // Calculer la hauteur de la modale principale pour aligner la modale historique
  useEffect(() => {
    if (!contentRef.current || !historyButtonRef.current) return;
    
    const updateHeight = () => {
      if (contentRef.current && historyButtonRef.current) {
        const modalRect = contentRef.current.getBoundingClientRect();
        const buttonRect = historyButtonRef.current.getBoundingClientRect();
        const gap = 10; // 10px gap between button and modal
        // La hauteur de la modale historique = hauteur modale principale - (position du bouton depuis le haut + hauteur du bouton + gap)
        const buttonTop = buttonRect.top - modalRect.top;
        const buttonHeight = buttonRect.height;
        const availableHeight = modalRect.height - (buttonTop + buttonHeight + gap);
        setMainModalHeight(availableHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [isOpen, editedLifts, isHistoryModalOpen]);

  useEffect(() => {
    if (isOpen) {
      const fallbackId = lifts[0]?.id ?? null;
      if (!lifts.some((lift) => lift.id === selectedLiftId)) {
        setSelectedLiftId(fallbackId);
      }
      if (!selectedLiftId && fallbackId) {
        setSelectedLiftId(fallbackId);
      }
      // Ouvrir l'historique par défaut quand la modal s'ouvre
      setIsHistoryModalOpen(true);
    } else {
      setIsHistoryModalOpen(false);
    }
  }, [isOpen, lifts, selectedLiftId]);

  const selectedLift = useMemo(
    () => editedLifts.find((lift) => lift.id === selectedLiftId) || editedLifts[0] || null,
    [editedLifts, selectedLiftId]
  );


  const totalCurrent = useMemo(
    () => editedLifts.reduce((acc, item) => acc + (Number(item.current) || 0), 0),
    [editedLifts]
  );

  // Calculer le RIS en utilisant totalCurrent, bodyWeight et gender
  const calculatedRIS = useMemo(() => {
    return calculateRIS(totalCurrent, bodyWeight, gender);
  }, [totalCurrent, bodyWeight, gender]);

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      style={{ zIndex: 100 }}
      onClick={handleBackdropClick}
    >
      <div ref={containerRef} className="relative">
        <div 
          ref={contentRef}
          className="relative mx-auto max-h-[92vh] overflow-visible rounded-2xl shadow-2xl flex flex-col min-w-[387px] w-auto"
          style={{
            background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
            opacity: 0.95
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5 opacity-75 flex-shrink-0" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              <path d="M144.3 0l224 0c26.5 0 48.1 21.8 47.1 48.2-.2 5.3-.4 10.6-.7 15.8l49.6 0c26.1 0 49.1 21.6 47.1 49.8-7.5 103.7-60.5 160.7-118 190.5-15.8 8.2-31.9 14.3-47.2 18.8-20.2 28.6-41.2 43.7-57.9 51.8l0 73.1 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0 0-73.1c-16-7.7-35.9-22-55.3-48.3-18.4-4.8-38.4-12.1-57.9-23.1-54.1-30.3-102.9-87.4-109.9-189.9-1.9-28.1 21-49.7 47.1-49.7l49.6 0c-.3-5.2-.5-10.4-.7-15.8-1-26.5 20.6-48.2 47.1-48.2zM101.5 112l-52.4 0c6.2 84.7 45.1 127.1 85.2 149.6-14.4-37.3-26.3-86-32.8-149.6zM380 256.8c40.5-23.8 77.1-66.1 83.3-144.8L411 112c-6.2 60.9-17.4 108.2-31 144.8z"/>
            </svg>
            <h2 className="text-xl font-normal text-white flex items-center gap-2 whitespace-nowrap" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              1 RM - <span className="font-light">{studentName || 'Athlète'}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="border-b border-white/10 mx-6"></div>
        <div className="px-6 pt-6 pb-3">
          <p className="text-sm text-white/50 font-extralight">
            Dernière mise à jour{lastUpdatedAt && (
              <>
                &nbsp;
                <span className="font-normal text-sm" style={{ color: 'var(--kaiylo-primary-hex)', marginLeft: '2px' }}>{formatDate(lastUpdatedAt)}</span>
              </>
            )}
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 pb-6 space-y-5">
          <div className="rounded-none divide-y divide-white/5 flex flex-col gap-[6px]">
                {editedLifts.map((lift) => {
                  const isActive = lift.id === selectedLift?.id;
                  const editedLift = editedLifts.find(l => l.id === lift.id) || lift;
                  return (
                    <div
                      key={lift.id}
                      className={`w-full flex items-center gap-4 px-4 py-2.5 transition-all duration-150 rounded-2xl border-t-0 ${
                        isActive
                          ? 'bg-[rgba(212,132,89,0.25)]'
                          : 'bg-[rgba(0,0,0,0.5)] hover:bg-[rgba(255,255,255,0.05)]'
                      }`}
                      style={{ borderTop: 'none', border: 'none' }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedLiftId(lift.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span 
                            className={`text-lg ${isActive ? 'font-normal' : 'font-light'}`}
                            style={{ 
                              color: isActive ? 'var(--kaiylo-primary-hex)' : 'white' 
                            }}
                          >
                            {lift.name}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {/* Champ de valeur RM éditable */}
                        <div className="relative bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] h-[36px] w-[99px] flex items-center justify-center pr-[10px]">
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
                            className="text-[18px] font-normal text-white text-center bg-transparent border-none outline-none w-full pr-[28px]"
                            style={{ caretColor: 'var(--kaiylo-primary-hex)' }}
                          />
                          <span className="absolute right-[26px] text-[16px] font-light text-white/75 pointer-events-none">
                            {editedLift.unit}
                          </span>
                          {/* Boutons de flèches */}
                          <div className="absolute right-0 top-0 bottom-0 w-[20px] flex flex-col rounded-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustLiftValue(lift.id, 0.5);
                              }}
                              className="flex-1 flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                              style={{ borderRadius: '10px 10px 0px 0px' }}
                            >
                              <ChevronUp className="w-[13px] h-[13px] text-white/50" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                adjustLiftValue(lift.id, -0.5);
                              }}
                              className="flex-1 flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                              style={{ borderRadius: '0px 0px 10px 10px' }}
                            >
                              <ChevronDown className="w-[13px] h-[13px] text-white/50" />
                            </button>
                          </div>
                        </div>
                      </div>
                      </div>
                  );
                })}
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] uppercase tracking-wider text-white/50 font-extralight">Total</span>
              <span className="text-base font-normal text-white">{formatWeight(totalCurrent)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-white/50 font-extralight">RIS</span>
              <span className="text-base font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                {calculatedRIS > 0
                  ? Number(calculatedRIS).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                  : risScore !== null && risScore !== undefined
                  ? Number(risScore).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              Enregistrer & fermer
            </button>
          </div>
        </div>
        </div>

        {/* History button and modal container - positioned outside modal to the right */}
        <div 
          className="absolute flex flex-col gap-2.5"
          style={{
            left: '100%',
            marginLeft: '1rem',
            top: '1.125rem',
            zIndex: 101,
          }}
        >
          <button
            ref={historyButtonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsHistoryModalOpen((prev) => {
                const next = !prev;
                return next;
              });
            }}
            aria-expanded={isHistoryModalOpen}
            aria-label={isHistoryModalOpen ? "Masquer l'historique" : "Voir l'historique du mouvement"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              isHistoryModalOpen 
                ? 'scale-95 hover:scale-105' 
                : 'bg-white/15 hover:scale-105 hover:bg-white/15'
            }`}
            style={{
              ...(isHistoryModalOpen && { backgroundColor: 'var(--kaiylo-primary-hex)' })
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={`h-4 w-4 text-white transition-opacity duration-150 ${isHistoryModalOpen ? 'opacity-100' : 'opacity-50'}`} fill="currentColor">
              <path d="M48 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM48 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM96 256a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z"/>
            </svg>
          </button>

          {/* History panel */}
          {isHistoryModalOpen && (
            <OneRmHistoryModal
              isOpen={isHistoryModalOpen}
              onClose={() => setIsHistoryModalOpen(false)}
              lift={selectedLift}
              studentName={studentName}
              position={null}
              mainModalHeight={mainModalHeight}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OneRmModal;
