import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, Trash2, Eye, EyeOff, Copy, Clipboard, MoreHorizontal, Save, X, Video, RefreshCw, Pencil } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import WorkoutSessionDetailsModal from './WorkoutSessionDetailsModal';
import CoachSessionReviewModal from './CoachSessionReviewModal';
import VideoDetailModal from './VideoDetailModal';
import OneRmModal, { DEFAULT_ONE_RM_DATA, calculateRIS } from './OneRmModal';
import StudentProfileModal from './StudentProfileModal';
import DeleteSessionModal from './DeleteSessionModal';
import PublishSessionModal from './PublishSessionModal';
import SwitchToDraftModal from './SwitchToDraftModal';
import { format, addDays, startOfWeek, subDays, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import useSocket from '../hooks/useSocket'; // Import the socket hook
import StudentSidebar from './StudentSidebar';

const StudentDetailView = ({ student, onBack, initialTab = 'overview', students = [], onStudentChange }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isOneRmModalOpen, setIsOneRmModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null); // { sessionId, day, sessionTitle }
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isPublishSessionModalOpen, setIsPublishSessionModalOpen] = useState(false);
  const [sessionToPublish, setSessionToPublish] = useState(null); // { session, day }
  const [isPublishingSession, setIsPublishingSession] = useState(false);
  const [isSwitchToDraftModalOpen, setIsSwitchToDraftModalOpen] = useState(false);
  const [sessionToSwitchToDraft, setSessionToSwitchToDraft] = useState(null); // { session, day }
  const [isSwitchingToDraft, setIsSwitchingToDraft] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState(null); // Session currently being dragged
  const [draggedFromDate, setDraggedFromDate] = useState(null); // Original date for the dragged session
  const [dragOverDate, setDragOverDate] = useState(null); // Date currently highlighted as drop target
  const [isRescheduling, setIsRescheduling] = useState(false); // Prevent concurrent rescheduling calls
  const [overviewWeekDate, setOverviewWeekDate] = useState(new Date()); // For overview weekly calendar
  const [trainingWeekDate, setTrainingWeekDate] = useState(new Date()); // For training weekly calendar (starts with current week)
  const [workoutSessions, setWorkoutSessions] = useState({}); // Will store arrays of sessions per date
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState(null); // Track which week is being hovered
  const [copiedWeek, setCopiedWeek] = useState(null); // Store copied week data for pasting
  const [trainingFilter, setTrainingFilter] = useState('all'); // Filter for training view: 'assigned', 'draft', 'all'
  const [weekViewFilter, setWeekViewFilter] = useState(4); // Week view filter: 2 or 4 weeks
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which session dropdown is open: 'sessionId-date'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [filterMenuOpen, setFilterMenuOpen] = useState(false); // Track if filter dropdown is open
  const [durationMenuOpen, setDurationMenuOpen] = useState(false); // Track if duration dropdown is open
  const [dropdownPosition, setDropdownPosition] = useState(null); // Store dropdown position
  const [closeTimeout, setCloseTimeout] = useState(null); // Timeout for closing dropdown
  const [copiedSession, setCopiedSession] = useState(null); // Store session data awaiting paste
  const [hoveredPasteDate, setHoveredPasteDate] = useState(null); // Track which day is hovered for paste
  const [isPastingSession, setIsPastingSession] = useState(false);
  
  // Video analysis state
  const [studentVideos, setStudentVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  
  // Video filters
  const [statusFilter, setStatusFilter] = useState(''); // Empty string means no filter
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open
  
  // Block information state
  const [blockNumber, setBlockNumber] = useState(3);
  const [totalBlocks, setTotalBlocks] = useState(3);
  const [blockName, setBlockName] = useState('Prépa Force');
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [isBlockEditModalOpen, setIsBlockEditModalOpen] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);

  // Sidebar filter states
  const [studentVideoCounts, setStudentVideoCounts] = useState({});
  const [studentMessageCounts, setStudentMessageCounts] = useState({});
  const [studentNextSessions, setStudentNextSessions] = useState({});

  const { socket, isConnected } = useSocket();

  const trainingWeeks = useMemo(() => {
    const start = startOfWeek(trainingWeekDate, { weekStartsOn: 1 });
    const allDays = [];
    const numberOfDays = weekViewFilter * 7;
    for (let i = 0; i < numberOfDays; i++) {
      allDays.push(addDays(start, i));
    }
    return allDays;
  }, [trainingWeekDate, weekViewFilter]);

  // Listen for real-time session updates
  useEffect(() => {
    if (socket) {
      const handleSessionUpdate = (data) => {
        console.log('SOCKET EVENT: session_updated received', data);
        const { assignmentId, updatedSession } = data;

        setWorkoutSessions(prevSessions => {
          const newSessions = { ...prevSessions };
          let sessionFound = false;

          // Find the assignment and update its nested workout_session
          for (const dateKey in newSessions) {
            const sessionsOnDay = newSessions[dateKey];
            const sessionIndex = sessionsOnDay.findIndex(s => s.assignmentId === assignmentId);

            if (sessionIndex !== -1) {
              console.log(`Found session to update on ${dateKey}`);
              // Create a new array for the day
              newSessions[dateKey] = [...sessionsOnDay];
              // Create a new session object to update
              const oldSession = newSessions[dateKey][sessionIndex];
              newSessions[dateKey][sessionIndex] = {
                ...oldSession,
                workout_sessions: {
                  ...oldSession.workout_sessions,
                  exercises: updatedSession.exercises,
                },
              };
              sessionFound = true;
              break; 
            }
          }

          if (sessionFound) {
            console.log('Session state updated via WebSocket.');
            // Also update the selectedSession if it's the one that was changed
            setSelectedSession(prevSelected => {
              if (prevSelected && prevSelected.assignmentId === assignmentId) {
                console.log('Updating selectedSession as well.');
                return {
                  ...prevSelected,
                  workout_sessions: {
                    ...prevSelected.workout_sessions,
                    exercises: updatedSession.exercises,
                  },
                };
              }
              return prevSelected;
            });
          } else {
            console.log('Session to update not found in current state.');
          }

          return newSessions;
        });
      };

      socket.on('session_updated', handleSessionUpdate);

      return () => {
        socket.off('session_updated', handleSessionUpdate);
      };
    }
  }, [socket, setSelectedSession]);

  // Debug copiedWeek state changes
  useEffect(() => {
    console.log('🔄 copiedWeek state changed:', copiedWeek);
  }, [copiedWeek]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [closeTimeout]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
        setDropdownPosition(null);
      }
      // Close filter and duration menus when clicking outside
      if (filterMenuOpen && !event.target.closest('[data-filter-menu]')) {
        setFilterMenuOpen(false);
      }
      if (durationMenuOpen && !event.target.closest('[data-duration-menu]')) {
        setDurationMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen, filterMenuOpen, durationMenuOpen]);

  const changeOverviewWeek = (direction) => {
    const newDate = direction === 'next' ? addDays(overviewWeekDate, 7) : subDays(overviewWeekDate, 7);
    setOverviewWeekDate(newDate);
  };

  const changeTrainingWeek = (direction) => {
    // Navigate by one week at a time
    const newDate = direction === 'next' ? addDays(trainingWeekDate, 7) : subDays(trainingWeekDate, 7);
    setTrainingWeekDate(newDate);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setSelectedSession(null); // Réinitialiser selectedSession pour une nouvelle séance
    setIsCreateModalOpen(true);
  };

  const handleSessionClick = (session, day) => {
    console.log('🔍 Session clicked:', {
      id: session.id,
      status: session.status,
      difficulty: session.difficulty,
      notes: session.notes
    });
    
    setSelectedSession(session);
    setSelectedDate(day);
    
    // Si la séance n'a pas été commencée ou est un brouillon, ouvrir la modale d'édition
    if (session.status !== 'completed' && session.status !== 'in_progress') {
      setIsCreateModalOpen(true);
    } else if (session.status === 'completed') {
      // Pour les séances terminées, ouvrir la modale de révision avec vidéos
      console.log('📝 Opening review modal with session:', session);
      setIsReviewModalOpen(true);
    } else {
      // Pour les séances en cours, ouvrir la modale de détails en lecture seule
      setIsDetailsModalOpen(true);
    }
  };

  const handleSessionDragStart = (event, session, day) => {
    const canDrag = session.status === 'draft' || session.status === 'assigned';

    if (!canDrag) {
      event.stopPropagation();
      event.preventDefault();
      alert("Impossible de déplacer une séance terminée ou en cours.");
      return;
    }

    // Prevent click handlers from firing while initiating a drag
    event.stopPropagation();
    setDraggedSession(session);
    setDraggedFromDate(day);
    setDragOverDate(null);
    // Provide a basic payload for browsers that expect dataTransfer content
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', session.id || session.assignmentId || session.workoutSessionId || 'workout-session');
    }
  };

  const handleSessionDragEnd = () => {
    setDraggedSession(null);
    setDraggedFromDate(null);
    setDragOverDate(null);
  };

  const handleDayDragOver = (event, day) => {
    if (!draggedSession) return;
    event.preventDefault();
    setDragOverDate(format(day, 'yyyy-MM-dd'));
  };

  const handleDragLeave = (event, day) => {
    // Only clear dragOverDate if we're actually leaving the day container
    // Check if we're moving to a child element
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return; // Still within the day container
    }
    setDragOverDate(null);
  };

  const handleDayDrop = async (event, day) => {
    event.preventDefault();
    if (!draggedSession || !draggedFromDate || isRescheduling) return;
    const targetDate = day;
    const fromDate = draggedFromDate;
    handleSessionDragEnd();
    setHoveredPasteDate(null);
    await handleMoveSession(draggedSession, fromDate, targetDate);
  };

  const handleMoveSession = async (session, fromDate, toDate) => {
    const fromKey = format(fromDate, 'yyyy-MM-dd');
    const toKey = format(toDate, 'yyyy-MM-dd');

    if (fromKey === toKey) {
      return; // Nothing to do if the session is dropped on the same day
    }

    try {
      if (isRescheduling) return;
      setIsRescheduling(true);

      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      const payloadDate = toKey;

      if (session.assignmentId) {
        // Published session: update assignment due date
        await axios.patch(
          `${getApiBaseUrlWithApi()}/assignments/${session.assignmentId}`,
          { dueDate: payloadDate },
          { headers }
        );

        // Keep workout session metadata (scheduled_date) in sync for student views
        if (session.workoutSessionId) {
          await axios.patch(
            `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
            { scheduled_date: payloadDate },
            { headers }
          );
        }
      } else if (session.status === 'draft' && session.workoutSessionId) {
        // Draft session: update scheduled_date directly on workout session
        await axios.patch(
          `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
          { scheduled_date: payloadDate },
          { headers }
        );
      } else if (session.workoutSessionId) {
        // Fallback: try updating the workout session date if available
        await axios.patch(
          `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
          { scheduled_date: payloadDate },
          { headers }
        );
      } else {
        console.warn('Unable to reschedule session – missing identifiers:', session);
        return;
      }

      await fetchWorkoutSessions();
    } catch (error) {
      console.error('Error moving session:', error);
      alert('Impossible de déplacer la séance. Vérifie ta connexion et réessaie.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handlePublishDraftSession = (session, day) => {
    console.log('🔍 handlePublishDraftSession called with session:', session);
    
    // Store session info and open modal
    setSessionToPublish({ session, day });
    setIsPublishSessionModalOpen(true);
  };

  const confirmPublishSession = async () => {
    if (!sessionToPublish) return;

    setIsPublishingSession(true);
    try {
      const { session, day } = sessionToPublish;
      const token = localStorage.getItem('authToken');
      
      console.log('📤 Publishing draft session:', {
        sessionId: session.id,
        title: session.title,
        hasExercises: !!session.exercises
      });
      
      // First, check if the session exists in the database
      console.log('🔍 Checking if session exists in database...');
      const checkResponse = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/${session.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!checkResponse.data.session) {
        throw new Error('Session not found in database. It may have been deleted.');
      }
      
      console.log('✅ Session exists in database, proceeding with update...');
      
      // Then update the session status to 'published' in the database
      const updateResponse = await axios.patch(
        `${getApiBaseUrlWithApi()}/workout-sessions/${session.id}`,
        { status: 'published' },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!updateResponse.data.session) {
        throw new Error('Failed to update session status');
      }
      
      console.log('✅ Session status updated to published');

      // Then create the assignment
      const assignmentData = {
        title: session.title,
        description: session.description || '',
        exercises: session.exercises,
        scheduled_date: format(day, 'yyyy-MM-dd'),
        student_id: student.id,
        status: 'published',
        existingSessionId: session.id,
        isEdit: true
      };

      const response = await axios.post(
        `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
        assignmentData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        console.log('✅ Assignment created successfully');
        // Rafraîchir les séances pour voir les changements
        await fetchWorkoutSessions();
        alert('Séance publiée avec succès ! Elle est maintenant visible par l\'étudiant.');
        
        // Close modal and reset state
        setIsPublishSessionModalOpen(false);
        setSessionToPublish(null);
      } else {
        throw new Error('Failed to create assignment');
      }
    } catch (error) {
      console.error('❌ Error publishing session:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        sessionId: session.id
      });
      
      // Si la session n'existe pas (404), proposer de la recréer
      if (error.response?.status === 404 || error.message.includes('Session not found in database')) {
        await handleSessionNotFound(session.id, 'publish');
      } else {
        alert(`Erreur lors de la publication de la séance: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsPublishingSession(false);
    }
  };

  const handleDeleteSession = (sessionId, day) => {
    // Find the session to get its title
    const session = Object.values(workoutSessions)
      .flat()
      .find(s => 
        (s.assignmentId === sessionId) || (s.id === sessionId && s.status === 'draft')
      );
    
    // Store session info and open modal
    setSessionToDelete({
      sessionId,
      day,
      sessionTitle: session?.title || null
    });
    setIsDeleteSessionModalOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setIsDeletingSession(true);
    try {
      const token = localStorage.getItem('authToken');
      const { sessionId, day } = sessionToDelete;
      
      // Check if this is a draft session (no assignment) or a regular assignment
      const session = Object.values(workoutSessions)
        .flat()
        .find(s => 
          (s.assignmentId === sessionId) || (s.id === sessionId && s.status === 'draft')
        );
      
      if (session && session.status === 'draft') {
        // Delete draft session directly
        const response = await axios.delete(
          `${getApiBaseUrlWithApi()}/workout-sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.status === 200) {
          // Rafraîchir les séances
          await fetchWorkoutSessions();
        } else {
          throw new Error('Failed to delete draft session');
        }
      } else {
        // Supprimer l'assignment (qui contient la référence à la séance)
        const response = await axios.delete(
          `${getApiBaseUrlWithApi()}/assignments/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          // Rafraîchir les séances
          await fetchWorkoutSessions();
        } else {
          throw new Error('Failed to delete session');
        }
      }
      
      // Close modal and reset state
      setIsDeleteSessionModalOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Erreur lors de la suppression de la séance. Veuillez réessayer.');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleSessionCreated = async (sessionData) => {
    try {
      const token = localStorage.getItem('authToken');
      
      console.log('🔍 handleSessionCreated called with:', {
        isEdit: sessionData.isEdit,
        existingSessionId: sessionData.existingSessionId,
        status: sessionData.status,
        title: sessionData.title
      });
      
      if (sessionData.isEdit && sessionData.existingSessionId) {
        // Editing existing session
        if (sessionData.status === 'draft' && !sessionData.assignmentId) {
          // Just update an existing draft session content (no assignmentId means it's already a draft)
          console.log('📝 Updating existing draft session:', sessionData.existingSessionId);
          
          try {
            // First, check if the session exists in the database
            console.log('🔍 Checking if draft session exists before updating...');
            const checkResponse = await axios.get(
              `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            if (!checkResponse.data.session) {
              throw new Error('Session not found in database. It may have been deleted.');
            }
            
            console.log('✅ Draft session exists in database, proceeding with update...');
            
            const updateResponse = await axios.patch(
              `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
              {
                title: sessionData.title,
                general_objective: sessionData.description, // map description -> general_objective
                exercises: sessionData.exercises,
                scheduled_date: sessionData.scheduled_date
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            if (!updateResponse.data.session) {
              throw new Error('Failed to update draft session');
            }
            
            console.log('✅ Draft session updated successfully');
          } catch (updateError) {
            console.error('❌ Error updating draft session:', updateError);
            console.error('Error details:', {
              message: updateError.message,
              response: updateError.response?.data,
              status: updateError.response?.status,
              sessionId: sessionData.existingSessionId
            });
            
            // If the session doesn't exist (404), create a new draft session instead
            if (updateError.response?.status === 404 || updateError.message.includes('Session not found in database')) {
              console.log('⚠️ Draft session not found, creating new draft session instead');
              
              // Remove existingSessionId to create a new session
              const newSessionData = { ...sessionData };
              delete newSessionData.existingSessionId;
              delete newSessionData.isEdit;
              
              const response = await axios.post(
                `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
                newSessionData,
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              if (!response.data.success) {
                throw new Error('Failed to create new draft session');
              }
              
              console.log('✅ New draft session created successfully');
            } else {
              throw updateError;
            }
          }
        } else {
          // Publishing a session - check if we're switching from assigned to draft
          console.log('📤 Publishing session:', sessionData.existingSessionId, 'Status:', sessionData.status);
          
          if (sessionData.status === 'draft') {
            // Switching from assigned to draft - delete assignment and create new draft session
            console.log('📝 Switching assigned session to draft mode');
            
            try {
              // First, delete the assignment to make it invisible to student
              if (sessionData.assignmentId) {
                await axios.delete(
                  `${getApiBaseUrlWithApi()}/assignments/${sessionData.assignmentId}`,
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );
                console.log('✅ Assignment deleted successfully');
              }

              // Create a new draft session with the updated content
              const newSessionData = { ...sessionData };
              delete newSessionData.existingSessionId;
              delete newSessionData.assignmentId;
              delete newSessionData.isEdit;
              
              const response = await axios.post(
                `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
                newSessionData,
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              if (!response.data.success) {
                throw new Error('Failed to create new draft session');
              }
              
              console.log('✅ Session switched to draft mode successfully');
            } catch (error) {
              console.error('Error switching to draft:', error);
              throw error;
            }
          } else {
            // Editing an existing assigned session or publishing a draft
            console.log('📤 Updating session:', sessionData.existingSessionId, 'Status:', sessionData.status);
            
            try {
              // First, check if the session exists in the database
              console.log('🔍 Checking if session exists before updating...');
              console.log('🔍 Using token:', token ? `${token.substring(0, 20)}...` : 'No token');
              
              const checkResponse = await axios.get(
                `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );
              
              if (!checkResponse.data.session) {
                throw new Error('Session not found in database. It may have been deleted.');
              }
              
              console.log('✅ Session exists in database, proceeding with update...');
              console.log('🔍 Session details:', {
                id: checkResponse.data.session.id,
                title: checkResponse.data.session.title,
                status: checkResponse.data.session.status,
                user_id: checkResponse.data.session.user_id
              });
              
              // Update the workout session with the new data
              // Add a small delay to reduce race conditions
              await new Promise(resolve => setTimeout(resolve, 100));
              
              let updateResponse;
              try {
                console.log('🔍 Attempting PATCH request with data:', {
                  sessionId: sessionData.existingSessionId,
                  title: sessionData.title,
                  status: sessionData.status || 'published',
                  exercisesCount: sessionData.exercises?.length || 0
                });
                
                updateResponse = await axios.patch(
                  `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
                  {
                    title: sessionData.title,
                    general_objective: sessionData.description,
                    exercises: sessionData.exercises,
                    scheduled_date: sessionData.scheduled_date,
                    status: sessionData.status || 'published'
                  },
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );
                
                console.log('✅ PATCH request successful:', updateResponse.data);
              } catch (updateError) {
                console.log('❌ PATCH request failed:', {
                  status: updateError.response?.status,
                  statusText: updateError.response?.statusText,
                  data: updateError.response?.data,
                  message: updateError.message
                });
                
                // If the update fails with 404, check if session still exists and retry once
                if (updateError.response?.status === 404) {
                  console.log('⚠️ Update failed with 404, checking session again...');
                  
                  try {
                    const recheckResponse = await axios.get(
                      `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
                      {
                        headers: { Authorization: `Bearer ${token}` }
                      }
                    );
                    
                    if (!recheckResponse.data.session) {
                      throw new Error('Session not found in database during retry. It may have been deleted.');
                    }
                    
                    console.log('✅ Session still exists, retrying update...');
                    
                    updateResponse = await axios.patch(
                      `${getApiBaseUrlWithApi()}/workout-sessions/${sessionData.existingSessionId}`,
                      {
                        title: sessionData.title,
                        general_objective: sessionData.description,
                        exercises: sessionData.exercises,
                        scheduled_date: sessionData.scheduled_date,
                        status: sessionData.status || 'published'
                      },
                      {
                        headers: { Authorization: `Bearer ${token}` }
                      }
                    );
                    
                    console.log('✅ Retry successful:', updateResponse.data);
                  } catch (retryError) {
                    console.log('❌ Retry failed:', {
                      status: retryError.response?.status,
                      statusText: retryError.response?.statusText,
                      data: retryError.response?.data,
                      message: retryError.message
                    });
                    throw retryError;
                  }
                } else {
                  throw updateError;
                }
              }

              if (!updateResponse.data.session) {
                throw new Error('Failed to update session');
              }
              
              console.log('✅ Session updated successfully');

              // Only create a new assignment if:
              // 1. There's NO existing assignment (it was a draft)
              // 2. AND we're publishing it now
              if (!sessionData.assignmentId && sessionData.status === 'published') {
                console.log('📤 Creating assignment for newly published draft');
                
                const response = await axios.post(
                  `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
                  sessionData,
                  {
                    headers: { Authorization: `Bearer ${token}` }
                  }
                );

                if (!response.data.success) {
                  throw new Error('Failed to create assignment');
                }
                
                console.log('✅ Assignment created successfully');
              } else if (sessionData.assignmentId) {
                const previousDate = sessionData.originalScheduledDate;
                const nextDate = sessionData.scheduled_date;

                if (nextDate && previousDate && nextDate !== previousDate) {
                  console.log('🗓️ Updating assignment due date:', {
                    assignmentId: sessionData.assignmentId,
                    previousDate,
                    nextDate
                  });

                  await axios.patch(
                    `${getApiBaseUrlWithApi()}/assignments/${sessionData.assignmentId}`,
                    { dueDate: nextDate },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                }
              }
              // If there's already an assignment, we don't need to create a new one
              // The existing assignment is already linked to the updated session
              
            } catch (updateError) {
              console.error('❌ Error updating session:', updateError);
              console.error('Error details:', {
                message: updateError.message,
                response: updateError.response?.data,
                status: updateError.response?.status,
                sessionId: sessionData.existingSessionId
              });
              
              // If the session doesn't exist (404), create a new one instead
              if (updateError.response?.status === 404 || updateError.message.includes('Session not found in database')) {
                console.log('⚠️ Session not found, creating new one instead');
                
                try {
                  const response = await axios.post(
                    `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
                    sessionData,
                    {
                      headers: { Authorization: `Bearer ${token}` }
                    }
                  );

                  if (!response.data.success) {
                    throw new Error('Failed to create and assign workout session');
                  }
                  
                  console.log('✅ New session created successfully');
                } catch (createError) {
                  console.error('❌ Failed to create new session:', createError);
                  await handleSessionNotFound(sessionData.existingSessionId, 'update');
                  throw createError;
                }
              } else {
                throw updateError;
              }
            }
          }
        }
      } else {
        // Creating new session
        console.log('➕ Creating new session');
        
        const response = await axios.post(
          `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
          sessionData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.data.success) {
          throw new Error('Failed to create and assign workout session');
        }
        
        console.log('✅ New session created successfully');
      }

      setIsCreateModalOpen(false);
      // Refresh workout sessions
      await fetchWorkoutSessions();
    } catch (error) {
      console.error('❌ Error creating/updating workout session and assignment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      alert(`Erreur lors de la sauvegarde de la séance: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCopyWeek = (weekStart) => {
    console.log('🔄 handleCopyWeek called with weekStart:', weekStart);
    console.log('🔄 Current workoutSessions:', workoutSessions);
    
    // Get all sessions in this week
    const weekSessions = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateKey = format(day, 'yyyy-MM-dd');
      const sessions = workoutSessions[dateKey] || [];
      console.log(`🔄 Day ${i}: ${dateKey}`, { sessions, sessionCount: sessions.length });
      
      sessions.forEach(session => {
        // Only copy sessions that match the current filter
        if (trainingFilter === 'all' || 
            (trainingFilter === 'assigned' && session.status !== 'draft') ||
            (trainingFilter === 'draft' && session.status === 'draft')) {
          weekSessions.push({ session, date: day });
        }
      });
    }

    console.log('🔄 Found weekSessions:', weekSessions);

    if (weekSessions.length === 0) {
      console.log('🔄 No sessions to copy');
      alert('Aucune séance à copier dans cette semaine');
      return;
    }

    // Check if we're copying the same week again
    if (copiedWeek && format(copiedWeek.weekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')) {
      console.log('🔄 Copying same week again - overwriting previous copy');
      alert('Cette semaine a déjà été copiée. La copie précédente sera remplacée.');
    }

    // Store the copied week data (overwriting any previous copy)
    const copiedData = {
      weekStart,
      sessions: weekSessions,
      copiedAt: new Date()
    };
    
    console.log('🔄 Setting copiedWeek:', copiedData);
    setCopiedWeek(copiedData);

    alert(`${weekSessions.length} séance(s) copiée(s) ! Survolez une semaine pour la coller.`);
  };

  const handlePasteWeek = async (targetWeekStart) => {
    if (!copiedWeek) {
      alert('Aucune semaine copiée !');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // Check if target week has existing sessions
      const targetWeekSessions = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(targetWeekStart, i);
        const dateKey = format(day, 'yyyy-MM-dd');
        const sessions = workoutSessions[dateKey] || [];
        targetWeekSessions.push(...sessions);
      }

      if (targetWeekSessions.length > 0) {
        if (!confirm(`Cette semaine contient déjà ${targetWeekSessions.length} séance(s). Voulez-vous continuer ? Les séances existantes seront remplacées.`)) {
          return;
        }
      }

      // Copy each session to the target week
      for (const { session, date } of copiedWeek.sessions) {
        const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert Sunday=0 to Monday=0
        const newDate = addDays(targetWeekStart, dayOfWeek);
        
          // Always create new sessions as 'assigned', regardless of original status
          const sessionData = {
            title: session.title,
            description: session.description || '',
            exercises: session.exercises,
            scheduled_date: format(newDate, 'yyyy-MM-dd'),
            student_id: student.id,
            status: session.status === 'draft' ? 'draft' : 'published' // Keep draft status, but make completed ones published
          };

        await axios.post(
          `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
          sessionData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      // Clear copied week after successful paste
      setCopiedWeek(null);
      
      // Refresh sessions
      await fetchWorkoutSessions();
      alert(`Semaine collée avec succès ! ${copiedWeek.sessions.length} séance(s) collée(s).`);
    } catch (error) {
      console.error('Error pasting week:', error);
      alert('Erreur lors du collage de la semaine');
    }
  };

  const handleDeleteWeek = async (weekStart) => {
    try {
      // Get all sessions in this week
      const weekSessions = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dateKey = format(day, 'yyyy-MM-dd');
        const sessions = workoutSessions[dateKey] || [];
        sessions.forEach(session => {
          // Only delete sessions that match the current filter
          if (trainingFilter === 'all' || 
              (trainingFilter === 'assigned' && session.status !== 'draft') ||
              (trainingFilter === 'draft' && session.status === 'draft')) {
            weekSessions.push({ session, date: day });
          }
        });
      }

      if (weekSessions.length === 0) {
        alert('Aucune séance à supprimer dans cette semaine');
        return;
      }

      if (!confirm(`Êtes-vous sûr de vouloir supprimer ${weekSessions.length} séance(s) de cette semaine ?`)) {
        return;
      }

      const token = localStorage.getItem('authToken');
      let deletedCount = 0;
      let errorCount = 0;

      // Delete each session automatically without individual confirmations
      for (const { session, date } of weekSessions) {
        try {
          const sessionId = session.assignmentId || session.id;
          
          // Check if this is a draft session (no assignment) or a regular assignment
          if (session.status === 'draft') {
            // Delete draft session directly
            await axios.delete(
              `${getApiBaseUrlWithApi()}/workout-sessions/${sessionId}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
          } else {
            // Delete assignment (which contains the reference to the session)
            const response = await axios.delete(
              `${getApiBaseUrlWithApi()}/assignments/${sessionId}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            if (!response.data.success) {
              throw new Error('Failed to delete session');
            }
          }
          
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting session ${session.assignmentId || session.id}:`, error);
          errorCount++;
        }
      }

      // Refresh workout sessions after all deletions
      await fetchWorkoutSessions();

      if (errorCount > 0) {
        alert(`Semaine partiellement supprimée : ${deletedCount} séance(s) supprimée(s), ${errorCount} erreur(s).`);
      } else {
        alert(`Semaine supprimée avec succès ! ${deletedCount} séance(s) supprimée(s).`);
      }
    } catch (error) {
      console.error('Error deleting week:', error);
      alert('Erreur lors de la suppression de la semaine');
    }
  };

  // Handle switching session to draft mode
  const handleSwitchToDraft = (session, day) => {
    // Store session info and open modal
    setSessionToSwitchToDraft({ session, day });
    setIsSwitchToDraftModalOpen(true);
  };

  const confirmSwitchToDraft = async () => {
    if (!sessionToSwitchToDraft) return;

    setIsSwitchingToDraft(true);
    try {
      const { session, day } = sessionToSwitchToDraft;
      const token = localStorage.getItem('authToken');
      
      // First, check if the session exists in the database
      console.log('🔍 Checking if session exists before switching to draft...');
      const checkResponse = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!checkResponse.data.session) {
        throw new Error('Session not found in database. It may have been deleted.');
      }
      
      console.log('✅ Session exists in database, proceeding with draft switch...');
      
      const scheduledDateValue = session.scheduled_date || (day ? format(day, 'yyyy-MM-dd') : null);

      const updatePayload = {
        status: 'draft',
        ...(scheduledDateValue ? { scheduled_date: scheduledDateValue } : {}),
        student_id: student?.id || null
      };

      const updateResponse = await axios.patch(
        `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
        updatePayload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!updateResponse.data.session) {
        throw new Error('Failed to update session status');
      }

      // Delete the assignment to make it invisible to student
      await axios.delete(
        `${getApiBaseUrlWithApi()}/assignments/${session.assignmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh sessions
      await fetchWorkoutSessions();
      alert('Séance passée en mode brouillon avec succès !');
      
      // Close modal and reset state
      setIsSwitchToDraftModalOpen(false);
      setSessionToSwitchToDraft(null);
    } catch (error) {
      console.error('Error switching to draft:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        sessionId: session.workoutSessionId
      });
      
      if (error.response?.status === 404 || error.message.includes('Session not found in database')) {
        await handleSessionNotFound(session.workoutSessionId, 'draft');
      } else {
        alert(`Erreur lors du passage en mode brouillon: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsSwitchingToDraft(false);
    }
  };

  // Handle copying a single session
  const handleCopySession = async (session, day) => {
    try {
      // Deep clone to avoid mutating original reference
      const sessionClone = JSON.parse(JSON.stringify(session));
      setCopiedSession({ session: sessionClone, fromDate: format(day, 'yyyy-MM-dd') });
    } catch (error) {
      console.error('Error copying session:', error);
      alert('Erreur lors de la copie de la séance');
    }
  };

  const handlePasteCopiedSession = async (targetDay) => {
    if (!copiedSession || isPastingSession) return;

    try {
      setIsPastingSession(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      const scheduledDate = format(targetDay, 'yyyy-MM-dd');

      const originalStatus = copiedSession.session.status;
      const sessionData = {
        title: copiedSession.session.title,
        description: copiedSession.session.description || '',
        exercises: copiedSession.session.exercises || [],
        scheduled_date: scheduledDate,
        student_id: student.id,
        status: originalStatus === 'draft' ? 'draft' : originalStatus === 'completed' ? 'published' : 'published'
      };

      await axios.post(
        `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
        sessionData,
        { headers }
      );

      await fetchWorkoutSessions();
      setCopiedSession(null);
      setHoveredPasteDate(null);
    } catch (error) {
      console.error('Error pasting copied session:', error);
      alert('Erreur lors du collage de la séance');
    } finally {
      setIsPastingSession(false);
    }
  };

  // Open dropdown menu for session on hover
  const openDropdown = (sessionId, dateKey, event) => {
    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    
    const dropdownKey = `${sessionId}-${dateKey}`;
    setDropdownOpen(dropdownKey);
    
    // Store button position for dropdown positioning
    if (event && event.currentTarget) {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 2, // Reduced gap for easier mouse movement
        right: window.innerWidth - rect.right - 14 // Align right edge of menu with right edge of button, shifted 14px to the right
      });
    }
  };

  // Close dropdown menu with delay
  const closeDropdown = () => {
    // Clear any existing timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
    }
    
    // Set a timeout to close the menu after a short delay
    const timeout = setTimeout(() => {
      setDropdownOpen(null);
      setDropdownPosition(null);
      setCloseTimeout(null);
    }, 150); // 150ms delay to allow moving mouse to menu
    
    setCloseTimeout(timeout);
  };

  // Keep dropdown open (cancel close)
  const keepDropdownOpen = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  // Fetch videos for the specific student
  const fetchStudentVideos = async () => {
    setVideosLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            studentId: student.id, // Filter by student ID
            limit: 1000, // Increase limit to get all videos (default is 50)
            offset: 0
            // Note: We don't pass 'status' here because we want all videos
            // The backend now filters by coach_feedback IS NULL by default for new videos
            // The frontend will filter by statusFilter after receiving all videos
          }
        }
      );
      
      if (response.data.success) {
        console.log(`📹 Fetched ${response.data.data.length} videos for student ${student.id}`);
        console.log(`📹 Video status breakdown:`, {
          pending: response.data.data.filter(v => v.status === 'pending').length,
          completed: response.data.data.filter(v => v.status === 'completed' || v.status === 'reviewed').length,
          total: response.data.data.length
        });
        setStudentVideos(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching student videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  // Handle video click
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsVideoDetailModalOpen(true);
  };

  // Handle feedback update
  const handleFeedbackUpdate = async (videoId, feedback, rating, deleted = false, status = 'completed') => {
    console.log('🔄 handleFeedbackUpdate called:', { videoId, deleted, status });
    
    if (deleted) {
      // Remove video from list if deleted
      console.log('🗑️ Removing video from list:', videoId);
      setStudentVideos(prev => {
        const filtered = prev.filter(v => v.id !== videoId);
        console.log(`📊 Video count after deletion: ${filtered.length} (was ${prev.length})`);
        return filtered;
      });
      setIsVideoDetailModalOpen(false);
      setSelectedVideo(null);
      // Refresh from server to ensure consistency
      setTimeout(() => {
        console.log('🔄 Refreshing videos list after deletion');
        fetchStudentVideos();
      }, 300);
    } else {
      // Update video feedback in the list locally for immediate UI update
      console.log('✏️ Updating video feedback locally:', videoId);
      setStudentVideos(prev => {
        const updated = prev.map(v => 
          v.id === videoId 
            ? { ...v, coach_feedback: feedback, coach_rating: rating, status: status }
            : v
        );
        console.log(`📊 Video count after local update: ${updated.length}`);
        return updated;
      });
      // Refresh the full list from server to ensure consistency
      // This ensures the count is accurate and includes any other changes
      setTimeout(() => {
        console.log('🔄 Refreshing videos list from server after feedback update');
        fetchStudentVideos();
      }, 500); // Small delay to allow backend to process the update
    }
  };

  const fetchWorkoutSessions = async () => {
    try {
      setLoadingSessions(true);
      const token = localStorage.getItem('authToken');
      
      // Get a wider date range to include both week and training week data for progress indicators
      const weekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const trainingWeekStart = startOfWeek(trainingWeekDate, { weekStartsOn: 1 });
      const trainingWeekEnd = addDays(trainingWeekStart, (weekViewFilter * 7) - 1);
      
      // Use a much wider range to ensure we get all sessions needed for progress calculation
      // Go back 2 months and forward 2 months to be sure we have all data
      const extendedStart = subDays(Math.min(weekStart.getTime(), trainingWeekStart.getTime()), 60);
      const extendedEnd = addDays(Math.max(weekEnd.getTime(), trainingWeekEnd.getTime()), 60);
      
      const rangeStart = format(extendedStart, 'yyyy-MM-dd');
      const rangeEnd = format(extendedEnd, 'yyyy-MM-dd');
      
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/assignments/student/${student.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: rangeStart,
            endDate: rangeEnd,
            limit: 200
          }
        }
      );

      console.log('Fetched assignments:', response.data);
      console.log('Date range:', { rangeStart, rangeEnd });

      // Convert array to object with date as key, storing arrays of sessions
      const sessionsMap = {};
      response.data.data.forEach(assignment => {
        if (assignment.workout_sessions) {
          // Use scheduled_date if available, otherwise use due_date
          const assignmentDate = assignment.scheduled_date || assignment.due_date;
          if (!assignmentDate) {
            console.warn('Assignment has no date:', assignment);
            return;
          }

          const dateKey = format(parseISO(assignmentDate), 'yyyy-MM-dd');
          console.log('Processing assignment:', { dateKey, assignment });

          const sessionData = {
              id: assignment.id,
              assignmentId: assignment.id,
              title: assignment.workout_sessions.title,
              exercises: assignment.workout_sessions.exercises,
              status: assignment.status,
              startTime: assignment.start_time,
              endTime: assignment.end_time,
              notes: assignment.notes,
              difficulty: assignment.difficulty,
              workoutSessionId: assignment.workout_session_id,
              scheduled_date: assignment.scheduled_date || assignment.due_date
            };

          // Initialize array for this date if it doesn't exist
          if (!sessionsMap[dateKey]) {
            sessionsMap[dateKey] = [];
          }
          
          // Add session to the array for this date
          sessionsMap[dateKey].push(sessionData);
        }
      });

      // Fetch draft sessions for this specific student (security: only for this student)
      // Draft sessions don't have assignments, so we need to fetch them separately
      try {
        const draftResponse = await axios.get(
          `${getApiBaseUrlWithApi()}/workout-sessions`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { 
              student_id: student.id,
              status: 'draft'
            }
          }
        );

        if (draftResponse.data?.sessions) {
          draftResponse.data.sessions.forEach(session => {
            if (session.status === 'draft' && session.student_id === student.id && session.scheduled_date) {
              const dateKey = format(parseISO(session.scheduled_date), 'yyyy-MM-dd');
              
              // Initialize array for this date if it doesn't exist
              if (!sessionsMap[dateKey]) {
                sessionsMap[dateKey] = [];
              }
              
              // Check if this draft session already exists (to avoid duplicates)
              const exists = sessionsMap[dateKey].some(
                s => s.workoutSessionId === session.id || s.id === session.id
              );
              
              if (!exists) {
                const sessionData = {
                  id: session.id,
                  workoutSessionId: session.id,
                  title: session.title,
                  description: session.general_objective || '',
                  exercises: session.exercises || [],
                  status: 'draft',
                  scheduled_date: session.scheduled_date
                };
                
                sessionsMap[dateKey].push(sessionData);
              }
            }
          });
          console.log('✅ Draft sessions fetched and added to map');
        }
      } catch (draftError) {
        console.warn('⚠️ Could not fetch draft sessions (this is OK if none exist):', draftError.message);
        // Don't fail the whole function if draft fetch fails
      }
      
      console.log('Processed sessions map:', sessionsMap);
      setWorkoutSessions(sessionsMap);
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch student details
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/student/${student.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = response.data.data;
      
      // Fetch 1RM records from backend
      try {
        const oneRmResponse = await axios.get(
          `${getApiBaseUrlWithApi()}/coach/student/${student.id}/one-rep-max`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (oneRmResponse.data.success && oneRmResponse.data.data && Array.isArray(oneRmResponse.data.data) && oneRmResponse.data.data.length > 0) {
          data.oneRepMaxes = oneRmResponse.data.data;
        } else {
          // Initialize empty array for new students
          data.oneRepMaxes = [];
        }
      } catch (oneRmError) {
        console.warn('Error fetching 1RM records from backend, using localStorage fallback:', oneRmError);
        // Fallback to localStorage if backend fails
        const storageKey = `oneRm_${student.id}`;
        const savedOneRm = localStorage.getItem(storageKey);
        if (savedOneRm) {
          try {
            const parsedOneRm = JSON.parse(savedOneRm);
            data.oneRepMaxes = parsedOneRm;
          } catch (e) {
            console.warn('Erreur lors de la lecture des 1RM depuis localStorage:', e);
            // Initialize empty array if localStorage parsing fails
            data.oneRepMaxes = [];
          }
        } else {
          // Initialize empty array for new students with no localStorage data
          data.oneRepMaxes = [];
        }
      }
      
      setStudentData(data);
      
      // Load block information from student data (use defaults if not set)
      setBlockNumber(data.block_number !== undefined && data.block_number !== null ? data.block_number : 3);
      setTotalBlocks(data.total_blocks !== undefined && data.total_blocks !== null ? data.total_blocks : 3);
      setBlockName(data.block_name || 'Prépa Force');
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSessionNotFound = async (sessionId, operation = 'update') => {
    console.log(`🧹 Cleaning up stale session reference: ${sessionId} (${operation})`);
    
    // Log additional debugging information
    console.log('🔍 Debugging session not found:', {
      sessionId,
      operation,
      currentWorkoutSessions: workoutSessions?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Refresh the workout sessions to get the latest data
    await fetchWorkoutSessions();
    
    // Show a user-friendly message
    alert(`Cette séance n'existe plus dans la base de données. Les données ont été actualisées.`);
  };

  // Fetch dashboard counts for sidebar filters
  const fetchDashboardCounts = async () => {
    try {
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/dashboard-counts`
      );

      if (response.data.success) {
        const videoCounts = response.data.data.videoCounts || {};
        const messageCounts = response.data.data.messageCounts || {};
        
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
      console.error('Error fetching dashboard counts:', error);
    }
  };

  // Save block information for the current student
  const saveBlockInformation = async (e) => {
    // Prevent event propagation to avoid closing modal
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isSavingBlock) return; // Prevent double submission
    
    try {
      setIsSavingBlock(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      // Validate and prepare values
      const blockNum = parseInt(blockNumber);
      const totalBlks = parseInt(totalBlocks);
      const blockNm = blockName?.trim() || '';
      
      // Validation
      if (isNaN(blockNum) || blockNum < 1) {
        throw new Error('Le numéro de bloc doit être un nombre supérieur à 0');
      }
      
      if (isNaN(totalBlks) || totalBlks < 1) {
        throw new Error('Le nombre total de blocs doit être un nombre supérieur à 0');
      }
      
      if (blockNum > totalBlks) {
        throw new Error('Le numéro de bloc ne peut pas être supérieur au nombre total de blocs');
      }
      
      console.log('💾 Saving block information:', {
        studentId: student.id,
        block_number: blockNum,
        total_blocks: totalBlks,
        block_name: blockNm
      });
      
      // Use PUT to update block information via profile endpoint
      // The backend should accept partial updates
      const response = await fetch(
        `${getApiBaseUrlWithApi()}/coach/student/${student.id}/profile`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            block_number: blockNum,
            total_blocks: totalBlks,
            block_name: blockNm
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📥 API Response:', result);
      
      // Update studentData to reflect the saved changes
      // Use result.data if available, otherwise use the values we sent
      const updatedData = result.data || {
        block_number: blockNum,
        total_blocks: totalBlks,
        block_name: blockNm
      };
      
      setStudentData(prev => {
        const updated = {
          ...prev,
          block_number: updatedData.block_number ?? blockNum,
          total_blocks: updatedData.total_blocks ?? totalBlks,
          block_name: updatedData.block_name ?? blockNm
        };
        console.log('✅ Updated studentData:', updated);
        return updated;
      });
      
      // Also update local state to keep them in sync
      setBlockNumber(blockNum);
      setTotalBlocks(totalBlks);
      setBlockName(blockNm);
      
      setIsBlockEditModalOpen(false);
      console.log('✅ Block information saved successfully');
    } catch (error) {
      console.error('❌ Error saving block information:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Erreur lors de l\'enregistrement des informations du bloc';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSavingBlock(false);
    }
  };

  // Fetch next sessions for all students
  const fetchNextSessions = async (studentsList) => {
    try {
      const nextSessions = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await Promise.all(
        studentsList.map(async (student) => {
          try {
            const response = await axios.get(
              `${getApiBaseUrlWithApi()}/assignments/student/${student.id}`,
              {
                params: {
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  limit: 100
                }
              }
            );

            if (response.data && response.data.data) {
              const upcomingSession = response.data.data.find(assignment => {
                const sessionDate = assignment.scheduled_date || assignment.due_date;
                if (!sessionDate) return false;
                const date = new Date(sessionDate);
                date.setHours(0, 0, 0, 0);
                return date >= today && assignment.status !== 'completed';
              });

              if (upcomingSession) {
                nextSessions[student.id] = upcomingSession.scheduled_date || upcomingSession.due_date;
              }
            }
          } catch (error) {
            console.error(`Error fetching sessions for student ${student.id}:`, error);
          }
        })
      );

      setStudentNextSessions(nextSessions);
    } catch (error) {
      console.error('Error fetching next sessions:', error);
    }
  };

  useEffect(() => {
    fetchStudentDetails();
    fetchWorkoutSessions();
  }, [student.id]);

  useEffect(() => {
    fetchWorkoutSessions();
  }, [overviewWeekDate, trainingWeekDate, activeTab, weekViewFilter]);

  // Fetch dashboard counts and next sessions when students list changes
  useEffect(() => {
    if (students.length > 0) {
      fetchDashboardCounts();
      fetchNextSessions(students);
    }
  }, [students]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch videos when analyse tab is active
  useEffect(() => {
    if (activeTab === 'analyse') {
      console.log(`📹 Fetching videos for student ${student.id} (analyse tab active)`);
      fetchStudentVideos();
    }
  }, [activeTab, student.id]);


  // Listen for WebSocket events to refresh videos
  useEffect(() => {
    // Always log the current state for debugging
    console.log('🔌 WebSocket listener effect triggered:', {
      hasSocket: !!socket,
      isConnected,
      socketConnected: socket?.connected,
      activeTab,
      studentId: student.id
    });

    // Only proceed if we're on the analyse tab
    if (activeTab !== 'analyse') {
      console.log('⏭️ Skipping WebSocket setup - not on analyse tab');
      return;
    }

    // Wait for socket to be connected
    if (!socket) {
      console.log('⏭️ Skipping WebSocket setup - no socket');
      return;
    }

    if (!isConnected && !socket.connected) {
      console.log('⏭️ Skipping WebSocket setup - socket not connected');
      return;
    }

    console.log(`🔌 Setting up WebSocket listeners for student ${student.id} in analyse tab`);
    
    const handleVideoUploaded = (data) => {
      console.log('📡 WebSocket: video_uploaded received', data);
      console.log(`📡 Comparing studentId: ${data.studentId} === ${student.id}?`, data.studentId === student.id);
      // Refresh videos list if it's for this student
      if (data.studentId === student.id) {
        console.log('✅ Refreshing videos list after video upload');
        fetchStudentVideos();
      } else {
        console.log('⏭️ Skipping refresh - different student');
      }
    };

    const handleVideoFeedbackUpdated = (data) => {
      console.log('📡 WebSocket: video_feedback_updated received', data);
      console.log(`📡 Comparing studentId: ${data.studentId} === ${student.id}?`, data.studentId === student.id);
      // Refresh videos list if it's for this student
      if (data.studentId === student.id) {
        console.log('✅ Refreshing videos list after feedback update');
        fetchStudentVideos();
      } else {
        console.log('⏭️ Skipping refresh - different student');
      }
    };

    socket.on('video_uploaded', handleVideoUploaded);
    socket.on('video_feedback_updated', handleVideoFeedbackUpdated);
    console.log('✅ WebSocket listeners registered for video_uploaded and video_feedback_updated');

    return () => {
      console.log('🔌 Cleaning up WebSocket listeners for videos');
      if (socket) {
        socket.off('video_uploaded', handleVideoUploaded);
        socket.off('video_feedback_updated', handleVideoFeedbackUpdated);
      }
    };
  }, [socket, isConnected, activeTab, student.id]);

  // Calculate progress statistics
  const calculateProgressStats = () => {
    // Get current week range
    const weekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    
    // Get current training week range - use the displayed weeks
    const trainingWeekStart = startOfWeek(trainingWeekDate, { weekStartsOn: 1 });
    const trainingWeekEnd = addDays(trainingWeekStart, (weekViewFilter * 7) - 1);
    
    // Get date keys for the ranges
    const weekDateKeys = [];
    const trainingWeekDateKeys = [];
    
    // Generate week date keys
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      weekDateKeys.push(format(date, 'yyyy-MM-dd'));
    }
    
    // Generate training week date keys - ensure we cover all displayed weeks
    for (let i = 0; i < (weekViewFilter * 7); i++) {
      const date = addDays(trainingWeekStart, i);
      trainingWeekDateKeys.push(format(date, 'yyyy-MM-dd'));
    }
    
    console.log('Training week date range:', {
      trainingWeekStart: format(trainingWeekStart, 'yyyy-MM-dd'),
      trainingWeekEnd: format(trainingWeekEnd, 'yyyy-MM-dd'),
      totalDays: trainingWeekDateKeys.length,
      trainingWeekDateKeys: trainingWeekDateKeys.slice(0, 5) + '...' + trainingWeekDateKeys.slice(-5)
    });
    
    // Count sessions for current week (flatten arrays)
    const allWeekSessions = weekDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
    // Count sessions for training weeks (flatten arrays)
    const allTrainingWeekSessions = trainingWeekDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
    // Filter to only assigned workouts (exclude drafts)
    const weekSessions = allWeekSessions.filter(session => session.status !== 'draft');
    const trainingWeekSessions = allTrainingWeekSessions.filter(session => session.status !== 'draft');
    
    // Count completed sessions
    const weekCompleted = weekSessions.filter(session => session.status === 'completed').length;
    const trainingWeekCompleted = trainingWeekSessions.filter(session => session.status === 'completed').length;
    
    // Debug logging
    console.log('Progress calculation debug:', {
      weekDateKeys: weekDateKeys,
      trainingWeekDateKeys: trainingWeekDateKeys.slice(0, 10) + '...',
      weekSessions: weekSessions.length,
      trainingWeekSessions: trainingWeekSessions.length,
      weekCompleted,
      trainingWeekCompleted,
      workoutSessionsKeys: Object.keys(workoutSessions),
      sampleSession: weekSessions[0] || trainingWeekSessions[0],
      allWorkoutSessions: workoutSessions
    });
    
    return {
      week: {
        completed: weekCompleted,
        total: weekSessions.length,
        progress: weekSessions.length > 0 ? (weekCompleted / weekSessions.length) * 100 : 0
      },
      trainingWeek: {
        completed: trainingWeekCompleted,
        total: trainingWeekSessions.length,
        progress: trainingWeekSessions.length > 0 ? (trainingWeekCompleted / trainingWeekSessions.length) * 100 : 0
      }
    };
  };

  const progressStats = calculateProgressStats();

  // Get status badge for videos
  const getVideoStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-light bg-orange-500 text-white">
            A feedback
          </span>
        );
      case 'reviewed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-light bg-green-600 text-white">
            Complété
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-light bg-gray-600 text-gray-200">
            {status}
          </span>
        );
    }
  };

  // Filter videos based on current filters (memoized for performance)
  const filteredVideos = useMemo(() => {
    const filtered = studentVideos.filter(video => {
      // Filter out videos without valid video_url (RPE-only entries should not appear in video analysis)
      if (!video.video_url || video.video_url.trim() === '') {
        return false;
      }
      
      // Status filter
      if (statusFilter === 'A feedback' && video.status !== 'pending') return false;
      if (statusFilter === 'Complété' && video.status !== 'completed' && video.status !== 'reviewed') return false;
      // If statusFilter is empty string (no filter), show all videos
      
      // Exercise filter
      if (exerciseFilter && !video.exercise_name.toLowerCase().includes(exerciseFilter.toLowerCase())) return false;
      
      // Date filter
      if (dateFilter) {
        const videoDate = format(new Date(video.created_at), 'yyyy-MM-dd');
        if (videoDate !== dateFilter) return false;
      }
      
      return true;
    });
    
    console.log(`📊 Filtered videos count: ${filtered.length} (from ${studentVideos.length} total videos)`);
    return filtered;
  }, [studentVideos, statusFilter, exerciseFilter, dateFilter]);

  // Keep getFilteredVideos for backward compatibility
  const getFilteredVideos = () => filteredVideos;

  // Group videos by workout session
  const groupedVideosBySession = useMemo(() => {
    const filteredVideos = getFilteredVideos();
    const groups = {};
    
    filteredVideos.forEach(video => {
      const sessionId = video.workout_session_id || video.assignment_id || 'unknown';
      
      if (!groups[sessionId]) {
        // Extract session name from the nested assignment data
        const sessionName = video.assignment?.workout_session?.title || 
                           video.session_name || 
                           'Séance';
        
        groups[sessionId] = {
          sessionId,
          sessionDate: video.created_at || video.uploaded_at,
          sessionName: sessionName,
          videos: []
        };
      }
      
      groups[sessionId].videos.push(video);
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.sessionDate).getTime();
      const dateB = new Date(b.sessionDate).getTime();
      return dateB - dateA;
    });
  }, [studentVideos, statusFilter, exerciseFilter, dateFilter]);

  // Toggle session open/closed
  const toggleSession = (sessionId) => {
    setOpenSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Get unique exercises for filter dropdown
  const getUniqueExercises = () => {
    const exercises = [...new Set(studentVideos.map(video => video.exercise_name))];
    return exercises;
  };

  // Render student videos grouped by session
  const renderStudentVideosGrouped = () => {
    if (groupedVideosBySession.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-white/50 h-80">
          <Video size={48} className="mb-4 opacity-30" />
          <p className="font-light">Aucune vidéo trouvée</p>
          <p className="text-sm">Aucune vidéo ne correspond aux filtres sélectionnés.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {groupedVideosBySession.map((session) => {
          const isOpen = openSessions[session.sessionId];
          const sessionTitle = `${session.sessionName} - ${format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr })}`;
          
          return (
            <div 
              key={session.sessionId}
              className="border border-white/10 rounded-lg overflow-hidden"
            >
              {/* Session Header (Clickable) */}
              <div 
                className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleSession(session.sessionId)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <ChevronRight 
                    size={20} 
                    className={`text-white/50 transition-transform flex-shrink-0 ${
                      isOpen ? 'rotate-90' : ''
                    }`} 
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-light text-base">{sessionTitle}</h3>
                    <p className="text-sm text-white/50 mt-1">
                      {session.videos.length} vidéo{session.videos.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.videos.some(v => v.status === 'pending') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {session.videos.filter(v => v.status === 'pending').length} à feedback
                    </span>
                  )}
                  {session.videos.every(v => v.status === 'completed' || v.status === 'reviewed') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light bg-green-500/20 text-green-400 border border-green-500/30">
                      Complété
                    </span>
                  )}
                </div>
              </div>
              
              {/* Session Videos (Collapsible) */}
              {isOpen && (
                <div className="border-t border-white/10">
                  <div className="p-4 space-y-3">
                    {session.videos.map((video) => (
          <div 
            key={video.id} 
            className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
            onClick={() => handleVideoClick(video)}
          >
            <div className="flex items-center gap-4">
              {/* Video Thumbnail */}
              <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                            {video?.video_url && video.video_url.trim() !== '' ? (
                              <>
                <video 
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                  <PlayCircle size={24} className="text-white" />
                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <Video size={24} className="text-gray-500" />
                              </div>
                            )}
              </div>
              
              {/* Video Info */}
              <div className="flex-1 min-w-0">
                {/* Exercise Tag */}
                <div className="mb-2">
                  <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm font-light">
                    {video.exercise_name}
                  </span>
                </div>
                
                {/* Series and Date */}
                <div className="text-white/50 text-sm">
                  Série {video.set_number || 1}/3
                </div>
                <div className="text-white/50 text-sm">
                  {format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
              
              {/* Status Tag - Only show for videos needing feedback */}
              {video.status === 'pending' && (
                <div className="flex-shrink-0 flex items-center">
                  <span className="inline-flex items-center justify-center bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-full text-xs font-light">
                    A feedback
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to filter sessions based on training filter
  const getFilteredSessions = (sessions) => {
    if (!sessions || !Array.isArray(sessions)) return [];
    
    switch (trainingFilter) {
      case 'assigned':
        return sessions.filter(session => session.status === 'assigned' || session.status === 'in_progress' || session.status === 'completed');
      case 'draft':
        return sessions.filter(session => session.status === 'draft');
      case 'all':
      default:
        return sessions;
    }
  };

  const oneRmRecords = useMemo(() => {
    const fallback = DEFAULT_ONE_RM_DATA;
    
    // Define custom order for exercises: Muscle-up, Traction (Pull-up), Dips, Squat
    const exerciseOrder = ['Muscle-up', 'Traction', 'Pull-up', 'Dips', 'Squat'];

    // Create empty template with the 4 default exercises for new students
    const emptyTemplate = [
      {
        id: 'muscle-up',
        name: 'Muscle-up',
        color: '#d4845a',
        current: 0,
        best: 0,
        unit: 'kg',
        delta: 0,
        goal: '',
        weeklyVolume: '',
        totalReps: '',
        lastSession: '',
        history: [],
      },
      {
        id: 'pull-up',
        name: 'Traction',
        color: '#3b82f6',
        current: 0,
        best: 0,
        unit: 'kg',
        delta: 0,
        goal: '',
        weeklyVolume: '',
        totalReps: '',
        lastSession: '',
        history: [],
      },
      {
        id: 'dips',
        name: 'Dips',
        color: '#22c55e',
        current: 0,
        best: 0,
        unit: 'kg',
        delta: 0,
        goal: '',
        weeklyVolume: '',
        totalReps: '',
        lastSession: '',
        history: [],
      },
      {
        id: 'squat',
        name: 'Squat',
        color: '#a855f7',
        current: 0,
        best: 0,
        unit: 'kg',
        delta: 0,
        goal: '',
        weeklyVolume: '',
        totalReps: '',
        lastSession: '',
        history: [],
      }
    ];

    if (studentData?.oneRepMaxes && Array.isArray(studentData.oneRepMaxes) && studentData.oneRepMaxes.length > 0) {
      // Map records with fallback data
      const mappedRecords = studentData.oneRepMaxes.map((record, index) => ({
        id: record.id || `one-rm-${index}`,
        name: record.name || record.exercise || `Mouvement ${index + 1}`,
        color: record.color || fallback[index % fallback.length]?.color || '#d4845a',
        current: Number(record.current) || Number(record.value) || 0,
        best: Number(record.best) || Number(record.personalBest) || Number(record.current) || 0,
        unit: record.unit || 'kg',
        delta: Number(record.delta) || 0,
        goal: record.goal || fallback[index % fallback.length]?.goal || '',
        weeklyVolume: record.weeklyVolume || fallback[index % fallback.length]?.weeklyVolume || '',
        totalReps: record.totalReps || fallback[index % fallback.length]?.totalReps || '',
        lastSession: record.lastSession || fallback[index % fallback.length]?.lastSession || '',
        history: record.history || fallback[index % fallback.length]?.history || [],
      }));
      
      // Sort according to custom order
      mappedRecords.sort((a, b) => {
        const indexA = exerciseOrder.findIndex(name => 
          a.name.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(a.name.toLowerCase())
        );
        const indexB = exerciseOrder.findIndex(name => 
          b.name.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(b.name.toLowerCase())
        );
        
        // If both found, sort by index
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If only A found, A comes first
        if (indexA !== -1) return -1;
        // If only B found, B comes first
        if (indexB !== -1) return 1;
        // If neither found, sort alphabetically
        return a.name.localeCompare(b.name);
      });
      
      return mappedRecords;
    }

    // Return empty template with 4 exercises showing 0 or empty values for new students
    return emptyTemplate;
  }, [studentData]);

  const totalOneRmCurrent = useMemo(
    () => oneRmRecords.reduce((sum, record) => sum + (Number(record.current) || 0), 0),
    [oneRmRecords]
  );

  // Calculer le RIS en utilisant la même fonction que dans OneRmModal
  const calculatedRIS = useMemo(() => {
    const bodyWeight = studentData?.weight ? Number(studentData.weight) : null;
    const gender = studentData?.gender || null;
    return calculateRIS(totalOneRmCurrent, bodyWeight, gender);
  }, [totalOneRmCurrent, studentData?.weight, studentData?.gender]);

  const formatWeight = (value, unit = 'kg') => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return '—';
    }

    return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
  };

  const renderOverviewDayContent = (dayDate, dayKey, isDropTarget = false, draggedSession = null) => {
    const sessions = workoutSessions[dayKey] || [];
    const hasMultipleSessions = sessions.length > 1;
    const hasMoreThanTwoSessions = sessions.length > 2;

    const sessionList = sessions.length > 0 ? (
      <div 
        className={`session-container flex flex-col gap-2 transition-all duration-300 ease-out relative`}
        style={{ 
          height: '220px', 
          overflowY: hasMoreThanTwoSessions ? 'auto' : 'hidden',
          backgroundColor: isDropTarget ? 'rgba(212, 132, 90, 0.10)' : 'transparent',
          borderRadius: '0.75rem',
          padding: isDropTarget ? '4px' : '0',
          transition: 'background-color 0.2s ease-out, padding 0.2s ease-out'
        }}
      >
        {sessions.map((session, sessionIndex) => {
          const canDrag = session.status === 'draft' || session.status === 'assigned';
          const dropdownKey = `${session.id || session.assignmentId}-${dayKey}`;
          const exercises = session.exercises || [];

          return (
            <div
              key={session.id || sessionIndex}
              className={`rounded-xl transition-all duration-200 ${hasMultipleSessions && !hasMoreThanTwoSessions ? '' : hasMoreThanTwoSessions ? 'flex-shrink-0' : 'h-full'} flex flex-col ${
                session.status === 'draft'
                  ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
                  : 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
              } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
                draggedSession && draggedSession.id === (session.id || session.assignmentId) ? 'opacity-50 scale-95' : ''
              }`}
              draggable
              onDragStart={(event) => handleSessionDragStart(event, session, dayDate)}
              onDragEnd={handleSessionDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                handleSessionClick(session, dayDate);
              }}
            >
              <div className={`${hasMoreThanTwoSessions ? 'pt-2 pb-2 px-2' : 'pt-3 pb-3 px-3'} space-y-2 flex-1 flex flex-col overflow-visible`} style={{ width: '100%' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${hasMoreThanTwoSessions ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                      <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z"/>
                    </svg>
                    <span className={`truncate ${hasMoreThanTwoSessions ? 'text-[12px]' : 'text-[14px]'} font-normal`} style={{ color: 'var(--kaiylo-primary-hex)' }}>{session.title || 'Séance'}</span>
                  </div>

                  {(session.status !== 'completed' && session.status !== 'in_progress') || session.status === 'completed' ? (
                    <div className="h-full flex items-center relative overflow-visible">
                      <button
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          openDropdown(session.id || session.assignmentId, dayKey, e);
                        }}
                        onMouseLeave={closeDropdown}
                        className="text-white/50 hover:text-white transition-colors flex items-center justify-center"
                        title="Options de la séance"
                      >
                        <MoreHorizontal className="h-[14px] w-[14px]" />
                      </button>

                      {dropdownOpen === dropdownKey && (
                        <div
                          onMouseEnter={keepDropdownOpen}
                          onMouseLeave={closeDropdown}
                          className="fixed rounded-lg shadow-2xl z-[9999] w-[220px]"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(10px)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            top: dropdownPosition?.top || 0,
                            right: dropdownPosition?.right || 0
                          }}
                        >
                          {session.status === 'completed' ? (
                            // For completed sessions, only show copy option
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                closeDropdown();
                                handleCopySession(session, dayDate);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-lg"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z"/>
                              </svg>
                              Copier
                            </button>
                          ) : (
                            <>
                              {session.status === 'draft' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeDropdown();
                                    handlePublishDraftSession(session, dayDate);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-t-lg"
                                >
                                  <Eye className="h-4 w-4" />
                                  Publier la séance
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeDropdown();
                                    handleSwitchToDraft(session, dayDate);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-t-lg"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                    <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z"/>
                                  </svg>
                                  Passer en mode brouillon
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeDropdown();
                                  handleCopySession(session, dayDate);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                  <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z"/>
                                </svg>
                                Copier
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeDropdown();
                                  handleDeleteSession(session.assignmentId || session.id, dayDate);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-b-lg"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                  <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                                </svg>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Ligne du nombre d'exercices pour les séances compactées */}
                {(hasMultipleSessions || hasMoreThanTwoSessions) && (
                  <>
                    <div className="border-b border-white/10 mb-2"></div>
                    <div className="flex items-center justify-between text-[11px] text-white/75">
                      <span className="font-light">+ {exercises.length} exercice{exercises.length > 1 ? 's' : ''}</span>
                    </div>
                  </>
                )}

                {!hasMultipleSessions && (
                  <>
                    <div className="border-b border-white/10 mb-2"></div>

                    <div className="flex flex-col gap-1.5 flex-1" style={{ marginTop: '12px' }}>
                      {exercises.map((exercise, index) => {
                        // Déterminer la couleur du nombre de séries basée sur les statuts de validation
                        const getSetsColor = () => {
                          // Seulement pour les séances terminées
                          if (session.status !== 'completed') return null;
                          
                          if (!exercise.sets || exercise.sets.length === 0) return null;
                          
                          // Vérifier les statuts de validation de toutes les séries
                          const hasFailed = exercise.sets.some(set => set.validation_status === 'failed');
                          const allCompleted = exercise.sets.every(set => set.validation_status === 'completed');
                          
                          if (hasFailed) return 'text-red-500'; // Rouge si au moins une série est en échec
                          if (allCompleted) return 'text-[#2FA064]'; // Vert si toutes les séries sont validées
                          
                          return null; // Couleur par défaut si pas toutes les séries sont validées
                        };
                        
                        const setsColor = getSetsColor();
                        const isCompleted = setsColor === 'text-[#2FA064]';
                        const isFailed = setsColor === 'text-red-500';
                        
                        return (
                          <div key={index} className="text-[11px] text-white truncate font-extralight">
                            <span className={`${setsColor || ''} ${isCompleted || isFailed ? 'font-normal' : ''}`}>
                              {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'}
                            </span>
                            {' '}
                            <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span> - <span className="font-light text-white/75">{exercise.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-0 text-[11px]">
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-normal shadow-sm flex items-center gap-1.5 ${
                        session.status === 'completed'
                          ? 'bg-[#3E6E54] text-white shadow-[#3E6E54]/20'
                          : session.status === 'in_progress'
                          ? 'bg-[#d4845a] text-white'
                          : session.status === 'draft'
                          ? 'bg-[#686762] text-white'
                          : session.status === 'assigned'
                          ? 'bg-[#3B6591] text-white'
                          : 'bg-gray-600 text-gray-200'
                      }`}
                    >
                      {session.status === 'completed' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2FA064]"></span>
                      )}
                      {session.status === 'assigned' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5B85B1]"></span>
                      )}
                      {session.status === 'draft' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4a4a47]"></span>
                      )}
                      {session.status === 'completed'
                        ? 'Terminé'
                        : session.status === 'in_progress'
                        ? 'En cours'
                        : session.status === 'draft'
                        ? 'Brouillon'
                        : session.status === 'assigned'
                        ? 'Assigné'
                        : 'Pas commencé'}
                    </span>
                    {session.status === 'completed' && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 640 640" 
                        className="w-4 h-4"
                        style={{ fill: '#2FA064' }}
                      >
                        <path d="M535.1 342.6C547.6 330.1 547.6 309.8 535.1 297.3L375.1 137.3C362.6 124.8 342.3 124.8 329.8 137.3C317.3 149.8 317.3 170.1 329.8 182.6L467.2 320L329.9 457.4C317.4 469.9 317.4 490.2 329.9 502.7C342.4 515.2 362.7 515.2 375.2 502.7L535.2 342.7zM183.1 502.6L343.1 342.6C355.6 330.1 355.6 309.8 343.1 297.3L183.1 137.3C170.6 124.8 150.3 124.8 137.8 137.3C125.3 149.8 125.3 170.1 137.8 182.6L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7z"/>
                      </svg>
                    )}

                    {/* Difficulty indicator - Only show for completed sessions with difficulty */}
                    {session.status === 'completed' && session.difficulty && (
                      <svg 
                        className={`${
                          session.difficulty.toLowerCase() === 'facile'
                            ? 'text-[#2FA064]'
                            : session.difficulty.toLowerCase() === 'moyen'
                            ? 'text-[#d4845a]'
                            : session.difficulty.toLowerCase() === 'difficile'
                            ? 'text-[#ef4444]'
                            : 'text-gray-500'
                        }`}
                        width="20"
                        height="20"
                        fill="currentColor" 
                        viewBox="0 0 640 640"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 282.9 440.5 289.9 440C296.9 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z"/>
                      </svg>
                    )}

                    {/* Difficulty Indicator - Only show for completed sessions */}
                    {/* Temporarily disabled - to be reworked later
                    {session.status === 'completed' && session.difficulty && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-light text-[10px] flex items-center gap-1 ${
                          session.difficulty.toLowerCase() === 'facile'
                            ? 'bg-[#2FA064]/20 text-[#2FA064] border border-[#2FA064]/30'
                            :                           session.difficulty.toLowerCase() === 'moyen'
                            ? 'text-[#d4845a]'
                            : session.difficulty.toLowerCase() === 'difficile'
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}
                        title={`Difficulté: ${session.difficulty}`}
                      >
                        {session.difficulty.toLowerCase() === 'facile' && (
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {session.difficulty.toLowerCase() === 'moyen' && (
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        )}
                        {session.difficulty.toLowerCase() === 'difficile' && (
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        {session.difficulty.toLowerCase() !== 'moyen' && session.difficulty}
                      </span>
                    )}
                    */}
                  </div>

                  {session.startTime && (
                    <span className="text-gray-400">
                      {format(parseISO(session.startTime), 'HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div 
        className={`flex-1 transition-all duration-300 ease-out relative`}
        style={{
          backgroundColor: isDropTarget ? 'rgba(212, 132, 90, 0.10)' : 'transparent',
          borderRadius: '0.75rem',
          minHeight: '220px',
          transition: 'background-color 0.2s ease-out'
        }}
      />
    );

    return (
      <>
        {sessionList}
        {isDropTarget && draggedSession && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ top: '40px', bottom: '0' }}>
            <div className="bg-[#d4845a] bg-opacity-25 text-[#d4845a] px-3 py-1.5 rounded-lg text-xs font-medium shadow-md" style={{ fontWeight: 500 }}>
              Déposer ici
            </div>
          </div>
        )}
        {copiedSession && hoveredPasteDate === dayKey && !draggedSession && (
          <>
            {/* Overlay avec blur et assombrissement si des séances existent */}
            {sessions.length > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 rounded-xl"
                style={{
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  transition: 'opacity 0.3s ease-out'
                }}
              />
            )}
            {/* Preview de la séance copiée - même style que le drag */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="session-container flex flex-col gap-2 transition-all duration-300 ease-out relative" style={{ height: '220px', overflowY: 'hidden' }}>
                <div className="rounded-xl transition-all duration-200 h-full flex flex-col bg-[rgba(255,255,255,0.05)] opacity-50 scale-95">
                  <div className="pt-3 pb-3 px-3 space-y-2 flex-1 flex flex-col overflow-visible" style={{ width: '100%' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                          <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z"/>
                        </svg>
                        <span className="text-[14px] font-normal truncate" style={{ color: 'var(--kaiylo-primary-hex)' }}>{copiedSession.session.title || 'Séance'}</span>
                      </div>
                    </div>
                    
                    <div className="border-b border-white/10 mb-2"></div>
                    
                    <div className="flex flex-col gap-1.5 flex-1" style={{ marginTop: '12px' }}>
                      {copiedSession.session.exercises?.slice(0, 3).map((exercise, index) => (
                        <div key={index} className="text-[11px] text-white truncate font-extralight">
                          <span className="font-light text-white/75">
                            {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'}
                          </span>
                          {' '}
                          <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span> - <span className="font-light text-white/75">{exercise.name}</span>
                        </div>
                      ))}
                      {copiedSession.session.exercises?.length > 3 && (
                        <div className="text-[11px] text-white/50 font-extralight">
                          + {copiedSession.session.exercises.length - 3} exercice{(copiedSession.session.exercises.length - 3) > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Boutons Coller et Annuler avec animation */}
            <div 
              className="absolute left-1/2 bottom-4 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-[120px]"
              style={{
                animation: 'slideUpFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              }}
            >
              <button
                className={`w-full px-5 py-2 rounded-lg text-sm shadow-lg ${
                  isPastingSession ? 'bg-[#1f3b70] text-white opacity-80 cursor-not-allowed' : 'bg-[var(--kaiylo-primary-hex)] text-white hover:bg-[var(--kaiylo-primary-hover)]'
                }`}
                style={{
                  transition: 'background-color 0.2s ease-out, transform 0.2s ease-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePasteCopiedSession(dayDate);
                }}
                disabled={isPastingSession}
                onMouseEnter={(e) => {
                  if (!isPastingSession) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isPastingSession ? 'Collage…' : 'Coller'}
              </button>
              <button
                className="w-full px-5 py-2 rounded-lg text-sm shadow-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                style={{
                  transition: 'background-color 0.2s ease-out, transform 0.2s ease-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCopiedSession(null);
                  setHoveredPasteDate(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </>
    );
  };

  const renderTrainingDayContent = (day, dateKey) => {
    const allSessions = workoutSessions[dateKey] || [];
    const sessions = getFilteredSessions(allSessions);

    const sessionList = sessions.length > 0 ? (
      <div className={`session-container flex-1 ${weekViewFilter === 2 ? 'space-y-1.5' : 'space-y-0.5'} overflow-y-auto max-h-full`}>
        {sessions.map((session, sessionIndex) => {
          const canDrag = session.status === 'draft' || session.status === 'assigned';

          return (
            <div
              key={session.id || sessionIndex}
              className={`rounded transition-all duration-200 ${
                session.status === 'draft'
                  ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                  : session.status === 'assigned'
                  ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                  : 'bg-[#262626] border-l-2 border-[#d4845a] hover:bg-[#2a2a2a]'
              } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${weekViewFilter === 2 ? 'p-1.5' : 'p-1'} ${
                draggedSession && draggedSession.id === (session.id || session.assignmentId) ? 'opacity-50 scale-95' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleSessionClick(session, day);
              }}
              draggable
              onDragStart={(event) => handleSessionDragStart(event, session, day)}
              onDragEnd={handleSessionDragEnd}
            >
              <div className={`flex items-center justify-between ${weekViewFilter === 2 ? 'mb-2' : 'mb-1'}`}>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`font-light truncate ${weekViewFilter === 2 ? 'text-sm' : 'text-[10px]'} max-w-[60%]`}>{session.title || 'Séance'}</div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {session.status === 'in_progress' && (
                      <PlayCircle className={`text-[#d4845a] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'completed' && (
                      <CheckCircle className={`text-[#22c55e] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'draft' && (
                      <EyeOff className={`text-white/50 ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'assigned' && (
                      <Clock className={`text-[#3b82f6] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                  </div>
                </div>
                {session.status !== 'completed' && session.status !== 'in_progress' && (
                  <div className="relative ml-2 dropdown-container flex-shrink-0 overflow-visible">
                    <button
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        openDropdown(session.id || session.assignmentId, dateKey, e);
                      }}
                      onMouseLeave={closeDropdown}
                      className="text-white/50 hover:text-white transition-colors flex items-center justify-center"
                      title="Options de la séance"
                    >
                      <MoreHorizontal className={weekViewFilter === 2 ? 'h-4 w-4' : 'h-3 w-3'} />
                    </button>
                    {dropdownOpen === `${session.id || session.assignmentId}-${dateKey}` && (
                      <div
                        onMouseEnter={keepDropdownOpen}
                        onMouseLeave={closeDropdown}
                        className="fixed rounded-lg shadow-2xl z-[9999] min-w-[180px]"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(10px)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          top: dropdownPosition?.top || 0,
                          right: dropdownPosition?.right || 0
                        }}
                      >
                        {session.status === 'draft' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeDropdown();
                              handlePublishDraftSession(session, day);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-t-lg"
                          >
                            <Eye className="h-4 w-4" />
                            Publier la séance
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeDropdown();
                              handleSwitchToDraft(session, day);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-t-lg"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                              <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z"/>
                            </svg>
                            Passer en mode brouillon
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            handleCopySession(session, day);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                            <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z"/>
                          </svg>
                          Copier
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeDropdown();
                            handleDeleteSession(session.assignmentId || session.id, day);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-b-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                            <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`text-white/50 ${weekViewFilter === 2 ? 'text-[10px]' : 'text-[8px]'}`}>
                + {session.exercises.length} exercises en plus
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="flex-1"></div>
    );

    return (
      <>
        {sessionList}
        {copiedSession && hoveredPasteDate === dateKey && !draggedSession && (
          <>
            {/* Overlay avec blur et assombrissement si des séances existent */}
            {sessions.length > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 rounded-lg"
                style={{
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  transition: 'opacity 0.3s ease-out'
                }}
              />
            )}
            {/* Preview de la séance copiée - même style que le drag */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="flex-1 space-y-1 overflow-y-auto">
                <div className="rounded-lg transition-all duration-200 flex-shrink-0 flex flex-col bg-[rgba(255,255,255,0.05)] opacity-50 scale-95">
                  <div className="pt-2 pb-2 px-2 space-y-2 flex-1 flex flex-col overflow-visible" style={{ width: '100%' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                          <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z"/>
                        </svg>
                        <span className="text-[12px] font-normal truncate" style={{ color: 'var(--kaiylo-primary-hex)' }}>{copiedSession.session.title || 'Séance'}</span>
                      </div>
                    </div>
                    
                    <div className="border-b border-white/10 mb-1"></div>
                    
                    <div className="flex flex-col gap-1 flex-1">
                      {copiedSession.session.exercises?.slice(0, 2).map((exercise, index) => (
                        <div key={index} className="text-[10px] text-white truncate font-extralight">
                          <span className="font-light text-white/75">
                            {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'}
                          </span>
                          {' '}
                          <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span> - <span className="font-light text-white/75">{exercise.name}</span>
                        </div>
                      ))}
                      {copiedSession.session.exercises?.length > 2 && (
                        <div className="text-[10px] text-white/50 font-extralight">
                          + {copiedSession.session.exercises.length - 2} ex.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Boutons Coller et Annuler avec animation */}
            <div 
              className="absolute left-1/2 bottom-3 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-[100px]"
              style={{
                animation: 'slideUpFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              }}
            >
              <button
                className={`w-full px-3 py-1.5 rounded-lg text-xs shadow-lg ${
                  isPastingSession ? 'bg-[#1f3b70] text-white opacity-80 cursor-not-allowed' : 'bg-[var(--kaiylo-primary-hex)] text-white hover:bg-[var(--kaiylo-primary-hover)]'
                }`}
                style={{
                  transition: 'background-color 0.2s ease-out, transform 0.2s ease-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePasteCopiedSession(day);
                }}
                disabled={isPastingSession}
                onMouseEnter={(e) => {
                  if (!isPastingSession) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isPastingSession ? 'Collage…' : 'Coller'}
              </button>
              <button
                className="w-full px-3 py-1.5 rounded-lg text-xs shadow-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/20"
                style={{
                  transition: 'background-color 0.2s ease-out, transform 0.2s ease-out'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCopiedSession(null);
                  setHoveredPasteDate(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </>
    );
  };

  const handleStudentSelect = (newStudent) => {
    if (onStudentChange) {
      onStudentChange(newStudent);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar */}
      {students.length > 0 && (
        <div className="ml-6 self-stretch flex items-stretch">
          <StudentSidebar
            students={students}
            currentStudentId={student?.id}
            onStudentSelect={handleStudentSelect}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            studentVideoCounts={studentVideoCounts}
            studentMessageCounts={studentMessageCounts}
            studentNextSessions={studentNextSessions}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 text-[#d4845a] animate-spin" />
          </div>
        ) : !studentData ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-white/50">Student data not found</div>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="relative">
        <div className="p-4 relative">
          {/* Toggle Sidebar Button */}
          {students.length > 0 && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute top-0 left-4 z-50 w-5 h-5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
          <div className="flex items-start gap-6 border-b border-b-[rgba(255,255,255,0.1)] ml-0 mt-3">
            <div className="w-[60px] h-[60px] rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0 overflow-hidden relative">
              <svg 
                className="w-[28px] h-[28px] text-white/80" 
                viewBox="0 0 448 512" 
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-light" style={{ fontWeight: 200 }}>
                {student?.full_name || student?.name || student?.profile?.full_name || 'Étudiant'}
              </h1>
              <div className="flex gap-6 mt-1" style={{ paddingLeft: '24px' }}>
                <button 
                  className={`tab-button-fixed-width pt-3 pb-2 text-sm ${activeTab === 'overview' ? 'font-normal text-[#d4845a] border-b-2 border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal'}`}
                  data-text="Tableau de bord"
                  style={activeTab !== 'overview' ? { fontWeight: 200 } : {}}
                  onClick={() => setActiveTab('overview')}
                >
                  Tableau de bord
                </button>
                <button 
                  className={`tab-button-fixed-width py-3 text-sm ${activeTab === 'training' ? 'font-normal text-[#d4845a] border-b-2 border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal'}`}
                  data-text="Entraînement"
                  style={activeTab !== 'training' ? { fontWeight: 200 } : {}}
                  onClick={() => setActiveTab('training')}
                >
                  Entraînement
                </button>
                <button 
                  className={`tab-button-fixed-width py-3 text-sm ${activeTab === 'analyse' ? 'font-normal text-[#d4845a] border-b-2 border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal'}`}
                  data-text="Analyse vidéo"
                  style={activeTab !== 'analyse' ? { fontWeight: 200 } : {}}
                  onClick={() => setActiveTab('analyse')}
                >
                  Analyse vidéo
                </button>
                <button 
                  className={`tab-button-fixed-width py-3 text-sm ${activeTab === 'suivi' ? 'font-normal text-[#d4845a] border-b-2 border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal'}`}
                  data-text="Suivi Financier"
                  style={activeTab !== 'suivi' ? { fontWeight: 200 } : {}}
                  onClick={() => setActiveTab('suivi')}
                >
                  Suivi Financier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-0" style={{ overflowX: 'hidden' }}>
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr,250px] gap-3 mb-3">
              {/* Current Block Card */}
              <div 
                className="bg-white/5 rounded-2xl px-2 py-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
                onClick={() => {
                  // Utiliser exactement la même logique que l'affichage pour charger les valeurs
                  const isNewStudent = progressStats.week.total === 0 && progressStats.trainingWeek.total === 0;
                  const displayBlockNumber = isNewStudent ? 1 : (studentData?.block_number ?? blockNumber ?? 3);
                  const displayTotalBlocks = isNewStudent ? 1 : (studentData?.total_blocks ?? totalBlocks ?? 3);
                  const displayBlockName = isNewStudent ? '' : (studentData?.block_name || blockName || 'Prépa Force');
                  
                  // Charger les valeurs calculées dans la modale
                  setBlockNumber(displayBlockNumber);
                  setTotalBlocks(displayTotalBlocks);
                  setBlockName(displayBlockName);
                  setIsBlockEditModalOpen(true);
                }}
              >
                <h2 
                  className="text-base font-normal mb-4 text-center"
                  style={{ color: 'var(--kaiylo-primary-hover)' }}
                >
                  {(() => {
                    const isNewStudent = progressStats.week.total === 0 && progressStats.trainingWeek.total === 0;
                    // Use studentData directly to ensure consistency
                    const displayBlockNumber = isNewStudent ? 1 : (studentData?.block_number ?? blockNumber ?? 3);
                    const displayTotalBlocks = isNewStudent ? 1 : (studentData?.total_blocks ?? totalBlocks ?? 3);
                    const displayBlockName = isNewStudent ? '' : (studentData?.block_name || blockName || 'Prépa Force');
                    return `Bloc ${displayBlockNumber}/${displayTotalBlocks}${displayBlockName ? ` - ${displayBlockName}` : ''}`;
                  })()}
                </h2>
                <div className="flex items-center justify-center gap-3">
                  <div 
                    className="relative w-20 h-20 cursor-help"
                    title="Progression cette semaine"
                  >
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="#262626"
                        strokeWidth="4"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="#d4845a"
                        strokeWidth="3.5"
                        fill="none"
                        strokeDasharray="226"
                        strokeDashoffset={226 - (progressStats.week.progress / 100) * 226}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-normal text-white">
                        {progressStats.week.completed}/{progressStats.week.total}
                      </span>
                    </div>
                  </div>
                  <div 
                    className="relative w-20 h-20 cursor-help"
                    title="Progression ce mois"
                  >
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="#262626"
                        strokeWidth="4"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="#d4845a"
                        strokeWidth="3.5"
                        fill="none"
                        strokeDasharray="226"
                        strokeDashoffset={226 - (progressStats.trainingWeek.progress / 100) * 226}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {progressStats.trainingWeek.completed}/{progressStats.trainingWeek.total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1RM Stats Card */}
              <div 
                className="bg-white/5 rounded-2xl pt-4 px-4 pb-2 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden border border-white/10"
                onClick={() => setIsOneRmModalOpen(true)}
              >
                <div className="mb-2 border-b border-white/10">
                  <h3 className="text-sm font-medium pb-[8px] flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 opacity-75" fill="currentColor">
                      <path d="M144.3 0l224 0c26.5 0 48.1 21.8 47.1 48.2-.2 5.3-.4 10.6-.7 15.8l49.6 0c26.1 0 49.1 21.6 47.1 49.8-7.5 103.7-60.5 160.7-118 190.5-15.8 8.2-31.9 14.3-47.2 18.8-20.2 28.6-41.2 43.7-57.9 51.8l0 73.1 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0 0-73.1c-16-7.7-35.9-22-55.3-48.3-18.4-4.8-38.4-12.1-57.9-23.1-54.1-30.3-102.9-87.4-109.9-189.9-1.9-28.1 21-49.7 47.1-49.7l49.6 0c-.3-5.2-.5-10.4-.7-15.8-1-26.5 20.6-48.2 47.1-48.2zM101.5 112l-52.4 0c6.2 84.7 45.1 127.1 85.2 149.6-14.4-37.3-26.3-86-32.8-149.6zM380 256.8c40.5-23.8 77.1-66.1 83.3-144.8L411 112c-6.2 60.9-17.4 108.2-31 144.8z"/>
                    </svg>
                    1 RM actuel
                  </h3>
                </div>
                <div className="flex flex-nowrap gap-2 pt-2 pb-2 overflow-x-auto -mx-4 px-4 onerm-scrollbar">
                  {oneRmRecords.map((record) => (
                    <div key={record.id} className="w-[84px] flex-shrink-0 p-3 bg-[rgba(0,0,0,0.35)] rounded-lg text-white">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-white font-extralight">{record.name}</span>
                      </div>
                      <p className="text-[18px] font-light mt-0.5">
                        <span style={{ color: '#d4845a' }} className="font-normal">
                          {record.current !== undefined && record.current !== null && !Number.isNaN(Number(record.current))
                            ? Number(record.current).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
                            : '0'}
                        </span>
                        <span className="text-[14px] text-white/75"> {record.unit || 'kg'}</span>
                      </p>
                    </div>
                  ))}
                  <div className="w-auto min-w-[84px] flex-shrink-0 p-3 bg-[rgba(255,255,255,0.05)] rounded-lg text-white md:ml-auto">
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-white font-extralight">Total</span>
                    </div>
                    <p className="text-[18px] font-light mt-0.5 whitespace-nowrap">
                      <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">
                        {totalOneRmCurrent !== undefined && totalOneRmCurrent !== null && !Number.isNaN(Number(totalOneRmCurrent))
                          ? Number(totalOneRmCurrent).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
                          : '—'}
                      </span>
                      {totalOneRmCurrent !== undefined && totalOneRmCurrent !== null && !Number.isNaN(Number(totalOneRmCurrent)) && (
                        <span className="text-[14px] text-white/75"> kg</span>
                      )}
                    </p>
                  </div>
                  <div className="w-auto min-w-[84px] flex-shrink-0 p-3 bg-[rgba(255,255,255,0.05)] rounded-lg text-white">
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-white font-extralight">RIS Score</span>
                    </div>
                    <p className="text-[18px] font-light mt-0.5 whitespace-nowrap">
                      <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">
                        {calculatedRIS > 0
                          ? Number(calculatedRIS).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : studentData?.oneRmRisScore?.toLocaleString?.('fr-FR', { maximumFractionDigits: 2 }) || '—'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <div 
                className="bg-white/5 rounded-2xl pt-4 px-4 pb-2 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden border border-white/10"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <div className="mb-2 border-b border-white/10">
                  <h3 className="text-sm font-medium pb-[8px] flex items-center justify-between text-[#d4845a]" style={{ fontWeight: 400 }}>
                    <div className="flex items-center gap-[10px]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 opacity-75" fill="currentColor">
                        <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/>
                      </svg>
                      Profile
                    </div>
                    <div 
                      className="relative cursor-pointer group/icon shrink-0 transition-transform duration-200 hover:scale-110 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat?studentId=${student.id}`);
                      }}
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 640 640" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-colors duration-200 ${
                          studentMessageCounts[student.id] && Number(studentMessageCounts[student.id]) > 0
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
                  </h3>
                </div>
                <div className="space-y-1 pt-2">
                  {/* Profile Information Grid */}
                  {(studentData?.discipline || studentData?.gender || studentData?.weight || studentData?.height) ? (
                    <div className="space-y-1 pt-0.5">
                      {studentData?.discipline && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-extralight">Discipline</span>
                          <span className="text-xs font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>{studentData.discipline}</span>
                        </div>
                      )}
                      {studentData?.gender && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-extralight">Sexe</span>
                          <span className="text-xs font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>{studentData.gender}</span>
                        </div>
                      )}
                      {studentData?.weight && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-extralight">Poids</span>
                          <span className="text-xs font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>{studentData.weight} kg</span>
                        </div>
                      )}
                      {studentData?.height && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50 font-extralight">Taille</span>
                          <span className="text-xs font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                            {studentData.height >= 100 ? `${(studentData.height / 100).toFixed(2)}m` : `${studentData.height} cm`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-white/50 font-extralight pt-0.5 text-center">Aucune information de profil</div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto planning-scrollbar">
              <div style={{ minWidth: '1203px', paddingRight: '0px' }}>
                {/* Week Navigation with Day Labels */}
                <div className="flex items-center mb-2" style={{ paddingLeft: '12px', paddingRight: '12px', paddingBottom: '0px' }}>
                  <button
                    onClick={() => changeOverviewWeek('prev')}
                    className="flex items-center transition-colors text-white/75 hover:text-white mr-auto"
                  >
                    <ChevronLeft className="h-[18px] w-[18px]" />
                  </button>
                  <div className="grid grid-cols-7 flex-1" style={{ gap: '8px' }}>
                    {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((dayLabel) => (
                      <div key={dayLabel} className="text-center">
                        <span className="text-[12px] text-white/75 font-extralight">{dayLabel}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => changeOverviewWeek('next')}
                    className="flex items-center transition-colors text-white/75 hover:text-white ml-auto"
                  >
                    <ChevronRight className="h-[18px] w-[18px]" />
                  </button>
                </div>

                {/* Weekly Schedule */}
                <div className="grid grid-cols-7 gap-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px', paddingRight: '8px', marginBottom: '4px' }}>
              {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day, i) => {
                const dayDate = addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i);
                const dayKey = format(dayDate, 'yyyy-MM-dd');
                const isToday = dayKey === format(new Date(), 'yyyy-MM-dd');
                const isDropTarget = dragOverDate === dayKey;

                return (
                  <div
                    key={day}
                    className="rounded-xl px-1 pt-1 pb-2 cursor-pointer transition-all duration-300 relative group min-h-[260px] overflow-hidden"
                    style={{ 
                      backgroundColor: copiedSession && hoveredPasteDate === dayKey ? 'rgba(212, 132, 90, 0.08)' : 'unset', 
                      border: 'none', 
                      width: '100%',
                      transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onClick={() => handleDayClick(dayDate)}
                    onDragOver={(event) => handleDayDragOver(event, dayDate)}
                    onDragEnter={(event) => handleDayDragOver(event, dayDate)}
                    onDragLeave={(event) => handleDragLeave(event, dayDate)}
                    onDrop={(event) => handleDayDrop(event, dayDate)}
                    onMouseEnter={() => setHoveredPasteDate(dayKey)}
                    onMouseLeave={(event) => {
                      // Check if relatedTarget is a valid node before calling contains
                      const relatedTarget = event.relatedTarget;
                      if (!relatedTarget || !(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
                        setHoveredPasteDate((current) => (current === dayKey ? null : current));
                      }
                    }}
                  >
                    <div className="text-sm text-white/75 mb-1.5 flex justify-end items-center gap-1">
                      <button className="p-1 rounded-[8px] transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:bg-white/10 group-hover:hover:bg-white/25 hover:scale-105 active:scale-95">
                        <Plus className="h-4 w-4 text-[#BFBFBF] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className={`text-[12px] font-extralight ${isToday ? 'text-white rounded-full w-6 h-6 flex items-center justify-center bg-[var(--kaiylo-primary-hover)]' : ''}`}>
                        {format(dayDate, 'dd')}
                      </span>
                    </div>

                    {renderOverviewDayContent(dayDate, dayKey, isDropTarget, draggedSession)}
                  </div>
                );
              })}
              </div>
              </div>
            </div>

            {/* Evolution des Kg/Reps, Notes et Limitations Section */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-3 mb-3 mt-3">
              {/* Evolution des Kg/Reps - Left Section (2/3 width) */}
              <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10">
                <div className="mb-4 border-b border-white/10 pb-2">
                  <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                      <path d="M128 128C128 110.3 113.7 96 96 96C78.3 96 64 110.3 64 128L64 464C64 508.2 99.8 544 144 544L544 544C561.7 544 576 529.7 576 512C576 494.3 561.7 480 544 480L144 480C135.2 480 128 472.8 128 464L128 128zM534.6 214.6C547.1 202.1 547.1 181.8 534.6 169.3C522.1 156.8 501.8 156.8 489.3 169.3L384 274.7L326.6 217.4C314.1 204.9 293.8 204.9 281.3 217.4L185.3 313.4C172.8 325.9 172.8 346.2 185.3 358.7C197.8 371.2 218.1 371.2 230.6 358.7L304 285.3L361.4 342.7C373.9 355.2 394.2 355.2 406.7 342.7L534.7 214.7z"/>
                    </svg>
                    Evolution des Kg/Reps
                  </h3>
                </div>
                {/* Grid 2x2 for exercise cards */}
                <div className="grid grid-cols-2 gap-3 relative">
                  {/* Overlay avec blur et icône "En développement" */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm bg-black/20 rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-16 h-16" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                        <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z"/>
                      </svg>
                      <span className="text-sm font-medium" style={{ color: 'var(--kaiylo-primary-hex)' }}>En développement</span>
                    </div>
                  </div>
                  {/* Muscle-up Card */}
                  <div className="bg-[rgba(0,0,0,0.5)] rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/75 font-extralight mb-1 ml-2">Muscle-up</div>
                        <div className="flex items-center gap-2 mb-2 ml-2">
                          <span className="text-lg font-normal text-white">26,1 kg</span>
                          <div className="flex items-center gap-1 text-green-500">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-normal">13%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Tonnage</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">522</span> <span className="text-[14px] text-white/75 font-extralight">kg</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Reps</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">20</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Mini chart */}
                      <div className="w-28 h-16 rounded flex-shrink-0 relative overflow-hidden flex items-center justify-center py-1 -mr-[-75px]">
                        <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="gradient-muscleup" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(212,132,89,0.5)" />
                              <stop offset="70%" stopColor="rgba(212,132,89,0.15)" />
                              <stop offset="85%" stopColor="rgba(212,132,89,0.08)" />
                              <stop offset="100%" stopColor="rgba(212,132,89,0)" />
                            </linearGradient>
                            <mask id="fade-mask-muscleup">
                              <linearGradient id="fade-gradient-muscleup" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="1" />
                                <stop offset="60%" stopColor="white" stopOpacity="1" />
                                <stop offset="80%" stopColor="white" stopOpacity="0.6" />
                                <stop offset="95%" stopColor="white" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                              </linearGradient>
                              <rect x="0" y="0" width="100" height="48" fill="url(#fade-gradient-muscleup)" />
                            </mask>
                          </defs>
                          <g mask="url(#fade-mask-muscleup)">
                            <path
                              d="M 0,44 Q 12,40 20,34 T 40,25 T 60,19 T 80,13 T 100,8 L 100,44 Z"
                              fill="url(#gradient-muscleup)"
                            />
                            <path
                              d="M 0,44 Q 12,40 20,34 T 40,25 T 60,19 T 80,13 T 100,8"
                              stroke="#d4845a"
                              strokeWidth="1.5"
                              fill="none"
                              opacity="0.8"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Pull-up Card */}
                  <div className="bg-[rgba(0,0,0,0.5)] rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/75 font-extralight mb-1 ml-2">Pull-up</div>
                        <div className="flex items-center gap-2 mb-2 ml-2">
                          <span className="text-lg font-normal text-white">72 kg</span>
                          <div className="flex items-center gap-1 text-green-500">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-xs font-normal">19%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Tonnage</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">864</span> <span className="text-[14px] text-white/75 font-extralight">kg</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Reps</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">12</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Mini chart */}
                      <div className="w-28 h-16 rounded flex-shrink-0 relative overflow-hidden flex items-center justify-center py-1 -mr-[-75px]">
                        <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="gradient-pullup" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(212,132,89,0.6)" />
                              <stop offset="70%" stopColor="rgba(212,132,89,0.2)" />
                              <stop offset="85%" stopColor="rgba(212,132,89,0.08)" />
                              <stop offset="100%" stopColor="rgba(212,132,89,0)" />
                            </linearGradient>
                            <mask id="fade-mask-pullup">
                              <linearGradient id="fade-gradient-pullup" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="1" />
                                <stop offset="60%" stopColor="white" stopOpacity="1" />
                                <stop offset="80%" stopColor="white" stopOpacity="0.6" />
                                <stop offset="95%" stopColor="white" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                              </linearGradient>
                              <rect x="0" y="0" width="100" height="48" fill="url(#fade-gradient-pullup)" />
                            </mask>
                          </defs>
                          <g mask="url(#fade-mask-pullup)">
                            <path
                              d="M 0,44 Q 15,42 25,38 T 50,26 T 75,11 T 100,5 L 100,44 Z"
                              fill="url(#gradient-pullup)"
                            />
                            <path
                              d="M 0,44 Q 15,42 25,38 T 50,26 T 75,11 T 100,5"
                              stroke="#d4845a"
                              strokeWidth="1.5"
                              fill="none"
                              opacity="0.9"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Dips Card */}
                  <div className="bg-[rgba(0,0,0,0.5)] rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/75 font-extralight mb-1 ml-2">Dips</div>
                        <div className="flex items-center gap-2 mb-2 ml-2">
                          <span className="text-lg font-normal text-white">88 kg</span>
                          <div className="flex items-center gap-1 text-red-500">
                            <TrendingUp className="h-3 w-3 rotate-180" />
                            <span className="text-xs font-normal">19%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Tonnage</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">880</span> <span className="text-[14px] text-white/75 font-extralight">kg</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Reps</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">10</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Mini chart */}
                      <div className="w-28 h-16 rounded flex-shrink-0 relative overflow-hidden flex items-center justify-center py-1 -mr-[-75px]">
                        <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="gradient-dips" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(212,132,89,0.5)" />
                              <stop offset="70%" stopColor="rgba(212,132,89,0.15)" />
                              <stop offset="85%" stopColor="rgba(212,132,89,0.08)" />
                              <stop offset="100%" stopColor="rgba(212,132,89,0)" />
                            </linearGradient>
                            <mask id="fade-mask-dips">
                              <linearGradient id="fade-gradient-dips" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="1" />
                                <stop offset="60%" stopColor="white" stopOpacity="1" />
                                <stop offset="80%" stopColor="white" stopOpacity="0.6" />
                                <stop offset="95%" stopColor="white" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                              </linearGradient>
                              <rect x="0" y="0" width="100" height="48" fill="url(#fade-gradient-dips)" />
                            </mask>
                          </defs>
                          <g mask="url(#fade-mask-dips)">
                            <path
                              d="M 0,36 Q 10,34 20,32 Q 30,30 40,32 Q 50,34 60,30 Q 70,32 80,34 Q 90,36 100,38 L 100,44 L 0,44 Z"
                              fill="url(#gradient-dips)"
                            />
                            <path
                              d="M 0,36 Q 10,34 20,32 Q 30,30 40,32 Q 50,34 60,30 Q 70,32 80,34 Q 90,36 100,38"
                              stroke="#d4845a"
                              strokeWidth="1.5"
                              fill="none"
                              opacity="0.8"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Squat Card */}
                  <div className="bg-[rgba(0,0,0,0.5)] rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/75 font-extralight mb-1 ml-2">Squat</div>
                        <div className="flex items-center gap-2 mb-2 ml-2">
                          <span className="text-lg font-normal text-white">163 kg</span>
                          <div className="flex items-center gap-1 text-red-500">
                            <TrendingUp className="h-3 w-3 rotate-180" />
                            <span className="text-xs font-normal">24%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Tonnage</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">815</span> <span className="text-[14px] text-white/75 font-extralight">kg</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 p-2 bg-[rgba(255,255,255,0.05)] rounded-[10px] text-white">
                            <div className="text-[12px] font-medium" style={{ color: 'var(--kaiylo-primary-hover)' }}>Reps</div>
                            <p className="text-[18px] font-light mt-0.5">
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }} className="font-normal">5</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Mini chart */}
                      <div className="w-28 h-16 rounded flex-shrink-0 relative overflow-hidden flex items-center justify-center py-1 -mr-[-75px]">
                        <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="gradient-squat" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(212,132,89,0.55)" />
                              <stop offset="70%" stopColor="rgba(212,132,89,0.18)" />
                              <stop offset="85%" stopColor="rgba(212,132,89,0.08)" />
                              <stop offset="100%" stopColor="rgba(212,132,89,0)" />
                            </linearGradient>
                            <mask id="fade-mask-squat">
                              <linearGradient id="fade-gradient-squat" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="white" stopOpacity="1" />
                                <stop offset="60%" stopColor="white" stopOpacity="1" />
                                <stop offset="80%" stopColor="white" stopOpacity="0.6" />
                                <stop offset="95%" stopColor="white" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                              </linearGradient>
                              <rect x="0" y="0" width="100" height="48" fill="url(#fade-gradient-squat)" />
                            </mask>
                          </defs>
                          <g mask="url(#fade-mask-squat)">
                            <path
                              d="M 0,40 Q 8,38 16,36 Q 24,34 32,32 Q 40,30 48,32 Q 56,34 64,31 Q 72,32 80,34 Q 88,36 100,36 L 100,44 L 0,44 Z"
                              fill="url(#gradient-squat)"
                            />
                            <path
                              d="M 0,40 Q 8,38 16,36 Q 24,34 32,32 Q 40,30 48,32 Q 56,34 64,31 Q 72,32 80,34 Q 88,36 100,36"
                              stroke="#d4845a"
                              strokeWidth="1.5"
                              fill="none"
                              opacity="0.85"
                            />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes et Limitations - Right Section (1/3 width) */}
              <div className="flex flex-col gap-3">
                {/* Notes Card */}
                <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10 flex-1">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 opacity-75" fill="currentColor">
                        <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
                      </svg>
                      Notes
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="relative group text-xs text-white/75 font-normal flex items-start gap-2 p-2 rounded-lg bg-white/5 transition-all duration-200 hover:backdrop-blur-sm hover:bg-black/30 cursor-pointer">
                      <span className="text-[#d4845a] mt-0.5 transition-all duration-200 group-hover:blur-sm group-hover:opacity-40">•</span>
                      <span className="transition-all duration-200 group-hover:blur-sm group-hover:text-white/40">A besoin d'une prog pour le bloc prochain azap</span>
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <Pencil className="w-4 h-4 text-[#d4845a]" />
                        <Trash2 className="w-4 h-4 text-[#d4845a]" />
                      </div>
                    </div>
                    <div className="relative group text-xs text-white/75 font-normal flex items-start gap-2 p-2 rounded-lg bg-white/5 transition-all duration-200 hover:backdrop-blur-sm hover:bg-black/30 cursor-pointer">
                      <span className="text-[#d4845a] mt-0.5 transition-all duration-200 group-hover:blur-sm group-hover:opacity-40">•</span>
                      <span className="transition-all duration-200 group-hover:blur-sm group-hover:text-white/40">Part en vacance 2 semaines</span>
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <Pencil className="w-4 h-4 text-[#d4845a]" />
                        <Trash2 className="w-4 h-4 text-[#d4845a]" />
                      </div>
                    </div>
                    <div className="relative group text-xs text-white/75 font-normal flex items-start gap-2 p-2 rounded-lg bg-white/5 transition-all duration-200 hover:backdrop-blur-sm hover:bg-black/30 cursor-pointer">
                      <span className="text-[#d4845a] mt-0.5 transition-all duration-200 group-hover:blur-sm group-hover:opacity-40">•</span>
                      <span className="transition-all duration-200 group-hover:blur-sm group-hover:text-white/40">A pas fait la séance du 13/09</span>
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <Pencil className="w-4 h-4 text-[#d4845a]" />
                        <Trash2 className="w-4 h-4 text-[#d4845a]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limitations et blessures Card */}
                <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10 flex-1">
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 opacity-75" fill="currentColor">
                        <path d="M200 48l112 0c4.4 0 8 3.6 8 8l0 40-128 0 0-40c0-4.4 3.6-8 8-8zm-56 8l0 40-80 0C28.7 96 0 124.7 0 160L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64l-80 0 0-40c0-30.9-25.1-56-56-56L200 0c-30.9 0-56 25.1-56 56zm80 160c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 40 40 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-40 0 0 40c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-40-40 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16l40 0 0-40z"/>
                      </svg>
                      Limitations et blessures
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-white/75 font-extralight flex items-start gap-2">
                      <span className="text-[#d4845a] mt-0.5">•</span>
                      <span>Douleure au pec gauche</span>
                    </div>
                    <div className="text-xs text-white/75 font-extralight flex items-start gap-2">
                      <span className="text-[#d4845a] mt-0.5">•</span>
                      <span>Asthmatique</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'training' && (
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeTrainingWeek('prev')} className="p-1.5 rounded-full hover:bg-white/10">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-light text-white/75 w-40 text-center">
                    {format(startOfWeek(trainingWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} - {format(addDays(startOfWeek(trainingWeekDate, { weekStartsOn: 1 }), (weekViewFilter * 7) - 1), 'd MMM yyyy', { locale: fr })}
                  </span>
                  <button onClick={() => changeTrainingWeek('next')} className="p-1.5 rounded-full hover:bg-white/10">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setTrainingWeekDate(new Date())}
                  className="bg-[rgba(255,255,255,0.1)] text-white/75 text-xs px-3 py-1.5 rounded-full hover:bg-white/20"
                >
                  Aujourd'hui
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Filter Dropdown */}
                <select
                  value={trainingFilter}
                  onChange={(e) => setTrainingFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-md select-dark text-white/75 hover:bg-white/5 focus:outline-none focus:border-[#d4845a] transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%23FFFFFF' stroke-opacity='0.75' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '28px'
                  }}
                >
                  <option value="all" className="bg-[#1a1a1a] text-white">Tous</option>
                  <option value="assigned" className="bg-[#1a1a1a] text-white">Assigné</option>
                  <option value="draft" className="bg-[#1a1a1a] text-white">Brouillon</option>
                </select>

                <div className="h-5 w-[1px] bg-white/20 mx-2"></div>

                {/* Week View Filter Dropdown */}
                <select
                  value={weekViewFilter}
                  onChange={(e) => setWeekViewFilter(Number(e.target.value))}
                  className="text-xs px-3 py-1.5 rounded-full select-dark text-white/75 hover:bg-white/5 focus:outline-none focus:border-[#d4845a] transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%23FFFFFF' stroke-opacity='0.75' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '28px'
                  }}
                >
                  <option value="2" className="bg-[#1a1a1a] text-white">2 semaines</option>
                  <option value="4" className="bg-[#1a1a1a] text-white">4 semaines</option>
                </select>
              </div>
            </div>

            <div className="border-b border-white/10 mb-3"></div>
            
            {/* Calendar Grid */}
            <div className="pr-14">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(day => (
                  <div key={day} className="text-center text-xs text-white/50 font-light">
                    {day}
                  </div>
                ))}
              </div>

              {/* Weeks with potential overlays */}
              <div className="flex flex-col gap-2">
                {(() => {
                  // Group days by week for rendering
                  const weeks = [];
                  let currentWeek = [];
                  
                  trainingWeeks.forEach((day, index) => {
                    if (!isValid(day)) return;
                    currentWeek.push({ day, index });
                    
                    if (currentWeek.length === 7 || index === trainingWeeks.length - 1) {
                      weeks.push([...currentWeek]);
                      currentWeek = [];
                    }
                  });
                  
                  return weeks.map((weekDays, weekIndex) => {
                    const weekStart = startOfWeek(weekDays[0].day, { weekStartsOn: 1 });
                    const weekKey = format(weekStart, 'yyyy-MM-dd');
                    
                    return (
                      <div key={weekKey} className="relative group">
                        {/* Week Actions - Side Buttons */}
                        <div className="absolute -right-12 top-0 bottom-0 flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 px-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyWeek(weekStart);
                            }}
                            className="p-2 bg-[#262626] rounded-full text-white/50 hover:text-white hover:bg-[#333] shadow-lg border border-white/10 transition-transform hover:scale-110"
                            title="Copier la semaine"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          
                          {copiedWeek && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePasteWeek(weekStart);
                              }}
                              className="p-2 bg-[#262626] rounded-full text-white/50 hover:text-white hover:bg-[#333] shadow-lg border border-white/10 transition-transform hover:scale-110"
                              title="Coller la semaine"
                            >
                              <Clipboard className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWeek(weekStart);
                            }}
                            className="p-2 bg-[#262626] rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/20 shadow-lg border border-white/10 transition-transform hover:scale-110"
                            title="Supprimer la semaine"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* The Grid for this week */}
                        <div className="grid grid-cols-7 gap-2">
                          {weekDays.map(({ day, index }) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const sessionsOnDay = (workoutSessions[dateKey] || []).filter(session => {
                              if (trainingFilter === 'all') return true;
                              return session.status === trainingFilter;
                            });
                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                            const isDropTarget = dragOverDate === dateKey;
                            
                            return (
                              <div
                                key={dateKey}
                                className="bg-[rgba(255,255,255,0.05)] rounded-lg p-2 flex flex-col h-[200px] transition-all duration-300 relative"
                                onDragOver={(e) => handleDayDragOver(e, day)}
                                onDragEnter={(e) => handleDayDragOver(e, day)}
                                onDragLeave={(e) => handleDragLeave(e, day)}
                                onDrop={(e) => handleDayDrop(e, day)}
                              >
                                <div className="flex items-center mb-2">
                                  <span className={`text-xs ${isToday ? 'bg-[#d4845a] rounded-full flex items-center justify-center h-5 w-5 text-white' : 'text-white/50'}`}>
                                    {format(day, 'd')}
                                  </span>
                                </div>
                                
                                <div 
                                  className={`flex-1 space-y-1 overflow-y-auto transition-all duration-300 ease-out rounded`}
                                  style={{
                                    backgroundColor: isDropTarget ? 'rgba(212, 132, 90, 0.10)' : 'transparent',
                                    padding: isDropTarget ? '4px' : '0',
                                    transition: 'background-color 0.2s ease-out, padding 0.2s ease-out'
                                  }}
                                >
                                  {sessionsOnDay.map(session => {
                                    const exercises = session.exercises || [];
                                    const sessionTitle = session.title || 'Séance';
                                    return (
                                      <div key={session.id || session.workoutSessionId} 
                                           draggable={session.status === 'draft' || session.status === 'assigned'}
                                           onDragStart={(e) => handleSessionDragStart(e, session, day)}
                                           onDragEnd={handleSessionDragEnd}
                                           onClick={() => handleSessionClick(session, day)}
                                           className={`bg-[rgba(255,255,255,0.03)] border border-white/20 rounded-md p-1.5 cursor-pointer transition-all duration-200 ${
                                             draggedSession && (draggedSession.id === session.id || draggedSession.assignmentId === session.assignmentId || draggedSession.workoutSessionId === session.workoutSessionId) ? 'opacity-50 scale-95' : ''
                                           }`}
                                      >
                                        <p className="text-xs text-[#d4845a] truncate">{sessionTitle}</p>
                                        <p className="text-[10px] text-white/60">
                                          {exercises.length} exercise{exercises.length > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {isDropTarget && draggedSession && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div className="bg-[#d4845a] bg-opacity-25 text-[#d4845a] px-2.5 py-1 rounded-lg text-[10px] font-medium shadow-md" style={{ fontWeight: 500 }}>
                                      Déposer ici
                                    </div>
                                  </div>
                                )}
                                <button onClick={() => handleDayClick(day)} className="mt-auto flex items-center justify-center w-full h-6 bg-white/5 rounded-md hover:bg-white/10">
                                  <Plus className="h-4 w-4 text-white/50" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analyse' && (
          <div className="p-4">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="A feedback">A feedback</option>
                  <option value="Complété">Complété</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              </div>

              {/* Exercise Filter */}
              <div className="relative">
                <select
                  value={exerciseFilter}
                  onChange={(e) => setExerciseFilter(e.target.value)}
                  className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Exercice</option>
                  {getUniqueExercises().map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Add Filter Button */}
              <button className="px-4 py-2 text-white/50 hover:text-white transition-colors text-sm">
                + Filter
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  fetchStudentVideos();
                }}
                disabled={videosLoading}
                className="px-3 py-2 text-white/50 hover:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Rafraîchir la liste des vidéos"
              >
                <RefreshCw className={`h-4 w-4 ${videosLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Video Count */}
              <div className="ml-auto text-sm text-white/50">
                {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''} {statusFilter === 'A feedback' ? 'à feedback' : 'trouvée' + (filteredVideos.length > 1 ? 's' : '')}
              </div>
            </div>

            {videosLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                <span className="ml-2 text-white/50">Chargement des vidéos...</span>
              </div>
            )}

            {!videosLoading && renderStudentVideosGrouped()}
          </div>
        )}

        {activeTab === 'suivi' && (
          <div className="p-4 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-16 h-16 text-white/25">
                <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z" fill="currentColor"/>
              </svg>
              <p className="text-white/25 text-lg">Page en cours de développement</p>
            </div>
          </div>
        )}
        </div>

        {/* Modals */}
        <CreateWorkoutSessionModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedSession(null); // Réinitialiser selectedSession à la fermeture
          }}
          selectedDate={selectedDate}
          onSessionCreated={handleSessionCreated}
          studentId={student.id}
          existingSession={selectedSession}
        />

        <WorkoutSessionDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          session={selectedSession}
          selectedDate={selectedDate}
        />

        <StudentProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          studentData={studentData}
          onUpdate={async (updatedData) => {
            // Update local state immediately for better UX
            setStudentData(prev => ({ ...prev, ...updatedData }));
            // Refresh full student details to ensure consistency
            await fetchStudentDetails();
          }}
        />

        <DeleteSessionModal
          isOpen={isDeleteSessionModalOpen}
          onClose={() => {
            setIsDeleteSessionModalOpen(false);
            setSessionToDelete(null);
          }}
          onConfirm={confirmDeleteSession}
          sessionTitle={sessionToDelete?.sessionTitle}
          loading={isDeletingSession}
        />

        <PublishSessionModal
          isOpen={isPublishSessionModalOpen}
          onClose={() => {
            setIsPublishSessionModalOpen(false);
            setSessionToPublish(null);
          }}
          onConfirm={confirmPublishSession}
          sessionTitle={sessionToPublish?.session?.title}
          loading={isPublishingSession}
        />

        <SwitchToDraftModal
          isOpen={isSwitchToDraftModalOpen}
          onClose={() => {
            setIsSwitchToDraftModalOpen(false);
            setSessionToSwitchToDraft(null);
          }}
          onConfirm={confirmSwitchToDraft}
          sessionTitle={sessionToSwitchToDraft?.session?.title}
          loading={isSwitchingToDraft}
        />

          <OneRmModal
          isOpen={isOneRmModalOpen}
          onClose={() => setIsOneRmModalOpen(false)}
          data={oneRmRecords}
          studentName={student?.full_name || student?.name || student?.profile?.full_name || studentData?.name || 'Athlète'}
          bodyWeight={studentData?.weight ? Number(studentData.weight) : null}
          gender={studentData?.gender || null}
          onSave={async (updatedLifts) => {
          try {
            const token = localStorage.getItem('authToken');
            const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
            
            // Préparer les données à sauvegarder
            const oneRepMaxes = updatedLifts.map(lift => {
              // Vérifier si la valeur a changé par rapport aux données originales
              const originalLift = oneRmRecords.find(l => l.id === lift.id);
              const valueChanged = originalLift && Number(originalLift.current) !== Number(lift.current);
              
              // Mettre à jour l'historique si la valeur a changé
              let updatedHistory = lift.history || [];
              if (valueChanged) {
                // Ajouter une nouvelle entrée au début de l'historique avec la date actuelle
                updatedHistory = [
                  {
                    value: Number(lift.current),
                    date: today,
                    label: lift.lastSession || 'Mise à jour'
                  },
                  ...updatedHistory
                ];
              }
              
              return {
                id: lift.id,
                name: lift.name,
                current: Number(lift.current) || 0,
                best: Number(lift.best) || Number(lift.current) || 0,
                unit: lift.unit || 'kg',
                delta: Number(lift.delta) || 0,
                goal: lift.goal,
                weeklyVolume: lift.weeklyVolume,
                totalReps: lift.totalReps,
                lastSession: lift.lastSession,
                history: updatedHistory
              };
            });

            // Mettre à jour les données localement
            setStudentData(prev => ({
              ...prev,
              oneRepMaxes: oneRepMaxes
            }));

            // Sauvegarder dans le backend
            try {
              const response = await axios.put(
                `${getApiBaseUrlWithApi()}/coach/student/${student.id}/one-rep-max`,
                { oneRepMaxes },
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              if (response.data.success) {
                // Sauvegarder aussi dans localStorage comme cache
                const storageKey = `oneRm_${student.id}`;
                localStorage.setItem(storageKey, JSON.stringify(oneRepMaxes));
                console.log('✅ 1RM sauvegardées dans le backend:', oneRepMaxes);
              } else {
                throw new Error(response.data.message || 'Erreur lors de la sauvegarde');
              }
            } catch (apiError) {
              console.error('Erreur lors de la sauvegarde dans le backend:', apiError);
              // Fallback: sauvegarder dans localStorage
              const storageKey = `oneRm_${student.id}`;
              localStorage.setItem(storageKey, JSON.stringify(oneRepMaxes));
              console.warn('⚠️ Sauvegarde dans localStorage uniquement (backend indisponible)');
              alert('Les modifications ont été sauvegardées localement. Veuillez réessayer plus tard pour synchroniser avec le serveur.');
            }
          } catch (error) {
            console.error('Erreur lors de la sauvegarde des 1RM:', error);
            alert('Erreur lors de la sauvegarde des modifications');
          }
        }}
        onSaveAndClose={async (updatedLifts) => {
          try {
            const token = localStorage.getItem('authToken');
            const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
            
            // Préparer les données à sauvegarder
            const oneRepMaxes = updatedLifts.map(lift => {
              // Vérifier si la valeur a changé par rapport aux données originales
              const originalLift = oneRmRecords.find(l => l.id === lift.id);
              const valueChanged = originalLift && Number(originalLift.current) !== Number(lift.current);
              
              // Mettre à jour l'historique si la valeur a changé
              let updatedHistory = lift.history || [];
              if (valueChanged) {
                // Ajouter une nouvelle entrée au début de l'historique avec la date actuelle
                updatedHistory = [
                  {
                    value: Number(lift.current),
                    date: today,
                    label: lift.lastSession || 'Mise à jour'
                  },
                  ...updatedHistory
                ];
              }
              
              return {
                id: lift.id,
                name: lift.name,
                current: Number(lift.current) || 0,
                best: Number(lift.best) || Number(lift.current) || 0,
                unit: lift.unit || 'kg',
                delta: Number(lift.delta) || 0,
                goal: lift.goal,
                weeklyVolume: lift.weeklyVolume,
                totalReps: lift.totalReps,
                lastSession: lift.lastSession,
                history: updatedHistory,
                color: lift.color
              };
            });

            // Sauvegarder dans le backend
            try {
              const response = await axios.put(
                `${getApiBaseUrlWithApi()}/coach/student/${student.id}/one-rep-max`,
                { oneRepMaxes },
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              if (response.data.success) {
                // Mettre à jour les données localement après succès backend
                setStudentData(prev => ({
                  ...prev,
                  oneRepMaxes: oneRepMaxes
                }));

                // Sauvegarder aussi dans localStorage comme cache
                const storageKey = `oneRm_${student.id}`;
                localStorage.setItem(storageKey, JSON.stringify(oneRepMaxes));

                console.log('✅ 1RM sauvegardées dans le backend et modale fermée:', oneRepMaxes);
                setIsOneRmModalOpen(false);
              } else {
                throw new Error(response.data.message || 'Erreur lors de la sauvegarde');
              }
            } catch (apiError) {
              console.error('Erreur lors de la sauvegarde dans le backend:', apiError);
              // Fallback: sauvegarder dans localStorage et mettre à jour l'état local
              const storageKey = `oneRm_${student.id}`;
              localStorage.setItem(storageKey, JSON.stringify(oneRepMaxes));
              
              setStudentData(prev => ({
                ...prev,
                oneRepMaxes: oneRepMaxes
              }));
              
              console.warn('⚠️ Sauvegarde dans localStorage uniquement (backend indisponible)');
              alert('Les modifications ont été sauvegardées localement. Veuillez réessayer plus tard pour synchroniser avec le serveur.');
              setIsOneRmModalOpen(false);
            }
          } catch (error) {
            console.error('Erreur lors de la sauvegarde des 1RM:', error);
            alert('Erreur lors de la sauvegarde des modifications');
          }
        }}
      />

        <VideoDetailModal 
          isOpen={isVideoDetailModalOpen}
          onClose={() => setIsVideoDetailModalOpen(false)}
          video={selectedVideo}
          onFeedbackUpdate={handleFeedbackUpdate}
          videoType="student"
          isCoachView={true}
        />

        <CoachSessionReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          session={selectedSession}
          selectedDate={selectedDate}
          studentId={student.id}
        />

        {/* Block Edit Modal */}
        {isBlockEditModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
            style={{ zIndex: 100 }}
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not on child elements
              if (e.target === e.currentTarget && !isSavingBlock) {
                setIsBlockEditModalOpen(false);
              }
            }}
            onMouseDown={(e) => {
              // Prevent closing when clicking inside the modal
              if (e.target !== e.currentTarget) {
                e.stopPropagation();
              }
            }}
          >
            <div 
              className="relative mx-auto w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
              style={{
                background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
                opacity: 0.95
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                    <path d="M232.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 149.8C5.4 145.8 0 137.3 0 128s5.4-17.9 13.9-21.8L232.5 5.2zM48.1 218.4l164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 277.8C5.4 273.8 0 265.3 0 256s5.4-17.9 13.9-21.8l34.1-15.8zM13.9 362.2l34.1-15.8 164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 405.8C5.4 401.8 0 393.3 0 384s5.4-17.9 13.9-21.8z"/>
                  </svg>
                  <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    Paramètres du bloc
                  </h2>
                </div>
                <button
                  onClick={() => setIsBlockEditModalOpen(false)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                    <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                  </svg>
                </button>
              </div>
              <div className="border-b border-white/10 mx-6"></div>

              {/* Form */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
                <div>
                  <label className="block text-sm font-extralight text-white/50 mb-2">
                    Numéro de bloc
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] h-[36px] w-14 flex items-center justify-center pr-[10px]">
                      <input
                        type="number"
                        value={blockNumber}
                        onChange={(e) => {
                          e.stopPropagation();
                          const value = parseInt(e.target.value) || 1;
                          setBlockNumber(value);
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setBlockNumber(prev => Math.max(1, prev + 1));
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setBlockNumber(prev => Math.max(1, prev - 1));
                          }
                        }}
                        className="w-full h-full bg-transparent border-none text-white text-sm text-center placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none px-2"
                        min="1"
                        disabled={isSavingBlock}
                      />
                      <div className="absolute right-[1px] top-0 bottom-0 flex flex-col justify-center items-center gap-0 pointer-events-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockNumber(prev => Math.max(1, prev + 1));
                          }}
                          disabled={isSavingBlock}
                          className="pointer-events-auto p-0.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                          tabIndex={-1}
                        >
                          <ChevronUp className="h-3 w-3 text-white/50" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockNumber(prev => Math.max(1, prev - 1));
                          }}
                          disabled={isSavingBlock}
                          className="pointer-events-auto p-0.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                          tabIndex={-1}
                        >
                          <ChevronDown className="h-3 w-3 text-white/50" />
                        </button>
                      </div>
                    </div>
                    <span className="text-white/50 text-sm">/</span>
                    <div className="relative bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[10px] h-[36px] w-14 flex items-center justify-center pr-[10px]">
                      <input
                        type="number"
                        value={totalBlocks}
                        onChange={(e) => {
                          e.stopPropagation();
                          const value = parseInt(e.target.value) || 1;
                          setTotalBlocks(value);
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setTotalBlocks(prev => Math.max(1, prev + 1));
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setTotalBlocks(prev => Math.max(1, prev - 1));
                          }
                        }}
                        className="w-full h-full bg-transparent border-none text-white text-sm text-center placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none px-2"
                        min="1"
                        disabled={isSavingBlock}
                      />
                      <div className="absolute right-[1px] top-0 bottom-0 flex flex-col justify-center items-center gap-0 pointer-events-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTotalBlocks(prev => Math.max(1, prev + 1));
                          }}
                          disabled={isSavingBlock}
                          className="pointer-events-auto p-0.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                          tabIndex={-1}
                        >
                          <ChevronUp className="h-3 w-3 text-white/50" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTotalBlocks(prev => Math.max(1, prev - 1));
                          }}
                          disabled={isSavingBlock}
                          className="pointer-events-auto p-0.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                          tabIndex={-1}
                        >
                          <ChevronDown className="h-3 w-3 text-white/50" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-extralight text-white/50 mb-2">
                    Nom du bloc
                  </label>
                  <input
                    type="text"
                    value={blockName}
                    onChange={(e) => {
                      e.stopPropagation();
                      setBlockName(e.target.value);
                    }}
                    onFocus={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Nom du bloc"
                    className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
                    disabled={isSavingBlock}
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-extralight text-white/50 mb-3">Indicateurs de progression</h3>
                  <div className="space-y-2 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#d4845a]"></div>
                      <span>
                        <span className="text-[var(--kaiylo-primary-hex)]">1er graphique :</span>
                        <span className="text-white/75 font-light"> Séances réalisées / assignées (semaine)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#d4845a]"></div>
                      <span>
                        <span className="text-[var(--kaiylo-primary-hex)]">2e graphique :</span>
                        <span className="text-white/75 font-light"> Séances réalisées / assignées (mois)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isSavingBlock) {
                        setIsBlockEditModalOpen(false);
                        // Reset to original values using the same logic as display
                        const isNewStudent = progressStats.week.total === 0 && progressStats.trainingWeek.total === 0;
                        const displayBlockNumber = isNewStudent ? 1 : (studentData?.block_number ?? blockNumber ?? 3);
                        const displayTotalBlocks = isNewStudent ? 1 : (studentData?.total_blocks ?? totalBlocks ?? 3);
                        const displayBlockName = isNewStudent ? '' : (studentData?.block_name || blockName || 'Prépa Force');
                        
                        setBlockNumber(displayBlockNumber);
                        setTotalBlocks(displayTotalBlocks);
                        setBlockName(displayBlockName);
                      }
                    }}
                    disabled={isSavingBlock}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={saveBlockInformation}
                    disabled={isSavingBlock}
                    className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                  >
                    {isSavingBlock ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDetailView;