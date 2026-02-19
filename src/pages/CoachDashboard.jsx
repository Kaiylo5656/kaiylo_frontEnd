import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { Search, SlidersHorizontal, Plus, Bell, Settings, MessageCircle, CheckSquare, Users, Trash2, ChevronDown, Check } from 'lucide-react';
import InviteStudentModal from '../components/InviteStudentModal';
import PendingInvitationsModal from '../components/PendingInvitationsModal';
import DeleteStudentModal from '../components/DeleteStudentModal';
import StudentDetailView from '../components/StudentDetailView';
import SortControl from '../components/SortControl';
import useSortParams from '../hooks/useSortParams';
import { sortStudents } from '../utils/studentSorting';
import useSocket from '../hooks/useSocket';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

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
  const [isDeleteStudentModalOpen, setIsDeleteStudentModalOpen] = useState(false);
  const [isDeletingStudents, setIsDeletingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentInitialTab, setSelectedStudentInitialTab] = useState('overview');
  const [studentVideoCounts, setStudentVideoCounts] = useState({}); // Track pending videos per student
  const [studentMessageCounts, setStudentMessageCounts] = useState({}); // Track unread messages per student
  const [studentNextSessions, setStudentNextSessions] = useState({}); // Track next planned session per student
  const [error, setError] = useState('');
  const [filterPendingFeedback, setFilterPendingFeedback] = useState(false);
  const [filterPendingMessages, setFilterPendingMessages] = useState(false);
  const [filterNoUpcomingSessions, setFilterNoUpcomingSessions] = useState(false);
  const [isFilterDropdownOpenDesktop, setIsFilterDropdownOpenDesktop] = useState(false);
  const [isFilterDropdownOpenMobile, setIsFilterDropdownOpenMobile] = useState(false);
  const { socket } = useSocket();

  // Sort state from URL
  const { sort, dir, updateSort } = useSortParams();

  // Wrapper for updateSort
  const handleSortChange = (newSort, newDir) => {
    updateSort(newSort, newDir);
  };

  useEffect(() => {
    fetchCoachData();
  }, []);

  // Effect for polling and WebSocket updates (initial fetch is done in fetchCoachData)
  useEffect(() => {
    if (students.length > 0) {
      // Set up polling every 30 seconds as a fallback
      const intervalId = setInterval(fetchDashboardCounts, 30000);

      // Set up WebSocket listeners for real-time updates
      if (socket) {
        const handleRealtimeUpdate = (data) => {
          logger.debug('WebSocket update received:', data);
          fetchDashboardCounts();
        };

        socket.on('session_completed_with_videos', handleRealtimeUpdate);
        socket.on('new_message', handleRealtimeUpdate);
        socket.on('video_uploaded', handleRealtimeUpdate);
        socket.on('video_feedback_updated', handleRealtimeUpdate);
        logger.debug('WebSocket listeners for dashboard counts attached.');
      }

      // Cleanup function
      return () => {
        clearInterval(intervalId);
        if (socket) {
          socket.off('session_completed_with_videos', fetchDashboardCounts);
          socket.off('new_message', fetchDashboardCounts);
          socket.off('video_uploaded', fetchDashboardCounts);
          socket.off('video_feedback_updated', fetchDashboardCounts);
          logger.debug('WebSocket listeners for dashboard counts removed.');
        }
      };
    }
  }, [students, socket]);

  // Check for reset parameter and reset state when present
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    logger.debug('🔍 CoachDashboard URL params:', location.search);
    if (urlParams.get('reset') === 'true') {
      logger.debug('🔍 Resetting student selection!');
      setSelectedStudent(null);
      setSelectedStudentInitialTab('overview');
      // Clean up the URL by removing the reset parameter
      navigate('/coach/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

  // Restore selected student from URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const studentIdFromUrl = urlParams.get('studentId');

    // If we have an ID in the URL, students are loaded, and no student is currently selected
    if (studentIdFromUrl && students.length > 0 && !selectedStudent) {
      const student = students.find(s => s.id === studentIdFromUrl);
      if (student) {
        setSelectedStudent(student);
      }
    }
  }, [location.search, students, selectedStudent]);


  // Filter and sort students based on search term, filters and sort params
  useEffect(() => {
    let filtered = students;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply pending feedback filter
    if (filterPendingFeedback) {
      filtered = filtered.filter(student =>
        studentVideoCounts[student.id] && Number(studentVideoCounts[student.id]) > 0
      );
    }

    // Apply pending messages filter
    if (filterPendingMessages) {
      filtered = filtered.filter(student =>
        studentMessageCounts[student.id] && Number(studentMessageCounts[student.id]) > 0
      );
    }

    // Apply no upcoming sessions filter
    if (filterNoUpcomingSessions) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(student => {
        const nextSessionDate = studentNextSessions[student.id];
        if (!nextSessionDate) {
          // No session date means no upcoming session
          return true;
        }

        // Check if the session date is still in the future
        const sessionDate = new Date(nextSessionDate);
        sessionDate.setHours(0, 0, 0, 0);

        // Only show students with no upcoming sessions (date is in the past or today is past the session date)
        return sessionDate < today;
      });
    }

    // Apply sorting
    const sorted = sortStudents(filtered, sort || 'name', dir || 'asc', studentVideoCounts, studentNextSessions);
    setFilteredStudents(sorted);
  }, [searchTerm, students, sort, dir, filterPendingFeedback, filterPendingMessages, filterNoUpcomingSessions, studentVideoCounts, studentMessageCounts, studentNextSessions]);

  // Helper function to extract name without email (preserves first and last names)
  const extractStudentName = (name, email) => {
    if (!name) return email || 'Unknown Student';

    // Remove email if it's present in the name
    let cleanName = name;
    if (email) {
      // Remove the email from the name (handles various formats)
      cleanName = cleanName.replace(email, '').trim();
    }

    // Remove "élève" if present (case insensitive, handles multiple spaces)
    cleanName = cleanName.replace(/\s*élève\s*/gi, ' ').trim();

    // Clean up multiple spaces but preserve the name structure (first name + last name)
    cleanName = cleanName.replace(/\s+/g, ' ').trim();

    return cleanName || email || 'Unknown Student';
  };

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      logger.debug('🔍 Fetching students from:', `${getApiBaseUrlWithApi()}/coach/students`);

      // Use the global axios instance which handles headers via AuthContext
      const studentsResponse = await axios.get(`${getApiBaseUrlWithApi()}/coach/students`);

      logger.debug('🔍 Full API response:', studentsResponse.data);
      logger.debug('🔍 Response status:', studentsResponse.status);
      logger.debug('🔍 Success field:', studentsResponse.data.success);
      logger.debug('🔍 Data field:', studentsResponse.data.data);
      logger.debug('🔍 Data length:', studentsResponse.data.data?.length);

      if (studentsResponse.data.success && studentsResponse.data.data) {
        // Transform the real student data to match our UI format
        const transformedStudents = studentsResponse.data.data.map(student => {
          // Try to get the full name from various sources
          let fullName = student.name;

          // Check if there's metadata with firstname/lastname
          if (student.user_metadata) {
            const firstName = student.user_metadata.firstname || student.user_metadata.first_name;
            const lastName = student.user_metadata.lastname || student.user_metadata.last_name;
            if (firstName || lastName) {
              fullName = [firstName, lastName].filter(Boolean).join(' ');
            }
          }

          // If we still don't have a good name, try raw_user_meta_data
          if (!fullName && student.raw_user_meta_data) {
            const firstName = student.raw_user_meta_data.firstname || student.raw_user_meta_data.first_name;
            const lastName = student.raw_user_meta_data.lastname || student.raw_user_meta_data.last_name;
            if (firstName || lastName) {
              fullName = [firstName, lastName].filter(Boolean).join(' ');
            }
          }

          // Clean the name (remove email and "élève" if present)
          const cleanName = extractStudentName(fullName || student.name, student.email);

          return {
            id: student.id,
            name: cleanName,
            lastActivity: student.last_activity || 'N/A',
            feedbackCount: student.pending_feedback_count || 0,
            status: student.status === 'active' ? 'Actif' : 'Inactif',
            email: student.email,
            joinedAt: student.joined_at
          };
        });

        setStudents(transformedStudents);
        logger.debug('✅ Fetched real students:', transformedStudents);

        // Charger les données de tri AVANT d'afficher la liste pour éviter le réordonnancement
        if (transformedStudents.length > 0) {
          await Promise.all([
            fetchDashboardCounts(),
            fetchNextSessions(transformedStudents)
          ]);
        }
      } else {
        logger.debug('⚠️ No students found or API returned unexpected format');
        logger.debug('🔍 Available fields in response:', Object.keys(studentsResponse.data));
        setStudents([]);
      }
    } catch (error) {
      logger.error('❌ Error fetching coach data:', error);
      logger.error('❌ Error details:', error.response?.data);
      logger.error('❌ Error status:', error.response?.status);
      // Show empty state instead of mock data
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardCounts = async () => {
    try {
      logger.debug('Fetching dashboard counts...');
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/dashboard-counts`
      );

      if (response.data.success) {
        logger.debug('Fetched counts:', response.data.data);
        // Normalize counts to ensure they are numbers
        const videoCounts = response.data.data.videoCounts || {};
        const messageCounts = response.data.data.messageCounts || {};

        // Convert to numbers and filter out 0 or undefined values
        const normalizedVideoCounts = {};
        const normalizedMessageCounts = {};

        Object.keys(videoCounts).forEach(studentId => {
          const count = Number(videoCounts[studentId]) || 0;
          if (count > 0) {
            normalizedVideoCounts[studentId] = count;
          }
        });

        Object.keys(messageCounts).forEach(studentId => {
          const count = Number(messageCounts[studentId]) || 0;
          if (count > 0) {
            normalizedMessageCounts[studentId] = count;
          }
        });

        setStudentVideoCounts(normalizedVideoCounts);
        setStudentMessageCounts(normalizedMessageCounts);
      }
    } catch (error) {
      logger.error('Error fetching dashboard counts:', error);
    }
  };

  const fetchNextSessions = async (studentsList) => {
    try {
      const nextSessions = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch next sessions for each student
      await Promise.all(
        studentsList.map(async (student) => {
          try {
            const response = await axios.get(
              `${getApiBaseUrlWithApi()}/assignments/student/${student.id}`,
              {
                params: {
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ahead
                  limit: 100
                }
              }
            );

            if (response.data && response.data.data) {
              // Find the last scheduled session (furthest date in the future)
              const allScheduledSessions = response.data.data
                .map(assignment => {
                  const sessionDate = assignment.scheduled_date || assignment.due_date;
                  if (!sessionDate) return null;
                  const date = new Date(sessionDate);
                  date.setHours(0, 0, 0, 0);
                  return { assignment, date };
                })
                .filter(item => item !== null && item.date >= today)
                .sort((a, b) => b.date - a.date); // Sort descending (latest first)

              if (allScheduledSessions.length > 0) {
                // Get the last scheduled session (furthest date)
                const lastScheduledSession = allScheduledSessions[0];
                nextSessions[student.id] = lastScheduledSession.assignment.scheduled_date || lastScheduledSession.assignment.due_date;
              }
            }
          } catch (error) {
            logger.error(`Error fetching sessions for student ${student.id}:`, error);
          }
        })
      );

      setStudentNextSessions(nextSessions);
    } catch (error) {
      logger.error('Error fetching next sessions:', error);
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

  const handleDeleteSelected = () => {
    if (selectedStudents.size === 0) return;
    setIsDeleteStudentModalOpen(true);
  };

  const handleConfirmDeleteStudents = async () => {
    if (selectedStudents.size === 0) return;

    setIsDeletingStudents(true);
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

      // Fermer la modale
      setIsDeleteStudentModalOpen(false);

      // Rafraîchir les données
      fetchCoachData();
    } catch (error) {
      logger.error('Error deleting students:', error);
      setError('Erreur lors de la suppression des étudiants');
    } finally {
      setIsDeletingStudents(false);
    }
  };

  const handleCloseDeleteStudentModal = () => {
    if (!isDeletingStudents) {
      setIsDeleteStudentModalOpen(false);
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
    logger.debug('Invitation sent:', invitationData);
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
    const params = new URLSearchParams({ studentId: student.id });
    if (sort) params.set('sort', sort);
    if (dir) params.set('dir', dir);
    navigate(`?${params}`, { replace: true });
  };

  // Handle clicking on feedback icon to go to video analysis
  const handleFeedbackClick = (student, e) => {
    e.stopPropagation(); // Prevent triggering the row click
    setSelectedStudent(student);
    setSelectedStudentInitialTab('analyse');
    const params = new URLSearchParams({ studentId: student.id });
    if (sort) params.set('sort', sort);
    if (dir) params.set('dir', dir);
    navigate(`?${params}`, { replace: true });
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

    // Preserve sort params when returning to list
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (dir) params.set('dir', dir);
    const query = params.toString();
    navigate(query ? `/coach/dashboard?${query}` : '/coach/dashboard', { replace: true });

    // Refresh dashboard counts when returning from student detail view
    fetchDashboardCounts();
  };



  // Show student detail view if a student is selected
  if (selectedStudent) {
    return (
      <StudentDetailView
        student={selectedStudent}
        students={students}
        onBack={handleBackToList}
        onStudentChange={(newStudent) => {
          setSelectedStudent(newStudent);
          setSelectedStudentInitialTab('overview');
        }}
        initialTab={selectedStudentInitialTab}
        initialStudentVideoCounts={studentVideoCounts}
        initialStudentMessageCounts={studentMessageCounts}
        initialStudentNextSessions={studentNextSessions}
      />
    );
  }

  return (
    <div className="h-full text-foreground flex flex-col relative overflow-x-hidden">
      {/* Mobile Background Elements (Hidden on Desktop) */}
      <div className="md:hidden">
        {/* Image de fond */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundImage: 'url(/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            backgroundColor: '#0a0a0a'
          }}
        />

        {/* Layer blur sur l'écran */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(100px)',
            backgroundColor: 'rgba(0, 0, 0, 0.01)',
            zIndex: 6,
            pointerEvents: 'none',
            opacity: 1
          }}
        />

        {/* Gradient conique Figma - partie droite */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite'
          }}
        />

        {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '50vw',
            transform: 'translateY(-50%) scaleX(-1)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
          }}
        />

        {/* Top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
            opacity: 0.35,
            zIndex: 5
          }}
        />
        {/* Warm orange glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
            opacity: 0.45,
            zIndex: 5
          }}
        />
        {/* Subtle bottom depth glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
          style={{
            background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
            opacity: 0.25,
            zIndex: 5
          }}
        />
      </div>

      <div className="flex-shrink-0 pt-3 px-6 pb-0 relative z-10">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
          {/* Mobile: Search + Action Buttons on same line */}
          <div className="flex flex-row items-center gap-3 md:hidden">
            {/* Search Input */}
            <div className="relative font-light flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un client"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenPendingInvitationsModal}
                className="p-2.5 bg-white/5 rounded-[8px] hover:bg-white/10 text-white/75 transition-colors"
                title="View pending invitations"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
                  <path d="M536.4-26.3c9.8-3.5 20.6-1 28 6.3s9.8 18.2 6.3 28l-178 496.9c-5 13.9-18.1 23.1-32.8 23.1-14.2 0-27-8.6-32.3-21.7l-64.2-158c-4.5-11-2.5-23.6 5.2-32.6l94.5-112.4c5.1-6.1 4.7-15-.9-20.6s-14.6-6-20.6-.9L229.2 276.1c-9.1 7.6-21.6 9.6-32.6 5.2L38.1 216.8c-13.1-5.3-21.7-18.1-21.7-32.3 0-14.7 9.2-27.8 23.1-32.8l496.9-178z" />
                </svg>
              </button>
              <button
                onClick={handleOpenInviteModal}
                className="group bg-[#d4845a] hover:bg-[#bf7348] text-white font-normal p-2.5 rounded-[8px] transition-colors flex items-center justify-center"
                title="Nouveau"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 fill-current transition-transform duration-200 group-hover:rotate-45">
                  <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop: Search + Filters */}
          <div className="hidden md:flex flex-col md:flex-row gap-3 flex-1 order-2 md:order-1">
            {/* Search Input */}
            <div className="relative font-light w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un client"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>

            {/* Filters and Sort - Desktop only, inline with search */}
            <div className="flex flex-row items-center gap-3">
              {/* Filters Button with Dropdown */}
              <DropdownMenu open={isFilterDropdownOpenDesktop} onOpenChange={setIsFilterDropdownOpenDesktop} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`group relative font-extralight py-2 px-[15px] rounded-[50px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground justify-center md:justify-start flex-1 md:flex-none overflow-hidden ${isFilterDropdownOpenDesktop || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions ? '' : ''
                      }`}
                    style={{
                      color: isFilterDropdownOpenDesktop || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
                    }}
                    title="Filtres"
                  >
                    <span
                      className={`absolute inset-0 rounded-[50px] transition-[background-color] duration-200 ${isFilterDropdownOpenDesktop || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions
                        ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                        : 'bg-[rgba(255,255,255,0.05)] group-hover:bg-[rgba(255,255,255,0.1)]'
                        }`}
                      aria-hidden
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 relative z-10">
                      <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z" />
                    </svg>
                    <span className="relative z-10">Filtres</span>
                    {(filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions) && (
                      <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-normal relative z-10">
                        {(filterPendingFeedback ? 1 : 0) + (filterPendingMessages ? 1 : 0) + (filterNoUpcomingSessions ? 1 : 0)}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform relative z-10 ${isFilterDropdownOpenDesktop ? 'rotate-180' : ''}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-56 rounded-xl p-1"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterPendingFeedback
                      ? 'bg-primary/20 text-primary font-normal'
                      : 'font-light'
                      }`}
                    style={
                      !filterPendingFeedback
                        ? {}
                        : {}
                    }
                    onMouseEnter={(e) => {
                      if (!filterPendingFeedback) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterPendingFeedback) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterPendingFeedback(!filterPendingFeedback)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterPendingFeedback
                      ? 'bg-[#d4845a] border-[#d4845a]'
                      : 'bg-transparent border-white/20'
                      }`}>
                      {filterPendingFeedback && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={filterPendingFeedback ? 'text-primary' : 'text-foreground'}>Feedback en attente</span>
                  </div>

                  <div
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterPendingMessages
                      ? 'bg-primary/20 text-primary font-normal'
                      : 'font-light'
                      }`}
                    onMouseEnter={(e) => {
                      if (!filterPendingMessages) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterPendingMessages) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterPendingMessages(!filterPendingMessages)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterPendingMessages
                      ? 'bg-[#d4845a] border-[#d4845a]'
                      : 'bg-transparent border-white/20'
                      }`}>
                      {filterPendingMessages && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={filterPendingMessages ? 'text-primary' : 'text-foreground'}>Messages en attente</span>
                  </div>

                  <div
                    className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterNoUpcomingSessions
                      ? 'bg-primary/20 text-primary font-normal'
                      : 'font-light'
                      }`}
                    onMouseEnter={(e) => {
                      if (!filterNoUpcomingSessions) {
                        e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '#D48459';
                          span.style.fontWeight = '400';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!filterNoUpcomingSessions) {
                        e.currentTarget.style.backgroundColor = '';
                        const span = e.currentTarget.querySelector('span');
                        if (span) {
                          span.style.color = '';
                          span.style.fontWeight = '';
                        }
                      }
                    }}
                    onClick={() => setFilterNoUpcomingSessions(!filterNoUpcomingSessions)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterNoUpcomingSessions
                      ? 'bg-[#d4845a] border-[#d4845a]'
                      : 'bg-transparent border-white/20'
                      }`}>
                      {filterNoUpcomingSessions && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={filterNoUpcomingSessions ? 'text-primary' : 'text-foreground'}>Aucune séance à venir</span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Control */}
              <SortControl
                sort={sort}
                dir={dir}
                onChange={handleSortChange}
                sortOptions={[
                  { value: 'joinedAt', dir: 'asc', label: 'Arrivée (Plus ancien)' },
                  { value: 'joinedAt', dir: 'desc', label: 'Arrivée (Plus récent)' },
                  { value: 'name', dir: 'asc', label: 'Nom (A–Z)' },
                  { value: 'name', dir: 'desc', label: 'Nom (Z–A)' }
                ]}
              />

              {/* Delete Button - appears when students are selected */}
              {selectedStudents.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center justify-center md:justify-start gap-[10px] bg-white/[0.03] border-[0.5px] border-white/0 px-[15px] py-[8px] rounded-[25px] hover:bg-white/[0.05] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-[16px] w-[16px] text-[#d4845a]">
                    <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
                  </svg>
                  <span className="text-[16px] text-[#d4845a] font-normal">Supprimer</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters and Sort - Mobile only, below search row */}
          <div className="flex md:hidden flex-row items-center gap-3">
            {/* Filters Button with Dropdown */}
            <DropdownMenu open={isFilterDropdownOpenMobile} onOpenChange={setIsFilterDropdownOpenMobile}>
              <DropdownMenuTrigger asChild>
                <button
                  className="group relative font-extralight py-2 px-[15px] rounded-[50px] transition-colors duration-200 flex items-center gap-2 text-primary-foreground justify-center flex-1 overflow-hidden"
                  style={{
                    color: isFilterDropdownOpenMobile || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions ? '#D48459' : 'rgba(250, 250, 250, 0.75)'
                  }}
                  title="Filtres"
                >
                  <span
                    className={`absolute inset-0 rounded-[50px] transition-[background-color] duration-200 ${isFilterDropdownOpenMobile || filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions
                      ? 'bg-[rgba(212,132,89,0.15)] group-hover:bg-[rgba(212,132,89,0.25)]'
                      : 'bg-[rgba(255,255,255,0.05)] group-hover:bg-[rgba(255,255,255,0.1)]'
                      }`}
                    aria-hidden
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4 relative z-10">
                    <path fill="currentColor" d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z" />
                  </svg>
                  <span className="relative z-10">Filtres</span>
                  {(filterPendingFeedback || filterPendingMessages || filterNoUpcomingSessions) && (
                    <span className="ml-1 bg-primary-foreground/20 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-normal relative z-10">
                      {(filterPendingFeedback ? 1 : 0) + (filterPendingMessages ? 1 : 0) + (filterNoUpcomingSessions ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform relative z-10 ${isFilterDropdownOpenMobile ? 'rotate-180' : ''}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                sideOffset={8}
                disablePortal={true}
                className="w-56 rounded-xl p-1"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(10px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div
                  className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterPendingFeedback
                    ? 'bg-primary/20 text-primary font-normal'
                    : 'font-light'
                    }`}
                  style={
                    !filterPendingFeedback
                      ? {}
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!filterPendingFeedback) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '#D48459';
                        span.style.fontWeight = '400';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!filterPendingFeedback) {
                      e.currentTarget.style.backgroundColor = '';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '';
                        span.style.fontWeight = '';
                      }
                    }
                  }}
                  onClick={() => setFilterPendingFeedback(!filterPendingFeedback)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterPendingFeedback
                    ? 'bg-[#d4845a] border-[#d4845a]'
                    : 'bg-transparent border-white/20'
                    }`}>
                    {filterPendingFeedback && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={filterPendingFeedback ? 'text-primary' : 'text-foreground'}>Feedback en attente</span>
                </div>

                <div
                  className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterPendingMessages
                    ? 'bg-primary/20 text-primary font-normal'
                    : 'font-light'
                    }`}
                  onMouseEnter={(e) => {
                    if (!filterPendingMessages) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '#D48459';
                        span.style.fontWeight = '400';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!filterPendingMessages) {
                      e.currentTarget.style.backgroundColor = '';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '';
                        span.style.fontWeight = '';
                      }
                    }
                  }}
                  onClick={() => setFilterPendingMessages(!filterPendingMessages)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterPendingMessages
                    ? 'bg-[#d4845a] border-[#d4845a]'
                    : 'bg-transparent border-white/20'
                    }`}>
                    {filterPendingMessages && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={filterPendingMessages ? 'text-primary' : 'text-foreground'}>Messages en attente</span>
                </div>

                <div
                  className={`px-2.5 py-2 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer rounded-md ${filterNoUpcomingSessions
                    ? 'bg-primary/20 text-primary font-normal'
                    : 'font-light'
                    }`}
                  onMouseEnter={(e) => {
                    if (!filterNoUpcomingSessions) {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '#D48459';
                        span.style.fontWeight = '400';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!filterNoUpcomingSessions) {
                      e.currentTarget.style.backgroundColor = '';
                      const span = e.currentTarget.querySelector('span');
                      if (span) {
                        span.style.color = '';
                        span.style.fontWeight = '';
                      }
                    }
                  }}
                  onClick={() => setFilterNoUpcomingSessions(!filterNoUpcomingSessions)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterNoUpcomingSessions
                    ? 'bg-[#d4845a] border-[#d4845a]'
                    : 'bg-transparent border-white/20'
                    }`}>
                    {filterNoUpcomingSessions && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={filterNoUpcomingSessions ? 'text-primary' : 'text-foreground'}>Aucune séance à venir</span>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Control - Mobile */}
            <SortControl
              sort={sort}
              dir={dir}
              onChange={handleSortChange}
              sortOptions={[
                { value: 'joinedAt', dir: 'asc', label: 'Arrivée (Plus ancien)' },
                { value: 'joinedAt', dir: 'desc', label: 'Arrivée (Plus récent)' },
                { value: 'name', dir: 'asc', label: 'Nom (A–Z)' },
                { value: 'name', dir: 'desc', label: 'Nom (Z–A)' }
              ]}
            />
          </div>

          {/* Action Buttons - Desktop: Right side */}
          <div className="hidden md:flex items-center space-x-3 order-3">
            <button
              onClick={handleOpenPendingInvitationsModal}
              className="p-2.5 bg-white/5 rounded-[8px] hover:bg-white/10 text-white/75 transition-colors"
              title="View pending invitations"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
                <path d="M536.4-26.3c9.8-3.5 20.6-1 28 6.3s9.8 18.2 6.3 28l-178 496.9c-5 13.9-18.1 23.1-32.8 23.1-14.2 0-27-8.6-32.3-21.7l-64.2-158c-4.5-11-2.5-23.6 5.2-32.6l94.5-112.4c5.1-6.1 4.7-15-.9-20.6s-14.6-6-20.6-.9L229.2 276.1c-9.1 7.6-21.6 9.6-32.6 5.2L38.1 216.8c-13.1-5.3-21.7-18.1-21.7-32.3 0-14.7 9.2-27.8 23.1-32.8l496.9-178z" />
              </svg>
            </button>
            <button
              onClick={handleOpenInviteModal}
              className="group bg-[#d4845a] hover:bg-[#bf7348] text-white font-normal pt-[7px] pb-[7px] px-5 rounded-[8px] transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 fill-current transition-transform duration-200 group-hover:rotate-45">
                <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z" />
              </svg>
              Nouveau
            </button>
          </div>
        </div>
      </div>

      {/* Client List Container - Scrollable */}
      <div className="flex-1 min-h-0 px-6 pb-6 relative z-10">
        <div className="rounded-lg flex flex-col overflow-hidden h-full" style={{ backgroundColor: 'unset', border: 'none' }}>

          {/* Client List - Scrollable */}
          <div className="overflow-y-auto flex-1 min-h-0 exercise-list-scrollbar" style={{ paddingRight: '12px' }}>
            <div className={`flex flex-col ${filteredStudents.length === 0 && !loading ? 'w-full min-h-full justify-center' : 'gap-[7px]'}`}>
              {/* Header */}
              {!loading && filteredStudents.length > 0 && (
                <div className="w-full h-[40px] rounded-[16px] flex md:grid md:grid-cols-[1fr_auto] items-center px-4 md:px-9 md:gap-8">
                  {/* Checkbox & Name Group */}
                  <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                    {/* Select All Checkbox */}
                    <div
                      className="shrink-0 hidden md:block"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAll();
                      }}
                    >
                      <div
                        className={`w-[20px] h-[20px] rounded-[4px] flex items-center justify-center transition-colors cursor-pointer ${selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                          ? 'bg-[#d4845a] border-[#d4845a]'
                          : 'bg-transparent border border-white/20 hover:border-white/40'
                          }`}
                      >
                        {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 && (
                          <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Avatar placeholder (transparent) to match student row */}
                    <div className="w-[42px] h-[42px] shrink-0 opacity-0 hidden md:block"></div>

                    {/* Clients text */}
                    <span className="text-[12px] text-white/50 font-light">
                      Clients ({filteredStudents.length})
                    </span>
                    {/* Selection Info */}
                    {selectedStudents.size > 0 && (
                      <span className="text-[12px] font-normal hidden md:inline" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                        {selectedStudents.size} sélectionné{selectedStudents.size > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Activity / Messages Center Section Header */}
                  <div className="hidden md:flex items-center justify-center !gap-4 sm:!gap-8 md:!gap-12 lg:!gap-16 xl:!gap-14 2xl:!gap-32 3xl:!gap-56 4xl:!gap-72 5xl:!gap-96">
                    {/* Feedback en attente Text */}
                    <p className="text-[12px] text-white/50 font-light text-center leading-normal whitespace-nowrap">
                      Feedback en attente
                    </p>

                    {/* Messages en attente Text */}
                    <p className="text-[12px] text-white/50 font-light text-center leading-normal whitespace-nowrap">
                      Messages en attente
                    </p>

                    {/* Next Session Date Header */}
                    <p className="w-[150px] text-[12px] text-white/50 font-light text-center whitespace-nowrap">
                      Programmé jusqu'au
                    </p>

                    {/* Status dot placeholder (transparent) */}
                    <div className="w-1.5 h-1.5 shrink-0 opacity-0"></div>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="text-center p-12 flex flex-col items-center justify-center gap-3">
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
              ) : filteredStudents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-full">
                  <div className="px-6 py-8 text-center font-light flex flex-col items-center gap-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                    <span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>
                        {students.length === 0 ? 'Aucun étudiant pour le moment' : 'Aucun étudiant trouvé'}
                      </span>
                      <br />
                      <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>
                        {students.length === 0
                          ? 'Commencez par inviter des étudiants à rejoindre votre programme de coaching'
                          : 'Aucun étudiant ne correspond à vos critères de recherche'}
                      </span>
                    </span>
                    {students.length === 0 ? (
                      <button
                        onClick={handleOpenInviteModal}
                        className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
                        style={{
                          backgroundColor: 'var(--kaiylo-primary-hex)',
                          color: 'var(--tw-ring-offset-color)'
                        }}
                      >
                        Inviter votre premier étudiant
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterPendingFeedback(false);
                          setFilterPendingMessages(false);
                        }}
                        className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
                        style={{
                          backgroundColor: 'var(--kaiylo-primary-hex)',
                          color: 'var(--tw-ring-offset-color)'
                        }}
                      >
                        Effacer la recherche
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`group relative w-full h-[60px] rounded-[16px] flex md:grid md:grid-cols-[1fr_auto] items-center px-4 md:px-9 gap-4 sm:gap-8 md:gap-12 lg:gap-16 xl:gap-14 2xl:gap-32 3xl:gap-56 4xl:gap-72 5xl:gap-96 cursor-pointer transition-all duration-200 ${selectedStudents.has(student.id)
                      ? 'bg-white/10'
                      : 'bg-white/[0.04] hover:bg-white/10'
                      }`}
                    onClick={() => handleStudentClick(student)}
                  >
                    {/* Checkbox & Name Group */}
                    <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1 justify-between md:justify-start">
                      <div className="flex items-center gap-4 md:gap-6 min-w-0">
                        {/* Checkbox */}
                        <div
                          className="shrink-0 hidden md:block"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStudent(student.id);
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-[4px] flex items-center justify-center transition-colors ${selectedStudents.has(student.id)
                              ? 'bg-[#d4845a]'
                              : 'bg-transparent border border-white/20 group-hover:border-white/40'
                              }`}
                          >
                            {selectedStudents.has(student.id) && (
                              <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-[42px] h-[42px] rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0 overflow-hidden relative">
                            <svg
                              className="w-[18px] h-[18px] text-white/80"
                              viewBox="0 0 448 512"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z" />
                            </svg>
                          </div>
                          <span className="text-[18px] text-white font-light whitespace-nowrap">{student.name}</span>
                        </div>
                      </div>

                      {/* Feedback Badge - Mobile only */}
                      <div className="md:hidden flex items-center justify-center">
                        {(studentVideoCounts[student.id] || 0) > 0 && (
                          <div
                            className="h-[22px] min-w-[22px] px-1.5 rounded-[20px] bg-[#d4845a] flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer hover:bg-[#d4845a]/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                              setSelectedStudentInitialTab('analyse');
                            }}
                            title="Voir les vidéos en attente de feedback"
                          >
                            <span className="text-[13px] text-white font-normal leading-none">
                              {studentVideoCounts[student.id] || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Activity / Messages Center Section */}
                    <div className="hidden md:flex items-center justify-center !gap-4 sm:!gap-8 md:!gap-12 lg:!gap-16 xl:!gap-14 2xl:!gap-32 3xl:!gap-56 4xl:!gap-72 5xl:!gap-96">
                      {/* Count Badge - Always displayed */}
                      <div className="w-[111px] flex items-center justify-center">
                        <div
                          className={`h-[22px] min-w-[22px] px-1.5 rounded-[20px] bg-[#d4845a] flex items-center justify-center shrink-0 transition-all duration-200 ${(studentVideoCounts[student.id] || 0) === 0
                            ? 'opacity-0 cursor-default pointer-events-none'
                            : 'cursor-pointer hover:bg-[#d4845a]/90 hover:scale-110'
                            }`}
                          onClick={(studentVideoCounts[student.id] || 0) > 0 ? (e) => {
                            e.stopPropagation(); // Prevent triggering the row click
                            setSelectedStudent(student);
                            setSelectedStudentInitialTab('analyse');
                          } : undefined}
                          title="Voir les vidéos en attente de feedback"
                        >
                          <span className="text-[13px] text-white font-normal leading-none">
                            {studentVideoCounts[student.id] || 0}
                          </span>
                        </div>
                      </div>

                      {/* Message Icon - Always displayed */}
                      <div className="w-[114px] flex items-center justify-center">
                        <div
                          className="relative cursor-pointer group/icon shrink-0 transition-transform duration-200 hover:scale-110 flex items-center justify-center"
                          onClick={(e) => handleMessageClick(student, e)}
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 640 640"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={`transition-colors duration-200 ${studentMessageCounts[student.id] && Number(studentMessageCounts[student.id]) > 0
                              ? 'text-white/75 group-hover/icon:text-white'
                              : 'text-white/30 group-hover/icon:text-white/50'
                              }`}
                          >
                            <path
                              d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z"
                              fill="currentColor"
                              fillOpacity="0.75"
                            />
                          </svg>
                          {/* Notification dot - Only show if there are unread messages */}
                          {studentMessageCounts[student.id] && Number(studentMessageCounts[student.id]) > 0 && (
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#d4845a] rounded-full border border-[#2A2A2A]"></div>
                          )}
                        </div>
                      </div>

                      {/* Next Session Date */}
                      <div className={`w-[150px] whitespace-nowrap text-center ${studentNextSessions[student.id]
                        ? 'text-[12px] font-normal text-white/75'
                        : 'text-[14px] font-normal text-[#d4845a]'
                        }`}>
                        {studentNextSessions[student.id] ? (
                          new Date(studentNextSessions[student.id]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/(\p{L}+)\.?\s*(\d{4})/u, '$1 .$2')
                        ) : (
                          'aucune séance à venir'
                        )}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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

      {/* Delete Student Modal */}
      <DeleteStudentModal
        isOpen={isDeleteStudentModalOpen}
        onClose={handleCloseDeleteStudentModal}
        onConfirm={handleConfirmDeleteStudents}
        studentNames={Array.from(selectedStudents).map(id => {
          const student = students.find(s => s.id === id);
          return student ? student.name : '';
        }).filter(name => name)}
        studentCount={selectedStudents.size}
        loading={isDeletingStudents}
      />
    </div>
  );
};

export default CoachDashboard;

