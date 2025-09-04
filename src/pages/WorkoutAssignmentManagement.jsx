import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const WorkoutAssignmentManagement = () => {
  const { user, getAuthToken } = useAuth();
  // State for form data
  const [formData, setFormData] = useState({
    studentId: '',
    workoutSessionId: '',
    dueDate: '',
    notes: ''
  });

  // State for data lists
  const [students, setStudents] = useState([]);
  const [workoutSessions, setWorkoutSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get auth token
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch initial data when component mounts
  useEffect(() => {
    console.log('🔍 WorkoutAssignmentManagement component mounted. Fetching initial data...');
    fetchStudents();
    fetchWorkoutSessions();
    fetchAssignments();
  }, []);

  // Fetch students associated with the coach
  const fetchStudents = async () => {
    try {
      console.log('📚 Fetching students...');
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/coach/students', {
        headers: getAuthHeaders()
      });
      console.log('📚 Students API response:', response.data);
      if (response.data.success) {
        setStudents(response.data.data);
        console.log('✅ Fetched students:', response.data.data);
        // Debug each student's data structure
        response.data.data.forEach((student, index) => {
          console.log(`Student ${index + 1} full data:`, student);
          console.log(`Student ${index + 1} fields:`, {
            id: student.id,
            raw_user_meta_data: student.raw_user_meta_data,
            user_metadata: student.user_metadata,
            metadata: student.metadata,
            name: student.name,
            email: student.email
          });
        });
      } else {
        console.warn('⚠️ Students API call was not successful:', response.data.message);
        setError(response.data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch workout sessions owned by the coach
  const fetchWorkoutSessions = async () => {
    try {
      console.log('💪 Fetching workout sessions...');
      setLoading(true);
              const response = await axios.get('http://localhost:3001/api/workout-sessions', {
        headers: getAuthHeaders()
      });
      console.log('💪 Workout Sessions API response:', response.data);
      // The sessions are directly in response.data.sessions
      if (response.data.sessions) {
        // Filter only published sessions
        const publishedSessions = response.data.sessions.filter(
          session => session.status === 'published'
        );
        setWorkoutSessions(publishedSessions);
        console.log('✅ Fetched published workout sessions:', publishedSessions);
      } else {
        console.warn('⚠️ Workout Sessions API call was not successful:', response.data.message);
        setError(response.data.message || 'Failed to fetch workout sessions');
      }
    } catch (error) {
      console.error('❌ Error fetching workout sessions:', error);
      setError('Failed to fetch workout sessions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing assignments
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/assignments/coach', {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setAssignments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setError('Failed to fetch assignments');
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.workoutSessionId) {
      setError('Student and workout session are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await axios.post('http://localhost:3001/api/assignments', formData, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setSuccess('Workout assigned successfully!');
        setFormData({
          studentId: '',
          workoutSessionId: '',
          dueDate: '',
          notes: ''
        });
        // Refresh assignments list
        fetchAssignments();
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError(error.response?.data?.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  // Handle assignment deletion
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(`http://localhost:3001/api/assignments/${assignmentId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setSuccess('Assignment deleted successfully!');
        fetchAssignments();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  // Get student name by ID
  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    // Name is directly in the student object, fallback to email if no name
    return student ? 
      (student.name || student.email || 'Unknown Student') 
      : 'Unknown Student';
  };

  // Get workout session title by ID
  const getWorkoutTitle = (workoutSessionId) => {
    const session = workoutSessions.find(s => s.id === workoutSessionId);
    return session ? session.title || 'Unknown Workout' : 'Unknown Workout';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status color for assignment
  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Workout Assignment Management
      </h1>

      {/* Debug Info */}
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Students loaded: {students.length}</p>
        <p>Workout sessions loaded: {workoutSessions.length}</p>
        <p>Loading state: {loading ? 'Yes' : 'No'}</p>
        <p>Error: {error || 'None'}</p>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Assign New Workout
        </h2>
        
        <form role="form" aria-label="Assign Workout" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Selection */}
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                Student *
              </label>
              <select
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name || student.email || 'Unknown Student'}
                  </option>
                ))}
              </select>
            </div>

            {/* Workout Session Selection */}
            <div>
              <label htmlFor="workoutSessionId" className="block text-sm font-medium text-gray-700 mb-2">
                Workout Session *
              </label>
              <select
                id="workoutSessionId"
                name="workoutSessionId"
                value={formData.workoutSessionId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a workout session</option>
                {workoutSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <input
                type="text"
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Optional notes for the student"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Workout'}
            </button>
          </div>
        </form>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Current Assignments
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No assignments found. Create your first assignment above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getStudentName(assignment.student_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getWorkoutTitle(assignment.workout_session_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(assignment.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(assignment.assigned_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutAssignmentManagement;