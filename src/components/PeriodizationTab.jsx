import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, AlertCircle, Loader2, FileText } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrlWithApi } from '../config/api';
import { getTagColor, hexToRgba } from '../utils/tagColors';
import CreateBlockModal from './CreateBlockModal';
import WeekNotesModal from './WeekNotesModal';

const PeriodizationTab = ({ studentId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blocks, setBlocks] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [creationDuration, setCreationDuration] = useState(4);
  const [blockToEdit, setBlockToEdit] = useState(null);
  
  // Week notes state
  const [weekNotesMap, setWeekNotesMap] = useState(new Map());
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedWeekForNotes, setSelectedWeekForNotes] = useState(null);

  // Constants for grid layout
  const WEEKS_TO_SHOW = 12; // Show 12 weeks at a time

  useEffect(() => {
    fetchBlocks();
    fetchTags();
  }, [studentId]);

  useEffect(() => {
    fetchWeekNotes();
  }, [studentId, currentDate]);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${getApiBaseUrlWithApi()}/periodization/blocks/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setBlocks(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError('Impossible de charger la périodisation.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Only coach can fetch tags usually, but we might need this for students too if we want to show tags correctly
      // For now, let's assume we can get colors from the block data or util
    } catch (err) {
      // Silent fail
    }
  };

  const fetchWeekNotes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Generate weeks for current view to fetch specific notes
      const startOfCurrentRange = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekKeys = [];
      for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        const weekDate = addWeeks(startOfCurrentRange, i);
        weekKeys.push(format(weekDate, 'yyyy-MM-dd'));
      }

      // Fetch notes for each week (in parallel)
      // Ideally we would have a bulk endpoint, but for now we'll do this
      const promises = weekKeys.map(weekKey => 
        axios.get(
          `${getApiBaseUrlWithApi()}/periodization/week-notes/${studentId}/${weekKey}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(e => ({ data: { success: false } })) // Catch errors to not fail all
      );

      const results = await Promise.all(promises);
      
      const newMap = new Map(); // Don't preserve old ones to avoid stale state? OR keep them?
      // Let's keep existing and update. actually re-creating map is cleaner for this view range.
      // But we might want to cache. Let's start with a fresh map for the view or merge.
      // Merging is safer if we navigate back and forth.
      
      // We can use the functional update form of setWeekNotesMap to merge
      setWeekNotesMap(prevMap => {
        const nextMap = new Map(prevMap);
        results.forEach((response, index) => {
          if (response.data && response.data.success) {
            const notes = response.data.data.notes || [];
            // Filter out empty notes if needed, or just store them
            // The hasNotes check handles empty content check
            nextMap.set(weekKeys[index], notes);
          }
        });
        return nextMap;
      });

    } catch (err) {
      console.error('Error fetching week notes:', err);
    }
  };

  const handlePrevRange = () => {
    setCurrentDate(subWeeks(currentDate, WEEKS_TO_SHOW));
  };

  const handleNextRange = () => {
    setCurrentDate(addWeeks(currentDate, WEEKS_TO_SHOW));
  };

  const handleCreateBlock = (weekDate) => {
    setSelectedWeek(weekDate);
    setCreationDuration(4);
    setBlockToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleMouseDown = (weekDate, e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault(); // Prevent text selection
    setIsSelecting(true);
    setSelectionStart(weekDate);
    setSelectionEnd(weekDate);
  };

  const handleMouseEnter = (weekDate) => {
    if (isSelecting) {
      setSelectionEnd(weekDate);
    }
  };

  const handleMouseUp = (weekDate, e) => {
    if (isSelecting && selectionStart) {
      e.stopPropagation(); // Prevent global cancel
      setIsSelecting(false);
      
      // Calculate range
      const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
      const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
      
      setSelectedWeek(start);
      setCreationDuration(diffWeeks);
      setIsCreateModalOpen(true);
      
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
        if (isSelecting) {
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);

  const handleBlockSaved = () => {
    fetchBlocks();
    setIsCreateModalOpen(false);
    setBlockToEdit(null);
  };

  const handleEditBlock = (block, e) => {
    e.stopPropagation();
    setBlockToEdit(block);
    setIsCreateModalOpen(true);
  };

  const handleOpenNotes = (weekDate) => {
    setSelectedWeekForNotes(weekDate);
    setIsNotesModalOpen(true);
  };

  const handleNotesSaved = (notes) => {
    // Update weekNotesMap
    const weekKey = format(selectedWeekForNotes, 'yyyy-MM-dd');
    const newMap = new Map(weekNotesMap);
    newMap.set(weekKey, notes);
    setWeekNotesMap(newMap);
  };

  const hasNotes = (weekDate) => {
    const weekKey = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const notes = weekNotesMap.get(weekKey);
    return notes && notes.length > 0 && notes.some(n => n.content.trim() !== '');
  };

  const handleDeleteBlock = async (blockId, e) => {
    e.stopPropagation();
    if (!window.confirm('Voulez-vous vraiment supprimer ce bloc ?')) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${blockId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlocks(blocks.filter(b => b.id !== blockId));
    } catch (err) {
      console.error('Error deleting block:', err);
      alert('Erreur lors de la suppression.');
    }
  };

  // Generate weeks for the current view
  const weeks = useMemo(() => {
    const startOfCurrentRange = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekList = [];
    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        weekList.push(addWeeks(startOfCurrentRange, i));
    }
    return weekList;
  }, [currentDate]);

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      {/* Header / Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-light text-white">Macro-planification</h2>
        <div className="flex items-center space-x-4">
            <button onClick={handlePrevRange} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
                <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-extralight text-white/70">
                {format(weeks[0], 'MMM yyyy', { locale: fr })} - {format(weeks[weeks.length - 1], 'MMM yyyy', { locale: fr })}
            </span>
             <button onClick={handleNextRange} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
        </div>
      )}

      {/* Grid Visualization */}
      {!loading && !error && (
        <div className="flex-1 overflow-y-auto">
             <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
                {weeks.map((weekDate, index) => {
                    // Find blocks active this week
                    const activeBlock = blocks.find(block => {
                        const blockStart = new Date(block.start_week_date);
                        // Normalize dates to start of week to compare safely
                        const normalizedBlockStart = startOfWeek(blockStart, { weekStartsOn: 1 });
                        const normalizedWeekDate = startOfWeek(weekDate, { weekStartsOn: 1 });
                        
                        // Check if current week is within [start, start + duration weeks]
                        // We use times to simplify comparison
                         const diffTime = normalizedWeekDate.getTime() - normalizedBlockStart.getTime();
                         const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
                         
                         return diffWeeks >= 0 && diffWeeks < block.duration;
                    });

                    // Determine styling based on block
                    let content = null;
                    if (activeBlock) {
                        let blockStyle = { 
                            backgroundColor: '#373736', 
                            color: 'white',
                            borderColor: '#373736'
                        };

                        if (activeBlock.color && activeBlock.color !== '#FFFFFF') {
                             // Explicit block color (opaque)
                             blockStyle = { 
                                backgroundColor: activeBlock.color, 
                                color: 'white',
                                borderColor: 'white' 
                             };
                        } else {
                             // Fallback to first tag's color
                             const primaryTag = activeBlock.tags && activeBlock.tags.length > 0 ? activeBlock.tags[0] : null;
                             if (primaryTag) {
                                 if (primaryTag.color && primaryTag.color !== '#FFFFFF') {
                                     // Opaque
                                     blockStyle = {
                                         backgroundColor: primaryTag.color,
                                         color: 'white',
                                         borderColor: 'white'
                                     };
                                 } else {
                                     // Helper returns RGBA for synthesized colors
                                     const computed = getTagColor(primaryTag.name);
                                     blockStyle = {
                                         backgroundColor: computed.backgroundColor,
                                         color: 'white',
                                         borderColor: 'white'
                                     };
                                 }
                             }
                        }

                        const blockStart = new Date(activeBlock.start_week_date);
                        const normalizedBlockStart = startOfWeek(blockStart, { weekStartsOn: 1 });
                        const normalizedWeekDate = startOfWeek(weekDate, { weekStartsOn: 1 });
                        const isStart = normalizedWeekDate.getTime() === normalizedBlockStart.getTime();

                        content = (
                            <div 
                                className="h-full w-full rounded-md p-2 flex flex-col justify-between relative group cursor-pointer hover:brightness-110 transition-all"
                                onClick={(e) => handleEditBlock(activeBlock, e)}
                                style={{ 
                                    backgroundColor: blockStyle.backgroundColor, 
                                    color: blockStyle.color,
                                    borderLeft: isStart ? `4px solid ${blockStyle.borderColor}` : 'none'
                                }}
                            >
                                <div className="text-xs font-semibold truncate">
                                    {activeBlock.name || (activeBlock.tags ? activeBlock.tags.map(t => t.name).join(', ') : 'Sans tag')}
                                </div>
                                {isStart && (
                                     <div className="text-[10px] opacity-75">{activeBlock.duration} semaines</div>
                                )}
                                
                                {/* Delete button (only visible on hover) */}
                                <button 
                                    onClick={(e) => handleDeleteBlock(activeBlock.id, e)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/20 rounded"
                                >
                                    <span className="sr-only">Supprimer</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        );
                    } else {
                        // Empty week - clicking creates a block
                        // Check if selected
                        let isSelected = false;
                        if (isSelecting && selectionStart && selectionEnd) {
                             const start = selectionStart < selectionEnd ? selectionStart : selectionEnd;
                             const end = selectionStart < selectionEnd ? selectionEnd : selectionStart;
                             const nWeek = startOfWeek(weekDate, { weekStartsOn: 1 }).getTime();
                             const nStart = startOfWeek(start, { weekStartsOn: 1 }).getTime();
                             const nEnd = startOfWeek(end, { weekStartsOn: 1 }).getTime();
                             isSelected = nWeek >= nStart && nWeek <= nEnd;
                        }

                        content = (
                             <button 
                                onClick={() => handleCreateBlock(weekDate)}
                                onMouseDown={(e) => handleMouseDown(weekDate, e)}
                                onMouseEnter={() => handleMouseEnter(weekDate)}
                                onMouseUp={(e) => handleMouseUp(weekDate, e)}
                                className={`h-full w-full rounded-md border transition-colors flex items-center justify-center group ${
                                    isSelected 
                                    ? 'bg-white/10 border-white/20' 
                                    : 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                             >
                                <Plus className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-white/20 group-hover:text-white/50'}`} />
                             </button>
                        );
                    }

                    return (
                        <div key={weekDate.toISOString()} className="aspect-square flex flex-col gap-2">
                             <div className="text-xs text-white/50 font-light pl-1 flex items-center justify-between">
                               <div>
                                 Semaine {format(weekDate, 'w')}
                                 <span className="text-[10px] opacity-50 block">{format(weekDate, 'd MMM', { locale: fr })}</span>
                               </div>
                               {/* Note icon */}
                               <button
                                 onClick={() => handleOpenNotes(weekDate)}
                                 className={`p-1 hover:bg-white/10 rounded transition-colors ${
                                   hasNotes(weekDate) ? 'text-[#D4845A]' : 'text-white/30 hover:text-white/50'
                                 }`}
                                 title="Notes de la semaine"
                               >
                                 <FileText className="w-3.5 h-3.5" />
                               </button>
                             </div>
                            {content}
                        </div>
                    );
                })}
             </div>
        </div>
      )}

      {/* Modals */}
        <CreateBlockModal 
            isOpen={isCreateModalOpen} 
            onClose={() => { setIsCreateModalOpen(false); setBlockToEdit(null); }}
            onSaved={handleBlockSaved}
            studentId={studentId}
            initialDate={selectedWeek}
            initialDuration={creationDuration}
            blockToEdit={blockToEdit}
        />
        
        <WeekNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          weekStartDate={selectedWeekForNotes}
          studentId={studentId}
          onSave={handleNotesSaved}
        />
    </div>
  );
};

export default PeriodizationTab;
