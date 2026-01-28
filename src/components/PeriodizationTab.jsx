import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addWeeks, getWeek, setWeek, getYear, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { getApiBaseUrlWithApi, buildApiUrl } from '../config/api';
import { getTagColor, hexToRgba, getTagColorMap } from '../utils/tagColors';
import CreateBlockModal from './CreateBlockModal';
import WeekNotesModal from './WeekNotesModal';
import BaseModal from './ui/modal/BaseModal';
import { useModalManager } from './ui/modal/ModalManager';

const PeriodizationTab = ({ studentId }) => {
  const { isTopMost } = useModalManager();
  // Initialize to current year
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  
  // Calculate currentDate based on selected year
  // Use ISO week standard: first week of year contains January 4th
  const currentDate = useMemo(() => {
    // Get January 4th of the selected year (ISO standard for first week)
    const jan4 = new Date(selectedYear, 0, 4);
    // Get the start of the week containing January 4th
    return startOfWeek(jan4, { weekStartsOn: 1 });
  }, [selectedYear]);
  const [blocks, setBlocks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [creationDuration, setCreationDuration] = useState(4);
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  
  // Week notes state
  const [weekNotesMap, setWeekNotesMap] = useState(new Map());
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedWeekForNotes, setSelectedWeekForNotes] = useState(null);
  
  // Delete block modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag & Drop state
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragStartWeek, setDragStartWeek] = useState(null);
  const [dragOffset, setDragOffset] = useState(0); // Offset in weeks
  const [dragAnchorOffset, setDragAnchorOffset] = useState(0); // Offset of click relative to block start

  // Resize state
  const [resizingBlock, setResizingBlock] = useState(null);
  const [resizeType, setResizeType] = useState(null); // 'start' or 'end'
  const [resizeStartWeek, setResizeStartWeek] = useState(null);
  const [resizeStartDuration, setResizeStartDuration] = useState(null);
  const [isResizeHandleActive, setIsResizeHandleActive] = useState(false); // Track if resize handle is being held
  
  // Track grid columns for responsive layout
  const [columns, setColumns] = useState(8);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1024) setColumns(8);
      else if (width >= 768) setColumns(6);
      else setColumns(4);
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Calculate number of weeks in the selected year using ISO standard
  const WEEKS_TO_SHOW = useMemo(() => {
    // Get the first week of the year (week containing January 4th)
    const jan4 = new Date(selectedYear, 0, 4);
    const firstWeekStart = startOfWeek(jan4, { weekStartsOn: 1 });
    
    // Get the last week of the year (week containing December 28th of the same year)
    // December 28th is always in the last week of the year
    const dec28 = new Date(selectedYear, 11, 28);
    const lastWeekStart = startOfWeek(dec28, { weekStartsOn: 1 });
    
    // Calculate difference in weeks
    const diffTime = lastWeekStart.getTime() - firstWeekStart.getTime();
    const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
    
    // Most years have 52 weeks, some have 53
    return diffWeeks;
  }, [selectedYear]);


  useEffect(() => {
    fetchBlocks();
    fetchTags();
  }, [studentId]);

  useEffect(() => {
    fetchWeekNotes();
  }, [studentId, selectedYear]);

  const fetchBlocks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('authToken');
      // Add timestamp to prevent caching
      const response = await axios.get(`${getApiBaseUrlWithApi()}/periodization/blocks/student/${studentId}?t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setBlocks(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
      if (!silent) setError('Impossible de charger la périodisation.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(buildApiUrl('/periodization/tags'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAllTags(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      // Silent fail - continue without tags
    }
  };

  const fetchWeekNotes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Generate all weeks for 2026
      const startOfYear2026 = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekKeys = [];
      for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        const weekDate = addWeeks(startOfYear2026, i);
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

  // Navigation removed since we show all weeks of 2026

  const handleCreateBlock = (weekDate) => {
    setSelectedWeek(weekDate);
    setCreationDuration(4);
    setBlockToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateBlockClick = () => {
    // Use the current week as default
    setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setCreationDuration(0);
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

  const getFirstNote = (weekDate) => {
    const weekKey = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const notes = weekNotesMap.get(weekKey);
    if (!notes || notes.length === 0) return null;
    const firstNote = notes.find(n => n.content && n.content.trim() !== '');
    return firstNote ? firstNote.content.trim() : null;
  };

  const handleDeleteBlock = async (blockId, e) => {
    e.stopPropagation();
    const block = blocks.find(b => b.id === blockId);
    setBlockToDelete(block);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      await axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${blockToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlocks(blocks.filter(b => b.id !== blockToDelete.id));
      setIsDeleteModalOpen(false);
      setBlockToDelete(null);
    } catch (err) {
      console.error('Error deleting block:', err);
      alert('Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag & Drop handlers
  const handleBlockDragStart = (block, weekDate, e) => {
    // Only start drag if clicking on the block itself, not on buttons or resize handles
    if (e.target.closest('button') || e.target.closest('.resize-handle')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    setDraggedBlock(block);
    const blockStart = startOfWeek(new Date(block.start_week_date), { weekStartsOn: 1 });
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    
    // Calculate offset of click relative to block start
    const diffTime = weekStart.getTime() - blockStart.getTime();
    const anchorOffset = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    setDragStartWeek(blockStart);
    setDragAnchorOffset(anchorOffset);
    setDragOffset(0); // Start with 0 movement
  };

  // Resize handlers
  const handleResizeStart = (block, type, weekDate, e) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    setIsResizeHandleActive(true);
    setResizingBlock({ ...block }); // Create a copy for visual updates
    setResizeType(type);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    setResizeStartWeek(weekStart);
    setResizeStartDuration(parseInt(block.duration, 10));
  };


  // Global mouse handlers for drag and resize
  useEffect(() => {
    if (!draggedBlock && !resizingBlock) return;

    let animationFrameId = null;
    let lastUpdateTime = 0;
    const throttleMs = 16; // ~60fps

    const handleGlobalMouseMove = (e) => {
      const now = performance.now();
      if (now - lastUpdateTime < throttleMs) {
        return;
      }
      lastUpdateTime = now;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        // Find which week element is under the cursor
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const weekElement = elements.find(el => el.dataset.weekDate);
        if (weekElement) {
          const weekDate = new Date(weekElement.dataset.weekDate);
          if (draggedBlock && dragStartWeek) {
            const currentMouseWeek = startOfWeek(weekDate, { weekStartsOn: 1 });
            // Calculate where the block start should be based on current mouse position and anchor
            // newBlockStart = currentMouseWeek - dragAnchorOffset
            const newBlockStartTime = currentMouseWeek.getTime() - (dragAnchorOffset * 1000 * 60 * 60 * 24 * 7);
            const diffTime = newBlockStartTime - dragStartWeek.getTime();
            const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
            setDragOffset(diffWeeks);
          } else if (resizingBlock && resizeStartWeek && resizeType) {
            const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
            const diffTime = weekStart.getTime() - resizeStartWeek.getTime();
            const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
            
            // Find the original block
            const originalBlock = blocks.find(b => b.id === resizingBlock.id);
            if (!originalBlock) return;
            
            const originalBlockStart = startOfWeek(new Date(originalBlock.start_week_date), { weekStartsOn: 1 });
            
            if (resizeType === 'end') {
              const newDuration = Math.max(1, resizeStartDuration + diffWeeks);
              setResizingBlock({ ...resizingBlock, duration: newDuration });
            } else if (resizeType === 'start') {
              const newStartDate = addWeeks(originalBlockStart, diffWeeks);
              const newDuration = Math.max(1, resizeStartDuration - diffWeeks);
              setResizingBlock({ 
                ...resizingBlock, 
                start_week_date: newStartDate.toISOString(),
                duration: newDuration 
              });
            }
          }
        }
        animationFrameId = null;
      });
    };

    // Helper function to calculate overlap operations (returns instructions, no side effects)
    const calculateOverlapOperations = (incomingBlock, newStartDate, newDuration, allBlocks) => {
      const incomingStart = startOfWeek(newStartDate, { weekStartsOn: 1 });
      const incomingEnd = addWeeks(incomingStart, newDuration);
      
      const operations = [];
      const otherBlocks = allBlocks.filter(b => b.id !== incomingBlock.id);
      
      otherBlocks.forEach(block => {
        const blockStart = startOfWeek(new Date(block.start_week_date), { weekStartsOn: 1 });
        const blockDuration = parseInt(block.duration, 10);
        const blockEnd = addWeeks(blockStart, blockDuration);
        
        // Check for overlap
        if (incomingStart < blockEnd && incomingEnd > blockStart) {
          // Case 1: Incoming completely covers existing -> Delete
          if (incomingStart <= blockStart && incomingEnd >= blockEnd) {
            operations.push({ type: 'DELETE', id: block.id });
          }
          // Case 2: Incoming is inside existing -> Split
          else if (incomingStart > blockStart && incomingEnd < blockEnd) {
            // 1. Trim Head
            const headDuration = Math.round((incomingStart.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
            operations.push({ 
                type: 'PATCH', 
                id: block.id, 
                data: { duration: Math.max(1, headDuration) } 
            });
            
            // 2. Create Tail
            const tailStart = incomingEnd;
            const tailDuration = Math.round((blockEnd.getTime() - incomingEnd.getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (tailDuration > 0) {
              operations.push({
                type: 'POST',
                data: {
                  student_id: studentId,
                  tags: block.tags ? block.tags.map(t => typeof t === 'string' ? t : t?.name || t) : [],
                  start_week_date: format(tailStart, 'yyyy-MM-dd'),
                  duration: tailDuration,
                  name: block.name
                }
              });
            }
          }
          // Case 3: Overlap Tail -> Trim existing (keep head)
          else if (incomingStart > blockStart && incomingStart < blockEnd) {
            const newDuration = Math.round((incomingStart.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (newDuration > 0) {
              operations.push({ 
                type: 'PATCH', 
                id: block.id, 
                data: { duration: newDuration } 
              });
            } else {
              operations.push({ type: 'DELETE', id: block.id });
            }
          }
          // Case 4: Overlap Head -> Trim existing (keep tail)
          else if (incomingEnd > blockStart && incomingEnd < blockEnd) {
            const newStart = incomingEnd;
            const newDuration = Math.round((blockEnd.getTime() - incomingEnd.getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (newDuration > 0) {
              operations.push({ 
                type: 'PATCH', 
                id: block.id, 
                data: { 
                    start_week_date: format(newStart, 'yyyy-MM-dd'),
                    duration: newDuration 
                } 
              });
            } else {
              operations.push({ type: 'DELETE', id: block.id });
            }
          }
        }
      });
      
      return operations;
    };

    const handleGlobalMouseUp = async (e) => {
      if (draggedBlock && dragOffset !== 0) {
        // --- DRAG END ---
        try {
          const token = localStorage.getItem('authToken');
          const newStartDate = addWeeks(dragStartWeek, dragOffset);
          
          // 1. Calculate operations
          const operations = calculateOverlapOperations(
            draggedBlock, 
            newStartDate, 
            parseInt(draggedBlock.duration, 10), 
            blocks
          );
          
          // 2. Optimistic Update (Immediate UI feedback)
          let optimisticBlocks = blocks.filter(b => b.id !== draggedBlock.id);
          
          // Apply overlap operations locally
          operations.forEach(op => {
              if (op.type === 'DELETE') {
                  optimisticBlocks = optimisticBlocks.filter(b => b.id !== op.id);
              } else if (op.type === 'PATCH') {
                  optimisticBlocks = optimisticBlocks.map(b => b.id === op.id ? { ...b, ...op.data } : b);
              } else if (op.type === 'POST') {
                  // Generate temp block
                  optimisticBlocks.push({ ...op.data, id: `temp-${Date.now()}-${Math.random()}` });
              }
          });
          
          // Add dragged block back with new props
          const updatedDraggedBlock = { 
              ...draggedBlock, 
              start_week_date: format(newStartDate, 'yyyy-MM-dd')
          };
          optimisticBlocks.push(updatedDraggedBlock);
          
          // Update state immediately
          setBlocks(optimisticBlocks);
          
          // Clear drag state immediately so UI shows the optimistic state
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          setDraggedBlock(null);
          setDragStartWeek(null);
          setDragOffset(0);
          setDragAnchorOffset(0);

          // 3. Perform API Calls in background
          const promises = operations.map(op => {
              if (op.type === 'DELETE') return axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${op.id}`, { headers: { Authorization: `Bearer ${token}` } });
              if (op.type === 'PATCH') return axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${op.id}`, op.data, { headers: { Authorization: `Bearer ${token}` } });
              if (op.type === 'POST') return axios.post(`${getApiBaseUrlWithApi()}/periodization/blocks`, op.data, { headers: { Authorization: `Bearer ${token}` } });
          });
          
          // Add main block update
          promises.push(axios.patch(
              `${getApiBaseUrlWithApi()}/periodization/blocks/${draggedBlock.id}`,
              {
                start_week_date: format(newStartDate, 'yyyy-MM-dd'),
                duration: draggedBlock.duration,
                name: draggedBlock.name,
                tags: draggedBlock.tags ? draggedBlock.tags.map(t => typeof t === 'string' ? t : t?.name || t) : []
              },
              { headers: { Authorization: `Bearer ${token}` } }
          ));
          
          await Promise.all(promises);
          
          // 4. Sync with server (silent) to get real IDs and ensure consistency
          await fetchBlocks(true);
          
        } catch (err) {
          console.error('Error moving block:', err);
          await fetchBlocks(true); // Revert to server state
          alert('Erreur lors du déplacement du bloc.');
        }
      } else if (draggedBlock) {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setDraggedBlock(null);
        setDragStartWeek(null);
        setDragOffset(0);
        setDragAnchorOffset(0);
      } else if (resizingBlock && resizeType) {
        // --- RESIZE END ---
        try {
          const token = localStorage.getItem('authToken');
          
          // Calculate new parameters for resizing block
          let newStartDateObj = startOfWeek(new Date(resizingBlock.start_week_date), { weekStartsOn: 1 });
          let newDurationVal = parseInt(resizingBlock.duration, 10);

          if (resizeType === 'end') {
             const originalBlock = blocks.find(b => b.id === resizingBlock.id);
             if (originalBlock) {
                newStartDateObj = startOfWeek(new Date(originalBlock.start_week_date), { weekStartsOn: 1 });
                newDurationVal = Math.max(1, resizingBlock.duration);
             }
          } else if (resizeType === 'start') {
             newStartDateObj = startOfWeek(new Date(resizingBlock.start_week_date), { weekStartsOn: 1 });
             newDurationVal = Math.max(1, resizingBlock.duration);
          }

          // 1. Calculate operations
          const operations = calculateOverlapOperations(
            resizingBlock,
            newStartDateObj,
            newDurationVal,
            blocks
          );

          // 2. Optimistic Update
          let optimisticBlocks = blocks.filter(b => b.id !== resizingBlock.id);

          // Apply overlap operations locally
          operations.forEach(op => {
              if (op.type === 'DELETE') {
                  optimisticBlocks = optimisticBlocks.filter(b => b.id !== op.id);
              } else if (op.type === 'PATCH') {
                  optimisticBlocks = optimisticBlocks.map(b => b.id === op.id ? { ...b, ...op.data } : b);
              } else if (op.type === 'POST') {
                  optimisticBlocks.push({ ...op.data, id: `temp-${Date.now()}-${Math.random()}` });
              }
          });

          // Add resized block back
          const updatedResizingBlock = {
              ...resizingBlock,
              start_week_date: format(newStartDateObj, 'yyyy-MM-dd'),
              duration: newDurationVal
          };
          optimisticBlocks.push(updatedResizingBlock);

          // Update state immediately
          setBlocks(optimisticBlocks);

          // Clear resize state
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          setResizingBlock(null);
          setResizeType(null);
          setResizeStartWeek(null);
          setResizeStartDuration(null);
          setIsResizeHandleActive(false);

          // 3. Perform API Calls
          const promises = operations.map(op => {
              if (op.type === 'DELETE') return axios.delete(`${getApiBaseUrlWithApi()}/periodization/blocks/${op.id}`, { headers: { Authorization: `Bearer ${token}` } });
              if (op.type === 'PATCH') return axios.patch(`${getApiBaseUrlWithApi()}/periodization/blocks/${op.id}`, op.data, { headers: { Authorization: `Bearer ${token}` } });
              if (op.type === 'POST') return axios.post(`${getApiBaseUrlWithApi()}/periodization/blocks`, op.data, { headers: { Authorization: `Bearer ${token}` } });
          });

          // Update the resized block on server
          let updatePayload = {
            name: resizingBlock.name,
            tags: resizingBlock.tags ? resizingBlock.tags.map(t => typeof t === 'string' ? t : t?.name || t) : []
          };
          updatePayload.start_week_date = format(newStartDateObj, 'yyyy-MM-dd');
          updatePayload.duration = newDurationVal;

          promises.push(axios.patch(
            `${getApiBaseUrlWithApi()}/periodization/blocks/${resizingBlock.id}`,
            updatePayload,
            { headers: { Authorization: `Bearer ${token}` } }
          ));

          await Promise.all(promises);
          
          // 4. Sync with server
          await fetchBlocks(true); 
        } catch (err) {
          console.error('Error resizing block:', err);
          await fetchBlocks(true);
          alert('Erreur lors du redimensionnement du bloc.');
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [draggedBlock, resizingBlock, dragStartWeek, dragOffset, dragAnchorOffset, resizeStartWeek, resizeType, resizeStartDuration, blocks]);

  // Navigation functions for year
  const changeYear = (direction) => {
    if (direction === 'prev') {
      setSelectedYear(prev => prev - 1);
    } else if (direction === 'next') {
      setSelectedYear(prev => prev + 1);
    }
  };

  // Generate all weeks for the selected year using ISO standard
  const weeks = useMemo(() => {
    const weekList = [];
    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        weekList.push(addWeeks(currentDate, i));
    }
    return weekList;
  }, [currentDate, WEEKS_TO_SHOW]);

  // Create a tagColorMap from all available tags (same as PeriodizationTagTypeahead) to ensure consistent colors
  const tagColorMap = useMemo(() => {
    const tagNames = allTags.map(tag => tag.name).filter(Boolean);
    return getTagColorMap(tagNames);
  }, [allTags]);

  // Calculate block numbers by sorting blocks by start date
  const blockNumbers = useMemo(() => {
    const sortedBlocks = [...blocks].sort((a, b) => {
      const dateA = new Date(a.start_week_date).getTime();
      const dateB = new Date(b.start_week_date).getTime();
      return dateA - dateB;
    });
    const numbers = new Map();
    sortedBlocks.forEach((block, index) => {
      numbers.set(block.id, index + 1);
    });
    return numbers;
  }, [blocks]);

  // Calculate first week of the year once
  const firstWeekStart = useMemo(() => {
    const jan4 = new Date(selectedYear, 0, 4);
    return startOfWeek(jan4, { weekStartsOn: 1 });
  }, [selectedYear]);

  // Pre-calculate block map for the entire year (index -> block)
  // This avoids expensive date calculations inside the render loop
  const blockMap = useMemo(() => {
    const map = new Array(WEEKS_TO_SHOW).fill(null);
    
    // 1. Fill with regular blocks first
    blocks.forEach(block => {
      // Skip if this block is being dragged or resized
      if ((draggedBlock && block.id === draggedBlock.id) || 
          (resizingBlock && block.id === resizingBlock.id)) {
        return;
      }
      
      const blockStart = new Date(block.start_week_date);
      const normalizedBlockStart = startOfWeek(blockStart, { weekStartsOn: 1 });
      const diffTime = normalizedBlockStart.getTime() - firstWeekStart.getTime();
      const startIndex = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
      const duration = parseInt(block.duration, 10);
      
      for (let i = 0; i < duration; i++) {
        const index = startIndex + i;
        if (index >= 0 && index < WEEKS_TO_SHOW) {
          map[index] = block;
        }
      }
    });

    // 2. Overlay dragged block
    if (draggedBlock && dragStartWeek) {
      const diffTimeStart = dragStartWeek.getTime() - firstWeekStart.getTime();
      const originalStartIndex = Math.round(diffTimeStart / (1000 * 60 * 60 * 24 * 7));
      const newStartIndex = originalStartIndex + dragOffset;
      const duration = parseInt(draggedBlock.duration, 10);
      
      // Calculate the dragged block with its temporary start date
      const newStartDate = addWeeks(dragStartWeek, dragOffset);
      const tempBlock = { ...draggedBlock, start_week_date: newStartDate.toISOString() };

      for (let i = 0; i < duration; i++) {
        const index = newStartIndex + i;
        if (index >= 0 && index < WEEKS_TO_SHOW) {
          map[index] = tempBlock;
        }
      }
    }

    // 3. Overlay resizing block
    if (resizingBlock) {
      const blockStart = new Date(resizingBlock.start_week_date);
      const normalizedBlockStart = startOfWeek(blockStart, { weekStartsOn: 1 });
      const diffTime = normalizedBlockStart.getTime() - firstWeekStart.getTime();
      const startIndex = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
      const duration = parseInt(resizingBlock.duration, 10);
      
      for (let i = 0; i < duration; i++) {
        const index = startIndex + i;
        if (index >= 0 && index < WEEKS_TO_SHOW) {
          map[index] = resizingBlock;
        }
      }
    }

    return map;
  }, [blocks, draggedBlock, dragStartWeek, dragOffset, resizingBlock, firstWeekStart, WEEKS_TO_SHOW]);

  return (
    <div className="h-full flex flex-col space-y-6 pt-0 pb-0 px-0">
      {/* Header / Controls */}
      <div className="flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-3 py-0.5 mb-4">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button 
              onClick={() => changeYear('prev')} 
              className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-0 rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground group"
              style={{
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.75)',
                fontWeight: '400',
                marginRight: '-4px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 md:h-4 md:w-4 text-white/75 group-hover:text-white group-active:text-white transition-colors" style={{ transform: 'scaleX(-1)' }}>
                <path fill="currentColor" d="M247.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L179.2 256 41.9 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
              </svg>
            </button>
            <span className="text-xs md:text-sm font-light text-white/75 text-center px-1" style={{ width: '145px' }}>
              {selectedYear} - {WEEKS_TO_SHOW} semaines
            </span>
            <button 
              onClick={() => changeYear('next')} 
              className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-0 rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground group"
              style={{
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.75)',
                fontWeight: '400',
                marginLeft: '-4px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 md:h-4 md:w-4 text-white/75 group-hover:text-white group-active:text-white transition-colors">
                <path fill="currentColor" d="M247.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L179.2 256 41.9 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
              </svg>
            </button>
            <button 
              onClick={() => setSelectedYear(new Date().getFullYear())}
              className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-3 md:px-[15px] rounded-[50px] transition-colors flex items-center gap-1 text-primary-foreground text-xs md:text-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(250, 250, 250, 0.5)',
                fontWeight: '400'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.1)';
                e.currentTarget.style.color = '#D48459';
                e.currentTarget.style.fontWeight = '400';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(250, 250, 250, 0.5)';
                e.currentTarget.style.fontWeight = '400';
              }}
            >
              Cette année
            </button>
            </div>
          </div>
          <button
            onClick={handleCreateBlockClick}
            className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-3 md:px-4 rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground"
            style={{
              backgroundColor: 'rgba(212, 132, 90, 1)',
              color: 'white',
              fontWeight: '400'
            }}
          >
            <span className="text-xs md:text-sm">Créer un bloc</span>
          </button>
        </div>
        <div className="border-b border-white/10 mb-3"></div>
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
             <div className="grid gap-y-4 gap-x-2 periodization-grid">
                {weeks.map((weekDate, index) => {
                    // Use pre-calculated block map for O(1) lookup
                    const activeBlock = blockMap[index];
                    const normalizedWeekDate = startOfWeek(weekDate, { weekStartsOn: 1 });

                    // Check neighbors efficiently using the map
                    const prevBlock = index > 0 ? blockMap[index - 1] : null;
                    const nextBlock = index < WEEKS_TO_SHOW - 1 ? blockMap[index + 1] : null;
                    
                    const hasPrevWeekSameBlock = activeBlock && prevBlock && activeBlock.id === prevBlock.id;
                    const hasNextWeekSameBlock = activeBlock && nextBlock && activeBlock.id === nextBlock.id;

                    // Calculate visual neighbors (taking grid wrapping into account)
                    const isFirstCol = index % columns === 0;
                    const isLastCol = (index + 1) % columns === 0;
                    const isVisualPrevSame = hasPrevWeekSameBlock && !isFirstCol;
                    const isVisualNextSame = hasNextWeekSameBlock && !isLastCol;

                    // Check if this week is in the past
                    const today = new Date();
                    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                    const isPastWeek = normalizedWeekDate.getTime() < currentWeekStart.getTime();

                    // Check if activeBlock extends to current week or beyond
                    // We can check this efficiently without date math if we know where we are in the loop
                    // But for visual opacity we still need to know if the *entire* block is past
                    let isBlockFullyPast = false;
                    if (activeBlock) {
                        const blockStart = new Date(activeBlock.start_week_date);
                        const normalizedBlockStart = startOfWeek(blockStart, { weekStartsOn: 1 });
                        const duration = parseInt(activeBlock.duration, 10);
                        const blockLastWeek = addWeeks(normalizedBlockStart, duration - 1);
                        const normalizedBlockLastWeek = startOfWeek(blockLastWeek, { weekStartsOn: 1 });
                        isBlockFullyPast = normalizedBlockLastWeek.getTime() < currentWeekStart.getTime();
                    }

                    // Determine styling based on block
                    let content = null;
                    if (activeBlock) {
                        // Default style
                        let blockStyle = { 
                            backgroundColor: '#373736', 
                            color: 'white',
                            borderColor: '#373736'
                        };

                        // Always use first tag's color via tagColorMap to ensure consistency with PeriodizationTagTypeahead
                        // Ignore activeBlock.color to always match the tag color
                        const primaryTag = activeBlock.tags && activeBlock.tags.length > 0 ? activeBlock.tags[0] : null;
                        let tagHexColor = null;
                        
                        if (primaryTag) {
                            // Extract tag name (could be string or object with name property)
                            const tagName = typeof primaryTag === 'string' ? primaryTag : (primaryTag?.name || primaryTag);
                            // Get the hex color from tagColorMap
                            const normalizedTagName = tagName.toLowerCase().trim();
                            
                            if (tagColorMap && tagColorMap.has(normalizedTagName)) {
                                tagHexColor = tagColorMap.get(normalizedTagName);
                            } else {
                                // Fallback: calculate hash-based color (same logic as getTagColor)
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
                                tagHexColor = NOTION_COLORS[colorIndex];
                            }
                            
                            // Use 25% opacity for background, 100% for border
                            blockStyle = {
                                backgroundColor: hexToRgba(tagHexColor, 0.25),
                                color: 'white',
                                borderColor: hexToRgba(tagHexColor, 1.0),
                                borderWidth: '2px',
                                borderStyle: 'solid'
                            };
                        }

                        // isStart: this is the first week of the block (no previous week in same block)
                        const isStart = !hasPrevWeekSameBlock;

                        // Calculate border radius based on position in block
                        // First week: rounded left, last week: rounded right, middle: no rounding
                        // Coins des extrémités doivent être de 12px
                        let borderRadius = '';
                        const radiusExtremity = '12px'; // 12px pour les coins des extrémités
                        
                        if (isVisualPrevSame && isVisualNextSame) {
                            // Middle week: no rounding
                            borderRadius = '0';
                        } else if (isVisualPrevSame) {
                            // Last week: rounded right only
                            borderRadius = `0 ${radiusExtremity} ${radiusExtremity} 0`;
                        } else if (isVisualNextSame) {
                            // First week: rounded left only
                            borderRadius = `${radiusExtremity} 0 0 ${radiusExtremity}`;
                        } else {
                            // Single week: all corners rounded
                            borderRadius = radiusExtremity;
                        }
                        
                        // Border style: remove left border if previous week is same block, remove right border if next week is same block
                        const borderLeft = isVisualPrevSame ? 'none' : blockStyle.borderWidth;
                        const borderRight = isVisualNextSame ? 'none' : blockStyle.borderWidth;
                        const borderTop = blockStyle.borderWidth;
                        const borderBottom = blockStyle.borderWidth;

                        // Check if this block is being hovered
                        const isHovered = hoveredBlockId === activeBlock.id;
                        // Adjust opacity on hover: increase from 0.25 to 0.4 for tagged blocks
                        // For blocks without tags, use brightness filter
                        const backgroundColorOpacity = isHovered ? 0.4 : 0.25;
                        const hoveredBackgroundColor = primaryTag && tagHexColor 
                            ? hexToRgba(tagHexColor, backgroundColorOpacity)
                            : (isHovered ? '#4a4a48' : blockStyle.backgroundColor); // Slightly lighter for hover on non-tagged blocks
                        
                        // Darker background for gap divs when week is past
                        const gapBackgroundColor = isPastWeek 
                            ? (primaryTag && tagHexColor 
                                ? hexToRgba(tagHexColor, backgroundColorOpacity * 0.5) // Half opacity for past weeks
                                : 'rgba(55, 55, 54, 0.5)') // Darker for non-tagged past blocks
                            : hoveredBackgroundColor;

                        // Calculate border color for gap divs - reduce opacity if block is fully past
                        let gapBorderColor = blockStyle.borderColor;
                        if (isBlockFullyPast) {
                            if (tagHexColor) {
                                gapBorderColor = hexToRgba(tagHexColor, 0.4); // Match the block opacity
                            } else {
                                // For blocks without tags, use rgba with reduced opacity
                                gapBorderColor = 'rgba(55, 55, 54, 0.4)';
                            }
                        }

                        // Use resizing block data if available, otherwise use activeBlock
                        const displayBlock = resizingBlock && resizingBlock.id === activeBlock.id ? resizingBlock : activeBlock;
                        const isDragging = draggedBlock && draggedBlock.id === activeBlock.id;
                        const isResizing = resizingBlock && resizingBlock.id === activeBlock.id;
                        
                        content = (
                            <div 
                                className="h-full w-full relative group cursor-move min-h-[100px] flex flex-col transition-all shadow-sm"
                                onMouseDown={(e) => handleBlockDragStart(displayBlock, weekDate, e)}
                                onMouseEnter={() => !isDragging && !isResizing && setHoveredBlockId(activeBlock.id)}
                                onMouseLeave={() => !isDragging && !isResizing && setHoveredBlockId(null)}
                                onClick={(e) => {
                                    // Only open edit modal if not dragging/resizing
                                    if (!isDragging && !isResizing && !e.target.closest('.resize-handle')) {
                                        handleEditBlock(activeBlock, e);
                                    }
                                }}
                                style={{ 
                                    backgroundColor: hoveredBackgroundColor, 
                                    color: blockStyle.color,
                                    borderColor: blockStyle.borderColor,
                                    borderTopWidth: borderTop,
                                    borderBottomWidth: borderBottom,
                                    borderLeftWidth: borderLeft,
                                    borderRightWidth: borderRight,
                                    borderStyle: blockStyle.borderStyle,
                                    borderRadius: borderRadius,
                                    transition: isDragging || isResizing 
                                        ? 'none' 
                                        : 'background-color 0.2s ease, border-radius 0.15s ease, border-width 0.15s ease, box-shadow 0.2s ease',
                                    opacity: isBlockFullyPast ? 0.4 : (isDragging || isResizing ? 0.8 : 1),
                                    cursor: isDragging || isResizing ? 'grabbing' : 'grab',
                                    transform: isDragging || isResizing ? 'scale(1.01)' : 'scale(1)',
                                    willChange: isDragging || isResizing ? 'transform, opacity' : 'auto',
                                    boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {/* Resize handle - left (start) */}
                                {isStart && (
                                    <div
                                        className="resize-handle absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-10"
                                        onMouseDown={(e) => handleResizeStart(displayBlock, 'start', weekDate, e)}
                                        style={{
                                            backgroundColor: 'transparent',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-full transition-all duration-200"
                                            style={{
                                                display: (hoveredBlockId === activeBlock.id) || isResizeHandleActive || (resizingBlock && resizingBlock.id === activeBlock.id && resizeType === 'start') ? 'block' : 'none',
                                                backgroundColor: isResizeHandleActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)',
                                                transform: isResizeHandleActive ? 'translateX(-50%) translateY(-50%) scale(1.2)' : 'translateX(-50%) translateY(-50%) scale(1)',
                                                transition: 'background-color 0.2s ease, transform 0.15s ease, opacity 0.2s ease',
                                                opacity: isResizeHandleActive ? 1 : 0.6
                                            }}
                                        />
                                    </div>
                                )}
                                
                                {/* Resize handle - right (end) */}
                                {!hasNextWeekSameBlock && (
                                    <div
                                        className="resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10"
                                        onMouseDown={(e) => handleResizeStart(displayBlock, 'end', weekDate, e)}
                                        style={{
                                            backgroundColor: 'transparent',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div
                                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-full transition-all duration-200"
                                            style={{
                                                display: (hoveredBlockId === activeBlock.id) || isResizeHandleActive || (resizingBlock && resizingBlock.id === activeBlock.id && resizeType === 'end') ? 'block' : 'none',
                                                backgroundColor: isResizeHandleActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)',
                                                transform: isResizeHandleActive ? 'translateX(50%) translateY(-50%) scale(1.2)' : 'translateX(50%) translateY(-50%) scale(1)',
                                                transition: 'background-color 0.2s ease, transform 0.15s ease, opacity 0.2s ease',
                                                opacity: isResizeHandleActive ? 1 : 0.6
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Fill gap to the right if next week is same block */}
                                {isVisualNextSame && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '-8px', // gap-x-1.5 = 6px + 2px extension
                                            top: '-2px', // Extend 2px above to match border
                                            bottom: '-2px', // Extend 2px below to match border
                                            width: '8px',
                                            backgroundColor: gapBackgroundColor,
                                            borderTop: `2px solid ${gapBorderColor}`,
                                            borderBottom: `2px solid ${gapBorderColor}`,
                                            zIndex: 1,
                                            transition: isDragging || isResizing 
                                                ? 'none' 
                                                : 'background-color 0.2s ease, border-color 0.2s ease'
                                        }}
                                    />
                                )}
                                {/* Fill gap to the left if previous week is same block */}
                                {isVisualPrevSame && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '-8px', // gap-x-1.5 = 6px + 2px extension
                                            top: '-2px', // Extend 2px above to match border
                                            bottom: '-2px', // Extend 2px below to match border
                                            width: '8px',
                                            backgroundColor: gapBackgroundColor,
                                            borderTop: `2px solid ${gapBorderColor}`,
                                            borderBottom: `2px solid ${gapBorderColor}`,
                                            zIndex: 1,
                                            transition: isDragging || isResizing 
                                                ? 'none' 
                                                : 'background-color 0.2s ease, border-color 0.2s ease'
                                        }}
                                    />
                                )}
                                {/* Partie supérieure avec le contenu du bloc */}
                                <div className="flex-1 p-3 flex flex-col justify-between relative">
                                    <div className="flex flex-col">
                                        {isStart && (
                                            <div 
                                                className="text-sm font-semibold truncate mb-1"
                                                style={{ 
                                                    color: tagHexColor || 'white' 
                                                }}
                                            >
                                                Bloc {blockNumbers.get(activeBlock.id) || 1} : {activeBlock.name || (activeBlock.tags ? activeBlock.tags.map(t => typeof t === 'string' ? t : t?.name || t).join(', ') : 'Sans nom')}
                                            </div>
                                        )}
                                        {isStart && (() => {
                                            // Calculate first week number of the block
                                            const firstWeekStart = startOfWeek(new Date(selectedYear, 0, 4), { weekStartsOn: 1 });
                                            const blockStartDate = new Date(activeBlock.start_week_date);
                                            const normalizedBlockStart = startOfWeek(blockStartDate, { weekStartsOn: 1 });
                                            const diffTime = normalizedBlockStart.getTime() - firstWeekStart.getTime();
                                            const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
                                            const firstWeekNumber = diffWeeks + 1;
                                            const duration = parseInt(activeBlock.duration, 10);
                                            const lastWeekNumber = firstWeekNumber + duration - 1;
                                            return (
                                                <div 
                                                    className="text-xs opacity-75 font-normal"
                                                    style={{ 
                                                        color: tagHexColor || 'white' 
                                                    }}
                                                >
                                                    S{firstWeekNumber} → S{lastWeekNumber} ({duration} sem)
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    
                                    {/* Delete button (only visible on last week and when block is hovered) */}
                                    {!hasNextWeekSameBlock && (
                                        <button 
                                            onClick={(e) => handleDeleteBlock(activeBlock.id, e)}
                                            className={`absolute top-2 right-2 text-white/50 hover:text-white transition-colors shrink-0 ${
                                                isHovered ? 'opacity-100' : 'opacity-0'
                                            }`}
                                            aria-label="Supprimer le bloc"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                                <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                
                                {/* Séparateur - occupe toute la largeur */}
                                <div className="h-px bg-[rgba(255,255,255,0.05)] mx-1" style={{ transform: 'translateY(-4px)' }}></div>
                                
                                {/* Partie inférieure avec les notes */}
                                <div 
                                    className="rounded-b-lg md:rounded-b-xl relative"
                                    style={{
                                        height: 'calc(0.25rem + 22px)'
                                    }}
                                >
                                    {/* Note icon - bottom left */}
                                    <div className="absolute bottom-1 left-1 flex items-center gap-0 max-w-[calc(100%-8px)]" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenNotes(weekDate);
                                            }}
                                            className="p-1 rounded transition-colors flex-shrink-0"
                                            title="Notes de la semaine"
                                        >
                                            <svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                viewBox="0 0 384 512" 
                                                className={`w-3.5 h-3.5 transition-opacity ${hasNotes(weekDate) ? 'opacity-100 hover:opacity-50' : 'opacity-25 hover:opacity-50'}`}
                                                style={{
                                                    fill: hasNotes(weekDate) ? '#d4845a' : 'currentColor'
                                                }}
                                            >
                                                <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
                                            </svg>
                                        </button>
                                        {getFirstNote(weekDate) && (
                                            <span className={`text-xs truncate max-w-[140px] mr-[2px] ${hasNotes(weekDate) ? 'text-[#d4845a]' : 'text-white/25'}`} style={{ lineHeight: '1.3' }}>
                                                {getFirstNote(weekDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
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
                             <div className="h-full w-full rounded-md relative min-h-[100px]" style={{ opacity: isPastWeek ? 0.4 : 1 }}>
                                <button 
                                    onClick={() => handleCreateBlock(weekDate)}
                                    onMouseDown={(e) => handleMouseDown(weekDate, e)}
                                    onMouseEnter={() => handleMouseEnter(weekDate)}
                                    onMouseUp={(e) => handleMouseUp(weekDate, e)}
                                    className={`h-full w-full rounded-lg md:rounded-xl transition-colors flex items-center justify-center group min-h-[100px] relative ${
                                        isSelected 
                                        ? 'bg-white/10' 
                                        : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)]'
                                    }`}
                                >
                                    <Plus className={`h-3 w-3 md:h-4 md:w-4 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isSelected ? 'text-white opacity-100' : 'text-[#BFBFBF] opacity-0 group-hover:opacity-100'}`} />
                                </button>
                                
                                {/* Séparateur - occupe toute la largeur */}
                                <div className="absolute bottom-[calc(0.25rem+28px)] left-1 right-1 h-px bg-[rgba(255,255,255,0.05)] ml-1 mr-1"></div>
                                
                                {/* Note icon - bottom left */}
                                <div className="absolute bottom-1 left-1 flex items-center gap-0 max-w-[calc(100%-8px)]" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenNotes(weekDate);
                                        }}
                                        className="p-1 rounded transition-colors flex-shrink-0 group"
                                        title="Notes de la semaine"
                                    >
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            viewBox="0 0 384 512" 
                                            className={`w-3.5 h-3.5 transition-opacity ${hasNotes(weekDate) ? 'opacity-100 group-hover:opacity-50' : 'opacity-25 group-hover:opacity-50'}`}
                                            style={{
                                                fill: hasNotes(weekDate) ? '#d4845a' : 'currentColor'
                                            }}
                                        >
                                            <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
                                        </svg>
                                    </button>
                                    {getFirstNote(weekDate) && (
                                        <span className={`text-xs truncate max-w-[140px] mr-[2px] ${hasNotes(weekDate) ? 'text-[#d4845a]' : 'text-white/25'}`} style={{ lineHeight: '1.3' }}>
                                            {getFirstNote(weekDate)}
                                        </span>
                                    )}
                                </div>
                             </div>
                        );
                    }

                    // Calculate week number relative to the selected year (ISO standard)
                    // Calculate the week number based on the first week of the selected year
                    const firstWeekStart = startOfWeek(new Date(selectedYear, 0, 4), { weekStartsOn: 1 });
                    const diffTime = weekDate.getTime() - firstWeekStart.getTime();
                    const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
                    const weekNumber = diffWeeks + 1;

                    // Check if this is the current week (reuse normalizedWeekDate and currentWeekStart from earlier calculation)
                    const isCurrentWeek = normalizedWeekDate.getTime() === currentWeekStart.getTime();
                    // isPastWeek is already calculated earlier, reuse it here

                    // Calculate week end date
                    const weekEndDate = endOfWeek(weekDate, { weekStartsOn: 1 });
                    
                    return (
                        <div key={weekDate.toISOString()} className="flex flex-col gap-0" data-week-date={normalizedWeekDate.toISOString()}>
                             <div 
                               className={`text-sm font-light flex items-center justify-between h-9 min-h-[2.25rem] transition-colors relative group/week-header ${
                                 isCurrentWeek 
                                   ? 'text-white' 
                                   : 'text-white/50'
                               }`}
                               style={isCurrentWeek ? { 
                                 paddingLeft: '8px',
                                 paddingRight: '8px',
                                 borderRadius: '8px 8px 0 0',
                                 opacity: 1
                               } : { 
                                 paddingLeft: '8px', 
                                 paddingRight: '8px', 
                                 borderRadius: '4px 4px 0 0', 
                                 opacity: isPastWeek ? 0.4 : 1
                               }}
                             >
                               <div className="flex items-center gap-2 flex-1">
                                 <div className="flex flex-col">
                                   <span 
                                     className={`${isCurrentWeek ? "font-medium text-sm" : "text-sm"} flex items-center gap-1`}
                                     style={isCurrentWeek ? { color: '#d4845a', opacity: 1, fontWeight: 500 } : {}}
                                   >
                                     {isCurrentWeek && (
                                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" style={{ color: '#d4845a' }}>
                                         <path d="M0 188.6C0 84.4 86 0 192 0S384 84.4 384 188.6c0 119.3-120.2 262.3-170.4 316.8-11.8 12.8-31.5 12.8-43.3 0-50.2-54.5-170.4-197.5-170.4-316.8zM192 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128z"/>
                                       </svg>
                                     )}
                                     Semaine {weekNumber}
                                   </span>
                                   <span 
                                     className="text-xs flex items-center gap-1 opacity-0 group-hover/week-header:opacity-100 transition-opacity"
                                     style={isCurrentWeek ? { color: '#d4845a', fontWeight: 400 } : {}}
                                     title={`${format(weekDate, 'd MMM', { locale: fr })} - ${format(weekEndDate, 'd MMM', { locale: fr })}`}
                                   >
                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="w-3 h-3" fill="currentColor">
                                       <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                                     </svg>
                                     {format(weekDate, 'd MMM', { locale: fr })} - {format(weekEndDate, 'd MMM', { locale: fr })}
                                   </span>
                                 </div>
                               </div>
                             </div>
                            <div className="flex-1 min-h-[100px]">
                                {content}
                            </div>
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
            existingBlocks={blockToEdit ? blocks.filter(b => b.id !== blockToEdit.id) : blocks}
        />
        
        <WeekNotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setIsNotesModalOpen(false)}
          weekStartDate={selectedWeekForNotes}
          studentId={studentId}
          onSave={handleNotesSaved}
        />
        
        {/* Delete Block Modal */}
        <BaseModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setBlockToDelete(null);
          }}
          modalId="delete-block-modal"
          zIndex={80}
          closeOnEsc={isTopMost}
          closeOnBackdrop={isTopMost}
          size="md"
          title="Supprimer le bloc"
          titleClassName="text-xl font-normal text-white"
        >
          <div className="space-y-6">
            {/* Warning Message */}
            <div className="flex flex-col items-start space-y-4">
              <div className="text-left space-y-2">
                <p className="text-sm font-extralight text-white/70">
                  Êtes-vous sûr de vouloir supprimer {blockToDelete ? (
                    <>le bloc <span className="font-normal text-white">"{blockToDelete.name || (blockToDelete.tags && blockToDelete.tags.length > 0 ? blockToDelete.tags.map(t => typeof t === 'string' ? t : t?.name || t).join(', ') : 'Sans nom')}"</span> ?</>
                  ) : (
                    <>ce bloc ?</>
                  )}
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-0">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBlockToDelete(null);
                }}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteBlock}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </BaseModal>
    </div>
  );
};

export default PeriodizationTab;
