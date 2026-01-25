import React, { useState } from 'react';
import axios from 'axios';
import { Layers, ChevronDown, Check, Loader2 } from 'lucide-react';
import BaseModal from './ui/modal/BaseModal';
import PeriodizationTagTypeahead from './ui/PeriodizationTagTypeahead';
import { getApiBaseUrlWithApi } from '../config/api';
import { format, addWeeks, subWeeks, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const CreateBlockModal = ({ isOpen, onClose, onSaved, initialDate, studentId, initialDuration, blockToEdit }) => {
  // We need to manage the tag selection state ourselves since ExerciseTagTypeahead expects an array of strings
  const [selectedTags, setSelectedTags] = useState([]);
  const [duration, setDuration] = useState(initialDuration || 4);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [isWeekSelectorOpen, setIsWeekSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update state when initial props change or modal opens
  React.useEffect(() => {
    if (blockToEdit) {
        setName(blockToEdit.name || '');
        setDuration(blockToEdit.duration);
        setStartDate(new Date(blockToEdit.start_week_date));
        setSelectedTags(blockToEdit.tags ? blockToEdit.tags.map(t => t.name) : []);
    } else {
        // Creation mode defaults
        if (initialDate) {
            setStartDate(initialDate);
        }
        if (initialDuration) {
            setDuration(initialDuration);
        } else if (isOpen) {
             setDuration(4); // Reset to default
        }
        if (isOpen) {
             // Clear fields when opening in create mode
             // Only if we just opened it (could add check for prev isOpen)
             // But for now, if not editing, ensure clean slate or rely on initialDate/Duration
             if (!initialDate) setName(''); // Only clear name if distinct open? 
             // Actually, simplest is: if !blockToEdit && isOpen, ensure we respect initial values.
             // Existing name clearing logic was: setName('') on success.
             if (!blockToEdit) {
                  // Keep name empty or previous logic?
                  // We'll rely on onSaved to clear it.
             }
        }
    }
  }, [blockToEdit, initialDate, initialDuration, isOpen]);

  // Generate available weeks (12 weeks before to 52 weeks after)
  const availableWeeks = React.useMemo(() => {
    const weeks = [];
    const baseDate = initialDate || new Date();
    const start = subWeeks(baseDate, 12);
    
    for (let i = 0; i < 64; i++) {
        const date = addWeeks(start, i);
        weeks.push(date);
    }
    return weeks;
  }, [initialDate]);

  const handleCreate = async () => {
    if (selectedTags.length === 0) {
        setError('Veuillez sélectionner un tag (objectif).');
        return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      let response;
      const payload = {
        student_id: studentId,
        tags: selectedTags,
        start_week_date: format(startDate, 'yyyy-MM-dd'),
        duration: parseInt(duration),
        name: name
      };

      if (blockToEdit) {
        response = await axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${blockToEdit.id}`, payload, {
             headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${getApiBaseUrlWithApi()}/periodization/blocks`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (response.data.success) {
        onSaved(response.data.data);
        // Reset and close
        setSelectedTags([]);
        setDuration(4);
        setName('');
        onClose();
      }
    } catch (err) {
      console.error('Error creating block:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du bloc.');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = initialDate ? format(initialDate, 'd MMMM yyyy', { locale: fr }) : '';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          <Layers className="w-5 h-5" />
          {blockToEdit ? 'Modifier le bloc' : 'Créer un bloc d\'entraînement'}
        </>
      }
      titleClassName="text-lg font-normal"
      size="sm"
    >
        <div className="space-y-6">
            <div>
                <label className="block text-[12px] font-medium text-white/50 mb-2">
                    Semaine de démarrage
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsWeekSelectorOpen(!isWeekSelectorOpen)}
                        className="w-full bg-[#0B0C0E] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] px-3 py-3 text-white text-sm outline-none transition-colors flex items-center justify-between"
                    >
                        <span className="font-light text-[12px]">
                           Semaine {format(startDate, 'w', { locale: fr })} du {format(startDate, 'd MMMM', { locale: fr })}
                        </span>
                        <ChevronDown className="h-4 w-4 text-white/50" />
                    </button>

                    {isWeekSelectorOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1B1E] border border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden max-h-[200px] overflow-y-auto z-50 shadow-xl">
                            {availableWeeks.map((date) => {
                                const isSelected = isSameDay(date, startDate);
                                const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), startOfWeek(date, { weekStartsOn: 1 }));
                                
                                return (
                                    <button
                                        key={date.toISOString()}
                                        type="button"
                                        onClick={() => {
                                            setStartDate(date);
                                            setIsWeekSelectorOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-[12px] flex items-center justify-between transition-colors ${
                                            isSelected 
                                                ? 'bg-[#d4845a]/10 text-[#d4845a]' 
                                                : 'text-white/50 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={isSelected ? 'font-normal' : 'font-light'}>
                                                Semaine {format(date, 'w', { locale: fr })} du {format(date, 'd MMMM', { locale: fr })}
                                            </span>
                                            {isCurrentWeek && (
                                                <span className="text-[10px] opacity-50 mt-0.5">Semaine en cours</span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="h-3 w-3" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div>
                 <label className="block text-[12px] font-medium text-white/50 mb-2">
                    Nom du bloc
                </label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Prépa Force"
                    className="w-full bg-[#0B0C0E] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] px-3 py-3 text-white text-sm outline-none focus:border-[#d4845a]/50 transition-colors placeholder:text-white/30"
                />
            </div>

            <div>
                 <label className="block text-[12px] font-medium text-white/50 mb-2">
                    Objectif (Tag)
                </label>
                <div className="relative">
                    <PeriodizationTagTypeahead 
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        placeholder="+ Tag"
                        canCreate={true}
                        inputClassName="bg-[#0B0C0E] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] px-3 py-3 text-white text-sm"
                        className="w-full"
                    />
                </div>
            </div>

             <div>
                <label className="block text-[12px] font-medium text-white/50 mb-2">
                    Durée (semaines)
                </label>
                <input 
                    type="number" 
                    min="1" 
                    max="52"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#0B0C0E] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] px-3 py-3 text-white text-sm outline-none focus:border-[#d4845a]/50 transition-colors"
                />
            </div>

            {error && (
                <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
                    {error}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleCreate}
                    disabled={loading}
                    className="bg-[#d4845a] hover:bg-[#d4845a]/90 text-white px-[14px] py-[10px] rounded-[10px] transition-colors flex items-center justify-center font-normal text-[11px]"
                >
                    {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    {blockToEdit ? 'Enregistrer' : 'Créer le bloc'}
                </button>
            </div>
        </div>
    </BaseModal>
  );
};

export default CreateBlockModal;
