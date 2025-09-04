import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CoachDashboard = () => {
  const { user, logout } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    studentEmail: '',
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [recentlyRemoved, setRecentlyRemoved] = useState([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [invitationSearchTerm, setInvitationSearchTerm] = useState('');
  const [invitationStatusFilter, setInvitationStatusFilter] = useState('all');

  // Debug logging for modal state
  useEffect(() => {
    console.log('🔍 showInviteForm state changed to:', showInviteForm);
  }, [showInviteForm]);

  // Fetch coach data on component mount
  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      
      // Fetch invitations
      const invitationsResponse = await axios.get('http://localhost:3001/api/invitations/coach', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (invitationsResponse.data.success) {
        setInvitations(invitationsResponse.data.data);
      }

      // Fetch students list
      const studentsResponse = await axios.get('http://localhost:3001/api/coach/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (studentsResponse.data.success) {
        setStudents(studentsResponse.data.data);
      } else {
        console.error('❌ Students response not successful:', studentsResponse.data);
      }

    } catch (error) {
      console.error('❌ Error fetching coach data:', error);
      console.error('❌ Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🎯 Invitation form submitted with data:', inviteForm);
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Using auth token:', token ? 'Token exists' : 'No token found');
      
      const response = await axios.post('http://localhost:3001/api/invitations/create', inviteForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Invitation creation response:', response.data);

      if (response.data.success) {
        setInviteForm({ studentEmail: '', message: '' });
        setShowInviteForm(false);
        fetchCoachData(); // Refresh the list
        alert('Invitation sent successfully!');
      }
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      alert(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      const response = await axios.delete(`http://localhost:3001/api/invitations/cancel/${invitationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.data.success) {
        fetchCoachData(); // Refresh the list
        alert('Invitation cancelled successfully!');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert(error.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    const student = students.find(s => s.id === studentId);
    const studentEmail = student?.email || 'Unknown email';
    
    const confirmMessage = `Are you sure you want to remove ${studentName} from your student list?

Student Details:
• Name: ${studentName}
• Email: ${studentEmail}

This action will:
• Remove the student from your dashboard
• Delete the coach-student relationship
• The student will no longer see your workouts

This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await axios.delete(`http://localhost:3001/api/coach/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.data.success) {
        fetchCoachData(); // Refresh the list
        alert(`✅ ${studentName} has been successfully removed from your student list.`);
        addToRecentlyRemoved(student); // Add to recently removed
      }
    } catch (error) {
      console.error('Error removing student:', error);
      alert(error.response?.data?.message || 'Failed to remove student');
    }
  };

  // Bulk selection functions
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    const filteredStudents = students.filter(student => 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudents(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkRemove = async () => {
    const selectedStudentNames = students
      .filter(s => selectedStudents.has(s.id))
      .map(s => s.name)
      .join(', ');

    const confirmMessage = `Are you sure you want to remove ${selectedStudents.size} student(s) from your list?

Selected students:
${students
  .filter(s => selectedStudents.has(s.id))
  .map(s => `• ${s.name} (${s.email})`)
  .join('\n')}

This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      const removePromises = Array.from(selectedStudents).map(studentId =>
        axios.delete(`http://localhost:3001/api/coach/students/${studentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })
      );

      await Promise.all(removePromises);
      setSelectedStudents(new Set());
      setShowBulkActions(false);
      
      // Add removed students to recently removed list
      const removedStudents = students.filter(s => selectedStudents.has(s.id));
      removedStudents.forEach(student => addToRecentlyRemoved(student));
      
      fetchCoachData();
      alert(`✅ Successfully removed ${selectedStudents.size} student(s) from your list.`);
    } catch (error) {
      console.error('Error in bulk removal:', error);
      alert('Some students could not be removed. Please try again.');
    }
  };

  // Undo functionality
  const addToRecentlyRemoved = (student) => {
    const removedStudent = {
      ...student,
      removedAt: new Date(),
      id: student.id
    };
    setRecentlyRemoved(prev => [...prev, removedStudent]);
    setShowUndoNotification(true);
    
    // Auto-hide undo notification after 10 seconds
    setTimeout(() => {
      setShowUndoNotification(false);
    }, 10000);
  };

  const handleUndoRemove = async (studentId) => {
    try {
      // Re-add the student to the coach's list
      const response = await axios.post('http://localhost:3001/api/coach/students', {
        studentId: studentId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.data.success) {
        // Remove from recently removed list
        setRecentlyRemoved(prev => prev.filter(s => s.id !== studentId));
        setShowUndoNotification(recentlyRemoved.length > 1);
        
        // Refresh the students list
        fetchCoachData();
        alert('✅ Student has been restored to your list.');
      }
    } catch (error) {
      console.error('Error restoring student:', error);
      alert('Failed to restore student. Please try again.');
    }
  };

  // Handle re-inviting a removed student
  const handleReinviteStudent = async (studentEmail) => {
    try {
      const response = await axios.post('http://localhost:3001/api/invitations/create', {
        studentEmail: studentEmail,
        message: 'You have been re-invited to join my fitness program.'
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        fetchCoachData(); // Refresh the list
        alert(`✅ New invitation sent to ${studentEmail}`);
      }
    } catch (error) {
      console.error('Error re-inviting student:', error);
      alert(error.response?.data?.message || 'Failed to send new invitation');
    }
  };

  // Check if an accepted student is still active
  const getStudentStatus = (invitation) => {
    if (invitation.status !== 'accepted') {
      return invitation.status;
    }
    
    // Check if the student is still in the active students list
    const isActive = students.some(student => student.email === invitation.student_email);
    
    if (isActive) {
      return 'active';
    } else {
      return 'removed';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'removed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Coach Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
                <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full text-white bg-green-500">
                  Coach
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Students</h3>
              <p className="text-3xl font-bold text-blue-600">{students.length}</p>
              <p className="text-sm text-gray-600">Active students</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Invitations</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {invitations.filter(inv => inv.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600">Awaiting response</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Active Programs</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Currently running</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Completed Workouts</h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">This month</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => {
                console.log('🎯 Invite Student button clicked');
                setShowInviteForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Student
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Create Workout
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Analytics
            </button>
          </div>

          {/* Invitation Modal */}
          {showInviteForm && (
            <>
              {/* Debug indicator */}
              <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'red', color: 'white', padding: '10px', zIndex: 9999 }}>
                MODAL IS RENDERED - showInviteForm: {showInviteForm.toString()}
              </div>
              
              {/* Simple Modal with Inline Styles */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '400px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: 0 }}>
                      Invite a Student
                    </h3>
                    <button
                      onClick={() => setShowInviteForm(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        padding: '4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                        Student Email
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteForm.studentEmail}
                        onChange={(e) => {
                          console.log('📧 Email input changed:', e.target.value);
                          setInviteForm({...inviteForm, studentEmail: e.target.value});
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                        Personal Message (Optional)
                      </label>
                      <textarea
                        value={inviteForm.message}
                        onChange={(e) => {
                          console.log('💬 Message input changed:', e.target.value);
                          setInviteForm({...inviteForm, message: e.target.value});
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          minHeight: '80px',
                          resize: 'vertical'
                        }}
                        rows="3"
                        placeholder="Add a personal message to your invitation..."
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setShowInviteForm(false)}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: '#2563EB',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Send Invitation
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* Invitations Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Recent Invitations</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-48">
                    <select
                      value={invitationStatusFilter}
                      onChange={(e) => setInvitationStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="removed">Removed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="w-64">
                    <input
                      type="text"
                      placeholder="Search invitations by email..."
                      value={invitationSearchTerm}
                      onChange={(e) => setInvitationSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span>Total: {invitations.length}</span>
                <span>Pending: {invitations.filter(inv => inv.status === 'pending').length}</span>
                <span>Active: {invitations.filter(inv => getStudentStatus(inv) === 'active').length}</span>
                <span>Removed: {invitations.filter(inv => getStudentStatus(inv) === 'removed').length}</span>
                <span>Expired: {invitations.filter(inv => inv.status === 'expired').length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitation Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No invitations yet. Invite your first student!
                      </td>
                    </tr>
                  ) : (
                    invitations
                      .filter(invitation => {
                        // Apply search filter
                        const matchesSearch = invitation.student_email.toLowerCase().includes(invitationSearchTerm.toLowerCase());
                        
                        // Apply status filter
                        const currentStatus = getStudentStatus(invitation);
                        const matchesStatus = invitationStatusFilter === 'all' || currentStatus === invitationStatusFilter;
                        
                        return matchesSearch && matchesStatus;
                      })
                      .map((invitation) => (
                      <tr key={invitation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invitation.student_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {invitation.invitation_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(getStudentStatus(invitation))}`}>
                            {getStudentStatus(invitation)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invitation.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invitation.expires_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invitation.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  const invitationLink = `${window.location.origin}/invite?code=${invitation.invitation_code}`;
                                  navigator.clipboard.writeText(invitationLink);
                                  alert('Invitation link copied to clipboard!');
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Copy invitation link"
                              >
                                Copy Link
                              </button>
                              <button
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {getStudentStatus(invitation) === 'active' && (
                            <div className="flex space-x-2">
                              <span className="text-green-600">Active Student</span>
                              <button
                                onClick={() => {
                                  const student = students.find(s => s.email === invitation.student_email);
                                  if (student) {
                                    handleRemoveStudent(student.id, student.name);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 text-xs"
                                title="Remove student from your list"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {getStudentStatus(invitation) === 'removed' && (
                            <div className="flex space-x-2">
                              <span className="text-red-600">Removed</span>
                              <button
                                onClick={() => {
                                  // Find the student in recently removed list
                                  const removedStudent = recentlyRemoved.find(s => s.email === invitation.student_email);
                                  if (removedStudent) {
                                    handleUndoRemove(removedStudent.id);
                                  } else {
                                    if (confirm(`Would you like to send a new invitation to ${invitation.student_email}?`)) {
                                      handleReinviteStudent(invitation.student_email);
                                    }
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                                title={`${recentlyRemoved.find(s => s.email === invitation.student_email) ? 'Restore student to your list' : 'Send new invitation to student'}`}
                              >
                                {recentlyRemoved.find(s => s.email === invitation.student_email) ? 'Restore' : 'Re-invite'}
                              </button>
                            </div>
                          )}
                          {invitation.status === 'expired' && (
                            <span className="text-gray-500">Expired</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Students Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">My Students</h2>
                <div className="flex items-center space-x-4">
                  {showBulkActions && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedStudents.size} selected
                      </span>
                      <button
                        onClick={handleBulkRemove}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                      >
                        Remove Selected
                      </button>
                    </div>
                  )}
                  <div className="w-64">
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by inviting students to join your fitness program.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Invite Student
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Select All Checkbox */}
                  {students.filter(student => 
                    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > 0 && (
                    <div className="col-span-full mb-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedStudents.size === students.filter(student => 
                            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.email?.toLowerCase().includes(searchTerm.toLowerCase())
                          ).length && selectedStudents.size > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Select all ({students.filter(student => 
                            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.email?.toLowerCase().includes(searchTerm.toLowerCase())
                          ).length} students)
                        </span>
                      </label>
                    </div>
                  )}
                  
                  {students
                    .filter(student => 
                      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((student) => (
                      <div key={student.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {student.name?.charAt(0) || 'S'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <h3 className="text-sm font-medium text-gray-900">{student.name}</h3>
                                <p className="text-sm text-gray-500">{student.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRemoveStudent(student.id, student.name)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              title="Remove student from your list"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Workout Assignments Section */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Workout Assignments</h3>
              <button
                onClick={() => window.location.href = '/coach/assignments'}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Manage Assignments
              </button>
            </div>
            <p className="text-gray-600">
              Assign workout sessions to your students and track their progress.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CoachDashboard;

