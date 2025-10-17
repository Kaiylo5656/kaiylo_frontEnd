import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { Search, SlidersHorizontal, Send, Plus, Bell, Settings, MessageSquare, MessageCircle, CheckSquare, RefreshCw, Users } from 'lucide-react';
import InviteStudentModal from '../components/InviteStudentModal';
import PendingInvitationsModal from '../components/PendingInvitationsModal';
import StudentDetailView from '../components/StudentDetailView';
import useSocket from '../hooks/useSocket';
import WebSocketDebugger from '../components/WebSocketDebugger';

const CoachDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { onVideoUpload } = useSocket();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPendingInvitationsModalOpen, setIsPendingInvitationsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentInitialTab, setSelectedStudentInitialTab] = useState('overview');
  const [activeTab, setActiveTab] = useState('students');
  const [studentVideoCounts, setStudentVideoCounts] = useState({}); // Track pending videos per student
  const [studentMessageCounts, setStudentMessageCounts] = useState({}); // Track unread messages per student
  const [error, setError] = useState('');
  const { socket } = useSocket();

  useEffect(() => {
    fetchCoachData();
  }, []);

  // Effect for polling and WebSocket updates
  useEffect(() => {
    if (students.length > 0) {
      // Fetch immediately on component mount or when students are loaded
      fetchDashboardCounts();

      // Set up polling every 30 seconds as a fallback
      const intervalId = setInterval(fetchDashboardCounts, 30000);

      // Set up WebSocket listeners for real-time updates
      if (socket) {
        const handleRealtimeUpdate = (data) => {
          console.log('WebSocket update received:', data);
          fetchDashboardCounts();
        };
        
        socket.on('session_completed_with_videos', handleRealtimeUpdate);
        socket.on('new_message', handleRealtimeUpdate);
        console.log('WebSocket listeners for dashboard counts attached.');
      }

      // Cleanup function
      return () => {
        clearInterval(intervalId);
        if (socket) {
          socket.off('session_completed_with_videos', fetchDashboardCounts);
          socket.off('new_message', fetchDashboardCounts);
          console.log('WebSocket listeners for dashboard counts removed.');
        }
      };
    }
  }, [students, socket]);

  // Check for reset parameter and reset state when present
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    console.log('🔍 CoachDashboard URL params:', location.search);
    if (urlParams.get('reset') === 'true') {
      console.log('🔍 Resetting student selection!');
      setSelectedStudent(null);
      setSelectedStudentInitialTab('overview');
      // Clean up the URL by removing the reset parameter
      navigate('/coach/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching students from:', `${getApiBaseUrlWithApi()}/coach/students`);
      console.log('🔍 Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
      
      const studentsResponse = await axios.get(`${getApiBaseUrlWithApi()}/coach/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      console.log('🔍 Full API response:', studentsResponse.data);
      console.log('🔍 Response status:', studentsResponse.status);
      console.log('🔍 Success field:', studentsResponse.data.success);
      console.log('🔍 Data field:', studentsResponse.data.data);
      console.log('🔍 Data length:', studentsResponse.data.data?.length);
      
      if (studentsResponse.data.success && studentsResponse.data.data) {
        // Transform the real student data to match our UI format
        const transformedStudents = studentsResponse.data.data.map(student => ({
          id: student.id,
          name: student.name || student.email || 'Unknown Student',
          lastActivity: student.last_activity || 'N/A',
          feedbackCount: student.pending_feedback_count || 0,
          status: student.status === 'active' ? 'Actif' : 'Inactif',
          email: student.email,
          joinedAt: student.joined_at
        }));
        
        setStudents(transformedStudents);
        console.log('✅ Fetched real students:', transformedStudents);
      } else {
        console.log('⚠️ No students found or API returned unexpected format');
        console.log('🔍 Available fields in response:', Object.keys(studentsResponse.data));
        setStudents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching coach data:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // Show empty state instead of mock data
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDashboardCounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      console.log('Fetching dashboard counts...');
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/dashboard-counts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('Fetched counts:', response.data.data);
        setStudentVideoCounts(response.data.data.videoCounts || {});
        setStudentMessageCounts(response.data.data.messageCounts || {});
      }
    } catch (error) {
      console.error('Error fetching dashboard counts:', error);
    }
  };

  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleInviteSent = (invitationData) => {
    // Optionally refresh the students list or show a success message
    console.log('Invitation sent:', invitationData);
    // You could add a toast notification here
  };

  const handleOpenPendingInvitationsModal = () => {
    setIsPendingInvitationsModalOpen(true);
  };

  const handleClosePendingInvitationsModal = () => {
    setIsPendingInvitationsModalOpen(false);
    // Refresh the student list when closing the modal
    fetchCoachData();
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setSelectedStudentInitialTab('overview');
  };

  // Handle clicking on feedback icon to go to video analysis
  const handleFeedbackClick = (student, e) => {
    e.stopPropagation(); // Prevent triggering the row click
    setSelectedStudent(student);
    setSelectedStudentInitialTab('analyse');
  };

  // Handle clicking on message icon to go to chat
  const handleMessageClick = (student, e) => {
    e.stopPropagation(); // Prevent triggering the row click
    // Navigate to chat page with specific student ID
    navigate(`/chat?studentId=${student.id}`);
  };


  const handleBackToList = () => {
    setSelectedStudent(null);
    setSelectedStudentInitialTab('overview');
  };



  // Show student detail view if a student is selected
  if (selectedStudent) {
    return (
      <StudentDetailView 
        student={selectedStudent} 
        onBack={handleBackToList}
        initialTab={selectedStudentInitialTab}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'students'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Étudiants</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <>
            {/* Client List Header */}
            <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search client"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-input rounded-lg pl-10 pr-4 py-2 w-64 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <button className="flex items-center space-x-2 bg-input px-4 py-2 rounded-lg hover:bg-muted">
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchCoachData}
              className="p-2 bg-input rounded-lg hover:bg-muted"
              title="Refresh students list"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={handleOpenPendingInvitationsModal}
              className="p-2 bg-input rounded-lg hover:bg-muted"
              title="View pending invitations"
            >
              <Send size={20} />
            </button>
            <button 
              onClick={handleOpenInviteModal}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              <Plus size={20} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Client List Table */}
        <div className="bg-card rounded-lg border border-border">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="p-4 w-12 text-left">
                  <div 
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      selectedStudents.size === students.length && students.length > 0
                        ? 'bg-transparent border-primary' 
                        : 'bg-muted-foreground border-muted-foreground'
                    }`}
                    onClick={handleSelectAll}
                  >
                    {selectedStudents.size === students.length && students.length > 0 && (
                      <CheckSquare className="text-primary" size={16} />
                    )}
                  </div>
                </th>
                <th className="p-4 text-left font-medium text-muted-foreground">Name</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Last Activity</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Messages</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Feedback en attente</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center p-8">Loading clients...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare size={24} className="text-muted-foreground" />
                      </div>
                      <div>
                        {students.length === 0 ? (
                          <>
                            <h3 className="text-lg font-medium text-foreground mb-2">No students yet</h3>
                            <p className="text-muted-foreground mb-4">
                              Start by inviting students to join your coaching program
                            </p>
                            <button 
                              onClick={handleOpenInviteModal}
                              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Invite Your First Student
                            </button>
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg font-medium text-foreground mb-2">No students found</h3>
                            <p className="text-muted-foreground mb-4">
                              No students match your search criteria
                            </p>
                            <button 
                              onClick={() => setSearchTerm('')}
                              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Clear Search
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <td className="p-4">
                      <div 
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          selectedStudents.has(student.id) 
                            ? 'bg-transparent border-primary' 
                            : 'bg-muted-foreground border-muted-foreground'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStudent(student.id);
                        }}
                      >
                        {selectedStudents.has(student.id) && <CheckSquare className="text-primary" size={16} />}
                      </div>
                    </td>
                    <td className="p-4 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-white flex items-center justify-center">
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          className="text-black"
                        >
                          <path 
                            d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" 
                            fill="currentColor"
                          />
                          <path 
                            d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" 
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{student.lastActivity}</td>
                    <td className="p-4">
                      {studentMessageCounts[student.id] > 0 && (
                        <div className="relative inline-block cursor-pointer" onClick={(e) => handleMessageClick(student, e)}>
                          <MessageCircle className="w-5 h-5 text-white" />
                          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {studentMessageCounts[student.id]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {studentVideoCounts[student.id] > 0 && (
                        <div className="relative inline-block cursor-pointer" onClick={(e) => handleFeedbackClick(student, e)}>
                          <MessageSquare className="w-5 h-5 text-white" />
                          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {studentVideoCounts[student.id]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 flex items-center space-x-2">
                       <span className={`w-2.5 h-2.5 rounded-full ${student.status === 'Actif' ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                      <span>{student.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      </div>

      {/* Invite Student Modal */}
      <InviteStudentModal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        onInviteSent={handleInviteSent}
      />

      {/* Pending Invitations Modal */}
      <PendingInvitationsModal
        isOpen={isPendingInvitationsModalOpen}
        onClose={handleClosePendingInvitationsModal}
      />
      
      {/* WebSocket Debugger - only show in development */}
      {process.env.NODE_ENV === 'development' && <WebSocketDebugger />}
    </div>
  );
};

export default CoachDashboard;

