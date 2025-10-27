import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Tag, Edit3 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import TagTypeahead from '../ui/TagTypeahead';
import ExerciseEditor from './ExerciseEditor';

const ExerciseLibraryPanel = ({ 
  exercises = [], 
  onSelect, 
  onCreateClick, 
  loading = false,
  showPreview = false,
  onExerciseUpdated,
  isOpen = false, // Add isOpen prop to track when the sheet opens/closes
  onExerciseDetailOpen // New prop to handle opening exercise details
}) => {
  // State machine for view management
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  
  
  // Filter state (persisted across view changes)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs for focus management
  const listHeadingRef = useRef(null);
  const lastFocusedItemRef = useRef(null);

  // Get unique tags from exercises
  const allTags = [...new Set(exercises.flatMap(ex => ex.tags || []))];

  // Reset to list view when sheet opens
  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelectedExerciseId(null);
      // Restore focus to list heading
      if (listHeadingRef.current) {
        listHeadingRef.current.focus();
      }
    }
  }, [isOpen]);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter exercises based on search term and selected tags
  useEffect(() => {
    let filtered = exercises;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exercise => 
        exercise.title?.toLowerCase().includes(term) ||
        exercise.instructions?.toLowerCase().includes(term) ||
        exercise.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filter by selected tags (ANY mode - exercise must have at least one selected tag)
    if (selectedTagFilters.length > 0) {
      filtered = filtered.filter(exercise => 
        exercise.tags?.some(tag => selectedTagFilters.includes(tag))
      );
    }

    setFilteredExercises(filtered);
  }, [exercises, searchTerm, selectedTagFilters]);

  const handleExerciseSelect = (exercise) => {
    onSelect(exercise);
  };

  const handleCardClick = (exercise, e) => {
    console.log('Card clicked:', exercise.title, e.target);
    
    // Check if the clicked element is a button or inside a button
    const clickedButton = e.target.closest('button');
    
    if (clickedButton) {
      console.log('Clicked on button, not opening modal');
      return; // Don't open modal if clicking on buttons
    }
    
    console.log('Opening detail modal for:', exercise.id);
    if (onExerciseDetailOpen) {
      onExerciseDetailOpen(exercise);
    }
  };


  const handleEditExercise = (exercise, e) => {
    e.stopPropagation();
    setView('edit');
    setSelectedExerciseId(exercise.id);
    // Store reference to the focused item for later restoration
    lastFocusedItemRef.current = e.target.closest('[data-exercise-id]');
  };

  const handleCreateClick = () => {
    setView('create');
    onCreateClick();
  };

  const handleSaveExercise = async (exerciseId, exerciseData) => {
    try {
      if (onExerciseUpdated) {
        await onExerciseUpdated(exerciseId, exerciseData);
      }
      // Return to list view after saving
      setView('list');
      setSelectedExerciseId(null);
      // Restore focus to the previously focused item or list heading
      if (lastFocusedItemRef.current) {
        lastFocusedItemRef.current.focus();
      } else if (listHeadingRef.current) {
        listHeadingRef.current.focus();
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

  const handleCancelEdit = () => {
    setView('list');
    setSelectedExerciseId(null);
    // Restore focus to the previously focused item or list heading
    if (lastFocusedItemRef.current) {
      lastFocusedItemRef.current.focus();
    } else if (listHeadingRef.current) {
      listHeadingRef.current.focus();
    }
  };

  // Get the exercise being edited
  const editingExercise = selectedExerciseId ? exercises.find(ex => ex.id === selectedExerciseId) : null;

  // Render based on current view
  if (view === 'edit' && editingExercise) {
    return (
      <div className="h-full">
        <ExerciseEditor
          exercise={editingExercise}
          onBack={isMobile ? handleCancelEdit : undefined}
          onSave={handleSaveExercise}
          onCancel={handleCancelEdit}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`h-full ${showPreview ? 'grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]' : 'flex flex-col'}`}>
        {/* Left Panel - Search */}
        <div className={`${showPreview ? 'border-r border-[#1a1a1a] bg-[#1a1a1a] min-h-0 overflow-y-auto' : 'bg-[#1a1a1a] min-h-0 overflow-y-auto flex-1'}`}>
          <div className="p-3">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-3">
              <div className="w-full bg-transparent outline-none text-sm placeholder:text-white/50 h-8 bg-gray-700 animate-pulse"></div>
            </div>
            <div className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm h-8 bg-gray-700 animate-pulse"></div>
          </div>
        </div>

        {/* Right Panel - Loading */}
        {showPreview && (
          <div className="min-w-0 overflow-y-auto p-4">
            <div className="text-sm text-white/70">Chargement des exercices...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`h-full ${showPreview ? 'grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]' : 'flex flex-col'}`}>
      {/* Left Panel - Search & Filters */}
      <div className={`${showPreview ? 'border-r border-[#1a1a1a] bg-[#1a1a1a] min-h-0 overflow-y-auto' : 'bg-[#1a1a1a] min-h-0 overflow-y-auto flex-1'}`}>
        <div className="p-3">
          {/* Search Input */}
          <div className="rounded-lg bg-[#262626] border border-[#404040] px-3 py-2 mb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un exercice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Tag Filter */}
          <TagTypeahead
            tags={allTags}
            selectedTags={selectedTagFilters}
            onTagsChange={setSelectedTagFilters}
            placeholder="Filtrer par tags..."
            className="mb-3"
          />

          {/* Create New Exercise Button */}
          <Button
            onClick={handleCreateClick}
            className="w-full rounded-lg bg-[#e87c3e] px-4 py-2 font-medium text-white hover:bg-[#d66d35] mt-3 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un nouvel exercice
          </Button>
        </div>

        {/* Exercise List */}
        <div className="p-3 pt-2 space-y-2">
          <h3 
            ref={listHeadingRef}
            className="text-sm font-medium text-white/70 mb-2"
            tabIndex={-1}
          >
            Exercices disponibles
          </h3>
          {filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              data-exercise-id={exercise.id}
              onClick={(e) => handleCardClick(exercise, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(exercise, e);
                }
              }}
              tabIndex={0}
              className="w-full rounded-lg border border-[#404040] bg-[#262626] hover:bg-[#404040] hover:border-[#F2785C]/30 focus:outline-none focus:ring-2 focus:ring-[#F2785C]/60 focus:border-[#F2785C]/50 px-3 py-3 text-left cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {exercise.title}
                  </div>
                  {exercise.instructions && (
                    <div className="text-white/40 text-xs mt-1 truncate">
                      {exercise.instructions}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleEditExercise(exercise, e)}
                    className="p-1 text-white/50 hover:text-[#F2785C] transition-colors"
                    title="Edit exercise"
                    aria-label="Edit exercise"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExerciseSelect(exercise);
                    }}
                    className="bg-[#e87c3e] text-white hover:bg-[#d66d35] text-xs px-3 py-1 rounded-lg font-medium"
                    aria-label="Add exercise to session"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              {exercise.tags && exercise.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {exercise.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-[#404040] px-2 py-0.5 text-[10px] text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {exercise.tags.length > 3 && (
                    <span className="text-[10px] text-white/50">
                      +{exercise.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredExercises.length === 0 && !loading && (
            <div className="text-center text-white/50 py-8">
              <div className="text-sm">
                {searchTerm || selectedTagFilters.length > 0 ? 'Aucun exercice trouvé' : 'Aucun exercice disponible'}
              </div>
              {!searchTerm && selectedTagFilters.length === 0 && (
                <Button
                  onClick={onCreateClick}
                  className="mt-3 bg-[#e87c3e] text-white hover:bg-[#d66d35]"
                >
                  Créer le premier exercice
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview/Empty State */}
      {showPreview && (
        <div className="min-w-0 overflow-y-auto p-4 bg-[#121212]">
          <div className="text-sm text-gray-400">
            Sélectionnez un exercice pour le prévisualiser ou créez-en un nouveau.
          </div>
        </div>
      )}

    </div>
  );
};

export default ExerciseLibraryPanel;
