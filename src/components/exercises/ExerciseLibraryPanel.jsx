import logger from '../../utils/logger';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Tag, Edit3 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import TagTypeahead from '../ui/TagTypeahead';
import ExerciseEditor from './ExerciseEditor';
import { getTagColor, getTagColorMap } from '../../utils/tagColors';

const ExerciseLibraryPanel = ({ 
  exercises = [], 
  onSelect, 
  onCreateClick, 
  loading = false,
  showPreview = false,
  onExerciseUpdated,
  isOpen = false, // Add isOpen prop to track when the sheet opens/closes
  onExerciseDetailOpen, // New prop to handle opening exercise details
  onEditExercise, // New prop to handle opening edit modal
  focusSearch = false // Prop to force focus on search input
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
  const searchInputRef = useRef(null);

  // Get all tags from exercises (including duplicates for proper counting)
  const allTags = exercises.flatMap(ex => ex.tags || []).filter(tag => tag && tag.trim() !== '');

  // Create a color map for all unique tags to ensure consistent colors
  const tagColorMap = useMemo(() => {
    const uniqueTags = [...new Set(allTags)];
    return getTagColorMap(uniqueTags);
  }, [allTags]);

  // Reset to list view when sheet opens and focus search input
  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelectedExerciseId(null);
    }
  }, [isOpen]);

  // Focus search input when sheet opens or when focusSearch changes
  useEffect(() => {
    if (isOpen) {
      // Focus search input when sheet opens
      // Use multiple timeouts to ensure the input is rendered and focusable
      const timeout1 = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select(); // Select text so user can type immediately
        }
      }, 100); // Initial delay
      
      // Fallback focus attempt
      const timeout2 = setTimeout(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 200);
      
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [isOpen, focusSearch]); // Also trigger when focusSearch changes

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

    // Filter by selected tags (ALL mode - exercise must have all selected tags)
    if (selectedTagFilters.length > 0) {
      filtered = filtered.filter(exercise => 
        exercise.tags && selectedTagFilters.every(tag => exercise.tags.includes(tag))
      );
    }

    setFilteredExercises(filtered);
  }, [exercises, searchTerm, selectedTagFilters]);

  const handleExerciseSelect = (exercise) => {
    onSelect(exercise);
  };

  const handleCardClick = (exercise, e) => {
    // Check if the clicked element is a button or inside a button
    const clickedButton = e.target.closest('button');
    
    if (clickedButton) {
      return; // Don't add exercise if clicking on buttons
    }
    
    // Remove focus immediately to prevent flash
    if (e.currentTarget && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur();
    }
    
    // Add exercise to session directly
    handleExerciseSelect(exercise);
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
      logger.error('Error updating exercise:', error);
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
        <div className={`${showPreview ? 'border-r border-[#1a1a1a] min-h-0 overflow-y-auto' : 'min-h-0 overflow-y-auto flex-1'}`}>
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
      <div className={`library-modal-scrollable-body ${showPreview ? 'border-r border-[#1a1a1a] min-h-0 overflow-y-auto' : 'min-h-0 overflow-y-auto flex-1'}`}>
        <div className="p-3">
          {/* Search Input with Tag Button */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher un exercice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-ring font-extralight"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>

            {/* Tag Filter Button */}
            <TagTypeahead
              tags={allTags}
              selectedTags={selectedTagFilters}
              onTagsChange={setSelectedTagFilters}
              placeholder="Filtrer par tags..."
              circularButton={true}
            />
          </div>

          {/* Create New Exercise Button */}
          <Button
            onClick={handleCreateClick}
            className="w-full rounded-lg bg-[#e87c3e] px-4 py-2 font-normal text-white hover:bg-[#d66d35] mt-3 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un nouvel exercice
          </Button>
        </div>

        {/* Exercise List */}
        <div className="p-3 pt-2 space-y-2">
          <h3 
            ref={listHeadingRef}
            className="text-sm font-extralight text-white/50 mb-2"
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
              className="w-full rounded-lg border-0 bg-black/25 hover:bg-[#404040] focus:outline-none active:outline-none px-4 py-3 text-left cursor-pointer transition-all duration-200"
              onMouseDown={(e) => {
                // Prevent default focus behavior on mousedown to avoid flash
                e.currentTarget.style.outline = 'none';
              }}
              onMouseUp={(e) => {
                // Remove outline if it appears
                e.currentTarget.style.outline = 'none';
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <div className="font-light text-white truncate">
                    {exercise.title}
                  </div>
                  {exercise.tags && exercise.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {exercise.tags.slice(0, 3).map((tag, index) => {
                        const tagStyle = getTagColor(tag, tagColorMap);
                        return (
                          <span
                            key={index}
                            className="rounded-full px-2 py-0.5 text-[10px]"
                            style={tagStyle}
                          >
                            {tag}
                          </span>
                        );
                      })}
                      {exercise.tags.length > 3 && (
                        <span className="text-[10px] text-white/50">
                          +{exercise.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditExercise) {
                        onEditExercise(exercise);
                      } else {
                        handleEditExercise(exercise, e);
                      }
                    }}
                    className="p-1 text-white/25 hover:text-[#e87c3e] transition-colors"
                    aria-label="Edit exercise"
                    title="Modifier l'exercice"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-4 w-4">
                      <path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L368 46.1 465.9 144 490.3 119.6c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L432 177.9 334.1 80 172.4 241.7zM96 64C43 64 0 107 0 160L0 416c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 64z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredExercises.length === 0 && !loading && (
            <div className="text-center text-white/50 py-8">
              <div className="text-sm font-extralight">
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
