import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import BaseModal from './ui/modal/BaseModal';
import PeriodizationTagTypeahead from './ui/PeriodizationTagTypeahead';
import { getApiBaseUrlWithApi } from '../config/api';
import { format, addWeeks, subWeeks, startOfWeek, isSameDay, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTagColor, getTagColorMap, hexToRgba } from '../utils/tagColors';

const CreateBlockModal = ({ isOpen, onClose, onSaved, initialDate, studentId, initialDuration, blockToEdit, existingBlocks = [] }) => {
  // We need to manage the tag selection state ourselves since ExerciseTagTypeahead expects an array of strings
  const [selectedTags, setSelectedTags] = useState([]);
  const [duration, setDuration] = useState(() => {
    // Default to 4 if initialDuration is not provided or is 0
    if (initialDuration !== undefined && initialDuration !== null && initialDuration > 0) {
      return initialDuration;
    }
    return 4;
  });
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    if (initialDate) {
      return initialDate;
    }
    // Default to current week start
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
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
        if (isOpen) {
            // Always reset name and tags when opening in create mode
            setName('');
            setSelectedTags([]);
            
            // Set start date based on initialDate prop
            if (initialDate) {
                setStartDate(initialDate);
            } else {
                setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
            }
            
            // Set duration based on initialDuration prop (default to 4 if not provided or is 0)
            if (initialDuration !== undefined && initialDuration !== null && initialDuration > 0) {
                setDuration(initialDuration);
            } else {
                setDuration(4);
            }
        }
    }
  }, [blockToEdit, initialDate, initialDuration, isOpen]);

  // Reset fields when modal closes
  React.useEffect(() => {
    if (!isOpen && !blockToEdit) {
      setName('');
      setSelectedTags([]);
      setError(null);
    }
  }, [isOpen, blockToEdit]);

  // Auto-fill name with first tag if name is empty
  React.useEffect(() => {
    if (selectedTags.length > 0 && (!name || name.trim() === '')) {
      const firstTag = selectedTags[0];
      const tagName = typeof firstTag === 'string' ? firstTag : (firstTag?.name || firstTag);
      if (tagName) {
        setName(tagName);
      }
    }
  }, [selectedTags]);

  // Generate available weeks (starting from current week, 52 weeks after)
  const availableWeeks = React.useMemo(() => {
    const weeks = [];
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    // Start from current week, go 52 weeks forward
    for (let i = 0; i < 52; i++) {
        const date = addWeeks(currentWeekStart, i);
        weeks.push(date);
    }
    return weeks;
  }, []);

  // Calculate block preview data
  const blockPreview = useMemo(() => {
    if (!selectedTags.length || !startDate || !duration || duration <= 0) {
      return null;
    }

    // Calculate block number (based on existing blocks sorted by date)
    const sortedBlocks = [...existingBlocks].sort((a, b) => {
      const dateA = new Date(a.start_week_date).getTime();
      const dateB = new Date(b.start_week_date).getTime();
      return dateA - dateB;
    });
    
    // Find position where this block would fit
    const startDateTime = startDate.getTime();
    let blockNumber = sortedBlocks.length + 1;
    for (let i = 0; i < sortedBlocks.length; i++) {
      const blockStartTime = new Date(sortedBlocks[i].start_week_date).getTime();
      if (startDateTime < blockStartTime) {
        blockNumber = i + 1;
        break;
      }
    }

    // Get tag color (hex) - same logic as PeriodizationTab
    const primaryTag = selectedTags[0];
    const tagName = typeof primaryTag === 'string' ? primaryTag : (primaryTag?.name || primaryTag);
    const normalizedTagName = tagName ? tagName.toLowerCase().trim() : '';
    
    // Calculate hash-based color (same logic as PeriodizationTab)
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    const NOTION_COLORS = [
      '#373736', '#686762', '#745a48', '#8e5835', '#896a2c',
      '#3e6e54', '#3b6591', '#6e5482', '#824e67', '#9d5650'
    ];
    const hash = hashString(normalizedTagName);
    const colorIndex = hash % NOTION_COLORS.length;
    const tagHexColor = NOTION_COLORS[colorIndex];

    // Calculate first and last week numbers
    const firstWeekStart = startOfWeek(new Date(new Date().getFullYear(), 0, 4), { weekStartsOn: 1 });
    const normalizedBlockStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const diffTime = normalizedBlockStart.getTime() - firstWeekStart.getTime();
    const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
    const firstWeekNumber = diffWeeks + 1;
    const lastWeekNumber = firstWeekNumber + parseInt(duration, 10) - 1;

    return {
      blockNumber,
      tagColor: tagHexColor || '#373736',
      name: name || selectedTags.join(', '),
      firstWeekNumber,
      lastWeekNumber,
      duration: parseInt(duration, 10)
    };
  }, [selectedTags, startDate, duration, name, existingBlocks]);

  const handleCreate = async () => {
    // Validation des tags
    if (selectedTags.length === 0) {
        setError('Veuillez sélectionner au moins un tag (objectif).');
        return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      // Prepare date objects for the new block
      const newBlockStart = startOfWeek(startDate, { weekStartsOn: 1 });
      const newBlockEnd = addWeeks(newBlockStart, parseInt(duration)); // End date is exclusive (start of next week)

      // Identify overlaps and prepare actions
      const overlapActions = [];
      const otherBlocks = existingBlocks.filter(b => !blockToEdit || b.id !== blockToEdit.id);

      for (const block of otherBlocks) {
        const blockStart = startOfWeek(new Date(block.start_week_date), { weekStartsOn: 1 });
        const blockDuration = parseInt(block.duration, 10);
        const blockEnd = addWeeks(blockStart, blockDuration);

        // Check for overlap
        // Overlap exists if (StartA < EndB) and (EndA > StartB)
        if (newBlockStart < blockEnd && newBlockEnd > blockStart) {
            console.log("Overlap detected with block:", block.name);

            // Case 1: New block completely covers existing block -> Delete existing
            if (newBlockStart <= blockStart && newBlockEnd >= blockEnd) {
                console.log("-> Action: DELETE");
                overlapActions.push(
                    axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                );
            }
            // Case 2: New block is inside existing block -> Split existing into two
            else if (newBlockStart > blockStart && newBlockEnd < blockEnd) {
                console.log("-> Action: SPLIT");
                // 1. Update existing block (Head) to end before new block
                const headDuration = Math.round((newBlockStart.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
                overlapActions.push(
                    axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                        duration: Math.max(1, headDuration)
                    }, { headers: { Authorization: `Bearer ${token}` } })
                );

                // 2. Create new block (Tail) starting after new block
                const tailStart = newBlockEnd; // Start of the week after new block
                const tailDuration = Math.round((blockEnd.getTime() - newBlockEnd.getTime()) / (1000 * 60 * 60 * 24 * 7));
                
                if (tailDuration > 0) {
                    overlapActions.push(
                        axios.post(`${getApiBaseUrlWithApi()}/periodization/blocks`, {
                            student_id: studentId,
                            tags: block.tags ? block.tags.map(t => typeof t === 'string' ? t : t?.name || t) : [],
                            start_week_date: format(tailStart, 'yyyy-MM-dd'),
                            duration: tailDuration,
                            name: block.name
                        }, { headers: { Authorization: `Bearer ${token}` } })
                    );
                }
            }
            // Case 3: Overlap at the end of existing block (New block starts inside existing) -> Trim Tail of existing
            else if (newBlockStart > blockStart && newBlockStart < blockEnd) {
                console.log("-> Action: TRIM TAIL");
                const newDuration = Math.round((newBlockStart.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
                if (newDuration > 0) {
                    overlapActions.push(
                        axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                            duration: newDuration
                        }, { headers: { Authorization: `Bearer ${token}` } })
                    );
                } else {
                    // If duration becomes 0, delete it
                    overlapActions.push(
                        axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                    );
                }
            }
            // Case 4: Overlap at the start of existing block (New block ends inside existing) -> Trim Head of existing
            else if (newBlockEnd > blockStart && newBlockEnd < blockEnd) {
                console.log("-> Action: TRIM HEAD");
                const newStart = newBlockEnd;
                const newDuration = Math.round((blockEnd.getTime() - newBlockEnd.getTime()) / (1000 * 60 * 60 * 24 * 7));
                
                if (newDuration > 0) {
                    overlapActions.push(
                        axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                            start_week_date: format(newStart, 'yyyy-MM-dd'),
                            duration: newDuration
                        }, { headers: { Authorization: `Bearer ${token}` } })
                    );
                } else {
                     overlapActions.push(
                        axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${block.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                    );
                }
            }
        }
      }

      // Execute all overlap resolution actions
      if (overlapActions.length > 0) {
          await Promise.all(overlapActions);
      }

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
        if (typeof onSaved === 'function') {
          onSaved(response.data.data);
        }
        // Reset and close
        setSelectedTags([]);
        setDuration(1);
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5" fill="currentColor" aria-hidden="true">
            <path d="M232.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 149.8C5.4 145.8 0 137.3 0 128s5.4-17.9 13.9-21.8L232.5 5.2zM48.1 218.4l164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 277.8C5.4 273.8 0 265.3 0 256s5.4-17.9 13.9-21.8l34.1-15.8zM13.9 362.2l34.1-15.8 164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 405.8C5.4 401.8 0 393.3 0 384s5.4-17.9 13.9-21.8z"/>
          </svg>
          {blockToEdit ? 'Modifier le bloc' : 'Créer un bloc d\'entraînement'}
        </>
      }
      titleClassName="text-lg font-normal"
      size="sm"
    >
        <div className="space-y-4 md:space-y-6">
            <div className="space-y-2">
                 <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
                    Nom du bloc
                </label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Prépa Force"
                    className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] h-[46px]"
                />
            </div>

            <div className="space-y-2">
                 <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
                    Objectif du bloc (Tag) <span className="text-[#d4845a]">*</span>
                </label>
                <div className="relative">
                    <PeriodizationTagTypeahead 
                        selectedTags={selectedTags}
                        onTagsChange={(tags) => {
                            setSelectedTags(tags);
                            // Clear error when user selects a tag
                            if (error && tags.length > 0) {
                                setError(null);
                            }
                        }}
                        placeholder="+ Tag"
                        canCreate={true}
                        inputClassName="px-[14px] py-[10px] rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
                        className="w-full"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
                    Semaine de démarrage
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsWeekSelectorOpen(!isWeekSelectorOpen)}
                        className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm outline-none transition-colors flex items-center justify-between focus:border-[rgba(255,255,255,0.05)]"
                    >
                        <span className="font-extralight">
                           Semaine {format(startDate, 'w', { locale: fr })} du {format(startDate, 'd MMMM', { locale: fr })}
                        </span>
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 384 512" 
                            className="h-4 w-4 pointer-events-none"
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                        </svg>
                    </button>

                    {isWeekSelectorOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(0,0,0,0.8)] backdrop-blur border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden max-h-[190px] overflow-y-auto z-50 shadow-xl scrollbar-thin-transparent-track">
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
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                                            isSelected 
                                                ? 'bg-[#d4845a]/10 text-[#d4845a] font-normal' 
                                                : 'text-white/50 hover:bg-white/5 font-extralight'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span>
                                                Semaine {format(date, 'w', { locale: fr })} du {format(date, 'd MMMM', { locale: fr })}
                                            </span>
                                            {isCurrentWeek && (
                                                <span className="text-[10px] opacity-50 mt-0.5 font-normal">Semaine en cours</span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                                                <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

             <div className="space-y-2">
                <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
                    Durée du bloc (semaine)
                </label>
                <div className="flex items-center gap-2 w-auto max-w-[150px] px-[14px] py-[10px] rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)]">
                    <button
                        type="button"
                        onClick={() => {
                            const newValue = Math.max(1, parseInt(duration) - 1);
                            setDuration(newValue);
                        }}
                        disabled={parseInt(duration) <= 1}
                        className="text-white/50 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        aria-label="Diminuer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-[14px] w-[14px]" fill="currentColor" aria-hidden="true">
                            <path d="M0 256c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 288c-17.7 0-32-14.3-32-32z"/>
                        </svg>
                    </button>
                    <input 
                        type="number" 
                        min="1" 
                        max="52"
                        value={duration}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (!isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 52)) {
                                setDuration(val);
                            }
                        }}
                        className="flex-1 text-center bg-transparent outline-none text-[#d4845a] text-base font-normal border-none p-0"
                        style={{ WebkitAppearance: 'textfield', MozAppearance: 'textfield' }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const newValue = Math.min(52, parseInt(duration) + 1);
                            setDuration(newValue);
                        }}
                        disabled={parseInt(duration) >= 52}
                        className="text-white/50 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        aria-label="Augmenter"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-[14px] w-[14px]" fill="currentColor" aria-hidden="true">
                            <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Aperçu du bloc */}
            {blockPreview && (
                <div className="space-y-2">
                    <label className="block text-sm font-extralight text-white/50" style={{ boxSizing: 'content-box' }}>
                        Aperçu du bloc
                    </label>
                    <div 
                        className="w-full px-4 py-3 rounded-[10px] flex items-center"
                        style={{
                            backgroundColor: hexToRgba(blockPreview.tagColor, 0.25)
                        }}
                    >
                        <span 
                            className="text-sm font-medium"
                            style={{
                                color: blockPreview.tagColor
                            }}
                        >
                            Bloc {blockPreview.blockNumber} : {blockPreview.name} - S{blockPreview.firstWeekNumber}→S{blockPreview.lastWeekNumber} ({blockPreview.duration} semaines)
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-[#d4845a] text-sm font-normal bg-[#d4845a]/10 px-3 py-2 rounded-[10px] border-[0.5px] border-[#d4845a]/20">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
                <button 
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Annuler
                </button>
                <button 
                    onClick={handleCreate}
                    disabled={loading}
                    className="bg-[#d4845a] hover:bg-[#d4845a]/90 text-white px-[14px] py-[10px] rounded-[10px] transition-colors flex items-center justify-center font-normal text-sm"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {blockToEdit ? 'Enregistrer' : 'Créer le bloc'}
                </button>
            </div>
        </div>
    </BaseModal>
  );
};

export default CreateBlockModal;
