import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { Search, SlidersHorizontal, Send, Plus, Bell, Settings, MessageSquare, MessageCircle, CheckSquare, RefreshCw, Users, Trash2 } from 'lucide-react';
import InviteStudentModal from '../components/InviteStudentModal';
import PendingInvitationsModal from '../components/PendingInvitationsModal';
import StudentDetailView from '../components/StudentDetailView';
import useSocket from '../hooks/useSocket';

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
      
      // Use the global axios instance which handles headers via AuthContext
      const studentsResponse = await axios.get(`${getApiBaseUrlWithApi()}/coach/students`);
      
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
      console.log('Fetching dashboard counts...');
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/dashboard-counts`
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

  const handleDeleteSelected = async () => {
    if (selectedStudents.size === 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedStudents.size} étudiant(s) sélectionné(s) ?`)) {
      return;
    }

    try {
      const studentIds = Array.from(selectedStudents);
      
      // Supprimer chaque étudiant sélectionné
      await Promise.all(
        studentIds.map(studentId => 
          axios.delete(`${getApiBaseUrlWithApi()}/coach/students/${studentId}`)
        )
      );

      // Mettre à jour la liste des étudiants
      setStudents(students.filter(s => !selectedStudents.has(s.id)));
      setSelectedStudents(new Set());
      
      // Rafraîchir les données
      fetchCoachData();
    } catch (error) {
      console.error('Error deleting students:', error);
      setError('Erreur lors de la suppression des étudiants');
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
      {/* Main Content */}
      <div className="flex-1 overflow-auto dashboard-scrollbar p-6">
        {/* Client List Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search client"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-64 text-white focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-white/20"
              />
            </div>
            <button className="flex items-center space-x-2 bg-[#d9d9d9]/20 border border-white/20 px-4 py-2.5 rounded-[25px] hover:bg-[#d9d9d9]/30 text-white transition-colors backdrop-blur-sm">
              <SlidersHorizontal size={16} className="text-white" />
              <span className="text-white font-normal">Filters</span>
            </button>
            {selectedStudents.size > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-[10px] bg-white/[0.03] border-[0.5px] border-white/0 px-[15px] py-[12px] rounded-[25px] hover:bg-white/[0.05] transition-colors"
              >
                <Trash2 size={14} className="text-[#d4845a]/80" />
                <span className="text-[13px] text-[#d4845a]/80 font-normal">Supprimer</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={fetchCoachData}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-colors"
              title="Refresh students list"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={handleOpenPendingInvitationsModal}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white transition-colors"
              title="View pending invitations"
            >
              <Send size={20} />
            </button>
            <button 
              onClick={handleOpenInviteModal}
              className="flex items-center space-x-2 bg-[#d4845a] text-white px-5 py-2.5 rounded-[10px] hover:bg-[#d4845a]/90 transition-colors font-normal text-[16px]"
            >
              <Plus size={20} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Column Headers */}
        {!loading && filteredStudents.length > 0 && (
          <div className="w-full flex items-center px-9 mb-2">
            {/* Name Column Header */}
            <div className="flex items-center gap-[30px] flex-1">
              <div className="w-5 h-5 shrink-0"></div>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-[46px] shrink-0"></div>
                <div className="flex flex-col justify-center text-[13px] text-white/50 font-extralight text-center whitespace-nowrap">
                  <p className="leading-normal">Name</p>
                </div>
              </div>
            </div>

            {/* Feedback en attente Column Header */}
            <div className="flex items-center justify-start flex-1 mr-16 ml-8">
              <div className="flex items-center gap-[300px]">
                <div className="shrink-0"></div>
                <div className="flex flex-col justify-center text-[13px] text-white/50 font-extralight text-center shrink-0">
                  <p className="leading-normal whitespace-pre-wrap">Feedback en attente</p>
                </div>
              </div>
            </div>

            {/* Programme jusqu'au Column Header */}
            <div className="text-[13px] text-white/50 font-extralight w-[166px] text-center mr-12 whitespace-nowrap">
              <p className="leading-normal">Programmé jusqu'au</p>
            </div>

            {/* Status Column Header - Empty space for alignment */}
            <div className="w-[10px] shrink-0"></div>
          </div>
        )}

        {/* Client List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center p-12 text-muted-foreground">Loading clients...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare size={24} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-2">
                  {students.length === 0 ? 'No students yet' : 'No students found'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {students.length === 0 
                    ? 'Start by inviting students to join your coaching program'
                    : 'No students match your search criteria'}
                </p>
                {students.length === 0 ? (
                  <button 
                    onClick={handleOpenInviteModal}
                    className="bg-white text-black px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors font-medium"
                  >
                    Invite Your First Student
                  </button>
                ) : (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="bg-white/10 text-white px-6 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className={`group relative w-full h-[72px] rounded-[20px] flex items-center px-9 cursor-pointer transition-all duration-200 ${
                  selectedStudents.has(student.id) 
                    ? 'bg-white/10' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => handleStudentClick(student)}
              >
                {/* Checkbox & Name Group */}
                <div className="flex items-center gap-[30px] flex-1">
                  {/* Checkbox */}
                  <div 
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStudent(student.id);
                    }}
                  >
                    <div 
                      className={`w-5 h-5 rounded-[2px] flex items-center justify-center transition-colors ${
                        selectedStudents.has(student.id) 
                          ? 'bg-[#d4845a]' 
                          : 'bg-transparent border border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {selectedStudents.has(student.id) && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-[46px] h-[46px] rounded-full bg-white/10 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative">
                      <svg 
                        className="w-full h-full text-white/80 p-2.5" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" />
                        <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" />
                      </svg>
                    </div>
                    <span className="text-[20px] text-white/75 font-light truncate">{student.name}</span>
                  </div>
                </div>

                {/* Activity / Messages Center Section */}
                <div className="flex items-center justify-start flex-1 mr-16 ml-8">
                  {/* Messages / Notifications */}
                  {(studentMessageCounts[student.id] > 0 || studentVideoCounts[student.id] > 0) ? (
                    <div className="flex items-center gap-[300px]">
                      {/* Message Icon - Positionné à gauche */}
                      <div 
                        className="relative cursor-pointer group/icon shrink-0"
                        onClick={(e) => handleMessageClick(student, e)}
                      >
                        <svg 
                          width="28" 
                          height="28" 
                          viewBox="0 0 37 37" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-white/75"
                        >
                          {/* Speech bubble shape */}
                          <path 
                            d="M18.5 3C9.387 3 2 9.387 2 18.5C2 23.5 4.5 27.8 8.2 30.5L6.5 34.5L11.2 32.2C13.5 32.7 15.9 33 18.5 33C27.613 33 35 26.613 35 18.5C35 9.387 27.613 3 18.5 3Z" 
                            fill="currentColor"
                            fillOpacity="0.75"
                          />
                          {/* Three dots */}
                          <circle cx="12" cy="18.5" r="2" fill="white" fillOpacity="0.9"/>
                          <circle cx="18.5" cy="18.5" r="2" fill="white" fillOpacity="0.9"/>
                          <circle cx="25" cy="18.5" r="2" fill="white" fillOpacity="0.9"/>
                        </svg>
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#d4845a] rounded-full border border-[#2A2A2A]"></div>
                      </div>

                      {/* Count Badge - Positionné à gauche après l'icône */}
                      <div className="h-[22px] min-w-[22px] px-1.5 rounded-[20px] bg-[#d4845a] flex items-center justify-center shrink-0">
                        <span className="text-[13px] text-white font-normal leading-none">
                          {(studentMessageCounts[student.id] || 0) + (studentVideoCounts[student.id] || 0)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Date */}
                <div className="text-[16px] text-white/50 font-light w-[166px] text-center mr-12 whitespace-nowrap">
                   {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/(\w+) (\d{4})/, '$1 .$2') : '21 sep .2025'}
                </div>

                {/* Status Dot */}
                <div className="w-[10px] flex justify-center shrink-0">
                  <div className={`w-[10px] h-[10px] rounded-full ${student.status === 'Actif' ? 'bg-[#00FF00]' : 'bg-white/20'}`}></div>
                </div>
              </div>
            ))
          )}
        </div>
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
    </div>
  );
};

export default CoachDashboard;

