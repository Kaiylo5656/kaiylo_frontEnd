import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AddExerciseModal from '../components/AddExerciseModal';
import DeleteExerciseModal from '../components/DeleteExerciseModal';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import SortControl from '../components/SortControl';
import TagFilterDropdown from '../components/ui/TagFilterDropdown';
import useSortParams from '../hooks/useSortParams';
import { sortExercises, getSortDescription } from '../utils/exerciseSorting';
import { getTagColor, getTagColorMap } from '../utils/tagColors';
import { Search, Check } from 'lucide-react';

const ExerciseManagement = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [hoveredExerciseId, setHoveredExerciseId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [exercisesToDelete, setExercisesToDelete] = useState([]);
  const [deleting, setDeleting] = useState(false);
  
  // Sort state from URL
  const { sort, dir, updateSort } = useSortParams();
  
  // Accessibility announcement for sort changes
  const [sortAnnouncement, setSortAnnouncement] = useState('');
  
  // Wrapper for updateSort that includes accessibility announcement
  const handleSortChange = (newSort, newDir) => {
    updateSort(newSort, newDir);
    setSortAnnouncement(getSortDescription(newSort, newDir));
    
    // Clear announcement after a delay
    setTimeout(() => setSortAnnouncement(''), 1000);
  };

  // Helper functions
  const handleSelectExercise = (exerciseId) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExercises.length === filteredExercises.length) {
      setSelectedExercises([]);
    } else {
      setSelectedExercises(filteredExercises.map(ex => ex.id));
    }
  };

  // Handle tag selection from TagFilterDropdown
  const handleTagSelection = (selectedTags) => {
    setSelectedTagFilters(selectedTags);
  };

  // Extract all tags from exercises for the typeahead (including duplicates for counting)
  const availableTags = useMemo(() => {
    const allTags = exercises.flatMap(exercise => exercise.tags || []);
    console.log('🏷️ All tags (with duplicates for counting):', allTags);
    return allTags.filter(tag => tag && tag.trim() !== '');
  }, [exercises]);

  // Create a color map for all unique tags to ensure no duplicate colors
  const tagColorMap = useMemo(() => {
    const allTags = exercises.flatMap(exercise => exercise.tags || []);
    return getTagColorMap(allTags);
  }, [exercises]);

  // Filter exercises based on search term and tag filter
  // Filter and sort exercises with memoization
  const filteredAndSortedExercises = useMemo(() => {
    // First filter exercises
    const filtered = exercises.filter(exercise => {
      // Search term filter
      const matchesSearch = exercise.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscleGroups?.some(group => 
          group.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      // Tag filter - exercise must have ALL selected tags
      const matchesTag = selectedTagFilters.length === 0 || 
        (exercise.tags && selectedTagFilters.every(tag => exercise.tags.includes(tag)));
      
      return matchesSearch && matchesTag;
    });

    // Then sort the filtered results
    console.log('🔍 About to sort:', { sort, dir, filteredCount: filtered.length });
    if (sort === 'createdAt' && filtered.length > 0) {
      console.log('📅 Sample exercises before sorting:', filtered.slice(0, 3).map(ex => ({
        title: ex.title,
        created_at: ex.created_at,
        id: ex.id
      })));
    }
    const sorted = sortExercises(filtered, sort, dir);
    if (sort === 'createdAt' && sorted.length > 0) {
      console.log('📊 Sample exercises after sorting:', sorted.slice(0, 3).map(ex => ({
        title: ex.title,
        created_at: ex.created_at,
        id: ex.id
      })));
    }
    
    return sorted;
  }, [exercises, searchTerm, selectedTagFilters, sort, dir]);

  // Keep the old variable name for compatibility
  const filteredExercises = filteredAndSortedExercises;

  // Fetch exercises from backend
  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Fetched exercises:', data.exercises);
        
        // Debug: Check the first few exercises for created_at values
        console.log('🔍 First 5 exercises with created_at:', data.exercises?.slice(0, 5).map(ex => ({
          id: ex.id,
          title: ex.title,
          created_at: ex.created_at,
          updated_at: ex.updated_at
        })));
        
        // Backend returns { exercises: [...] }, so we need to extract the exercises array
        setExercises(data.exercises || []);
      } else {
        console.error('Failed to fetch exercises');
        setExercises([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };


  // Handle array inputs (muscle groups, equipment, tags)



  // Handle exercise creation from modal
  const handleSubmit = async (formData) => {
    try {
      const url = `${getApiBaseUrlWithApi()}/exercises`;
      
      const exerciseData = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        tags: formData.tags,
        demoVideoURL: formData.demoVideoURL
      };
      
      console.log('📦 Frontend sending exerciseData:', exerciseData);
      
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exerciseData)
      });

      if (response.ok) {
        fetchExercises();
      } else {
        const errorData = await response.text();
        console.error('Failed to save exercise:', response.status, errorData);
        throw new Error('Failed to save exercise');
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
      throw error;
    }
  };

  // Handle exercise update from modal
  const handleUpdate = async (exerciseId, formData) => {
    try {
      const url = `${getApiBaseUrlWithApi()}/exercises/${exerciseId}`;
      
      const exerciseData = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        tags: formData.tags,
        demoVideoURL: formData.demoVideoURL
      };
      
      console.log('📦 Frontend updating exerciseData:', exerciseData);
      
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exerciseData)
      });

      if (response.ok) {
        setEditingExercise(null);
        fetchExercises();
      } else {
        const errorData = await response.text();
        console.error('Failed to update exercise:', response.status, errorData);
        throw new Error('Failed to update exercise');
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  };

  // Handle row click to open detail modal
  const handleRowClick = (exercise) => {
    console.log('🔍 Opening detail modal for exercise:', exercise);
    console.log('🔍 Exercise ID:', exercise.id);
    setSelectedExerciseId(exercise.id);
    setShowDetailModal(true);
  };

  // Handle detail modal close
  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedExerciseId(null);
  };

  // Edit exercise
  const handleEdit = (exercise) => {
    console.log('✏️ Editing exercise:', exercise);
    console.log('✏️ Exercise tags:', exercise.tags);
    setEditingExercise(exercise);
    setShowModal(true);
  };

  // Delete exercise - opens confirmation modal
  const handleDelete = (exerciseId) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    setExerciseToDelete(exercise);
    setExercisesToDelete([]);
    setShowDeleteModal(true);
  };

  // Confirm delete single exercise
  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises/${exerciseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setExerciseToDelete(null);
        fetchExercises();
      } else {
        console.error('Failed to delete exercise');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Delete multiple exercises - opens confirmation modal
  const handleDeleteMultiple = () => {
    if (selectedExercises.length === 0) {
      return;
    }

    setExerciseToDelete(null);
    setExercisesToDelete(selectedExercises);
    setShowDeleteModal(true);
  };

  // Confirm delete multiple exercises
  const handleConfirmDeleteMultiple = async () => {
    if (exercisesToDelete.length === 0) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('authToken');
      
      // Delete exercises one by one
      const deletePromises = exercisesToDelete.map(exerciseId => 
        fetch(`${getApiBaseUrlWithApi()}/exercises/${exerciseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const responses = await Promise.all(deletePromises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        setShowDeleteModal(false);
        setExercisesToDelete([]);
        setSelectedExercises([]); // Clear selection
        fetchExercises();
      } else {
        console.error('Failed to delete some exercises');
        // Still refresh to show current state
        fetchExercises();
      }
    } catch (error) {
      console.error('Error deleting exercises:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      tags: []
    });
  };

  // Cancel form
  const handleCancel = () => {
    setShowModal(false);
    setEditingExercise(null);
    resetForm();
  };

  return (
    <div className="h-full text-foreground flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center z-10">
          <div 
            className="rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: '#d4845a',
              borderRightColor: '#d4845a',
              width: '40px',
              height: '40px'
            }}
          />
        </div>
      )}
      <div className="flex-shrink-0 pt-3 px-6 pb-0">
        {/* Search and Filter Bar */}
          <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center space-x-3">
              {/* Search Input */}
              <div className="relative font-light">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un exercice"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>
              
              {/* Filters Button */}
              <TagFilterDropdown
                tags={availableTags}
                selectedTags={selectedTagFilters}
                onTagsChange={handleTagSelection}
                placeholder="Rechercher un tag..."
              />

              {/* Sort Control */}
              <SortControl 
                sort={sort} 
                dir={dir} 
                onChange={handleSortChange}
              />

              {/* Delete Button - appears when exercises are selected */}
              {selectedExercises.length > 0 && (
                <button
                  onClick={handleDeleteMultiple}
                  className="flex items-center gap-[10px] bg-white/[0.03] border-[0.5px] border-white/0 px-[15px] py-[8px] rounded-[25px] hover:bg-white/[0.05] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-[16px] w-[16px] text-[#d4845a]">
                    <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                  </svg>
                  <span className="text-[16px] text-[#d4845a] font-normal">Supprimer</span>
                </button>
              )}
            </div>
          </div>

          {/* New Button */}
          <button
            onClick={() => {
              setEditingExercise(null); // Clear any editing state
              setShowModal(true);
            }}
            className="group bg-primary hover:bg-primary/90 text-primary-foreground font-normal pt-[7px] pb-[7px] px-5 rounded-[8px] transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 fill-current transition-transform duration-200 group-hover:rotate-45">
              <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/>
            </svg>
            Nouveau
          </button>
        </div>

      </div>

      {/* Exercise List Container - Scrollable */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="rounded-lg flex flex-col overflow-hidden h-full" style={{ backgroundColor: 'unset', border: 'none' }}>
          {/* Header */}
          <div className="px-6 py-3 shrink-0" style={{ borderBottom: 'none', maxWidth: '978px' }}>
            <div className="grid grid-cols-[400px_287px_1fr] items-center gap-6">
              <div className="flex items-center space-x-6">
                {/* Select All Checkbox */}
                <button
                  onClick={handleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedExercises.length === filteredExercises.length && filteredExercises.length > 0
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {selectedExercises.length === filteredExercises.length && filteredExercises.length > 0 && (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  )}
                </button>
                <h3 className="text-xs font-light text-foreground" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Exercices ({filteredExercises.length})
                </h3>
                {/* Selection Info */}
                {selectedExercises.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    {selectedExercises.length} sélectionné{selectedExercises.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                <span className="text-xs font-extralight text-muted-foreground pr-0 text-center" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Tags</span>
              </div>
              <div></div>
            </div>
          </div>

          {/* Exercise List - Scrollable */}
          <div className="overflow-y-auto flex-1 min-h-0 exercise-list-scrollbar">
            {filteredExercises.length === 0 && !loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="px-6 py-8 text-center font-light flex flex-col items-center gap-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                  {exercises.length === 0 ? (
                    <>
                      <span><span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucun exercice trouvé.</span><br /><span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Créez votre premier exercice pour commencer !</span></span>
                      <button 
                        onClick={() => {
                          setEditingExercise(null);
                          setShowModal(true);
                        }}
                        className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
                        style={{
                          backgroundColor: 'var(--kaiylo-primary-hex)',
                          color: 'var(--tw-ring-offset-color)'
                        }}
                      >
                        Ajoute ton premier exercice
                      </button>
                    </>
                  ) : (
                    <>
                      <span><span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucun exercice trouvé.</span><br /><span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Aucun exercice ne correspond à vos critères de recherche</span></span>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTagFilters([]);
                        }}
                        className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
                        style={{
                          backgroundColor: 'var(--kaiylo-primary-hex)',
                          color: 'var(--tw-ring-offset-color)'
                        }}
                      >
                        Effacer la recherche
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-[7px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {filteredExercises.map(exercise => {
                const isSelected = selectedExercises.includes(exercise.id);
                const isHovered = hoveredExerciseId === exercise.id;
                const backgroundColor = isSelected || isHovered 
                  ? 'rgba(255, 255, 255, 0.16)' 
                  : 'rgba(255, 255, 255, 0.04)';
                
                return (
                <div 
                  key={exercise.id} 
                  className="px-6 py-2 transition-colors cursor-pointer rounded-2xl"
                  style={{ 
                    backgroundColor: backgroundColor,
                    borderWidth: '0px',
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderStyle: 'none',
                    borderImage: 'none'
                  }}
                  onMouseEnter={() => setHoveredExerciseId(exercise.id)}
                  onMouseLeave={() => setHoveredExerciseId(null)}
                  onClick={(e) => {
                    // Don't open modal if clicking on checkbox or action buttons
                    if (e.target.closest('button')) return;
                    handleRowClick(exercise);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(exercise);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${exercise.title}`}
                >
                  <div className="grid grid-cols-[400px_287px_1fr] items-center gap-6">
                    <div className="flex items-center space-x-6">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectExercise(exercise.id);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          selectedExercises.includes(exercise.id)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : ''
                        }`}
                        style={{
                          borderWidth: '1px',
                          borderColor: isSelected ? undefined : 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {selectedExercises.includes(exercise.id) && (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        )}
                      </button>

                      {/* Exercise Name with Indicators */}
                      <div className="flex-1 flex items-center gap-2">
                        <h4 className="text-foreground font-light">
                          {exercise.title}
                        </h4>
                        {/* Instructions Indicator */}
                        <div className="flex items-center" title={exercise.instructions && exercise.instructions.trim() ? "Instructions renseignées" : "Aucune instruction"}>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 384 512" 
                            className="h-4 w-4"
                            style={{ 
                              fill: exercise.instructions && exercise.instructions.trim() 
                                ? 'rgba(212, 132, 89, 0.8)' 
                                : 'rgba(255, 255, 255, 0.2)' 
                            }}
                          >
                            <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
                          </svg>
                        </div>
                        {/* Video Indicator */}
                        <div className="flex items-center" title={exercise.demoVideoURL ? "Vidéo renseignée" : "Aucune vidéo"}>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 640 640" 
                            className="h-4 w-4"
                            style={{ 
                              fill: exercise.demoVideoURL 
                                ? 'rgba(212, 132, 89, 0.8)' 
                                : 'rgba(255, 255, 255, 0.2)' 
                            }}
                          >
                            <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Tag Column - Centered */}
                    <div className="flex justify-center">
                      {exercise.tags && exercise.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {exercise.tags.map(tag => {
                            const tagStyle = getTagColor(tag, tagColorMap);
                            return (
                              <span 
                                key={tag} 
                                className="px-3 py-1 rounded-full text-xs font-light"
                                style={tagStyle}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex justify-end">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(exercise);
                          }}
                          className="p-1 transition-colors group"
                          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                          }}
                          title="Edit exercise"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                            <path fill="currentColor" d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(exercise.id);
                          }}
                          className="p-1 transition-colors group"
                          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                          }}
                          title="Delete exercise"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                            <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExerciseCreated={handleSubmit}
        editingExercise={editingExercise}
        onExerciseUpdated={handleUpdate}
        existingExercises={exercises}
      />

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        isOpen={showDetailModal}
        onClose={handleDetailModalClose}
        exerciseId={selectedExerciseId}
        tagColorMap={tagColorMap}
      />

      {/* Delete Exercise Modal */}
      <DeleteExerciseModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setExerciseToDelete(null);
          setExercisesToDelete([]);
        }}
        onConfirm={exerciseToDelete ? handleConfirmDelete : handleConfirmDeleteMultiple}
        exerciseTitle={exerciseToDelete?.title}
        exerciseCount={exerciseToDelete ? 1 : exercisesToDelete.length}
        loading={deleting}
      />

      {/* Accessibility announcement for sort changes */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {sortAnnouncement}
      </div>
    </div>
  );
};

export default ExerciseManagement;
