import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Plus, MoreHorizontal, User, GripVertical, BookOpen, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import ContainedSideSheet from './ui/ContainedSideSheet';
import ExerciseLibraryPanel from './exercises/ExerciseLibraryPanel';
import AddExerciseModal from './AddExerciseModal';
import ExerciseArrangementModal from './ExerciseArrangementModal';
import ExerciseLibraryModal from './ExerciseLibraryModal';
import UnsavedChangesWarningModal from './UnsavedChangesWarningModal';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';
import ModalPortal from './ui/modal/ModalPortal';
import WorkoutVideoUploadModal from './WorkoutVideoUploadModal';
import { getApiBaseUrlWithApi } from '../config/api';
import { getTagColor } from '../utils/tagColors';

const CreateWorkoutSessionModal = ({ isOpen, onClose, selectedDate, onSessionCreated, studentId, existingSession }) => {
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [sessionDate, setSessionDate] = useState(selectedDate || new Date()); // Track the currently selected date for the session
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const exerciseRefs = useRef({});
  const [animatingIndex, setAnimatingIndex] = useState(null);
  
  // Exercise Library Side Sheet State
  const [openSheet, setOpenSheet] = useState(true);
  const [libraryMode, setLibraryMode] = useState('browse'); // 'browse' or 'create'
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [replacingExerciseIndex, setReplacingExerciseIndex] = useState(null);

  // Exercise Arrangement Modal State
  const [arrangementPosition, setArrangementPosition] = useState({ 
    top: 0, 
    left: 800,
    width: 340,
    height: 0
  });
  
  // Exercise Library Modal State
  const [libraryPosition, setLibraryPosition] = useState({ 
    top: 0, 
    left: -380,
    width: 360,
    height: 0
  });
  
  const modalRef = useRef(null);
  const dateInputRef = useRef(null);
  const backdropRef = useRef(null);
  const arrangementButtonRef = useRef(null);

  // Modal management
  const { isTopMost } = useModalManager();
  const modalId = 'create-workout-session';

  // State for tracking initial values to detect changes
  const [initialState, setInitialState] = useState(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  
  // Video modal state for student preview
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedSetForVideo, setSelectedSetForVideo] = useState({});
  const [videoUploadExerciseIndex, setVideoUploadExerciseIndex] = useState(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchExercises();
      // Force les deux panneaux à être toujours ouverts
      setShowSidebar(true);
      setOpenSheet(true);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Pre-fill form when editing existing session and store initial state
  useEffect(() => {
    if (isOpen && existingSession) {
      const name = existingSession.title || '';
      const desc = existingSession.description || '';
      let date = selectedDate || new Date();
      if (existingSession.scheduled_date) {
        date = parseISO(existingSession.scheduled_date);
      }
      
      // Convert session exercises to form format
      const formExercises = existingSession.exercises?.map(ex => {
        // Ensure sets is an array before mapping
        let sets = [];
        if (Array.isArray(ex.sets)) {
          sets = ex.sets.map(set => ({
            serie: set.serie,
            weight: set.weight?.toString() || '',
            reps: set.reps?.toString() || '',
            rest: set.rest || '03:00',
            video: set.video || false,
            repType: set.repType || 'reps',
            // Store previous RPE if the session was completed
            // Store previous RPE if the session was completed
            previousRpe: (ex.useRir || ex.use_rir)
              ? (set.studentWeight || set.student_weight || null)
              : (set.rpe_rating || set.rpeRating || set.previousRpe || null)
          }));
        } else {
          // Default sets if none exist or not an array
          sets = [
            { serie: 1, weight: '', reps: '', rest: '03:00', video: false, repType: 'reps', previousRpe: null }
          ];
        }

        return {
          id: Date.now() + Math.random(), // Generate unique ID
          name: ex.name,
          tags: ex.tags || [],
          exerciseId: ex.exerciseId,
          description: ex.description || '',
          sets: sets,
          notes: ex.notes || '',
          isExpanded: true,
          tempo: ex.tempo || '',
          per_side: ex.per_side || false,
          useRir: ex.useRir || false
        };
      }) || [];
      
      setSessionName(name);
      setDescription(desc);
      setSessionDate(date);
      setExercises(formExercises);

      // Store initial state for comparison
      setInitialState({
        sessionName: name,
        description: desc,
        sessionDate: format(date, 'yyyy-MM-dd'),
        exercises: JSON.parse(JSON.stringify(formExercises)) // Deep clone
      });
    } else if (isOpen && !existingSession) {
      // Reset form for new session
      const defaultDate = selectedDate || new Date();
      setSessionName('');
      setDescription('');
      setSessionDate(defaultDate);
      setExercises([]);

      // Store initial state (empty)
      setInitialState({
        sessionName: '',
        description: '',
        sessionDate: format(defaultDate, 'yyyy-MM-dd'),
        exercises: []
      });
    }
  }, [isOpen, existingSession, selectedDate]);

  // Calculate position for arrangement modal
  const updateArrangementPosition = useCallback(() => {
    if (!arrangementButtonRef.current || !modalRef.current) return;
    
    const buttonRect = arrangementButtonRef.current.getBoundingClientRect();
    const modalRect = modalRef.current.getBoundingClientRect();
    const gap = 10; // 10px gap below button
    const panelWidth = 340;
    
    // Position relative to the parent container (externalContent which is positioned relative to the modal)
    // The modal should be positioned 10px below the button
    const buttonHeight = buttonRect.height;
    const topOffset = buttonHeight + gap; // Button height + 10px gap

    // Calculate available height to align bottom of ExerciseArrangementModal with bottom of main modal
    // externalContent is positioned at top: 1.125rem (18px) from modal top
    // ExerciseArrangementModal starts at topOffset from the top of externalContent
    // We want ExerciseArrangementModal bottom to align with modal bottom
    // So: height = (modalRect.bottom - (modalRect.top + 18)) - topOffset
    // Simplified: height = modalRect.height - 18 - topOffset
    const externalContentTopOffset = 18; // 1.125rem = 18px
    const modalHeight = modalRect.height;
    const availableHeight = modalHeight - externalContentTopOffset - topOffset;

    setArrangementPosition({ 
      top: topOffset, 
      left: 0, // Aligned with button on the left
      width: panelWidth,
      height: Math.max(0, availableHeight) // Height to align bottom with main modal
    });
  }, []);

  // Update arrangement position when sidebar opens or window resizes
  useEffect(() => {
    if (!showSidebar || !modalRef.current) return;
    
    // Use setTimeout to ensure button ref and modal ref are available after render
    const timer = setTimeout(() => {
      updateArrangementPosition();
    }, 0);

    // Use ResizeObserver to instantly update when modal size changes
    const resizeObserver = new ResizeObserver(() => {
      updateArrangementPosition();
    });
    
    resizeObserver.observe(modalRef.current);

    const handleResize = () => updateArrangementPosition();
    const handleScroll = () => updateArrangementPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showSidebar, updateArrangementPosition]);

  // Also update position when exercises change (modal height may change)
  // Note: ResizeObserver in the previous effect should handle this, but we keep this as a fallback
  useEffect(() => {
    if (!showSidebar || !isOpen) return;
    const timer = setTimeout(() => {
      updateArrangementPosition();
    }, 50); // Reduced delay since ResizeObserver handles most updates
    return () => clearTimeout(timer);
  }, [exercises.length, showSidebar, isOpen, updateArrangementPosition]);

  // Calculate position for library modal - MUST be defined before useEffect that uses it
  const updateLibraryPosition = useCallback(() => {
    if (!modalRef.current) return;
    
    const modalRect = modalRef.current.getBoundingClientRect();
    const gap = 0; // Pas d'espace entre les modales
    const panelWidth = 360; // Réduit de 400 à 360 pour mieux s'adapter
    const minMargin = 10; // Réduit pour être moins strict

    // Position relative to viewport (using fixed positioning)
    // Position à gauche de la modale par défaut, collée sans espace
    let left = modalRect.left - panelWidth;
    let top = modalRect.top;

    // Vérifier si on a assez d'espace à gauche de la modale
    const spaceOnLeft = modalRect.left;
    const spaceOnRight = window.innerWidth - modalRect.right;
    
    // Priorité à gauche : seulement si vraiment pas d'espace, on passe à droite
    // On accepte un léger débordement si nécessaire
    if (spaceOnLeft < minMargin) {
      // Vraiment pas d'espace à gauche, essayer à droite
      if (spaceOnRight >= panelWidth + minMargin) {
        left = modalRect.right;
      }
    }

    setLibraryPosition({ 
      top, 
      left, 
      width: panelWidth,
      height: modalRect.height
    });
  }, []);

  // Update button position when modal opens or resizes
  const [buttonPosition, setButtonPosition] = useState({ left: 'auto', top: '1.125rem' });
  
  const updateButtonPosition = useCallback(() => {
    if (!modalRef.current) return;
    const modalRect = modalRef.current.getBoundingClientRect();
    // Position button to the right of the modal with 16px margin
    const leftPosition = modalRect.right + 16; // 16px margin from modal right edge
    setButtonPosition({
      left: `${leftPosition}px`,
      top: `${modalRect.top + 18}px` // 1.125rem = 18px from modal top
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    
    // Initial position
    const timer = setTimeout(() => {
      if (modalRef.current && isOpen) {
        updateButtonPosition();
      }
    }, 100);

    // Use ResizeObserver to instantly update button position when modal size changes
    const resizeObserver = new ResizeObserver(() => {
      // Only update if modal ref is available (don't check isOpen here to avoid stale closure)
      if (!modalRef.current) return;
      updateButtonPosition();
      if (showSidebar) {
        updateArrangementPosition();
      }
      if (openSheet) {
        updateLibraryPosition();
      }
    });
    
    try {
      if (modalRef.current) {
        resizeObserver.observe(modalRef.current);
      }
    } catch (error) {
      console.error('Error observing modal:', error);
    }

    const handleResize = () => {
      // Only handle resize if modal is still open
      if (!isOpen || !modalRef.current) return;
      updateButtonPosition();
      if (showSidebar) {
        updateArrangementPosition();
      }
      if (openSheet) {
        updateLibraryPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      try {
        resizeObserver.disconnect();
      } catch (error) {
        // Ignore errors on cleanup
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updateButtonPosition, showSidebar, updateArrangementPosition, openSheet, updateLibraryPosition]);

  // Update library position when it opens (initial position)
  // Note: The ResizeObserver in the main useEffect handles instant updates when modal size changes
  useEffect(() => {
    if (!openSheet || !isOpen || !modalRef.current) return;
    
    // Initial position update when library opens
    const timer = setTimeout(() => {
      updateLibraryPosition();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [openSheet, isOpen, updateLibraryPosition]);

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleAddExercise = (selectedExercise) => {
    // Store all tags from the exercise
    const exerciseTags = selectedExercise.tags || [];

    const newExercise = {
      id: Date.now(),
      name: selectedExercise.title,
      tags: exerciseTags,
      exerciseId: selectedExercise.id,
      description: selectedExercise.description || '',
      sets: [
        { serie: 1, weight: '', reps: '', rest: '03:00', video: false, repType: 'reps' }
      ],
      notes: '',
      isExpanded: true,
      tempo: '',
      per_side: false,
      useRir: false
    };
    
    setExercises([...exercises, newExercise]);
    setShowExerciseSelector(false);
    setSearchTerm('');
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleAddSet = (exerciseIndex) => {
    const updatedExercises = [...exercises];
    const currentSets = updatedExercises[exerciseIndex].sets;
    const newSetNumber = currentSets.length + 1;
    
    // Récupérer les valeurs de la dernière série
    const lastSet = currentSets[currentSets.length - 1];
    const previousWeight = lastSet?.weight || '';
    const previousReps = lastSet?.reps || '';
    const previousRest = lastSet?.rest || '03:00';
    
    const previousRepType = lastSet?.repType || 'reps';
    updatedExercises[exerciseIndex].sets.push({
      serie: newSetNumber,
      weight: previousWeight,
      reps: previousReps,
      rest: previousRest,
      video: false,
      repType: previousRepType,
      previousRpe: null // New sets don't have previous RPE
    });
    setExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    // Renumber remaining sets
    updatedExercises[exerciseIndex].sets.forEach((set, idx) => {
      set.serie = idx + 1;
    });
    setExercises(updatedExercises);
  };

  // Helper function to check if session was copied from a completed session
  const hasPreviousRpeData = () => {
    return exercises.some(exercise => 
      exercise.sets?.some(set => 
        set.previousRpe !== null && set.previousRpe !== undefined
      )
    );
  };

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updatedExercises);
  };

  const handleChangeAllRepTypes = (exerciseIndex, repType) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.forEach(set => {
      set.repType = repType;
      // Reset reps and weight if switching to hold
      if (repType === 'hold') {
        set.reps = '0s';
        set.weight = '';
      }
      // Reset reps value if switching to reps
      if (repType === 'reps') {
        set.reps = '';
      }
    });
    setExercises(updatedExercises);
  };

  const toggleExerciseExpanded = (exerciseIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].isExpanded = !updatedExercises[exerciseIndex].isExpanded;
    setExercises(updatedExercises);
  };

  // Helper function to animate exercise movement using FLIP technique
  const animateExerciseMove = (fromIndex, toIndex) => {
    const fromExercise = exercises[fromIndex];
    const toExercise = exercises[toIndex];
    
    if (!fromExercise || !toExercise) return;

    const fromElement = exerciseRefs.current[fromExercise.id];
    const toElement = exerciseRefs.current[toExercise.id];
    
    if (!fromElement || !toElement) {
      // Fallback if refs not available
      const updatedExercises = [...exercises];
      [updatedExercises[fromIndex], updatedExercises[toIndex]] = [updatedExercises[toIndex], updatedExercises[fromIndex]];
      setExercises(updatedExercises);
      return;
    }

    // FLIP: First - capture initial positions
    const fromInitialRect = fromElement.getBoundingClientRect();
    const toInitialRect = toElement.getBoundingClientRect();
    const containerRect = fromElement.parentElement.getBoundingClientRect();
    
    const fromInitialTop = fromInitialRect.top - containerRect.top;
    const toInitialTop = toInitialRect.top - containerRect.top;
    const distance = Math.abs(toInitialTop - fromInitialTop);

    // Update state (this will cause React to reorder elements)
    const updatedExercises = [...exercises];
    [updatedExercises[fromIndex], updatedExercises[toIndex]] = [updatedExercises[toIndex], updatedExercises[fromIndex]];
    setExercises(updatedExercises);

    // FLIP: Last - after React renders, get final positions and animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Get elements after re-render (they've swapped positions in DOM)
        const newFromElement = exerciseRefs.current[fromExercise.id];
        const newToElement = exerciseRefs.current[toExercise.id];
        
        if (!newFromElement || !newToElement) return;

        const fromFinalRect = newFromElement.getBoundingClientRect();
        const toFinalRect = newToElement.getBoundingClientRect();
        const newContainerRect = newFromElement.parentElement.getBoundingClientRect();
        
        const fromFinalTop = fromFinalRect.top - newContainerRect.top;
        const toFinalTop = toFinalRect.top - newContainerRect.top;

        // FLIP: Invert - set elements to their initial positions
        const fromDelta = fromInitialTop - fromFinalTop;
        const toDelta = toInitialTop - toFinalTop;

        newFromElement.style.transform = `translateY(${fromDelta}px)`;
        newFromElement.style.transition = 'none';
        newFromElement.style.zIndex = '10';
        
        newToElement.style.transform = `translateY(${toDelta}px)`;
        newToElement.style.transition = 'none';
        newToElement.style.zIndex = '9';

        // FLIP: Play - animate to final positions
        requestAnimationFrame(() => {
          newFromElement.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          newToElement.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          
          newFromElement.style.transform = 'translateY(0)';
          newToElement.style.transform = 'translateY(0)';
        });

        // Clean up after animation
        setTimeout(() => {
          if (newFromElement) {
            newFromElement.style.transform = '';
            newFromElement.style.transition = '';
            newFromElement.style.zIndex = '';
          }
          if (newToElement) {
            newToElement.style.transform = '';
            newToElement.style.transition = '';
            newToElement.style.zIndex = '';
          }
        }, 500);
      });
    });
  };

  // Exercise reordering functions with smooth slide animation
  const moveExerciseUp = (index) => {
    if (index > 0) {
      animateExerciseMove(index, index - 1);
    }
  };

  const moveExerciseDown = (index) => {
    if (index < exercises.length - 1) {
      animateExerciseMove(index, index + 1);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragEnd = (e) => {
    // Reset all drag states
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Only reset if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex && dragIndex !== undefined && !isNaN(dragIndex)) {
      const updatedExercises = [...exercises];
      const draggedExercise = updatedExercises[dragIndex];
      
      // Remove the dragged exercise
      updatedExercises.splice(dragIndex, 1);
      
      // Insert it at the new position
      updatedExercises.splice(dropIndex, 0, draggedExercise);
      
      setExercises(updatedExercises);
    }
  };

  const handleSubmit = async (e, status = 'published') => {
    e.preventDefault();
    
    // Validate exercises
    if (exercises.length === 0) {
      alert('Veuillez ajouter au moins un exercice');
      return;
    }

    const sessionData = {
      title: sessionName.trim() || `Séance du ${format(sessionDate, 'dd/MM/yyyy')}`,
      description: description.trim(),
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        tags: ex.tags,
        sets: ex.sets.map(set => ({
          serie: set.serie,
          weight: ex.useRir ? (parseFloat(set.weight) || 0) : (set.weight || ''),
          reps: set.repType === 'hold' ? set.reps : (set.reps || ''),
          rest: set.rest,
          video: set.video,
          repType: set.repType || 'reps',
          previousRpe: set.previousRpe !== null && set.previousRpe !== undefined ? set.previousRpe : null
        })),
        notes: ex.notes,
        tempo: ex.tempo,
        per_side: ex.per_side || false,
        useRir: ex.useRir || false
      })),
      scheduled_date: format(sessionDate, 'yyyy-MM-dd'),
      student_id: studentId,
      status: status, // 'published' or 'draft'
      // Include existing session info if editing
      ...(existingSession && {
        existingSessionId: existingSession.workoutSessionId || existingSession.id, // Use workoutSessionId for draft sessions
        assignmentId: existingSession.assignmentId, // Include assignmentId for assigned sessions
        isEdit: true
      }),
      originalScheduledDate: existingSession?.scheduled_date
        ? existingSession.scheduled_date
        : format(selectedDate || sessionDate, 'yyyy-MM-dd')
    };

    console.log('Sending session data:', sessionData);
    console.log('Existing session details:', {
      id: existingSession?.id,
      assignmentId: existingSession?.assignmentId,
      workoutSessionId: existingSession?.workoutSessionId,
      status: existingSession?.status
    });

    try {
      onSessionCreated(sessionData);
      handleClose(true); // Force close after successful save
    } catch (error) {
      console.error('Error creating/updating workout session:', error);
    }
  };

  const handleSaveDraft = (e) => {
    handleSubmit(e, 'draft');
  };

  const handlePublish = (e) => {
    handleSubmit(e, 'published');
  };

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialState) return false;

    // Check session name
    if (sessionName.trim() !== initialState.sessionName.trim()) {
      return true;
    }

    // Check description
    if (description.trim() !== initialState.description.trim()) {
      return true;
    }

    // Check date
    const currentDateStr = format(sessionDate, 'yyyy-MM-dd');
    if (currentDateStr !== initialState.sessionDate) {
      return true;
    }

    // Check exercises - compare count
    if (exercises.length !== initialState.exercises.length) {
      return true;
    }

    // Check each exercise
    for (let i = 0; i < exercises.length; i++) {
      const current = exercises[i];
      const initial = initialState.exercises[i];

      if (!initial) return true; // New exercise added

      // Check exercise properties
      if (current.name !== initial.name ||
          current.exerciseId !== initial.exerciseId ||
          current.notes !== initial.notes ||
          current.tempo !== initial.tempo ||
          current.per_side !== initial.per_side) {
        return true;
      }

      // Check sets
      if (current.sets.length !== initial.sets.length) {
        return true;
      }

      // Check each set
      for (let j = 0; j < current.sets.length; j++) {
        const currentSet = current.sets[j];
        const initialSet = initial.sets[j];

        if (!initialSet) return true;

        if (currentSet.weight !== initialSet.weight ||
            currentSet.reps !== initialSet.reps ||
            currentSet.rest !== initialSet.rest ||
            currentSet.video !== initialSet.video) {
          return true;
        }
      }
    }

    return false;
  }, [sessionName, description, sessionDate, exercises, initialState]);

  const handleClose = useCallback((forceClose = false) => {
    // Don't close if AddExerciseModal is open
    if (isAddExerciseModalOpen && !forceClose) {
      return;
    }

    // Check for unsaved changes unless force close
    if (!forceClose && hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
      return;
    }
    
    // Reset all state
    setSessionName('');
    setDescription('');
    setExercises([]);
    setSessionDate(selectedDate || new Date());
    setSearchTerm('');
    setShowExerciseSelector(false);
    setShowSidebar(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setOpenSheet(false);
    setLibraryMode('browse');
    setReplacingExerciseIndex(null);
    setInitialState(null);
    setShowUnsavedWarning(false);
    onClose();
  }, [isAddExerciseModalOpen, hasUnsavedChanges, selectedDate, onClose]);

  const handleConfirmQuit = useCallback(() => {
    setShowUnsavedWarning(false);
    handleClose(true); // Force close
  }, [handleClose]);

  const handleCancelQuit = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  // Handle backdrop click manually
  const handleBackdropClick = useCallback((e) => {
    // Only proceed if this modal is topmost (or if warning modal is open)
    // This prevents interference with other modals that might be open
    if (!isTopMost && !showUnsavedWarning) {
      return;
    }
    
    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      handleClose(true);
    }
  }, [isTopMost, showUnsavedWarning, hasUnsavedChanges, handleClose]);

  // Handle ESC key with change detection
  useEffect(() => {
    if (!isOpen || !isTopMost || showUnsavedWarning) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        
        if (hasUnsavedChanges()) {
          setShowUnsavedWarning(true);
        } else {
          handleClose(true);
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isTopMost, showUnsavedWarning, hasUnsavedChanges, handleClose]);

  // Exercise Library Functions
  const handleOpenLibrary = () => {
    setOpenSheet(true);
    setLibraryMode('browse');
  };

  const handleCloseLibrary = () => {
    setOpenSheet(false);
    setLibraryMode('browse');
    setReplacingExerciseIndex(null);
  };

  const handleAddExerciseToSession = (exercise) => {
    // Convert exercise to session format
    const newExercise = {
      id: Date.now(),
      name: exercise.title,
      tags: exercise.tags || [],
      exerciseId: exercise.id,
      description: exercise.instructions || '',
      sets: [
        { serie: 1, weight: '', reps: '', rest: '03:00', video: false, repType: 'reps' }
      ],
      notes: '',
      isExpanded: true,
      tempo: '',
      useRir: false
    };
    
    // If we're replacing an exercise, replace it at the specified index
    if (replacingExerciseIndex !== null) {
      const updatedExercises = [...exercises];
      // Preserve the existing sets if the exercise has any
      if (updatedExercises[replacingExerciseIndex]?.sets?.length > 0) {
        newExercise.sets = updatedExercises[replacingExerciseIndex].sets;
      }
      updatedExercises[replacingExerciseIndex] = newExercise;
      setExercises(updatedExercises);
      setReplacingExerciseIndex(null);
      // Keep library open when replacing an exercise
    } else {
      // Otherwise, add it to the end
      setExercises([...exercises, newExercise]);
      // Keep library open when adding a new exercise
    }
  };

  const handleReplaceExercise = (exerciseIndex) => {
    setReplacingExerciseIndex(exerciseIndex);
    setOpenSheet(true);
    setLibraryMode('browse');
    // Force blur to remove hover state
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };


  const handleCreateClick = () => {
    setEditingExercise(null);
    setIsAddExerciseModalOpen(true);
  };

  const handleEditExercise = (exercise) => {
    setEditingExercise(exercise);
    setIsAddExerciseModalOpen(true);
  };

  const handleBackToBrowse = () => {
    setLibraryMode('browse');
  };

  const handleExerciseCreated = async (exerciseData) => {
    try {
      setLibraryLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exerciseData)
      });

      if (!response.ok) {
        throw new Error('Failed to create exercise');
      }

      const result = await response.json();
      
      // Add the new exercise to the top of the available exercises list
      // (it will appear at the top when no filters are active)
      setAvailableExercises(prev => [result.exercise, ...prev]);
      
      // Close the modal
      setIsAddExerciseModalOpen(false);
      
      // Optionally add the exercise directly to the session
      handleAddExerciseToSession(result.exercise);
      
    } catch (error) {
      console.error('Error creating exercise:', error);
      alert('Failed to create exercise. Please try again.');
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleExerciseUpdated = async (exerciseId, exerciseData) => {
    try {
      setLibraryLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises/${exerciseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exerciseData)
      });

      if (!response.ok) {
        throw new Error('Failed to update exercise');
      }

      const result = await response.json();
      
      // Update the exercise in the available exercises list
      setAvailableExercises(prev => 
        prev.map(exercise => 
          exercise.id === exerciseId ? result.exercise : exercise
        )
      );
      
      // Close the modal and reset editing exercise
      setIsAddExerciseModalOpen(false);
      setEditingExercise(null);
      
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Failed to update exercise. Please try again.');
    } finally {
      setLibraryLoading(false);
    }
  };

  const filteredExercises = availableExercises.filter(exercise =>
    exercise.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
    <BaseModal
      ref={modalRef}
      isOpen={isOpen}
      onClose={() => handleClose(false)}
      modalId={modalId}
      zIndex={60}
      closeOnEsc={false}
      closeOnBackdrop={false}
      onBackdropClick={handleBackdropClick}
      size="2xl"
      noPadding={true}
      className="!p-0 relative mx-auto w-full max-w-[700px] md:max-w-[700px] max-h-[92vh] overflow-visible flex flex-col"
      borderRadius={openSheet ? "0px 16px 16px 0px" : "16px"}
      externalContent={
        isOpen ? (
          <div 
            className="fixed flex flex-col gap-2.5"
            style={{
              left: buttonPosition.left,
              top: buttonPosition.top,
              zIndex: 1002,
              pointerEvents: 'auto',
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Arrangement button */}
            <button
              ref={arrangementButtonRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSidebar((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => updateArrangementPosition(), 0);
                  }
                  return next;
                });
              }}
              aria-expanded={showSidebar}
              aria-label={showSidebar ? "Masquer l'agencement" : "Afficher l'agencement des exercices"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150"
              style={{
                backgroundColor: showSidebar ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.2)',
                borderWidth: '0px',
                borderStyle: 'none',
                borderColor: 'rgba(0, 0, 0, 0)',
                borderImage: 'none',
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: 1003,
                position: 'relative',
                minWidth: '40px',
                minHeight: '40px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = showSidebar ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = showSidebar ? 'var(--kaiylo-primary-hex)' : 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Agencement des exercices"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 512 512" 
                className="h-4 w-4 text-white" 
                fill="currentColor"
                style={{ pointerEvents: 'none' }}
              >
                <path d="M48 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM48 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM96 256a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z"/>
              </svg>
            </button>

            {/* Exercise Arrangement Modal */}
            {showSidebar && (
              <ExerciseArrangementModal
                isOpen={showSidebar}
                onClose={() => {
                  setShowSidebar(false);
                }}
                exercises={exercises}
                position={{
                  ...arrangementPosition,
                  left: 0, // Aligned with button on the left
                }}
                draggedIndex={draggedIndex}
                dragOverIndex={dragOverIndex}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMoveUp={moveExerciseUp}
                onMoveDown={moveExerciseDown}
                useAbsolute={true}
              />
            )}
          </div>
        ) : null
      }
    >
            {/* Library button - arrow on the left side of modal */}
            <button
              onClick={() => {
                setOpenSheet((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => updateLibraryPosition(), 0);
                  }
                  return next;
                });
              }}
              aria-expanded={openSheet}
              aria-label={openSheet ? "Masquer la bibliothèque" : "Afficher la bibliothèque d'exercices"}
              className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1002] inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                openSheet 
                  ? 'scale-95 hover:scale-105' 
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: 'rgba(19, 20, 22, 1)',
                borderWidth: '1px',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              title="Bibliothèque d'exercices"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 256 512" 
                className={`h-4 w-4 transition-transform duration-150 ${openSheet ? 'rotate-180' : ''}`}
                fill="currentColor"
              >
                <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
              </svg>
            </button>

            {/* Fixed Header */}
            <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                    <path d="M352.9 21.2L308 66.1 445.9 204 490.8 159.1C504.4 145.6 512 127.2 512 108s-7.6-37.6-21.2-51.1L455.1 21.2C441.6 7.6 423.2 0 404 0s-37.6 7.6-51.1 21.2zM274.1 100L58.9 315.1c-10.7 10.7-18.5 24.1-22.6 38.7L.9 481.6c-2.3 8.3 0 17.3 6.2 23.4s15.1 8.5 23.4 6.2l127.8-35.5c14.6-4.1 27.9-11.8 38.7-22.6L412 237.9 274.1 100z"/>
                  </svg>
                  <h2 className="text-base md:text-xl font-normal text-white flex items-center gap-1 md:gap-2 min-w-0" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    <span className="truncate">{existingSession ? 'Modifier la séance' : 'Nouvelle séance'}</span>
                    <span className="hidden sm:inline font-light"> - </span>
                    <span className="font-light truncate hidden sm:inline">
                      {(() => {
                        const formattedDate = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
                        return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                      })()}
                    </span>
                    <span className="font-light truncate sm:hidden text-xs">
                      {format(selectedDate, 'd MMM', { locale: fr })}
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleClose(false)}
                    className="text-white/50 hover:text-white transition-colors"
                    aria-label="Close modal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                      <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-b border-white/10 mx-4 md:mx-6"></div>

        {/* Scrollable Body */}
        <div 
          className="flex-1 min-h-0 px-4 md:px-6 py-4 md:py-6"
        >
          <div className="workout-modal-content w-full flex min-h-0">
            {/* Main Content */}
            <div className="workout-modal-main flex-1 min-h-0 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="block text-xs md:text-sm font-extralight text-white/50">
                  Nom de la séance
                </label>
                <div className="relative flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 448 512" 
                    className="absolute left-3 md:left-[14px] h-3.5 w-3.5 md:h-4 md:w-4 pointer-events-none flex-shrink-0"
                    style={{ color: '#d4845a' }}
                    fill="currentColor"
                  >
                    <path d="M160.5-26.4c9.3-7.8 23-7.5 31.9 .9 12.3 11.6 23.3 24.4 33.9 37.4 13.5 16.5 29.7 38.3 45.3 64.2 5.2-6.8 10-12.8 14.2-17.9 1.1-1.3 2.2-2.7 3.3-4.1 7.9-9.8 17.7-22.1 30.8-22.1 13.4 0 22.8 11.9 30.8 22.1 1.3 1.7 2.6 3.3 3.9 4.8 10.3 12.4 24 30.3 37.7 52.4 27.2 43.9 55.6 106.4 55.6 176.6 0 123.7-100.3 224-224 224S0 411.7 0 288c0-91.1 41.1-170 80.5-225 19.9-27.7 39.7-49.9 54.6-65.1 8.2-8.4 16.5-16.7 25.5-24.2zM225.7 416c25.3 0 47.7-7 68.8-21 42.1-29.4 53.4-88.2 28.1-134.4-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5-17.3-22.1-49.1-62.4-65.3-83-5.4-6.9-15.2-8-21.5-1.9-18.3 17.8-51.5 56.8-51.5 104.3 0 68.6 50.6 109.2 113.7 109.2z"/>
                  </svg>
                  <Input
                    placeholder="Saisir le nom de la séance"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full pl-9 md:pl-[42px] pr-3 md:pr-[14px] py-2.5 md:py-3 rounded-[10px] border-0 bg-[rgba(0,0,0,0.5)] text-white text-xs md:text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 h-10 md:h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs md:text-sm font-extralight text-white/50">
                  Date de la séance
                </label>
                <div 
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="relative rounded-[10px] flex items-center cursor-pointer w-full px-3 md:px-[14px] py-2.5 md:py-3 bg-[rgba(0,0,0,0.5)] h-10 md:h-[44px]"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 448 512" 
                    className="h-3.5 w-3.5 md:h-4 md:w-4 pointer-events-none mr-2 md:mr-3 flex-shrink-0"
                    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    fill="currentColor"
                  >
                    <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z"/>
                  </svg>
                  {/* Custom Display */}
                  <div className="flex-1 text-xs md:text-sm text-white font-normal">
                    {sessionDate ? (
                      (() => {
                        const [year, month, day] = format(sessionDate, 'yyyy-MM-dd').split('-');
                        return `${day}/${month}/${year}`;
                      })()
                    ) : (
                      <span className="text-[rgba(255,255,255,0.25)]">Date de la séance</span>
                    )}
                  </div>
                  
                  {/* Native Input */}
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={sessionDate ? format(sessionDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (nextValue) {
                        setSessionDate(parseISO(nextValue));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Description removed as per coach request */}

              <div className="space-y-4">
              {exercises.map((exercise, exerciseIndex) => (
                <div 
                  key={exercise.id} 
                  ref={(el) => {
                    if (el) {
                      exerciseRefs.current[exercise.id] = el;
                    } else {
                      delete exerciseRefs.current[exercise.id];
                    }
                  }}
                  className="rounded-[12px] overflow-hidden bg-[rgba(0,0,0,0.3)]"
                  style={{
                    willChange: 'transform'
                  }}
                >
                  {/* Exercise Header */}
                  <div className="flex items-center justify-between p-3 md:p-4 bg-[rgba(0,0,0,0.2)]">
                    <div 
                      onClick={(e) => {
                        handleReplaceExercise(exerciseIndex);
                        // Force blur immediately to remove hover state
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.blur();
                        }
                      }}
                      className={`flex items-center flex-1 py-1 pl-2 pr-1 rounded-lg border-0 cursor-pointer transition-colors min-w-0 ${
                        replacingExerciseIndex === exerciseIndex 
                          ? 'bg-[rgba(255,255,255,0.10)]' 
                          : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.10)]'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                        <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z"/>
                      </svg>
                      <span className="text-[var(--tw-ring-offset-color)] font-normal text-base md:text-lg ml-2 md:ml-3 truncate">{exercise.name}</span>
                      <div className="hidden sm:flex gap-1 md:gap-1.5 flex-wrap ml-2 md:ml-[14px]">
                        {exercise.tags && exercise.tags.map((tag, tagIndex) => {
                          const tagStyle = getTagColor(tag);
                          return (
                            <span 
                              key={tagIndex} 
                              className="px-2 py-0.5 rounded-full text-xs font-light"
                              style={tagStyle}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updatedExercises = [...exercises];
                          updatedExercises[exerciseIndex].useRir = !exercise.useRir;
                          // Réinitialiser toutes les valeurs de poids à 0 (ou vide) lors du changement de mode
                          updatedExercises[exerciseIndex].sets = updatedExercises[exerciseIndex].sets.map(set => ({
                            ...set,
                            weight: ''
                          }));
                          setExercises(updatedExercises);
                        }}
                        className={`ml-auto py-1 px-2 md:px-3 rounded-[8px] text-xs md:text-sm font-normal transition-colors flex items-center gap-1 md:gap-1.5 flex-shrink-0 ${
                          exercise.useRir
                            ? 'bg-[rgba(212,132,89,0.2)] text-[#d4845a] hover:bg-[rgba(212,132,89,0.3)]'
                            : 'bg-white/10 text-white/50 hover:text-[#d4845a] hover:bg-white/15'
                        }`}
                        title={exercise.useRir ? "Passer en mode Charge" : "Passer en mode RPE"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 fill-current">
                          <path d="M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9S384 204.9 384 192l0-32-32 0c-10.1 0-19.6 4.7-25.6 12.8l-32.4 43.2-40-53.3 21.2-28.3C293.3 110.2 321.8 96 352 96l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6zM154 296l40 53.3-21.2 28.3C154.7 401.8 126.2 416 96 416l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c10.1 0 19.6-4.7 25.6-12.8L154 296zM438.6 470.6c-9.2 9.2-22.9 11.9-34.9 6.9S384 460.9 384 448l0-32-32 0c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8l-64 0c-17.7 0-32-14.3-32-32S14.3 96 32 96l64 0c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8l32 0 0-32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"/>
                        </svg>
                        <span className="hidden sm:inline">{exercise.useRir ? 'RPE' : 'Charge'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-0 px-0">
                      <div className="flex items-center gap-0" style={{ paddingLeft: '6px', paddingRight: '6px' }}>
                        <button
                          type="button"
                          onClick={() => moveExerciseUp(exerciseIndex)}
                          disabled={exerciseIndex === 0}
                          className="text-white/40 hover:text-[#d4845a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors px-1 py-1.5 rounded"
                          title="Monter l'exercice"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor">
                            <path d="M169.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L192 205.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExerciseDown(exerciseIndex)}
                          disabled={exerciseIndex === exercises.length - 1}
                          className="text-white/40 hover:text-[#d4845a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors py-1.5 pl-1 pr-1 rounded"
                          title="Descendre l'exercice"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor">
                            <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                          </svg>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-white/10"></div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="text-white/40 hover:text-[#d4845a] transition-colors py-1.5 pl-2.5 pr-2.5 rounded"
                        title="Supprimer l'exercice"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-4 w-4" fill="currentColor">
                          <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Exercise Table */}
                  {exercise.isExpanded && (
                    <div className="bg-[rgba(0,0,0,0.2)] p-3 md:p-4">
                      {/* Table Container with Scroll */}
                      <div className="exercise-sets-container overflow-x-auto -mx-3 md:-mx-4 px-3 md:px-4">
                        <table className="w-full text-xs md:text-sm min-w-[500px]">
                          <thead className="sticky top-0 z-10">
                            <tr className="text-white/50 text-xs font-extralight">
                              <th className="text-center pb-[10px] font-extralight w-16" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Série</th>
                              <th className="text-center pb-[10px] font-extralight min-w-24" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <button 
                                      type="button"
                                      className="flex items-center justify-center gap-1 hover:text-[#d4845a] transition-colors cursor-pointer mx-auto pl-3"
                                      style={{ color: 'rgba(255, 255, 255, 0.25)' }}
                                    >
                                      <span>{exercise.sets[0]?.repType === 'hold' ? 'Hold' : 'Reps'}</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-3 w-3" fill="currentColor">
                                        <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                                      </svg>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent 
                                    align="start" 
                                    sideOffset={5} 
                                    disablePortal={true}
                                    className="rounded-lg shadow-2xl z-[9999]"
                                    style={{
                                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                      backdropFilter: 'blur(10px)',
                                      borderColor: 'rgba(255, 255, 255, 0.15)',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      marginLeft: '12px'
                                    }}
                                  >
                                    <DropdownMenuItem onClick={() => handleChangeAllRepTypes(exerciseIndex, 'reps')}>
                                      Reps
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleChangeAllRepTypes(exerciseIndex, 'hold')}>
                                      Hold
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </th>
                              <th className="text-center pb-[10px] font-extralight min-w-24" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>{exercise.useRir ? 'RPE' : 'Charge'}</th>
                              {hasPreviousRpeData() && (
                                <th className="text-center pb-[10px] font-extralight min-w-24" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                                  {exercise.useRir ? 'Charge précédente' : 'RPE précédent'}
                                </th>
                              )}
                              <th className="text-center pb-[10px] font-extralight min-w-24" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Repos</th>
                              <th className="text-center pb-[10px] font-extralight w-20" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Vidéo</th>
                              <th className="pb-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercise.sets.map((set, setIndex) => (
                              <tr key={setIndex} className={`group border-t border-white/5 hover:bg-white/5 transition-colors ${setIndex === exercise.sets.length - 1 ? 'border-b border-white/5' : ''}`}>
                                <td className="py-1.5 text-sm text-center font-normal text-white/25 w-16">{set.serie}</td>
                                <td className="py-1.5 min-w-24">
                                  {set.repType === 'hold' ? (
                                    <div 
                                      className="relative flex items-center justify-center mx-auto w-[82px]"
                                      onMouseEnter={(e) => {
                                        const input = e.currentTarget.querySelector('input');
                                        if (input) {
                                          input.style.borderStyle = 'solid';
                                          input.style.borderWidth = '0.5px';
                                          input.style.borderColor = '#d4845a';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        const input = e.currentTarget.querySelector('input');
                                        if (input && document.activeElement !== input) {
                                          input.style.borderStyle = 'none';
                                          input.style.borderWidth = '0px';
                                          input.style.borderColor = 'transparent';
                                        }
                                      }}
                                    >
                                      <Input
                                        type="text"
                                        value={set.reps || ''}
                                        maxLength={8}
                                        onChange={(e) => {
                                          const inputValue = e.target.value.slice(0, 8);
                                          const previousValue = set.reps || '';
                                          
                                          // Allow empty string
                                          if (inputValue === '') {
                                            handleSetChange(exerciseIndex, setIndex, 'reps', '');
                                            return;
                                          }
                                          
                                          // Prevent deleting 's' at the end - if user tries to delete 's', restore it
                                          let cleanValue = inputValue.replace(/s/gi, '');
                                          
                                          // If previous value was "0s" or "0" and user types a digit, replace the 0
                                          if ((previousValue === '0s' || previousValue === '0') && /^\d$/.test(cleanValue)) {
                                            handleSetChange(exerciseIndex, setIndex, 'reps', cleanValue + 's');
                                            return;
                                          }
                                          
                                          // Check if it contains colon (MM:SS format) - don't add 's' for this format
                                          if (cleanValue.includes(':')) {
                                            const parts = cleanValue.split(':');
                                            if (parts.length === 2) {
                                              const minutes = parseInt(parts[0], 10);
                                              const seconds = parseInt(parts[1], 10);
                                              if (!isNaN(minutes) && !isNaN(seconds) && minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds < 60) {
                                                handleSetChange(exerciseIndex, setIndex, 'reps', cleanValue);
                                              }
                                            }
                                            return;
                                          }
                                          
                                          // Allow only digits - always add 's' at the end
                                          if (/^\d+$/.test(cleanValue)) {
                                            const numValue = parseInt(cleanValue, 10);
                                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 9999) {
                                              // Store with 's' appended
                                              handleSetChange(exerciseIndex, setIndex, 'reps', cleanValue + 's');
                                            }
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          const input = e.target;
                                          const cursorPosition = input.selectionStart;
                                          const value = input.value;
                                          
                                          const allowedKeys = [
                                            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
                                            'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'
                                          ];
                                          
                                          // Prevent deleting 's' at the end
                                          if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPosition === value.length && value.endsWith('s')) {
                                            e.preventDefault();
                                            // Move cursor before 's' to allow deleting the number
                                            input.setSelectionRange(value.length - 1, value.length - 1);
                                            return;
                                          }
                                          
                                          // Prevent typing at the end if it would overwrite 's'
                                          if (cursorPosition === value.length && value.endsWith('s') && !value.includes(':')) {
                                            if (/^\d$/.test(e.key)) {
                                              // Allow digits but insert before 's', limit to 8 characters
                                              e.preventDefault();
                                              const newValue = (value.slice(0, -1) + e.key + 's').slice(0, 8);
                                              handleSetChange(exerciseIndex, setIndex, 'reps', newValue);
                                              setTimeout(() => {
                                                input.setSelectionRange(newValue.length - 1, newValue.length - 1);
                                              }, 0);
                                              return;
                                            }
                                          }
                                          
                                          if (allowedKeys.includes(e.key)) {
                                            return;
                                          }
                                          
                                          // Allow digits and ':' (but not 's')
                                          if (/^\d$/.test(e.key) || e.key === ':') {
                                            return;
                                          }
                                          
                                          e.preventDefault();
                                        }}
                                        placeholder="40s"
                                        className="text-white text-sm text-center h-8 w-[82px] mx-auto rounded-[8px] focus:outline-none pt-[2px] pb-[2px] transition-colors"
                                        onFocus={(e) => {
                                          const input = e.target;
                                          const value = input.value;
                                          // If value is "0s", select the "0" so it can be easily replaced
                                          if (value === '0s') {
                                            setTimeout(() => {
                                              input.setSelectionRange(0, 1);
                                            }, 0);
                                          } else if (value.endsWith('s') && !value.includes(':')) {
                                            // If value ends with 's' (but not "0s"), position cursor before 's'
                                            setTimeout(() => {
                                              input.setSelectionRange(value.length - 1, value.length - 1);
                                            }, 0);
                                          }
                                          e.target.style.borderStyle = 'solid';
                                          e.target.style.borderWidth = '0.5px';
                                          e.target.style.borderColor = '#d4845a';
                                        }}
                                        onBlur={(e) => {
                                          e.target.style.borderStyle = 'none';
                                          e.target.style.borderWidth = '0px';
                                          e.target.style.borderColor = 'transparent';
                                          // Ensure 's' is always present when blurring (if not empty and not MM:SS format)
                                          const value = e.target.value;
                                          if (value && !value.includes(':') && !value.endsWith('s')) {
                                            handleSetChange(exerciseIndex, setIndex, 'reps', value + 's');
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className="flex items-center justify-center w-[82px] mx-auto"
                                      onMouseEnter={(e) => {
                                        const input = e.currentTarget.querySelector('input');
                                        if (input) {
                                          input.style.borderStyle = 'solid';
                                          input.style.borderWidth = '0.5px';
                                          input.style.borderColor = '#d4845a';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        const input = e.currentTarget.querySelector('input');
                                        if (input && document.activeElement !== input) {
                                          input.style.borderStyle = 'none';
                                          input.style.borderWidth = '0px';
                                          input.style.borderColor = 'transparent';
                                        }
                                      }}
                                    >
                                      <Input
                                        type="text"
                                        value={set.reps || ''}
                                        maxLength={8}
                                        onChange={(e) => {
                                          // Allow any character - free text input, limit to 8 characters
                                          const value = e.target.value.slice(0, 8);
                                          handleSetChange(exerciseIndex, setIndex, 'reps', value);
                                        }}
                                        placeholder=""
                                        className="text-white text-sm text-center h-8 w-[82px] mx-auto rounded-[8px] focus:outline-none pt-[2px] pb-[2px] !pl-1.5 !pr-1.5 transition-colors"
                                        onFocus={(e) => {
                                          e.target.style.borderStyle = 'solid';
                                          e.target.style.borderWidth = '0.5px';
                                          e.target.style.borderColor = '#d4845a';
                                        }}
                                        onBlur={(e) => {
                                          e.target.style.borderStyle = 'none';
                                          e.target.style.borderWidth = '0px';
                                          e.target.style.borderColor = 'transparent';
                                        }}
                                      />
                                    </div>
                                  )}
                                </td>
                                <td className="py-1.5 min-w-24">
                                  <div 
                                    className="relative flex items-center justify-center mx-auto w-20"
                                    onMouseEnter={(e) => {
                                      const input = e.currentTarget.querySelector('input');
                                      if (input) {
                                        input.style.borderStyle = 'solid';
                                        input.style.borderWidth = '0.5px';
                                        input.style.borderColor = '#d4845a';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const input = e.currentTarget.querySelector('input');
                                      if (input && document.activeElement !== input) {
                                        input.style.borderStyle = 'none';
                                        input.style.borderWidth = '0px';
                                        input.style.borderColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <Input
                                      type={exercise.useRir ? "number" : "text"}
                                      step={exercise.useRir ? "1" : undefined}
                                      maxLength={exercise.useRir ? undefined : 5}
                                      value={set.weight}
                                      onChange={(e) => {
                                        let value = e.target.value;
                                        if (exercise.useRir) {
                                          // En mode RPE, seulement des nombres entiers (pas de virgule/point)
                                          // Limité entre 1 et 10
                                          value = value.replace(/[,.]/g, '');
                                          if (value === '' || value === '-') {
                                            handleSetChange(exerciseIndex, setIndex, 'weight', value);
                                            return;
                                          }
                                          const numValue = parseInt(value, 10);
                                          if (!isNaN(numValue) && numValue >= 1) {
                                            // Limiter entre 1 et 10
                                            const limitedValue = Math.min(10, Math.max(1, numValue));
                                            handleSetChange(exerciseIndex, setIndex, 'weight', limitedValue.toString());
                                          } else if (numValue === 0 || value === '') {
                                            // Allow empty but don't allow 0
                                            if (value === '') {
                                              handleSetChange(exerciseIndex, setIndex, 'weight', '');
                                            }
                                            // If user typed 0, don't update (invalid RPE)
                                          }
                                        } else {
                                          // En mode Charge, permettre texte libre, limité à 5 caractères
                                          const limitedValue = value.slice(0, 5);
                                          handleSetChange(exerciseIndex, setIndex, 'weight', limitedValue);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (exercise.useRir) {
                                          const input = e.target;
                                          const currentValue = input.value || '';
                                          
                                          // Empêcher la saisie de virgule, point et autres caractères non numériques
                                          if (e.key === ',' || e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                                            e.preventDefault();
                                            return;
                                          }
                                          
                                          // Empêcher la saisie de 0 seul
                                          if (e.key === '0' && currentValue === '') {
                                            e.preventDefault();
                                            return;
                                          }
                                          
                                          // Si l'input a déjà une valeur, empêcher d'ajouter des chiffres qui dépasseraient 10
                                          if (/^\d$/.test(e.key) && currentValue !== '') {
                                            const newValue = parseInt(currentValue + e.key, 10);
                                            if (newValue > 10) {
                                              e.preventDefault();
                                              return;
                                            }
                                          }
                                        }
                                      }}
                                      placeholder=""
                                      className={`text-white text-sm text-center h-8 w-20 rounded-[8px] focus:outline-none pt-[2px] pb-[2px] ${exercise.useRir ? '' : 'pr-6'} transition-colors`}
                                      onFocus={(e) => {
                                        e.target.style.borderStyle = 'solid';
                                        e.target.style.borderWidth = '0.5px';
                                        e.target.style.borderColor = '#d4845a';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderStyle = 'none';
                                        e.target.style.borderWidth = '0px';
                                        e.target.style.borderColor = 'transparent';
                                      }}
                                    />
                                    {!exercise.useRir && (
                                      <span className="absolute right-2 text-white/25 text-sm font-normal pointer-events-none">kg</span>
                                    )}
                                  </div>
                                </td>
                                {hasPreviousRpeData() && (
                                  <td className="py-1.5 min-w-24">
                                    <div className="flex items-center justify-center">
                                      {set.previousRpe && set.previousRpe !== null && set.previousRpe !== undefined ? (
                                        <div 
                                          className="flex items-center justify-center px-2 py-1 rounded"
                                          title={exercise.useRir 
                                            ? `Charge renseignée lors de la séance précédente: ${set.previousRpe}kg`
                                            : `RPE renseigné lors de la séance précédente: ${set.previousRpe}`
                                          }
                                        >
                                          <span className="text-[#d4845a] text-sm font-normal">
                                            {exercise.useRir ? `${set.previousRpe}kg` : set.previousRpe}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-white/25 text-sm font-light">-</span>
                                    )}
                                  </div>
                                </td>
                                )}
                                <td className="py-1.5 min-w-24">
                                  <div
                                    className="flex items-center justify-center"
                                    onMouseEnter={(e) => {
                                      const input = e.currentTarget.querySelector('input');
                                      if (input) {
                                        input.style.borderStyle = 'solid';
                                        input.style.borderWidth = '0.5px';
                                        input.style.borderColor = '#d4845a';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const input = e.currentTarget.querySelector('input');
                                      if (input && document.activeElement !== input) {
                                        input.style.borderStyle = 'none';
                                        input.style.borderWidth = '0px';
                                        input.style.borderColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <Input
                                      type="text"
                                      value={set.rest}
                                      onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'rest', e.target.value)}
                                      placeholder="03:00"
                                      className="text-white text-sm text-center h-8 w-20 mx-auto rounded-[8px] focus:outline-none placeholder:text-white/30 transition-colors"
                                      onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                          e.preventDefault();
                                          const currentValue = set.rest || '00:00';
                                          const parts = currentValue.split(':');
                                          if (parts.length === 2) {
                                            const minutes = parseInt(parts[0], 10) || 0;
                                            const seconds = parseInt(parts[1], 10) || 0;
                                            const totalSeconds = minutes * 60 + seconds;
                                            
                                            // Add or subtract 1 minute (60 seconds)
                                            const newTotalSeconds = e.key === 'ArrowUp' 
                                              ? totalSeconds + 60 
                                              : Math.max(0, totalSeconds - 60);
                                            
                                            const newMinutes = Math.floor(newTotalSeconds / 60);
                                            const newSeconds = newTotalSeconds % 60;
                                            
                                            // Format as MM:SS with leading zeros
                                            const formattedValue = `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
                                            handleSetChange(exerciseIndex, setIndex, 'rest', formattedValue);
                                          }
                                        }
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderStyle = 'solid';
                                        e.target.style.borderWidth = '0.5px';
                                        e.target.style.borderColor = '#d4845a';
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderStyle = 'none';
                                        e.target.style.borderWidth = '0px';
                                        e.target.style.borderColor = 'transparent';
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="py-1.5 w-20" style={{ textAlign: 'center' }}>
                                  <div className="flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetChange(exerciseIndex, setIndex, 'video', !set.video);
                                      }}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors border-border hover:border-primary ${
                                        set.video
                                          ? 'bg-primary border-primary text-primary-foreground'
                                          : ''
                                      }`}
                                      style={{
                                        borderWidth: '1px',
                                        borderColor: set.video ? undefined : 'rgba(255, 255, 255, 0.1)'
                                      }}
                                    >
                                      {set.video && (
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className="py-1.5 text-center pr-[10px]">
                                  {exercise.sets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                                      className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-[#d4845a] transition-all p-1 rounded"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-3 w-3" fill="currentColor">
                                        <path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/>
                                      </svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Controls Row: Charge par main checkbox, Tempo input, Ajouter une série */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-4 pt-0">
                        {/* Left side: Charge par main checkbox and Tempo input */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-[12px] w-full sm:w-auto">
                          {/* Charge par main checkbox */}
                          <div className="flex items-center gap-2 md:gap-[8px] h-[29px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updatedExercises = [...exercises];
                                updatedExercises[exerciseIndex].per_side = !exercise.per_side;
                                setExercises(updatedExercises);
                              }}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors border-border hover:border-primary cursor-pointer ${
                                exercise.per_side
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : ''
                              }`}
                              style={{
                                borderWidth: '1px',
                                borderColor: exercise.per_side ? undefined : 'rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {exercise.per_side && (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              )}
                            </button>
                            <label 
                              onClick={(e) => {
                                e.stopPropagation();
                                const updatedExercises = [...exercises];
                                updatedExercises[exerciseIndex].per_side = !exercise.per_side;
                                setExercises(updatedExercises);
                              }}
                              className="text-[11px] md:text-[12px] font-light text-white/50 cursor-pointer whitespace-nowrap leading-[29px]"
                            >
                              Charge par main
                            </label>
                          </div>
                          
                          {/* Tempo input */}
                          <Input
                            type="text"
                            value={exercise.tempo || ''}
                            onChange={(e) => {
                              let value = e.target.value;
                              
                              // Si l'utilisateur supprime ou modifie, permettre l'édition libre
                              // Filtrer pour n'accepter que les chiffres et les tirets
                              value = value.replace(/[^0-9-]/g, '');
                              
                              // Si l'utilisateur tape uniquement des chiffres, formater automatiquement
                              const digitsOnly = value.replace(/-/g, '');
                              
                              // Limiter à 4 chiffres maximum
                              if (digitsOnly.length > 4) {
                                const limitedDigits = digitsOnly.slice(0, 4);
                                // Formater en x-x-x-x
                                value = `${limitedDigits[0]}-${limitedDigits[1]}-${limitedDigits[2]}-${limitedDigits[3]}`;
                              } else if (digitsOnly.length > 0) {
                                // Formater progressivement selon le nombre de chiffres
                                const digits = digitsOnly.split('');
                                if (digits.length === 1) {
                                  value = digits[0];
                                } else if (digits.length === 2) {
                                  value = `${digits[0]}-${digits[1]}`;
                                } else if (digits.length === 3) {
                                  value = `${digits[0]}-${digits[1]}-${digits[2]}`;
                                } else if (digits.length === 4) {
                                  value = `${digits[0]}-${digits[1]}-${digits[2]}-${digits[3]}`;
                                }
                              } else {
                                // Si vide, permettre la suppression
                                value = '';
                              }
                              
                              const updatedExercises = [...exercises];
                              updatedExercises[exerciseIndex].tempo = value;
                              setExercises(updatedExercises);
                              
                              // Mettre à jour la bordure selon si une valeur est présente (seulement si le champ n'est pas en focus)
                              const inputElement = e.target;
                              if (document.activeElement !== inputElement) {
                                inputElement.style.borderStyle = 'none';
                                inputElement.style.borderWidth = '0px';
                                inputElement.style.borderColor = 'rgba(0, 0, 0, 0)';
                                inputElement.style.borderImage = 'none';
                              }
                            }}
                            onKeyDown={(e) => {
                              // Permettre toutes les touches de navigation et suppression
                              if (e.key === 'Backspace' || e.key === 'Delete' || 
                                  e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                                  e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
                                  e.key === 'Tab' || e.key === 'Enter' ||
                                  e.key === 'Home' || e.key === 'End' ||
                                  (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))) {
                                return; // Laisser le comportement par défaut
                              }
                              
                              // Empêcher uniquement les caractères non numériques
                              if (!/[0-9]/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onFocus={(e) => {
                              // Sélectionner tout le texte pour faciliter la modification
                              e.target.select();
                              if (!e.target.value) {
                                e.target.placeholder = 'X-X-X-X';
                              }
                              // Ajouter la bordure orange au focus
                              e.target.style.borderStyle = 'none';
                              e.target.style.borderWidth = '0px';
                              e.target.style.borderColor = 'rgba(0, 0, 0, 0)';
                              e.target.style.borderImage = 'none';
                            }}
                            onBlur={(e) => {
                              if (!e.target.value) {
                                e.target.placeholder = 'Tempo';
                                // Restaurer la bordure par défaut si vide
                                e.target.style.borderStyle = 'none';
                                e.target.style.borderWidth = '0px';
                                e.target.style.borderColor = 'rgba(0, 0, 0, 0)';
                                e.target.style.borderImage = 'none';
                              } else {
                                // Garder une bordure blanche visible si une valeur est présente
                                e.target.style.borderStyle = 'none';
                                e.target.style.borderWidth = '0px';
                                e.target.style.borderColor = 'rgba(0, 0, 0, 0)';
                                e.target.style.borderImage = 'none';
                              }
                            }}
                            placeholder="Tempo"
                            className="bg-[rgba(255,255,255,0.05)] rounded-[8px] text-white text-[12px] md:text-[12px] font-[400] px-[11px] py-[4px] h-[29px] w-[95px] focus:outline-none focus:ring-1 focus:ring-[#d4845a] placeholder:text-[rgba(255,255,255,0.5)] placeholder:font-[300] transition-colors duration-200 text-center"
                          />
                        </div>

                        {/* Right side: Ajouter une série button */}
                        <button
                          type="button"
                          onClick={() => handleAddSet(exerciseIndex)}
                          className="text-[10px] md:text-[11px] font-normal py-1.5 md:py-1 px-3 md:px-2 rounded-md transition-colors duration-200 bg-white/5 border whitespace-nowrap sm:ml-auto hover:bg-[rgba(212,132,90,0.25)] w-full sm:w-auto"
                          style={{ 
                            fontFamily: "'Inter', sans-serif",
                            color: 'var(--kaiylo-primary-hex)',
                            borderColor: 'var(--kaiylo-primary-hex)',
                            borderWidth: '1px'
                          }}
                        >
                          Ajouter une série
                        </button>
                      </div>

                      {/* Notes Input */}
                      <Input
                        value={exercise.notes}
                        onChange={(e) => {
                          const updatedExercises = [...exercises];
                          updatedExercises[exerciseIndex].notes = e.target.value;
                          setExercises(updatedExercises);
                        }}
                        placeholder="Ajouter une note pour cet exercice"
                        className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-transparent focus-visible:ring-0 mt-4"
                        onFocus={(e) => {
                          e.target.style.borderStyle = 'none';
                          e.target.style.borderWidth = '0px';
                          e.target.style.borderColor = 'transparent';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderStyle = 'none';
                          e.target.style.borderWidth = '0px';
                          e.target.style.borderColor = 'transparent';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Exercise Selector */}
            {showExerciseSelector && (
              <div className="px-4 pb-4">
                <div className="bg-[rgba(0,0,0,0.3)] rounded-[10px]">
                  <div className="relative border-b border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" aria-hidden="true" fill="currentColor">
                      <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376C296.3 401.1 253.9 416 208 416 93.1 416 0 322.9 0 208S93.1 0 208 0 416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
                    </svg>
                    <Input
                      type="text"
                      placeholder="Choisir un exercice"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 bg-transparent border-none text-white placeholder:text-white/30 h-12 text-sm focus-visible:ring-0 focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowExerciseSelector(false);
                        setSearchTerm('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors text-sm"
                    >
                      Annuler
                    </button>
                  </div>

                  {/* Exercise List */}
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredExercises.map(exercise => (
                        <div
                          key={exercise.id}
                          onClick={() => handleAddExercise(exercise)}
                          className="px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-normal text-white text-sm">{exercise.title}</div>
                            {exercise.tags && exercise.tags.length > 0 && (
                              <div className="flex gap-1.5">
                                {exercise.tags.map(tag => {
                                  const tagStyle = getTagColor(tag);
                                  return (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-full text-xs font-light"
                                      style={tagStyle}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {exercise.description && (
                            <div className="text-xs text-white/50 mt-1 font-extralight">
                              {exercise.description}
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredExercises.length === 0 && (
                        <div className="p-4 text-center text-white/40 text-sm font-extralight">
                          Aucun exercice trouvé
                        </div>
                      )}
                    </div>
                </div>
              </div>
            )}

            {/* Add Exercise Button */}
            {!showExerciseSelector && (
              <div className="pt-0 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowExerciseSelector(true)}
                  className="w-full sm:w-auto px-6 md:px-8 bg-[rgba(212,132,90,0.15)] hover:bg-[rgba(212,132,90,0.25)] text-[#d4845a] py-2.5 md:py-3 rounded-[10px] flex items-center justify-center gap-2 transition-colors font-normal text-xs md:text-sm focus:outline-none focus-visible:ring-0"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Ajouter exercice
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-0">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] order-3 sm:order-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] order-2"
              >
                <span className="hidden sm:inline">Publier comme brouillon</span>
                <span className="sm:hidden">Brouillon</span>
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors order-1 sm:order-3"
                style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
              >
                Publier
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Exercise Library Modal - Adjacent panel on the left */}
        {openSheet && (
          <ExerciseLibraryModal
            isOpen={openSheet}
            onClose={handleCloseLibrary}
            position={libraryPosition}
            exercises={availableExercises}
            onSelect={handleAddExerciseToSession}
            onCreateClick={handleCreateClick}
            loading={libraryLoading}
            onExerciseUpdated={handleExerciseUpdated}
            onEditExercise={handleEditExercise}
            focusSearch={replacingExerciseIndex !== null}
          />
        )}
    </BaseModal>
    
    {/* Add Exercise Modal */}
    <AddExerciseModal
      isOpen={isAddExerciseModalOpen}
      onClose={() => {
        setIsAddExerciseModalOpen(false);
        setEditingExercise(null);
      }}
      onExerciseCreated={handleExerciseCreated}
      onExerciseUpdated={handleExerciseUpdated}
      editingExercise={editingExercise}
      existingExercises={availableExercises}
    />

    {/* Unsaved Changes Warning Modal */}
    <UnsavedChangesWarningModal
      isOpen={showUnsavedWarning}
      onClose={handleCancelQuit}
      onConfirm={handleConfirmQuit}
    />

    {/* Student Preview Modal */}
    {showStudentPreview && exercises.length > 0 && (() => {
      const firstExercise = exercises[0];
      const sets = firstExercise.sets || [];
      
      return (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4 z-[10000]" onClick={() => setShowStudentPreview(false)}>
            <div 
              className="text-white rounded-[27px] w-full max-w-[375px] max-h-[92vh] overflow-y-auto overflow-x-hidden shadow-xl bg-[#0a0a0a]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec titre */}
              <div className="px-12 pt-8 pb-0">
                <div className="mb-6">
                  {/* Navigation et titre */}
                  <div className="flex items-center justify-between mb-[7px]">
                    <h1 className="text-[25px] font-normal text-[#d4845a] leading-normal text-left flex-1">
                      {firstExercise.name}
                    </h1>
                    <button
                      onClick={() => setShowStudentPreview(false)}
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-[15px] items-start w-full">
                    {/* Tempo et Charge par main - Affichés si définis par le coach */}
                    {(firstExercise.tempo || firstExercise.per_side) && (
                      <div className="flex flex-col gap-[15px] items-start">
                        <p className="text-[12px] font-light text-white/50">
                          {firstExercise.tempo ? `Tempo : ${firstExercise.tempo}` : ''}
                          {firstExercise.tempo && firstExercise.per_side ? ' | ' : ''}
                          {firstExercise.per_side ? 'Charge par main' : ''}
                        </p>
                      </div>
                    )}
                    
                    {/* Points d'avancement */}
                    {exercises.length > 0 && (
                      <div className="flex items-center gap-2">
                        {exercises.map((_, exIndex) => (
                          <div
                            key={exIndex}
                            className={`w-[5px] h-[5px] rounded-full transition-colors duration-200 ${
                              exIndex === 0 ? 'bg-[#d4845a]' : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#d4845a] transition-all duration-300"
                        style={{ width: `${(1 / exercises.length) * 100}%` }}
                      />
                    </div>
                    
                    {/* Icônes information et commentaire */}
                    <div className="flex gap-[10px] items-center">
                      <div className="w-5 h-5 flex items-center justify-center rounded-full cursor-not-allowed opacity-50">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 512 512"
                          className="w-5 h-5 text-white/25"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM224 160a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-8 64l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24z"/>
                        </svg>
                      </div>
                      <div className="cursor-pointer relative w-5 h-5 flex items-center justify-center opacity-50">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 512 512"
                          className="w-5 h-5 text-white/25"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M51.9 384.9C19.3 344.6 0 294.4 0 240 0 107.5 114.6 0 256 0S512 107.5 512 240 397.4 480 256 480c-36.5 0-71.2-7.2-102.6-20L37 509.9c-3.7 1.6-7.5 2.1-11.5 2.1-14.1 0-25.5-11.4-25.5-25.5 0-4.3 1.1-8.5 3.1-12.2l48.8-89.4zm37.3-30.2c12.2 15.1 14.1 36.1 4.8 53.2l-18 33.1 58.5-25.1c11.8-5.1 25.2-5.2 37.1-.3 25.7 10.5 54.2 16.4 84.3 16.4 117.8 0 208-88.8 208-192S373.8 48 256 48 48 136.8 48 240c0 42.8 15.1 82.4 41.2 114.7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commentaire coach */}
              <div className="px-12 mb-6">
                <div className="flex flex-col gap-[7px] items-start w-full">
                  <p className="text-[10px] font-normal text-white/35 leading-normal">
                    Commentaire coach :
                  </p>
                  <p className="text-[10px] text-white/25 leading-normal">
                    Aucun commentaire pour le moment
                  </p>
                </div>
              </div>

              {/* Liste des séries */}
              <div className="pl-6 pr-12 space-y-[10px] pb-6">
                {/* Headers - Positionnés au-dessus des séries */}
                <div className="flex items-center mb-2">
                  <div className="w-[20px] flex-shrink-0 mr-1" />
                  <div className="rounded-[5px] flex items-center px-[15px] pr-[30px] flex-1 min-w-[200px] max-w-[400px]">
                    <div className="flex items-center w-full gap-3">
                      <div className="w-[42px] flex justify-center items-center flex-shrink-0">
                        <p className="text-[8px] font-normal text-white/25 leading-none">
                          {(() => {
                            const repType = sets[0]?.repType || 'reps';
                            if (repType === 'hold') {
                              return 'Hold';
                            }
                            return 'Rep.';
                          })()}
                        </p>
                      </div>
                      <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                        <p className="text-[8px] font-normal text-white/25 leading-none">{firstExercise.useRir ? 'RPE' : 'Charge'}</p>
                      </div>
                      <div className="flex-1 flex justify-center items-center gap-[15px]">
                        <div className="w-[17px] h-[17px]" />
                        <div className="w-[17px] h-[17px]" />
                      </div>
                      <div className="w-[24px] flex justify-center items-center flex-shrink-0">
                        <p className="text-[8px] font-normal text-white/25 leading-none text-center w-full">
                          {firstExercise.useRir ? 'Charge' : 'RPE'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-[24px] flex-shrink-0 ml-[10px]" />
                </div>
                {/* Header icône vidéo */}
                <div className="flex items-center mb-2">
                  <div className="w-[20px] flex-shrink-0 mr-1" />
                  <div className="rounded-[5px] flex items-center px-[15px] pr-[30px] flex-1 min-w-[200px] max-w-[400px]" />
                  <div className="w-[24px] flex-shrink-0 ml-[10px]" />
                </div>

                {/* Séries */}
                {sets.map((set, setIndex) => {
                  const setNumber = setIndex + 1;
                  const weight = set.weight ?? '';
                  const repType = set.repType || 'reps';
                  let reps = '?';
                  if (repType === 'hold') {
                    const repsValue = set.reps || '';
                    if (repsValue.includes(':')) {
                      reps = repsValue;
                    } else {
                      reps = repsValue ? (repsValue.endsWith('s') ? repsValue : `${repsValue}s`) : '0s';
                    }
                  } else {
                    reps = set.reps || '?';
                  }

                  return (
                    <div key={setIndex} className="flex items-center">
                      {/* Numéro de série - À l'extérieur de la box */}
                      <span className="text-[10px] text-white/50 w-[20px] flex-shrink-0 mr-1">{setNumber}</span>
                      <div 
                        className="bg-white/10 rounded-[5px] flex items-center px-[15px] pr-[30px] py-[13px] flex-1 min-w-[200px] max-w-[400px] hover:bg-white/10 transition-colors"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <div className="flex items-center w-full gap-3">
                          {/* Colonne Rep - Centrée */}
                          <div className="w-[42px] flex justify-center items-center flex-shrink-0 overflow-hidden">
                            <span className="text-white leading-none whitespace-nowrap" style={{ fontSize: reps.length > 8 ? '10px' : reps.length > 6 ? '11px' : reps === 'AMRAP' ? '12px' : '15px' }}>{reps}</span>
                          </div>
                          {/* Colonne Charge/RPE - Centrée */}
                          <div className="w-[50px] flex justify-center items-center flex-shrink-0">
                            {firstExercise.useRir ? (
                              <span className="text-[15px] text-[#d4845a] leading-none">
                                {weight || '-'}
                              </span>
                            ) : (
                              <span className="text-[15px] text-[#d4845a] leading-none flex items-center gap-[3px]">
                                {weight}
                                {weight && weight.toString().match(/^\d+\.?\d*$/) ? <span className="text-[12px] font-normal">kg</span> : null}
                              </span>
                            )}
                          </div>
                          {/* Boutons de validation - Centrés */}
                          <div className="flex-1 flex justify-center items-center gap-[15px]">
                            <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] bg-white/15">
                              <svg width="10" height="7" viewBox="0 0 10 7" fill="none" className="flex-shrink-0">
                                <path 
                                  d="M1 3.5L3.5 6L9 1" 
                                  stroke="#FFF" 
                                  strokeWidth="1.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  strokeOpacity="0.25"
                                />
                              </svg>
                            </div>
                            <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center p-[4px] bg-white/15">
                              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className="flex-shrink-0">
                                <path 
                                  d="M5 12L12 5M5 5L12 12" 
                                  stroke="white" 
                                  strokeOpacity="0.25" 
                                  strokeWidth="1.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </div>
                          {/* Input RPE / Charge */}
                          <div className={`${firstExercise.useRir ? 'w-auto min-w-[45px]' : 'w-[24px]'} flex justify-center items-center`}>
                            <div className="flex justify-center items-center w-full">
                              {firstExercise.useRir ? (
                                // Si coach demande RPE : l'élève saisit une charge
                                <div className="relative flex items-center gap-[2px]">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value=""
                                    readOnly
                                    disabled
                                    className="w-[22px] h-[18px] bg-transparent border-0 border-b-[0.5px] border-white/25 rounded-none text-[9px] font-medium text-center transition-colors focus:outline-none focus:border-[#d4845a] cursor-not-allowed text-white/50"
                                    style={{ 
                                      padding: '0',
                                      fontSize: '9px',
                                      lineHeight: 1
                                    }}
                                  />
                                  <span className="text-[8px] text-white/25 font-normal leading-none">kg</span>
                                </div>
                              ) : (
                                // Si coach demande charge : l'élève saisit un RPE
                                <button
                                  disabled
                                  className="bg-white/5 border-[0.5px] border-white/25 rounded-[5px] w-[18px] h-[18px] flex items-center justify-center transition-colors opacity-50 cursor-not-allowed"
                                >
                                  <span className="text-[9px] font-medium leading-none text-white/50">
                                    {''}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Icône vidéo - À l'extérieur de la box - 4 états */}
                      <div className="relative flex-shrink-0 ml-[10px]">
                        {(() => {
                          const videoEnabled = set.video === true || set.video === 1 || set.video === 'true';
                          // En prévisualisation, on simule qu'aucune vidéo n'a été uploadée
                          const hasVideoOrNoVideo = false;
                          
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (videoEnabled) {
                                  setSelectedSetForVideo(prev => ({
                                    ...prev,
                                    0: setIndex
                                  }));
                                  setVideoUploadExerciseIndex(0);
                                  setIsVideoModalOpen(true);
                                }
                              }}
                              disabled={!videoEnabled}
                              className={`w-[24px] h-[24px] min-w-[24px] max-w-[24px] flex items-center justify-center rounded-full transition-all duration-200 ${
                                // État 1: Coach ne demande pas de vidéo - visible mais disabled
                                !videoEnabled
                                  ? 'bg-white/5 opacity-50 cursor-not-allowed'
                                  : // État 2: Vidéo requise mais pas renseignée - orange
                                  !hasVideoOrNoVideo
                                  ? 'bg-[#d4845a] hover:bg-[#e87c3e] cursor-pointer'
                                  : // État 3 & 4: Vidéo renseignée (uploadée ou "pas de vidéo") - grisé mais cliquable
                                  'bg-white/10 hover:bg-white/20 cursor-pointer'
                              }`}
                              title={
                                !videoEnabled
                                  ? "Vidéo non requise"
                                  : "⚠️ Vidéo requise - Cliquez pour ajouter"
                              }
                            >
                              {/* Icône caméra barrée */}
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                <path fillRule="evenodd" clipRule="evenodd" d="M0 3.75C0 3.35218 0.158035 2.97064 0.43934 2.68934C0.720644 2.40804 1.10218 2.25 1.5 2.25H7.125C7.48882 2.24996 7.84025 2.38214 8.11386 2.62195C8.38746 2.86175 8.56459 3.19282 8.61225 3.5535L10.9447 2.517C11.0589 2.46613 11.184 2.4446 11.3086 2.45436C11.4332 2.46413 11.5534 2.50488 11.6583 2.57292C11.7631 2.64096 11.8493 2.73412 11.909 2.84394C11.9687 2.95376 11.9999 3.07676 12 3.20175V8.79825C11.9999 8.92314 11.9686 9.04603 11.909 9.15576C11.8493 9.26549 11.7632 9.35859 11.6585 9.42661C11.5537 9.49463 11.4336 9.53541 11.3091 9.54526C11.1846 9.55511 11.0596 9.53371 10.9455 9.483L8.61225 8.4465C8.56459 8.80718 8.38746 9.13825 8.11386 9.37805C7.84025 9.61786 7.48882 9.75004 7.125 9.75H1.5C1.10218 9.75 0.720644 9.59196 0.43934 9.31066C0.158035 9.02936 0 8.64782 0 8.25V3.75ZM8.625 7.63125L11.25 8.79825V3.20175L8.625 4.36875V7.63125ZM1.5 3C1.30109 3 1.11032 3.07902 0.96967 3.21967C0.829018 3.36032 0.75 3.55109 0.75 3.75V8.25C0.75 8.44891 0.829018 8.63968 0.96967 8.78033C1.11032 8.92098 1.30109 9 1.5 9H7.125C7.32391 9 7.51468 8.92098 7.65533 8.78033C7.79598 8.63968 7.875 8.44891 7.875 8.25V3.75C7.875 3.55109 7.79598 3.36032 7.65533 3.21967C7.51468 3.07902 7.32391 3 7.125 3H1.5Z" 
                                  fill={!videoEnabled ? "#9CA3AF" : !hasVideoOrNoVideo ? "white" : "#9CA3AF"} 
                                  fillOpacity={!videoEnabled ? "0.4" : !hasVideoOrNoVideo ? "1" : "0.6"}
                                />
                                {/* Ligne de barré - affichée pour les états 1, 3 et 4 */}
                                {(!videoEnabled || hasVideoOrNoVideo) && (
                                  <line 
                                    x1="1" 
                                    y1="1" 
                                    x2="11" 
                                    y2="11" 
                                    stroke={!videoEnabled ? "#9CA3AF" : "#9CA3AF"} 
                                    strokeWidth="1.5" 
                                    strokeOpacity={!videoEnabled ? "0.4" : "0.6"} 
                                    strokeLinecap="round"
                                  />
                                )}
                              </svg>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bouton Fermer */}
              <div className="px-12 pb-8">
                <button
                  onClick={() => setShowStudentPreview(false)}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-normal text-sm rounded-[10px] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      );
    })()}

    {/* Video Upload Modal for Student Preview */}
    {showStudentPreview && exercises.length > 0 && (() => {
      const activeExerciseIndex = videoUploadExerciseIndex ?? 0;
      const activeSetIndex = selectedSetForVideo[activeExerciseIndex] ?? 0;
      const activeExercise = exercises[activeExerciseIndex];
      const activeSet = activeExercise?.sets?.[activeSetIndex];
      
      return (
        <WorkoutVideoUploadModal
          key={`upload-modal-preview-${activeExerciseIndex}-${activeSetIndex}`}
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          onUploadSuccess={() => {
            // En prévisualisation, on ne fait rien mais on ferme la modale
            setIsVideoModalOpen(false);
          }}
          onDeleteVideo={() => {
            // En prévisualisation, on ne fait rien mais on ferme la modale
            setIsVideoModalOpen(false);
          }}
          exerciseInfo={{
            exerciseName: activeExercise?.name || 'Exercice',
            exerciseId: activeExercise?.exerciseId,
            exerciseIndex: activeExerciseIndex
          }}
          setInfo={{
            setIndex: activeSetIndex,
            setNumber: activeSetIndex + 1
          }}
          existingVideo={null}
        />
      );
    })()}

    </>
  );
};

export default CreateWorkoutSessionModal;