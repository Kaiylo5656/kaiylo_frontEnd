import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Plus, Trash2, MoreHorizontal, Search, Menu, User, GripVertical, ChevronUp, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import ContainedSideSheet from './ui/ContainedSideSheet';
import ExerciseLibraryPanel from './exercises/ExerciseLibraryPanel';
import AddExerciseModal from './AddExerciseModal';
import ExerciseDetailModal from './ExerciseDetailModal';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';
import { getApiBaseUrlWithApi } from '../config/api';

const CreateWorkoutSessionModal = ({ isOpen, onClose, selectedDate, onSessionCreated, studentId, existingSession }) => {
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  // Exercise Library Side Sheet State
  const [openSheet, setOpenSheet] = useState(false);
  const [libraryMode, setLibraryMode] = useState('browse'); // 'browse' or 'create'
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  
  // Exercise Detail Modal State
  const [showExerciseDetailModal, setShowExerciseDetailModal] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState(null);

  // Modal management
  const { isTopMost } = useModalManager();
  const modalId = 'create-workout-session';

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchExercises();
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Pre-fill form when editing existing session
  useEffect(() => {
    if (isOpen && existingSession) {
      setSessionName(existingSession.title || '');
      setDescription(existingSession.description || '');
      
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
            video: set.video || false
          }));
        } else {
          // Default sets if none exist or not an array
          sets = [
            { serie: 1, weight: '', reps: '', rest: '03:00', video: false }
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
          tempo: ex.tempo || ''
        };
      }) || [];
      
      setExercises(formExercises);
    } else if (isOpen && !existingSession) {
      // Reset form for new session
      setSessionName('');
      setDescription('');
      setExercises([]);
    }
  }, [isOpen, existingSession]);

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
        { serie: 1, weight: '', reps: '', rest: '03:00', video: false }
      ],
      notes: '',
      isExpanded: true,
      tempo: ''
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
    const newSetNumber = updatedExercises[exerciseIndex].sets.length + 1;
    updatedExercises[exerciseIndex].sets.push({
      serie: newSetNumber,
      weight: '',
      reps: '',
      rest: '03:00',
      video: false
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

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updatedExercises);
  };

  const toggleExerciseExpanded = (exerciseIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].isExpanded = !updatedExercises[exerciseIndex].isExpanded;
    setExercises(updatedExercises);
  };

  // Exercise reordering functions
  const moveExerciseUp = (index) => {
    if (index > 0) {
      const updatedExercises = [...exercises];
      [updatedExercises[index], updatedExercises[index - 1]] = [updatedExercises[index - 1], updatedExercises[index]];
      setExercises(updatedExercises);
    }
  };

  const moveExerciseDown = (index) => {
    if (index < exercises.length - 1) {
      const updatedExercises = [...exercises];
      [updatedExercises[index], updatedExercises[index + 1]] = [updatedExercises[index + 1], updatedExercises[index]];
      setExercises(updatedExercises);
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
      title: sessionName.trim() || `Séance du ${format(selectedDate, 'dd/MM/yyyy')}`,
      description: description.trim(),
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        tags: ex.tags,
        sets: ex.sets.map(set => ({
          serie: set.serie,
          weight: parseFloat(set.weight) || 0,
          reps: parseInt(set.reps) || 0,
          rest: set.rest,
          video: set.video
        })),
        notes: ex.notes,
        tempo: ex.tempo
      })),
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      student_id: studentId,
      status: status, // 'published' or 'draft'
      // Include existing session info if editing
      ...(existingSession && {
        existingSessionId: existingSession.workoutSessionId || existingSession.id, // Use workoutSessionId for draft sessions
        assignmentId: existingSession.assignmentId, // Include assignmentId for assigned sessions
        isEdit: true
      })
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
      handleClose();
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

  const handleClose = () => {
    // Don't close if AddExerciseModal is open
    if (isAddExerciseModalOpen) {
      return;
    }
    
    setSessionName('');
    setDescription('');
    setExercises([]);
    setSearchTerm('');
    setShowExerciseSelector(false);
    setShowSidebar(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setOpenSheet(false);
    setLibraryMode('browse');
    onClose();
  };

  // Exercise Library Functions
  const handleOpenLibrary = () => {
    setOpenSheet(true);
    setLibraryMode('browse');
  };

  const handleCloseLibrary = () => {
    setOpenSheet(false);
    setLibraryMode('browse');
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
        { serie: 1, weight: '', reps: '', rest: '03:00', video: false }
      ],
      notes: '',
      isExpanded: true,
      tempo: ''
    };
    
    setExercises([...exercises, newExercise]);
    handleCloseLibrary();
  };


  const handleCreateClick = () => {
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
      
      // Add the new exercise to the available exercises list
      setAvailableExercises(prev => [...prev, result.exercise]);
      
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
      
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Failed to update exercise. Please try again.');
    } finally {
      setLibraryLoading(false);
    }
  };

  // Exercise Detail Modal Handlers
  const handleExerciseDetailOpen = (exercise) => {
    console.log('Opening exercise detail for:', exercise.title);
    setSelectedExerciseForDetail(exercise);
    setShowExerciseDetailModal(true);
  };

  const handleExerciseDetailClose = () => {
    setShowExerciseDetailModal(false);
    setSelectedExerciseForDetail(null);
  };

  const handleAddToSessionFromDetail = (exercise) => {
    // Call the same handler as the library's Ajouter button
    handleAddExerciseToSession(exercise);
    // Keep the modal open by default, but could add a toast here
  };

  const filteredExercises = availableExercises.filter(exercise =>
    exercise.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      modalId={modalId}
      zIndex={60}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="2xl"
      noPadding={true}
      className="!p-0 relative mx-auto w-full max-w-[1100px] max-h-[92vh] overflow-hidden flex flex-col"
    >
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">
                {existingSession ? 'Modifier la séance' : 'Nom de la séance'}
              </h2>
              <p className="text-xs text-gray-400">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenLibrary}
                className="p-2 bg-[#F2785C] rounded-lg hover:brightness-110 transition-all duration-200 hover:scale-105"
                title="Bibliothèque d'exercices"
              >
                <BookOpen className="h-5 w-5 text-black/90" />
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 bg-[#262626] rounded-lg hover:bg-[#404040] transition-all duration-200 hover:scale-105"
                title="Agencement des exercices"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className={`workout-modal-content ${openSheet ? 'w-1/2' : 'w-full'} transition-all duration-300 flex min-h-0`}>
            {/* Main Content */}
            <div className="workout-modal-main flex-1 min-h-0">
              <div className="py-2 space-y-2">
                <label className="text-sm font-semibold text-white/90 tracking-wide uppercase">
                  Nom de la séance
                </label>
                <Input
                  placeholder="Saisir le nom de la séance"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="bg-[#1f1f1f] border border-[#3a3a3a] text-white placeholder-gray-400 text-base rounded-lg px-4 py-3 focus-visible:ring-2 focus-visible:ring-[#F2785C] focus-visible:border-transparent transition-all duration-150 shadow-sm"
                />
              </div>

              {/* Description removed as per coach request */}

              <div className="space-y-4">
              {exercises.map((exercise, exerciseIndex) => (
                <div 
                  key={exercise.id} 
                  className={`rounded-lg overflow-hidden transition-all duration-200 ${
                    draggedIndex === exerciseIndex 
                      ? 'bg-[#2a2a2a] opacity-50' 
                      : dragOverIndex === exerciseIndex 
                        ? 'bg-[#2a2a2a]' 
                        : 'bg-[#1a1a1a]'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, exerciseIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, exerciseIndex)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, exerciseIndex)}
                >
                  {/* Exercise Header */}
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a]">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      <span className="text-white font-medium">{exercise.name}</span>
                      <div className="flex gap-1 flex-wrap">
                        {exercise.tags && exercise.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                            tag.toLowerCase() === 'pull' ? 'bg-orange-500' :
                            tag.toLowerCase() === 'push' ? 'bg-green-500' :
                            tag.toLowerCase() === 'legs' ? 'bg-purple-500' :
                            'bg-gray-500'
                          }`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showSidebar && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveExerciseUp(exerciseIndex)}
                            disabled={exerciseIndex === 0}
                            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Monter l'exercice"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExerciseDown(exerciseIndex)}
                            disabled={exerciseIndex === exercises.length - 1}
                            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Descendre l'exercice"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-600"></div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exercise.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer l'exercice"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Exercise Table */}
                  {exercise.isExpanded && (
                    <div className="bg-[#0a0a0a] p-3">
                      {/* Table Container with Scroll */}
                      <div className="exercise-sets-container overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                            <tr className="text-gray-400 text-xs">
                              <th className="text-left pb-2">Série</th>
                              <th className="text-center pb-2">Charge (kg)</th>
                              <th className="text-center pb-2">Reps</th>
                              <th className="text-center pb-2">Repos</th>
                              <th className="text-center pb-2">Vidéo</th>
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercise.sets.map((set, setIndex) => (
                              <tr key={setIndex} className="border-t border-[#262626]">
                                <td className="py-2 text-white">{set.serie}</td>
                                <td className="py-2">
                                  <Input
                                    type="number"
                                    step="1"
                                    value={set.weight}
                                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)}
                                    placeholder=""
                                    className="bg-[#262626] border-none text-white text-center h-8 w-16 mx-auto"
                                  />
                                </td>
                                <td className="py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={set.reps}
                                    onChange={(e) => {
                                      const value = Math.max(0, Number(e.target.value));
                                      handleSetChange(exerciseIndex, setIndex, 'reps', value === 0 ? '' : value.toString());
                                    }}
                                    placeholder=""
                                    className="bg-[#262626] border-none text-white text-center h-8 w-12 mx-auto"
                                  />
                                </td>
                                <td className="py-2">
                                  <Input
                                    type="text"
                                    value={set.rest}
                                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'rest', e.target.value)}
                                    placeholder="03:00"
                                    className="bg-[#262626] border-none text-white text-center h-8 w-16 mx-auto"
                                  />
                                </td>
                                <td className="py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={set.video}
                                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'video', e.target.checked)}
                                    className="w-4 h-4 rounded bg-[#262626] border-gray-600 text-orange-500 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="py-2 text-right">
                                  {exercise.sets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Set Row */}
                      <div className="flex justify-end mt-3 pt-3 border-t border-[#262626]">
                        <button
                          type="button"
                          onClick={() => handleAddSet(exerciseIndex)}
                          className="text-sm text-[#e87c3e] hover:text-[#e87c3e]/80 flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
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
                        placeholder="Ajouter une note pour cette exercice"
                        className="bg-[#262626] border-none text-white placeholder-gray-500 mt-3"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Exercise Selector */}
            {showExerciseSelector && (
              <div className="px-4 pb-4">
                <div className="bg-[#1a1a1a] rounded-lg border border-[#262626]">
                  <div className="relative border-b border-[#262626]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Choisir un exercice"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-transparent border-none text-white placeholder-gray-500 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowExerciseSelector(false);
                        setSearchTerm('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      Annuler
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredExercises.map(exercise => (
                      <div
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="p-3 hover:bg-[#262626] cursor-pointer transition-colors border-b border-[#1a1a1a] last:border-b-0"
                      >
                        <div className="font-medium text-white">{exercise.title}</div>
                        {exercise.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {exercise.description}
                          </div>
                        )}
                        {exercise.tags && exercise.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {exercise.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-[#333] text-gray-300 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredExercises.length === 0 && (
                      <div className="p-4 text-center text-gray-400">
                        Aucun exercice trouvé
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Exercise Button */}
            {!showExerciseSelector && (
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => setShowExerciseSelector(true)}
                  className="w-full bg-[#6b4e2e] hover:bg-[#7a5a37] text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Ajouter exercice
                </button>
              </div>
            )}

            {/* Action Buttons - Inside scrollable area */}
            <div className="pt-6 pb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-xl transition-colors font-medium"
                >
                  Enregistrer comme brouillon
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="w-full bg-[#F2785C] hover:bg-[#e56d52] text-[#1D1D1F] py-3 rounded-xl transition-colors font-medium"
                >
                  Publier
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Exercise Arrangement */}
          <div className={`workout-sidebar-integrated ${!showSidebar ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-[#e87c3e]" />
                <h3 className="text-white font-medium">Agencement des exercices</h3>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-move transition-all duration-200 ${
                    draggedIndex === index 
                      ? 'bg-[#404040] opacity-50' 
                      : dragOverIndex === index 
                        ? 'bg-[#404040]' 
                        : 'bg-[#262626] hover:bg-[#333333]'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-[#e87c3e] cursor-move" />
                    <span className="text-white text-sm truncate">{exercise.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveExerciseUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Monter"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveExerciseDown(index)}
                      disabled={index === exercises.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Descendre"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              
              {exercises.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Aucun exercice ajouté
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
    </BaseModal>

    {/* Exercise Library Side Sheet - Alongside main content */}
    <ContainedSideSheet
      open={openSheet}
      onClose={handleCloseLibrary}
      title="Bibliothèque d'exercices"
      contained={true}
      sideBySide={true}
      zIndex={70}
      preventClose={isAddExerciseModalOpen}
    >
      <ExerciseLibraryPanel
        exercises={availableExercises}
        onSelect={handleAddExerciseToSession}
        onCreateClick={handleCreateClick}
        loading={libraryLoading}
        showPreview={false}
        onExerciseUpdated={handleExerciseUpdated}
        isOpen={openSheet}
        onExerciseDetailOpen={handleExerciseDetailOpen}
      />
    </ContainedSideSheet>
    
    {/* Add Exercise Modal */}
    <AddExerciseModal
      isOpen={isAddExerciseModalOpen}
      onClose={() => setIsAddExerciseModalOpen(false)}
      onExerciseCreated={handleExerciseCreated}
    />

    {/* Exercise Detail Modal - Rendered as Portal */}
    <ExerciseDetailModal
      isOpen={showExerciseDetailModal}
      onClose={handleExerciseDetailClose}
      exerciseId={selectedExerciseForDetail?.id}
      onAddToSession={handleAddToSessionFromDetail}
    />
    </>
  );
};

export default CreateWorkoutSessionModal;