import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressAnalytics from '../components/ProgressAnalytics';

const StudentDashboard = () => {
  const { user, getAuthToken } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [completingWorkout, setCompletingWorkout] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch assigned sessions from backend
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/assignments/student', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      console.log('📊 Fetched assignments:', data);
      setAssignments(data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (assignment) => {
    console.log('🔍 Viewing session:', assignment);
    setSelectedSession(assignment);
  };

  const closeSessionDetails = () => {
    setSelectedSession(null);
  };

  const markWorkoutComplete = async (assignmentId) => {
    try {
      setCompletingWorkout(assignmentId);
      const token = await getAuthToken();
      
      const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark workout as complete');
      }

      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, status: 'completed', completed_at: new Date().toISOString() }
            : assignment
        )
      );

      // Close modal if it's open
      if (selectedSession && selectedSession.id === assignmentId) {
        setSelectedSession(null);
      }

      console.log('✅ Workout marked as complete');
    } catch (error) {
      console.error('Error marking workout complete:', error);
    } finally {
      setCompletingWorkout(null);
    }
  };

  // Calculate stats
  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const inProgressCount = assignments.filter(a => a.status === 'in_progress').length;
  const completionRate = assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="mt-2 text-gray-600">Track your workout assignments and progress</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAnalytics(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  !showAnalytics
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setShowAnalytics(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  showAnalytics
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Conditional Content */}
        {showAnalytics ? (
          <ProgressAnalytics userRole="student" />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                    <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">{completedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <p className="text-2xl font-semibold text-gray-900">{inProgressCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{completionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {assignments.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {completedCount} of {assignments.length} workouts completed ({completionRate}%)
                </p>
              </div>
            )}

            {/* Assignments List */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Your Workout Assignments</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {assignments.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
                    <p className="mt-1 text-sm text-gray-500">You don't have any workout assignments yet.</p>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              {assignment.workout_sessions?.title || 'Untitled Workout'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : assignment.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.status === 'completed' ? '✅ Completed' : 
                               assignment.status === 'in_progress' ? '⏱️ In Progress' : 
                               '📋 Pending'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {assignment.workout_sessions?.general_objective || 'No description available'}
                          </p>
                          {assignment.completed_at && (
                            <p className="mt-1 text-xs text-green-600">
                              Completed on: {new Date(assignment.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewSession(assignment)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            View Details
                          </button>
                          {assignment.status !== 'completed' && (
                            <button
                              onClick={() => markWorkoutComplete(assignment.id)}
                              disabled={completingWorkout === assignment.id}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {completingWorkout === assignment.id ? 'Completing...' : 'Mark Complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Session Details Modal */}
        {selectedSession && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ 
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '1.5rem',
                margin: '0 1rem',
                maxWidth: '42rem',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSession.workout_sessions?.title || 'Workout Details'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedSession.workout_sessions?.general_objective || 'No description available'}
                  </p>
                </div>
                <button
                  onClick={closeSessionDetails}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Workout Status */}
              <div className="mb-6">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedSession.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : selectedSession.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSession.status === 'completed' ? '✅ Completed' : 
                     selectedSession.status === 'in_progress' ? '⏱️ In Progress' : 
                     '📋 Pending'}
                  </span>
                  {selectedSession.completed_at && (
                    <span className="text-sm text-green-600">
                      Completed on: {new Date(selectedSession.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Exercises */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exercises</h3>
                {selectedSession.workout_sessions?.exercises && selectedSession.workout_sessions.exercises.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSession.workout_sessions.exercises.map((exercise, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            {exercise.name || `Exercise ${index + 1}`}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Sets:</span>
                            <span className="ml-1 font-medium">{exercise.sets || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Reps:</span>
                            <span className="ml-1 font-medium">{exercise.reps || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rest:</span>
                            <span className="ml-1 font-medium">{exercise.rest || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">RPE:</span>
                            <span className="ml-1 font-medium">{exercise.rpe || 'N/A'}</span>
                          </div>
                        </div>
                        {exercise.notes && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">Notes:</span>
                            <p className="text-sm text-gray-700 mt-1">{exercise.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No exercises available for this workout.</p>
                )}
              </div>

              {/* Action Buttons */}
              {selectedSession.status !== 'completed' && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => markWorkoutComplete(selectedSession.id)}
                    disabled={completingWorkout === selectedSession.id}
                    className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                  >
                    {completingWorkout === selectedSession.id ? 'Completing...' : 'Mark Workout Complete'}
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={closeSessionDetails}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Close Workout Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;