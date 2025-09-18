import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Filter, Edit, Trash2, Check } from 'lucide-react';

const ExerciseManagement = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    tags: []
  });

  // Available tag colors for display
  const tagColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800', 
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800'
  ];

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

  const getTagColor = (tag) => {
    switch (tag.toLowerCase()) {
      case 'pull':
        return 'bg-orange-500 text-white';
      case 'push':
        return 'bg-green-500 text-white';
      case 'legs':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPrimaryTag = (exercise) => {
    // Determine primary tag based on muscle groups or title
    const title = exercise.title?.toLowerCase() || '';
    const muscleGroups = exercise.muscleGroups || [];
    
    if (title.includes('traction') || title.includes('pull') || muscleGroups.includes('Back')) {
      return 'Pull';
    }
    if (title.includes('dips') || title.includes('push') || muscleGroups.includes('Chest')) {
      return 'Push';
    }
    if (title.includes('squat') || title.includes('leg') || muscleGroups.includes('Legs')) {
      return 'Legs';
    }
    return 'Other';
  };

  // Filter exercises based on search term
  const filteredExercises = exercises.filter(exercise =>
    exercise.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.muscleGroups?.some(group => 
      group.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
        // Log the specific exercise we're interested in
        const targetExercise = data.exercises?.find(ex => ex.id === 'c79b9491-08b9-4e00-9d8b-68af6b76a9a4');
        if (targetExercise) {
          console.log('🎯 Target exercise after fetch:', {
            id: targetExercise.id,
            title: targetExercise.title,
            tags: targetExercise.tags
          });
        }
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle array inputs (muscle groups, equipment, tags)

  // Handle tag input
  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
        console.log('🏷️ Added tag:', newTag, 'Current tags:', [...formData.tags, newTag]);
      }
      e.target.value = '';
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    console.log('🏷️ removeTag called with:', tagToRemove);
    console.log('🏷️ Current formData.tags before removal:', formData.tags);
    setFormData(prev => {
      const newTags = prev.tags.filter(tag => tag !== tagToRemove);
      console.log('🏷️ Removed tag:', tagToRemove, 'Current tags:', newTags);
      return {
        ...prev,
        tags: newTags
      };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingExercise 
        ? `${getApiBaseUrlWithApi()}/exercises/${editingExercise.id}`
        : `${getApiBaseUrlWithApi()}/exercises`;
      
      const method = editingExercise ? 'PATCH' : 'POST';
      
      // Send both description and instructions fields
      const exerciseData = {
        title: formData.title,
        description: formData.description, // Send description field
        instructions: formData.instructions, // Send instructions field
        tags: formData.tags
      };
      
      console.log('📦 Frontend sending exerciseData:', exerciseData);
      console.log('📦 Tags being sent:', formData.tags);
      console.log('📦 Current formData:', formData);
      console.log('URL:', url);
      console.log('Method:', method);
      
      const token = localStorage.getItem('authToken');
      console.log('🔑 Auth Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exerciseData)
      });

      if (response.ok) {
        setShowForm(false);
        setEditingExercise(null);
        resetForm();
        fetchExercises();
      } else {
        const errorData = await response.text();
        console.error('Failed to save exercise:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
    }
  };

  // Edit exercise
  const handleEdit = (exercise) => {
    console.log('✏️ Editing exercise:', exercise);
    console.log('✏️ Exercise tags:', exercise.tags);
    setEditingExercise(exercise);
    setFormData({
      title: exercise.title,
      description: exercise.description || '', // Use description field if it exists
      instructions: exercise.instructions || '', // Use instructions field
      tags: exercise.tags || []
    });
    console.log('✏️ Form data set with tags:', exercise.tags || []);
    setShowForm(true);
  };

  // Delete exercise
  const handleDelete = async (exerciseId) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises/${exerciseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchExercises();
      } else {
        console.error('Failed to delete exercise');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  // Delete multiple exercises
  const handleDeleteMultiple = async () => {
    if (selectedExercises.length === 0) {
      return;
    }

    const exerciseCount = selectedExercises.length;
    const exerciseText = exerciseCount === 1 ? 'exercise' : 'exercises';
    
    if (!window.confirm(`Are you sure you want to delete ${exerciseCount} ${exerciseText}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // Delete exercises one by one
      const deletePromises = selectedExercises.map(exerciseId => 
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
        setSelectedExercises([]); // Clear selection
        fetchExercises();
      } else {
        console.error('Failed to delete some exercises');
        // Still refresh to show current state
        fetchExercises();
      }
    } catch (error) {
      console.error('Error deleting exercises:', error);
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
    setShowForm(false);
    setEditingExercise(null);
    resetForm();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Exercices</h1>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search exercice"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-input border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* New Button */}
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + New
          </button>
        </div>

        {/* Exercise Form */}
        {showForm && (
          <div className="bg-card rounded-lg border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Exercise Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Push-ups"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Brief description of the exercise..."
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Step-by-step instructions for performing the exercise..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  onKeyPress={handleTagInput}
                  placeholder="Press Enter to add tags..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-primary hover:text-primary/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-muted-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Exercise List */}
        <div className="bg-card rounded-lg border border-border">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center">
              <div className="flex items-center space-x-4 flex-1">
                {/* Select All Checkbox */}
                <button
                  onClick={handleSelectAll}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedExercises.length === filteredExercises.length && filteredExercises.length > 0
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {selectedExercises.length === filteredExercises.length && filteredExercises.length > 0 && (
                    <Check className="h-3 w-3" />
                  )}
                </button>
                <h3 className="text-lg font-semibold text-foreground">
                  Exercices ({filteredExercises.length})
                </h3>
                {/* Selection Info and Delete Button */}
                {selectedExercises.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedExercises.length} selected
                    </span>
                    <button
                      onClick={handleDeleteMultiple}
                      className="flex items-center space-x-1 px-3 py-1 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm text-muted-foreground">Tags</span>
              </div>
              <div className="flex-1"></div>
            </div>
          </div>

          {/* Exercise List */}
          <div className="divide-y divide-border">
            {filteredExercises.length === 0 && !loading ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No exercises found. Create your first exercise to get started!
              </div>
            ) : (
              filteredExercises.map(exercise => (
                <div key={exercise.id} className="px-6 py-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleSelectExercise(exercise.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedExercises.includes(exercise.id)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {selectedExercises.includes(exercise.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>

                      {/* Exercise Name */}
                      <div className="flex-1">
                        <h4 className="text-foreground font-medium">
                          {exercise.title}
                        </h4>
                      </div>
                    </div>

                    {/* Tag Column - Centered */}
                    <div className="flex-1 flex justify-center">
                      {exercise.tags && exercise.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {exercise.tags.map(tag => (
                            <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(getPrimaryTag(exercise))}`}>
                          {getPrimaryTag(exercise)}
                        </span>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex-1 flex justify-end">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(exercise)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseManagement;
