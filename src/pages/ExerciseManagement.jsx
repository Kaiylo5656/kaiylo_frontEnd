import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ExerciseManagement = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    muscleGroups: [],
    equipment: [],
    difficulty: 'beginner',
    instructions: '',
    tags: []
  });

  // Available options for form
  const muscleGroups = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
    'Legs', 'Core', 'Glutes', 'Calves', 'Full Body'
  ];

  const equipment = [
    'None', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
    'Pull-up Bar', 'Bench', 'Machine', 'Bodyweight', 'Cable'
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  // Fetch exercises from backend
  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/exercises', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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
  const handleArrayChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

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
      }
      e.target.value = '';
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingExercise 
        ? `http://localhost:3001/api/exercises/${editingExercise.id}`
        : 'http://localhost:3001/api/exercises';
      
      const method = editingExercise ? 'PATCH' : 'POST';
      
      // Only send fields that the backend expects
      const exerciseData = {
        title: formData.title,
        instructions: formData.instructions,
        tags: formData.tags
      };
      
      const token = localStorage.getItem('authToken');
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
        console.error('Failed to save exercise');
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
    }
  };

  // Edit exercise
  const handleEdit = (exercise) => {
    setEditingExercise(exercise);
    setFormData({
      title: exercise.title,
      description: exercise.description,
      muscleGroups: exercise.muscle_groups || [],
      equipment: exercise.equipment || [],
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      tags: exercise.tags || []
    });
    setShowForm(true);
  };

  // Delete exercise
  const handleDelete = async (exerciseId) => {
    if (!window.confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:3001/api/exercises/${exerciseId}`, {
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

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      muscleGroups: [],
      equipment: [],
      difficulty: 'beginner',
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exercise Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage exercises for your workout library
          </p>
        </div>

        {/* Add Exercise Button and Search */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + Add New Exercise
          </button>
          <div className="w-1/3">
            <input
              type="text"
              placeholder="Search exercises by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Exercise Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-2">
                     Exercise Name *
                   </label>
                   <input
                     type="text"
                     name="title"
                     value={formData.title}
                     onChange={handleInputChange}
                     required
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g., Push-ups"
                   />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the exercise..."
                />
              </div>

              {/* Muscle Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Muscle Groups
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {muscleGroups.map(muscle => (
                    <label key={muscle} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.muscleGroups.includes(muscle)}
                        onChange={() => handleArrayChange('muscleGroups', muscle)}
                        className="mr-2"
                      />
                      <span className="text-sm">{muscle}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Equipment
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {equipment.map(item => (
                    <label key={item} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.equipment.includes(item)}
                        onChange={() => handleArrayChange('equipment', item)}
                        className="mr-2"
                      />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Step-by-step instructions for performing the exercise..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  onKeyPress={handleTagInput}
                  placeholder="Press Enter to add tags..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
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
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Exercises List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Exercise Library ({exercises.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {exercises.length === 0 && !loading ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No exercises found. Create your first exercise to get started!
              </div>
            ) : (
              exercises
                .filter(exercise => 
                  exercise.title.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(exercise => (
                <div key={exercise.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                                             <h4 className="text-lg font-medium text-gray-900">
                         {exercise.title}
                       </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {exercise.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exercise.muscle_groups?.map(muscle => (
                          <span
                            key={muscle}
                            className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"
                          >
                            {muscle}
                          </span>
                        ))}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          exercise.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                          exercise.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {exercise.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(exercise)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
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
