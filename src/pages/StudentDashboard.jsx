import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentDashboard = () => {
  const { user, getAuthToken } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  // Fetch assigned sessions from backend
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      console.log('🔍 StudentDashboard: Starting to fetch assignments...');
      setLoading(true);
      const token = getAuthToken();
      console.log('🔍 StudentDashboard: Token retrieved:', token ? `Length: ${token.length}` : 'No token');
      
      // Updated to use the correct endpoint that matches where coaches create assignments
      const url = 'http://localhost:3001/api/assignments/student';
      console.log('🔍 StudentDashboard: Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 StudentDashboard: Response status:', response.status);
      console.log('🔍 StudentDashboard: Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 StudentDashboard: Response data:', data);
        // The response structure is different - it returns { success: true, data: [...] }
        const assignmentsData = data.data || [];
        console.log('🔍 StudentDashboard: Assignments data:', assignmentsData);
        setAssignments(assignmentsData);
      } else {
        console.error('❌ StudentDashboard: Failed to fetch assignments, status:', response.status);
        const errorText = await response.text();
        console.error('❌ StudentDashboard: Error response body:', errorText);
        setAssignments([]);
      }
    } catch (error) {
      console.error('❌ StudentDashboard: Error fetching assignments:', error);
    } finally {
      setLoading(false);
      console.log('🔍 StudentDashboard: Fetch completed, loading set to false');
    }
  };

  // View session details
  const handleViewSession = (assignment) => {
    try {
      console.log('🔍 handleViewSession called with assignment:', assignment);
      console.log('🔍 Workout sessions data:', assignment.workout_sessions);
      
      // The assignment data already contains the workout session details from our backend join
      // No need to make another API call
      if (assignment.workout_sessions) {
        console.log('🔍 Setting selected session:', assignment.workout_sessions);
        setSelectedSession(assignment.workout_sessions);
        console.log('🔍 selectedSession state should now be:', assignment.workout_sessions);
      } else {
        console.error('No workout session data available for this assignment');
      }
    } catch (error) {
      console.error('Error setting session details:', error);
    }
  };

  // Close session details modal
  const closeSessionDetails = () => {
    setSelectedSession(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here are your assigned workout sessions.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignments.filter(a => a.status === 'completed').length}
                </p>
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
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignments.filter(a => a.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Sessions */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              My Assigned Sessions
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {assignments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your coach will assign workout sessions to you soon.
                </p>
              </div>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {assignment.workout_sessions?.title || 'Loading...'}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          assignment.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : assignment.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {assignment.workout_sessions?.general_objective || 'No description available'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Assigned on: {new Date(assignment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                                             <button
                         onClick={() => handleViewSession(assignment)}
                         className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                       >
                         View Details
                       </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {console.log('🔍 About to render modal. selectedSession:', selectedSession)}
      {selectedSession && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ 
              backgroundColor: 'white', 
              zIndex: 9999 
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedSession.title || 'Workout Session'}
              </h3>
              <button
                onClick={closeSessionDetails}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Objective Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 text-lg mb-2">🎯 Workout Objective</h4>
                <p className="text-blue-800 text-base leading-relaxed">
                  {selectedSession.general_objective || 'No objective available'}
                </p>
              </div>

              {/* Status Section */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 text-lg mb-2">📊 Status</h4>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedSession.status === 'published' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedSession.status === 'published' ? '✅ Published' : '⏳ Draft'}
                  </span>
                </div>
              </div>

              {/* Exercises Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 text-lg mb-4">
                  💪 Exercises ({selectedSession.exercises?.length || 0})
                </h4>
                {selectedSession.exercises && selectedSession.exercises.length > 0 ? (
                  <div className="space-y-4">
                    {selectedSession.exercises.map((exercise, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900 text-lg">
                            Exercise {index + 1}
                          </h5>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{exercise.sets || 0}</div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Sets</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{exercise.reps || 0}</div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Reps</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{exercise.rest || 0}s</div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Rest</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{exercise.rpe || 0}/10</div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">RPE</div>
                          </div>
                        </div>
                        
                        {exercise.notes && exercise.notes.trim() && (
                          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                              <span className="font-medium">📝 Notes:</span> {exercise.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-2">🏋️</div>
                    <p className="text-gray-500 text-lg">No exercises available for this session.</p>
                  </div>
                )}
              </div>

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
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
