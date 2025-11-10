import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, FileText, AlertTriangle, User, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, ChevronDown, Loader2, Trash2, Eye, EyeOff, Copy, Clipboard, MoreHorizontal, Edit2, Save, X } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import WorkoutSessionDetailsModal from './WorkoutSessionDetailsModal';
import CoachSessionReviewModal from './CoachSessionReviewModal';
import VideoDetailModal from './VideoDetailModal';
import OneRmModal, { DEFAULT_ONE_RM_DATA } from './OneRmModal';
import { format, addDays, startOfWeek, subDays, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import useSocket from '../hooks/useSocket'; // Import the socket hook

const StudentDetailView = ({ student, onBack, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isOneRmModalOpen, setIsOneRmModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState(null); // Session currently being dragged
  const [draggedFromDate, setDraggedFromDate] = useState(null); // Original date for the dragged session
  const [dragOverDate, setDragOverDate] = useState(null); // Date currently highlighted as drop target
  const [isRescheduling, setIsRescheduling] = useState(false); // Prevent concurrent rescheduling calls
  const [overviewWeekDate, setOverviewWeekDate] = useState(new Date()); // For overview weekly calendar
  const [trainingMonthDate, setTrainingMonthDate] = useState(new Date()); // For training monthly calendar
  const [workoutSessions, setWorkoutSessions] = useState({}); // Will store arrays of sessions per date
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState(null); // Track which week is being hovered
  const [copiedWeek, setCopiedWeek] = useState(null); // Store copied week data for pasting
  const [trainingFilter, setTrainingFilter] = useState('all'); // Filter for training view: 'assigned', 'draft', 'all'
  const [weekViewFilter, setWeekViewFilter] = useState(4); // Week view filter: 2 or 4 weeks
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which session dropdown is open: 'sessionId-date'
  const [dropdownPosition, setDropdownPosition] = useState(null); // Store dropdown position
  
  // Video analysis state
  const [studentVideos, setStudentVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  
  // Video filters
  const [statusFilter, setStatusFilter] = useState(''); // Empty string means no filter
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Block information state
  const [blockNumber, setBlockNumber] = useState(3);
  const [totalBlocks, setTotalBlocks] = useState(3);
  const [blockName, setBlockName] = useState('Prépa Force');
  const [isEditingBlock, setIsEditingBlock] = useState(false);

  const { socket } = useSocket();

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
        setDropdownPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  const changeOverviewWeek = (direction) => {
    const newDate = direction === 'next' ? addDays(overviewWeekDate, 7) : subDays(overviewWeekDate, 7);
    setOverviewWeekDate(newDate);
  };

  const changeTrainingMonth = (direction) => {
    if (weekViewFilter === 2) {
      // For 2-week view, navigate by 2 weeks from the current trainingMonthDate
      const newDate = direction === 'next' ? addDays(trainingMonthDate, 14) : subDays(trainingMonthDate, 14);
      setTrainingMonthDate(newDate);
    } else {
      // For 4-week view, navigate by month
      const newDate = direction === 'next' ? addMonths(trainingMonthDate, 1) : subMonths(trainingMonthDate, 1);
      setTrainingMonthDate(newDate);
    }
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

  const handleDayDragLeave = (event, day) => {
    if (!draggedSession) return;
    // Only clear highlight when leaving the current card entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragOverDate((current) => (current === format(day, 'yyyy-MM-dd') ? null : current));
    }
  };

  const handleDayDrop = async (event, day) => {
    if (!draggedSession || !draggedFromDate) return;
    event.preventDefault();
    const targetDate = day;
    const fromDate = draggedFromDate;
    handleSessionDragEnd();
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

  const handlePublishDraftSession = async (session, day) => {
    console.log('🔍 handlePublishDraftSession called with session:', session);
    
    if (!confirm('Êtes-vous sûr de vouloir publier cette séance brouillon ? Elle sera visible par l\'étudiant.')) {
      return;
    }

    try {
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
    }
  };

  const handleDeleteSession = async (sessionId, day) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
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
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Erreur lors de la suppression de la séance. Veuillez réessayer.');
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

      // Delete each session
      for (const { session, date } of weekSessions) {
        await handleDeleteSession(session.assignmentId || session.id, date);
      }

      alert(`Semaine supprimée avec succès ! ${weekSessions.length} séance(s) supprimée(s).`);
    } catch (error) {
      console.error('Error deleting week:', error);
      alert('Erreur lors de la suppression de la semaine');
    }
  };

  // Handle switching session to draft mode
  const handleSwitchToDraft = async (session, day) => {
    if (!confirm('Êtes-vous sûr de vouloir passer cette séance en mode brouillon ? Elle ne sera plus visible par l\'étudiant.')) {
      return;
    }

    try {
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
      
      // Update the session status to 'draft' in the database
      const updateResponse = await axios.patch(
        `${getApiBaseUrlWithApi()}/workout-sessions/${session.workoutSessionId}`,
        { status: 'draft' },
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
    }
  };

  // Handle copying a single session
  const handleCopySession = async (session, day) => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Create a new session with the same content but for a new date
      const sessionData = {
        title: session.title,
        description: session.description || '',
        exercises: session.exercises,
        scheduled_date: format(day, 'yyyy-MM-dd'),
        student_id: student.id,
        status: 'published'
      };

      await axios.post(
        `${getApiBaseUrlWithApi()}/workout-sessions/assign`,
        sessionData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh sessions
      await fetchWorkoutSessions();
      alert('Séance copiée avec succès !');
    } catch (error) {
      console.error('Error copying session:', error);
      alert('Erreur lors de la copie de la séance');
    }
  };

  // Toggle dropdown menu for session
  const toggleDropdown = (sessionId, dateKey, event) => {
    const dropdownKey = `${sessionId}-${dateKey}`;
    setDropdownOpen(dropdownOpen === dropdownKey ? null : dropdownKey);
    
    // Store button position for dropdown positioning
    if (event && event.target) {
      const rect = event.target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.right + window.scrollX - 190, // Position dropdown just to the left of the button (since it's 180px wide)
        right: rect.right + window.scrollX
      });
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
          params: { studentId: student.id } // Filter by student ID
        }
      );
      
      if (response.data.success) {
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
  const handleFeedbackUpdate = (videoId, feedback, rating, deleted = false, status = 'completed') => {
    if (deleted) {
      // Remove video from list if deleted
      setStudentVideos(prev => prev.filter(v => v.id !== videoId));
      setIsVideoDetailModalOpen(false);
      setSelectedVideo(null);
      } else {
      // Update video feedback in the list
      setStudentVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, coach_feedback: feedback, coach_rating: rating, status: status }
          : v
      ));
    }
  };

  const fetchWorkoutSessions = async () => {
    try {
      setLoadingSessions(true);
      const token = localStorage.getItem('authToken');
      
      // Get a wider date range to include both week and month data for progress indicators
      const weekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
        const monthStart = startOfMonth(trainingMonthDate);
      const monthEnd = endOfMonth(trainingMonthDate);
      
      // Use a much wider range to ensure we get all sessions needed for progress calculation
      // Go back 2 months and forward 2 months to be sure we have all data
      const extendedStart = subDays(Math.min(weekStart.getTime(), monthStart.getTime()), 60);
      const extendedEnd = addDays(Math.max(weekEnd.getTime(), monthEnd.getTime()), 60);
      
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
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/coach/student/${student.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStudentData(response.data.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle session cleanup when sessions are not found
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

  useEffect(() => {
    fetchStudentDetails();
    fetchWorkoutSessions();
  }, [student.id]);

  useEffect(() => {
    fetchWorkoutSessions();
  }, [overviewWeekDate, trainingMonthDate, activeTab]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch videos when analyse tab is active
  useEffect(() => {
    if (activeTab === 'analyse') {
      fetchStudentVideos();
    }
  }, [activeTab, student.id]);

  // Calculate progress statistics
  const calculateProgressStats = () => {
    // Get current week range
    const weekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    
    // Get current month range - use entire calendar month
    const monthStart = startOfMonth(trainingMonthDate);
    const monthEnd = endOfMonth(trainingMonthDate);
    
    // Get date keys for the ranges
    const weekDateKeys = [];
    const monthDateKeys = [];
    
    // Generate week date keys
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      weekDateKeys.push(format(date, 'yyyy-MM-dd'));
    }
    
    // Generate month date keys - ensure we cover the entire month
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    monthDays.forEach(day => {
      monthDateKeys.push(format(day, 'yyyy-MM-dd'));
    });
    
    console.log('Month date range:', {
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      totalDays: monthDays.length,
      monthDateKeys: monthDateKeys.slice(0, 5) + '...' + monthDateKeys.slice(-5)
    });
    
    // Count sessions for current week (flatten arrays)
    const allWeekSessions = weekDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
    // Count sessions for current month (flatten arrays)
    const allMonthSessions = monthDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
    // Filter to only assigned workouts (exclude drafts)
    const weekSessions = allWeekSessions.filter(session => session.status !== 'draft');
    const monthSessions = allMonthSessions.filter(session => session.status !== 'draft');
    
    // Count completed sessions
    const weekCompleted = weekSessions.filter(session => session.status === 'completed').length;
    const monthCompleted = monthSessions.filter(session => session.status === 'completed').length;
    
    // Debug logging
    console.log('Progress calculation debug:', {
      weekDateKeys: weekDateKeys,
      monthDateKeys: monthDateKeys.slice(0, 10) + '...',
      weekSessions: weekSessions.length,
      monthSessions: monthSessions.length,
      weekCompleted,
      monthCompleted,
      workoutSessionsKeys: Object.keys(workoutSessions),
      sampleSession: weekSessions[0] || monthSessions[0],
      allWorkoutSessions: workoutSessions
    });
    
    return {
      week: {
        completed: weekCompleted,
        total: weekSessions.length,
        progress: weekSessions.length > 0 ? (weekCompleted / weekSessions.length) * 100 : 0
      },
      month: {
        completed: monthCompleted,
        total: monthSessions.length,
        progress: monthSessions.length > 0 ? (monthCompleted / monthSessions.length) * 100 : 0
      }
    };
  };

  const progressStats = calculateProgressStats();

  // Get status badge for videos
  const getVideoStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
            A feedback
          </span>
        );
      case 'reviewed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
            Complété
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200">
            {status}
          </span>
        );
    }
  };

  // Filter videos based on current filters
  const getFilteredVideos = () => {
    return studentVideos.filter(video => {
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
  };

  // Get unique exercises for filter dropdown
  const getUniqueExercises = () => {
    const exercises = [...new Set(studentVideos.map(video => video.exercise_name))];
    return exercises;
  };

  // Render student videos with thumbnail cards
  const renderStudentVideosCards = () => {
    const filteredVideos = getFilteredVideos();
    
    return (
      <div className="space-y-4">
        {filteredVideos.map((video) => (
          <div 
            key={video.id} 
            className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
            onClick={() => handleVideoClick(video)}
          >
            <div className="flex items-center gap-4">
              {/* Video Thumbnail */}
              <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                <video 
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    // Update the video duration when metadata loads
                    const duration = e.target.duration;
                    if (duration && !isNaN(duration)) {
                      const minutes = Math.floor(duration / 60);
                      const seconds = Math.floor(duration % 60);
                      const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      e.target.parentElement.querySelector('.duration-display').textContent = timeDisplay;
                    }
                  }}
                />
                <div className="duration-display absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                  Loading...
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                  <PlayCircle size={24} className="text-white" />
                </div>
              </div>
              
              {/* Video Info */}
              <div className="flex-1 min-w-0">
                {/* Exercise Tag */}
                <div className="mb-2">
                  <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm font-medium">
                    {video.exercise_name}
                  </span>
                </div>
                
                {/* Series and Date */}
                <div className="text-gray-400 text-sm">
                  Série {video.set_number || 1}/3
                </div>
                <div className="text-gray-400 text-sm">
                  {format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
              
              {/* Status Tag */}
              <div className="flex-shrink-0">
                {video.status === 'pending' ? (
                  <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    A feedback
                  </span>
                ) : (
                  <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    Complété
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
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

    if (studentData?.oneRepMaxes && Array.isArray(studentData.oneRepMaxes) && studentData.oneRepMaxes.length > 0) {
      return studentData.oneRepMaxes.map((record, index) => ({
        id: record.id || `one-rm-${index}`,
        name: record.name || record.exercise || `Mouvement ${index + 1}`,
        color: record.color || fallback[index % fallback.length]?.color || '#e87c3e',
        current: Number(record.current) || Number(record.value) || 0,
        best: Number(record.best) || Number(record.personalBest) || Number(record.current) || 0,
        unit: record.unit || 'kg',
        delta: Number(record.delta) || 0,
        goal: record.goal || fallback[index % fallback.length]?.goal,
        weeklyVolume: record.weeklyVolume || fallback[index % fallback.length]?.weeklyVolume,
        totalReps: record.totalReps || fallback[index % fallback.length]?.totalReps,
        lastSession: record.lastSession || fallback[index % fallback.length]?.lastSession,
        history: record.history || fallback[index % fallback.length]?.history || [],
      }));
    }

    return fallback;
  }, [studentData]);

  const totalOneRmCurrent = useMemo(
    () => oneRmRecords.reduce((sum, record) => sum + (Number(record.current) || 0), 0),
    [oneRmRecords]
  );

  const formatWeight = (value, unit = 'kg') => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return '—';
    }

    return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!studentData) {
    return <div className="p-6">Student data not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-[#1a1a1a]">
        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <h1 className="text-xl font-medium">Théo Chomarat</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-6 px-4 border-b border-[#1a1a1a]">
        <button 
          className={`py-3 text-sm font-medium ${activeTab === 'overview' ? 'text-[#e87c3e] border-b-2 border-[#e87c3e]' : 'text-gray-400'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`py-3 text-sm font-medium ${activeTab === 'training' ? 'text-[#e87c3e] border-b-2 border-[#e87c3e]' : 'text-gray-400'}`}
          onClick={() => setActiveTab('training')}
        >
          Training
        </button>
        <button 
          className={`py-3 text-sm font-medium ${activeTab === 'analyse' ? 'text-[#e87c3e] border-b-2 border-[#e87c3e]' : 'text-gray-400'}`}
          onClick={() => setActiveTab('analyse')}
        >
          Analyse vidéo
        </button>
        <button 
          className={`py-3 text-sm font-medium ${activeTab === 'suivi' ? 'text-[#e87c3e] border-b-2 border-[#e87c3e]' : 'text-gray-400'}`}
          onClick={() => setActiveTab('suivi')}
        >
          Suivi Financier
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-[250px,1fr,250px] gap-3 mb-3">
              {/* Current Block Card */}
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                {!isEditingBlock ? (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium">
                      Bloc {blockNumber}/{totalBlocks} - {blockName}
                    </h2>
                    <button
                      onClick={() => setIsEditingBlock(true)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Edit block information"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={blockNumber}
                        onChange={(e) => setBlockNumber(parseInt(e.target.value) || 1)}
                        className="bg-[#262626] border border-gray-600 rounded px-2 py-1 text-white text-sm w-12"
                        min="1"
                      />
                      <span className="text-gray-400 text-sm">/</span>
                      <input
                        type="number"
                        value={totalBlocks}
                        onChange={(e) => setTotalBlocks(parseInt(e.target.value) || 1)}
                        className="bg-[#262626] border border-gray-600 rounded px-2 py-1 text-white text-sm w-12"
                        min="1"
                      />
                    </div>
                    <input
                      type="text"
                      value={blockName}
                      onChange={(e) => setBlockName(e.target.value)}
                      className="w-full bg-[#262626] border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      placeholder="Block name"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingBlock(false)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBlock(false);
                          // Reset to original values if needed
                          setBlockNumber(3);
                          setTotalBlocks(3);
                          setBlockName('Prépa Force');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="26"
                          stroke="#262626"
                          strokeWidth="4"
                          fill="#1a1a1a"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="26"
                          stroke="#e87c3e"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="163"
                          strokeDashoffset={163 - (progressStats.week.progress / 100) * 163}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {progressStats.week.completed}/{progressStats.week.total}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">This Week</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="26"
                          stroke="#262626"
                          strokeWidth="4"
                          fill="#1a1a1a"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="26"
                          stroke="#e87c3e"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="163"
                          strokeDashoffset={163 - (progressStats.month.progress / 100) * 163}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {progressStats.month.completed}/{progressStats.month.total}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">This Month</span>
                  </div>
                </div>
              </div>

              {/* 1RM Stats Card */}
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">1 RM actuel</h3>
                  <button
                    type="button"
                    onClick={() => setIsOneRmModalOpen(true)}
                    className="px-2 py-1 text-xs bg-[#262626] rounded hover:bg-[#333333] transition-colors"
                  >
                    Voir
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {oneRmRecords.map((record) => (
                    <div key={record.id}>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: record.color || '#e87c3e' }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-gray-400">{record.name}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{formatWeight(record.current, record.unit)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-[#262626]">
                  <div>
                    <span className="text-xs text-gray-400">Total</span>
                    <p className="text-sm font-medium">{formatWeight(totalOneRmCurrent)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">RIS Score</span>
                    <p className="text-sm font-medium">
                      {studentData?.oneRmRisScore?.toLocaleString?.('fr-FR', { maximumFractionDigits: 2 }) || '95,99'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Profile</h3>
                  <button className="px-2 py-1 text-xs bg-[#262626] rounded">Open</button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">Théo Chomarat</span>
                    <span className="text-[10px] text-[#e87c3e]">♂</span>
                  </div>
                  <div className="text-xs text-gray-400">Discipline : Street Lifting</div>
                  <div className="text-xs text-gray-400">23 ans</div>
                  <div className="text-xs text-gray-400">61 kg</div>
                  <div className="text-xs text-gray-400">1m56</div>
                </div>
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeOverviewWeek('prev')}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg hover:bg-[#262626] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Semaine précédente</span>
              </button>
              <button
                onClick={() => setOverviewWeekDate(new Date())}
                className="flex items-center gap-2 px-4 py-2 bg-[#e87c3e] text-white rounded-lg hover:bg-[#d66d35] transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span>Aujourd'hui</span>
              </button>
              <button
                onClick={() => changeOverviewWeek('next')}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg hover:bg-[#262626] transition-colors"
              >
                <span>Semaine suivante</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekly Schedule */}
            <div className="grid grid-cols-7 gap-3">
              {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day, i) => {
                const dayDate = addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i);
                const dayKey = format(dayDate, 'yyyy-MM-dd');
                const isToday = dayKey === format(new Date(), 'yyyy-MM-dd');
                const isDropTarget = dragOverDate === dayKey;

                return (
                  <div
                    key={day}
                    className={`rounded-xl p-2 cursor-pointer transition-colors relative group h-[200px] overflow-hidden border ${
                      isDropTarget
                        ? 'bg-[#2f2f2f] border-[#e87c3e]'
                        : isToday
                        ? 'bg-[#262626] border-2 border-[#e87c3e]'
                        : 'bg-[#1a1a1a] border-transparent hover:bg-[#262626]'
                    }`}
                    onClick={() => handleDayClick(dayDate)}
                    onDragOver={(event) => handleDayDragOver(event, dayDate)}
                    onDragEnter={(event) => handleDayDragOver(event, dayDate)}
                    onDragLeave={(event) => handleDayDragLeave(event, dayDate)}
                    onDrop={(event) => handleDayDrop(event, dayDate)}
                  >
                    <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                      <span>
                        {day} {format(dayDate, 'dd')}
                      </span>
                      <Plus className="h-3 w-3 text-[#e87c3e] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {loadingSessions ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const dateKey = dayKey;
                          const sessions = workoutSessions[dateKey] || [];

                          if (sessions.length > 0) {
                            return (
                              <div className="session-container space-y-1" style={{ height: '150px', overflowY: 'auto' }}>
                                {sessions.map((session, sessionIndex) => {
                                  const canDrag = session.status === 'draft' || session.status === 'assigned';
                                  const dropdownKey = `${session.id || session.assignmentId}-${dayKey}`;
                                  const exercises = session.exercises || [];

                                  return (
                                    <div
                                      key={session.id || sessionIndex}
                                      className={`rounded transition-colors ${
                                        session.status === 'draft'
                                          ? 'bg-[#3a3a3a] border-l-2 border-dashed border-gray-500 hover:bg-[#4a4a4a]'
                                          : 'bg-[#262626] border border-transparent hover:bg-[#2a2a2a]'
                                      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                                      draggable
                                      onDragStart={(event) => handleSessionDragStart(event, session, dayDate)}
                                      onDragEnd={handleSessionDragEnd}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSessionClick(session, dayDate);
                                      }}
                                    >
                                      <div className="p-2 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <span className="truncate text-[11px] font-medium">{session.title || 'Séance'}</span>
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                              {session.status === 'in_progress' && <PlayCircle className="h-3 w-3 text-[#e87c3e]" />}
                                              {session.status === 'completed' && <CheckCircle className="h-3 w-3 text-[#22c55e]" />}
                                              {session.status === 'draft' && <EyeOff className="h-3 w-3 text-gray-400" />}
                                              {session.status === 'assigned' && <Clock className="h-3 w-3 text-[#3b82f6]" />}
                                            </div>
                                          </div>

                                          {session.status !== 'completed' && session.status !== 'in_progress' && (
                                            <div className="relative dropdown-container flex-shrink-0">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleDropdown(session.id || session.assignmentId, dayKey, e);
                                                }}
                                                className="text-gray-400 hover:text-white transition-colors"
                                                title="Options de la séance"
                                              >
                                                <MoreHorizontal className="h-3 w-3" />
                                              </button>

                                              {dropdownOpen === dropdownKey && (
                                                <div
                                                  className="fixed bg-[#262626] border border-[#404040] rounded-lg shadow-lg z-[9999] min-w-[180px]"
                                                  style={{
                                                    top: dropdownPosition?.top || 0,
                                                    left: dropdownPosition?.left || 0,
                                                    transform: dropdownPosition?.right > window.innerWidth - 50 ? 'translateX(-100%)' : 'none'
                                                  }}
                                                >
                                                  {session.status === 'draft' ? (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDropdownOpen(null);
                                                        setDropdownPosition(null);
                                                        handlePublishDraftSession(session, dayDate);
                                                      }}
                                                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2 rounded-t-lg"
                                                    >
                                                      <Eye className="h-4 w-4" />
                                                      Publier la séance
                                                    </button>
                                                  ) : (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDropdownOpen(null);
                                                        setDropdownPosition(null);
                                                        handleSwitchToDraft(session, dayDate);
                                                      }}
                                                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2 rounded-t-lg"
                                                    >
                                                      <EyeOff className="h-4 w-4" />
                                                      Passer en mode brouillon
                                                    </button>
                                                  )}

                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDropdownOpen(null);
                                                      setDropdownPosition(null);
                                                      handleCopySession(session, dayDate);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2"
                                                  >
                                                    <Copy className="h-4 w-4" />
                                                    Copier
                                                  </button>

                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDropdownOpen(null);
                                                      setDropdownPosition(null);
                                                      handleDeleteSession(session.assignmentId || session.id, dayDate);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#404040] flex items-center gap-2 rounded-b-lg"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Supprimer
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-1">
                                          {exercises.slice(0, 2).map((exercise, index) => (
                                            <div key={index} className="text-[10px] text-gray-400 truncate">
                                              {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'} {exercise.name}{' '}
                                              {exercise.sets?.[0]?.weight ? `@${exercise.sets[0].weight}kg` : ''}
                                            </div>
                                          ))}
                                          {exercises.length > 2 && (
                                            <div className="text-[10px] text-gray-500">+ {exercises.length - 2} exercices</div>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-[#3a3a3a] pt-2 text-[10px]">
                                          <span
                                            className={`px-2 py-0.5 rounded-full font-medium ${
                                              session.status === 'completed'
                                                ? 'bg-[#22c55e] text-white'
                                                : session.status === 'in_progress'
                                                ? 'bg-[#e87c3e] text-white'
                                                : session.status === 'draft'
                                                ? 'bg-gray-500 text-white'
                                                : session.status === 'assigned'
                                                ? 'bg-[#3b82f6] text-white'
                                                : 'bg-gray-600 text-gray-200'
                                            }`}
                                          >
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
                            );
                          }

                          return <div className="flex-1" />;
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Training Tab - Monthly Calendar View */}
        {activeTab === 'training' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => changeTrainingMonth('prev')} className="p-2 rounded-lg hover:bg-[#1a1a1a]">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {weekViewFilter === 2 ? (
                        // For 2-week view, show the actual 2-week range
                        (() => {
                          const weekStart = startOfWeek(trainingMonthDate, { weekStartsOn: 1 });
                          const weekEnd = addDays(weekStart, 13);
                          return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM', { locale: fr })}`;
                        })()
                      ) : (
                        // For 4-week view, show the month range
                        `${format(startOfMonth(trainingMonthDate), 'd MMM', { locale: fr })} - ${format(endOfMonth(trainingMonthDate), 'd MMM', { locale: fr })}`
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTrainingMonthDate(new Date());
                      // For 2-week view, this will automatically center around today
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#e87c3e] text-white rounded-lg hover:bg-[#d66d35] transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Aujourd'hui</span>
                  </button>
                </div>
                <button onClick={() => changeTrainingMonth('next')} className="p-2 rounded-lg hover:bg-[#1a1a1a]">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    trainingFilter === 'assigned' 
                      ? 'bg-[#e87c3e] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setTrainingFilter('assigned')}
                >
                  Assigné
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    trainingFilter === 'draft' 
                      ? 'bg-[#e87c3e] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setTrainingFilter('draft')}
                >
                  Brouillon
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    trainingFilter === 'all' 
                      ? 'bg-[#e87c3e] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setTrainingFilter('all')}
                >
                  Tous
                </button>
                <button 
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    weekViewFilter === 2 
                      ? 'bg-[#e87c3e] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setWeekViewFilter(2)}
                >
                  2 semaines
                </button>
                <button 
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    weekViewFilter === 4 
                      ? 'bg-[#e87c3e] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setWeekViewFilter(4)}
                >
                  4 semaines
                </button>
              </div>
            </div>

            {/* Copy Status Indicator */}
            {copiedWeek && (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-400">
                    {copiedWeek.sessions.length} séance(s) prête(s) à être collée(s)
                  </span>
                </div>
                <button
                  onClick={() => setCopiedWeek(null)}
                  className="text-green-400 hover:text-green-300 text-sm underline"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Calendar Grid */}
            <div className={weekViewFilter === 2 ? 'space-y-4' : 'space-y-2'}>
              {(() => {
                // For 2-week view, center around current date or trainingMonthDate
                let startDate, endDate;
                
                if (weekViewFilter === 2) {
                  // Center 2 weeks around the trainingMonthDate
                  const weekStart = startOfWeek(trainingMonthDate, { weekStartsOn: 1 });
                  startDate = weekStart;
                  endDate = addDays(startDate, 13); // 2 weeks = 14 days
                } else {
                  // For 4-week view, use the month-based logic
                  const monthStart = startOfMonth(trainingMonthDate);
                  startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                  endDate = addDays(startDate, (weekViewFilter * 7) - 1);
                }
                
                // Group days by weeks
                const weeks = [];
                for (let i = 0; i < weekViewFilter; i++) {
                  const weekStart = addDays(startDate, i * 7);
                  const weekDays = [];
                  for (let j = 0; j < 7; j++) {
                    weekDays.push(addDays(weekStart, j));
                  }
                  weeks.push({ weekStart, weekDays });
                }

                return (
                  <>
                    {/* Week headers */}
          <div className="grid grid-cols-7 gap-2">
            {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day) => (
              <div key={day} className="text-center text-xs text-gray-400 py-2">
                {day}
              </div>
            ))}
                  </div>

                  {/* Week rows */}
                  {weeks.map((week, weekIndex) => {
                    const weekKey = format(week.weekStart, 'yyyy-MM-dd');
                    const isHovered = hoveredWeek === weekKey;
                    
                    return (
                      <div
                        key={weekKey}
                        className={`relative group flex ${weekViewFilter === 2 ? 'min-h-[320px]' : 'min-h-[140px]'}`}
                      >
                        {/* Container pour la zone de survol et les boutons */}
                        <div
                          className={`week-action-container absolute -left-12 top-0 bottom-0 w-16 z-20 transition-all duration-200 ${
                            isHovered ? 'bg-gray-800/20 border-l-2 border-[#e87c3e]' : 'hover:bg-gray-800/10'
                          }`}
                          onMouseEnter={() => setHoveredWeek(weekKey)}
                          onMouseLeave={() => setHoveredWeek(null)}
                          title="Survolez pour voir les actions de semaine"
                        >
                          {/* Zone invisible pour déclencher le survol */}
                          <div className="absolute inset-0 cursor-pointer" />
                          
                          {/* Week action buttons - apparaissent au centre */}
                          {isHovered && (
                            <div className="week-action-buttons flex flex-col gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('🔄 Copy button clicked!', week.weekStart);
                                handleCopyWeek(week.weekStart);
                              }}
                              className="p-2 bg-[#e87c3e] hover:bg-[#d66d35] text-white rounded-lg transition-colors relative z-50 pointer-events-auto"
                              title="Copier la semaine"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {copiedWeek && (
                              <button
                                onClick={() => handlePasteWeek(week.weekStart)}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                title="Coller la semaine copiée"
                              >
                                <Clipboard className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteWeek(week.weekStart)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                              title="Supprimer la semaine"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            </div>
                          )}
                        </div>

                        {/* Week days */}
                        <div className={`grid grid-cols-7 flex-1 ${weekViewFilter === 2 ? 'gap-6' : 'gap-2'}`}>
                          {week.weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const session = workoutSessions[dateKey];
                const isCurrentMonth = isSameMonth(day, trainingMonthDate);
                const isDropTarget = dragOverDate === dateKey;
                
                return (
                  <div
                    key={dateKey}
                    className={`rounded-lg cursor-pointer transition-colors flex flex-col border ${
                      isDropTarget
                        ? 'bg-[#2f2f2f] border-[#e87c3e]'
                        : format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-[#262626] border-2 border-[#e87c3e]'
                        : isCurrentMonth
                        ? 'bg-[#1a1a1a] border-transparent hover:bg-[#262626]'
                        : 'bg-[#0a0a0a] border-transparent hover:bg-[#262626]'
                    } ${weekViewFilter === 2 ? 'p-4 h-[280px]' : 'p-3 h-[120px]'}`}
                    onClick={() => handleDayClick(day)}
                    onDragOver={(event) => handleDayDragOver(event, day)}
                    onDragEnter={(event) => handleDayDragOver(event, day)}
                    onDragLeave={(event) => handleDayDragLeave(event, day)}
                    onDrop={(event) => handleDayDrop(event, day)}
                  >
                    <div className={`text-sm mb-2 ${isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                      {format(day, 'd')}
                    </div>
                                {(() => {
                                  const allSessions = workoutSessions[dateKey] || [];
                                  const sessions = getFilteredSessions(allSessions);
                                  if (sessions.length > 0) {
                                    return (
                                      <div className={`session-container flex-1 ${weekViewFilter === 2 ? 'space-y-3' : 'space-y-1'} overflow-y-auto max-h-full`}>
                                        {sessions.map((session, sessionIndex) => {
                                          const canDrag = session.status === 'draft' || session.status === 'assigned';

                                          return (
                                            <div 
                                              key={session.id || sessionIndex}
                                              className={`rounded transition-colors ${
                                                session.status === 'draft' 
                                                  ? 'bg-[#3a3a3a] border-l-2 border-dashed border-gray-500 hover:bg-[#4a4a4a]' 
                                                  : session.status === 'assigned'
                                                  ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                                                  : 'bg-[#262626] border-l-2 border-[#e87c3e] hover:bg-[#2a2a2a]'
                                              } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${weekViewFilter === 2 ? 'p-4' : 'p-2'}`}
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
                                                  <div className={`font-medium truncate ${weekViewFilter === 2 ? 'text-sm' : 'text-[10px]'} max-w-[60%]`}>{session.title || 'Séance'}</div>
                                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                                    {session.status === 'in_progress' && (
                                                      <PlayCircle className={`text-[#e87c3e] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                                                    )}
                                                    {session.status === 'completed' && (
                                                      <CheckCircle className={`text-[#22c55e] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                                                    )}
                                                    {session.status === 'draft' && (
                                                      <EyeOff className={`text-gray-400 ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                                                    )}
                                                    {session.status === 'assigned' && (
                                                      <Clock className={`text-[#3b82f6] ${weekViewFilter === 2 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                                                    )}
                                                  </div>
                                                </div>
                                                {session.status !== 'completed' && session.status !== 'in_progress' && (
                                                  <div className="relative ml-2 dropdown-container flex-shrink-0">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleDropdown(session.id || session.assignmentId, dateKey, e);
                                                      }}
                                                      className="text-gray-400 hover:text-white transition-colors"
                                                      title="Options de la séance"
                                                    >
                                                      <MoreHorizontal className={weekViewFilter === 2 ? 'h-4 w-4' : 'h-3 w-3'} />
                                                    </button>
                                                    {/* Dropdown Menu */}
                                                    {dropdownOpen === `${session.id || session.assignmentId}-${dateKey}` && (
                                                      <div 
                                                        className="fixed bg-[#262626] border border-[#404040] rounded-lg shadow-lg z-[9999] min-w-[180px]"
                                                        style={{
                                                          top: dropdownPosition?.top || 0,
                                                          left: dropdownPosition?.left || 0,
                                                          transform: dropdownPosition?.right > window.innerWidth - 50 ? 'translateX(-100%)' : 'none'
                                                        }}
                                                      >
                                                        {session.status === 'draft' ? (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setDropdownOpen(null);
                                                              setDropdownPosition(null);
                                                              handlePublishDraftSession(session, day);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2 rounded-t-lg"
                                                          >
                                                            <Eye className="h-4 w-4" />
                                                            Publier la séance
                                                          </button>
                                                        ) : (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setDropdownOpen(null);
                                                              setDropdownPosition(null);
                                                              handleSwitchToDraft(session, day);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2 rounded-t-lg"
                                                          >
                                                            <EyeOff className="h-4 w-4" />
                                                            Passer en mode brouillon
                                                          </button>
                                                        )}
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDropdownOpen(null);
                                                            setDropdownPosition(null);
                                                            handleCopySession(session, day);
                                                          }}
                                                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#404040] flex items-center gap-2"
                                                        >
                                                          <Copy className="h-4 w-4" />
                                                          Copier
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDropdownOpen(null);
                                                            setDropdownPosition(null);
                                                            handleDeleteSession(session.assignmentId || session.id, day);
                                                          }}
                                                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#404040] flex items-center gap-2 rounded-b-lg"
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                          Supprimer
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              <div className={`text-gray-400 ${weekViewFilter === 2 ? 'text-sm' : 'text-[9px]'}`}>
                                                + {session.exercises.length} exercises en plus
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  // For consistent height, return an empty container for both views
                                  return <div className="flex-1"></div>;
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>

        </div>
      )}

        {/* Analyse vidéo Tab */}
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
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
              <button className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">
                + Filter
              </button>

              {/* Video Count */}
              <div className="ml-auto text-sm text-gray-400">
                {getFilteredVideos().length} vidéo{getFilteredVideos().length > 1 ? 's' : ''} {statusFilter === 'A feedback' ? 'à feedback' : 'trouvée' + (getFilteredVideos().length > 1 ? 's' : '')}
              </div>
            </div>

            {videosLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                <span className="ml-2 text-gray-400">Chargement des vidéos...</span>
              </div>
            )}

            {!videosLoading && getFilteredVideos().length > 0 && renderStudentVideosCards()}

            {!videosLoading && getFilteredVideos().length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 h-80">
                <PlayCircle size={48} className="mb-4" />
                <p className="font-medium">Aucune vidéo trouvée</p>
                <p className="text-sm">Les vidéos d'analyse pour {studentData?.raw_user_meta_data?.full_name || student.email} apparaîtront ici.</p>
              </div>
            )}
          </div>
        )}

        {/* Suivi Financier Tab */}
        {activeTab === 'suivi' && (
          <div className="p-4">
            <p className="text-gray-400">Suivi Financier - Coming soon</p>
          </div>
        )}

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

      <OneRmModal
        isOpen={isOneRmModalOpen}
        onClose={() => setIsOneRmModalOpen(false)}
        data={oneRmRecords}
        studentName={studentData?.raw_user_meta_data?.full_name || student?.email || 'Athlète'}
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
      </div>
    </div>
  );
};

export default StudentDetailView;