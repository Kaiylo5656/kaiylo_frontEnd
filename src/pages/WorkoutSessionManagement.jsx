import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';

const WorkoutSessionManagement = () => {
  const { user, getAuthToken } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  // State for form data
  const [formData, setFormData] = useState({
    title: '',
    general_objective: '', // Only this field, no description
    exercises: [],
    status: 'draft'
  });

  // Fetch sessions and exercises from backend
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const token = getAuthToken();
      
      // Fetch sessions
      const sessionsResponse = await fetch(`${getApiBaseUrlWithApi()}/workout-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch exercises
      const exercisesResponse = await fetch(`${getApiBaseUrlWithApi()}/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        // Backend returns { sessions: [...] }, so we need to extract the sessions array
        setSessions(sessionsData.sessions || []);
      } else {
        setSessions([]); // Set empty array on error
      }
      
      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        // Backend returns { exercises: [...] }, so we need to extract the exercises array
        setExercises(exercisesData.exercises || []);
      } else {
        setExercises([]); // Set empty array on error
      }
    } catch (error) {
      logger.error('Error fetching data:', error);
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

  // Add exercise to session
  const addExerciseToSession = () => {
    const newExercise = {
      exerciseId: '',
      sets: 3,
      reps: 10,
      rest: 60,
      rpe: 7,
      notes: ''
    };
    
    setFormData(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
  };

  // Update exercise in session
  const updateExerciseInSession = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) => 
        i === index ? { ...exercise, [field]: value } : exercise
      )
    }));
  };

  // Remove exercise from session
  const removeExerciseFromSession = (index) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingSession 
        ? `${getApiBaseUrlWithApi()}/workout-sessions/${editingSession.id}`
        : `${getApiBaseUrlWithApi()}/workout-sessions`;
      
      const method = editingSession ? 'PATCH' : 'POST';
      
      const token = getAuthToken();
      logger.debug('🔍 Debug - Token being sent:', token);
      logger.debug('🔍 Debug - Token type:', typeof token);
      logger.debug('🔍 Debug - Token length:', token ? token.length : 0);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      logger.debug('🔍 Debug - Response status:', response.status);
      logger.debug('🔍 Debug - Response ok:', response.ok);

      if (response.ok) {
        setShowForm(false);
        setEditingSession(null);
        resetForm();
        fetchData();
      } else {
        logger.error('Failed to save session');
        const errorText = await response.text();
        logger.error('🔍 Debug - Error response:', errorText);
      }
    } catch (error) {
      logger.error('Error saving session:', error);
    }
  };

  // Edit session
  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      title: session.title || '',
      general_objective: session.general_objective || '',
      exercises: session.exercises || [],
      status: session.status || 'draft'
    });
    setShowForm(true);
  };

  // Delete session
  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrlWithApi()}/workout-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchData();
      } else {
        logger.error('Failed to delete session');
      }
    } catch (error) {
      logger.error('Error deleting session:', error);
    }
  };

  // Publish session
  const handlePublish = async (sessionId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiBaseUrlWithApi()}/workout-sessions/${sessionId}/publish`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchData();
      } else {
        logger.error('Failed to publish session');
      }
    } catch (error) {
      logger.error('Error publishing session:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      general_objective: '',
      exercises: [],
      status: 'draft'
    });
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingSession(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Workout Session Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage workout sessions for your clients
          </p>
        </div>

        {/* Add Session Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + Create New Session
          </button>
        </div>

        {/* Session Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingSession ? 'Edit Workout Session' : 'Create New Workout Session'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Upper Body Strength"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* General Objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Objective
                </label>
                <textarea
                  name="general_objective"
                  value={formData.general_objective}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is the main goal of this workout session?"
                />
              </div>

              {/* Exercises */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Exercises
                  </label>
                  <button
                    type="button"
                    onClick={addExerciseToSession}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Exercise
                  </button>
                </div>
                
                {formData.exercises.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No exercises added yet. Click "Add Exercise" to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.exercises.map((exercise, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          {/* Exercise Selection */}
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Exercise
                            </label>
                            <select
                              value={exercise.exerciseId || ''}
                              onChange={(e) => updateExerciseInSession(index, 'exerciseId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Exercise</option>
                              {exercises.map(ex => (
                                <option key={ex.id} value={ex.id}>
                                  {ex.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Sets */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sets
                            </label>
                                                         <input
                               type="number"
                               min="1"
                               value={exercise.sets || ''}
                               onChange={(e) => updateExerciseInSession(index, 'sets', parseInt(e.target.value) || 0)}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                          </div>

                          {/* Reps */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Reps
                            </label>
                                                         <input
                               type="number"
                               min="1"
                               value={exercise.reps || ''}
                               onChange={(e) => updateExerciseInSession(index, 'reps', parseInt(e.target.value) || 0)}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                          </div>

                          {/* Rest */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rest (sec)
                            </label>
                                                         <input
                               type="number"
                               min="0"
                               value={exercise.rest || ''}
                               onChange={(e) => updateExerciseInSession(index, 'rest', parseInt(e.target.value) || 0)}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                          </div>

                          {/* RPE */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              RPE
                            </label>
                                                         <input
                               type="number"
                               min="1"
                               max="10"
                               value={exercise.rpe || ''}
                               onChange={(e) => updateExerciseInSession(index, 'rpe', parseInt(e.target.value) || 0)}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                             />
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={exercise.notes || ''}
                            onChange={(e) => updateExerciseInSession(index, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional notes for this exercise..."
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeExerciseFromSession(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove Exercise
                          </button>
                        </div>
                      </div>
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
                  {editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Workout Sessions ({sessions.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {sessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No workout sessions found. Create your first session to get started!
              </div>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {session.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          session.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {session.general_objective}
                      </p>
                      {session.general_objective && (
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Objective:</strong> {session.general_objective}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {session.exercises?.length || 0} exercises
                        </span>
                        <span className="text-xs text-gray-500">
                          Created by: {session.user_id}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {session.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(session.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(session)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
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

export default WorkoutSessionManagement;
