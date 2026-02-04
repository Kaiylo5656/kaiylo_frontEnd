import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, Eye, EyeOff, MoreHorizontal, Save, X, Video, RefreshCw, FileText } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import WorkoutSessionDetailsModal from './WorkoutSessionDetailsModal';
import CoachSessionReviewModal from './CoachSessionReviewModal';
import VideoDetailModal from './VideoDetailModal';
import OneRmModal, { DEFAULT_ONE_RM_DATA, calculateRIS } from './OneRmModal';
import StudentProfileModal from './StudentProfileModal';
import CreateBlockModal from './CreateBlockModal';
import VoiceMessage from './VoiceMessage';
import DeleteSessionModal from './DeleteSessionModal';
import PublishSessionModal from './PublishSessionModal';
import SwitchToDraftModal from './SwitchToDraftModal';
import BaseModal from './ui/modal/BaseModal';
import { useModalManager } from './ui/modal/ModalManager';
import { format, addDays, startOfWeek, subDays, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, differenceInYears, addWeeks, differenceInCalendarWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import useSocket from '../hooks/useSocket'; // Import the socket hook
import PeriodizationTab from './PeriodizationTab';
import StudentSidebar from './StudentSidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';

const StudentDetailView = ({ student, onBack, initialTab = 'overview', students = [], onStudentChange }) => {
  const navigate = useNavigate();
  const { isTopMost: isDeleteNoteModalTopMost } = useModalManager();
  const { isTopMost: isDeleteLimitationModalTopMost } = useModalManager();
  const { isTopMost: isDeleteWeekModalTopMost } = useModalManager();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [studentData, setStudentData] = useState(null);
  const [blocks, setBlocks] = useState([]);
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
  const [dragOverSessionId, setDragOverSessionId] = useState(null); // Session currently being hovered during drag
  const [isRescheduling, setIsRescheduling] = useState(false); // Prevent concurrent rescheduling calls
  const [overviewWeekDate, setOverviewWeekDate] = useState(new Date()); // For overview weekly calendar
  const [trainingWeekDate, setTrainingWeekDate] = useState(new Date()); // For training weekly calendar (starts with current week)
  const [workoutSessions, setWorkoutSessions] = useState({}); // Will store arrays of sessions per date
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState(null); // Track which week is being hovered
  const [copiedWeek, setCopiedWeek] = useState(null); // Store copied week data for pasting
  const [isPastingWeek, setIsPastingWeek] = useState(false); // Track if week is being pasted
  const [pastingWeekStart, setPastingWeekStart] = useState(null); // Track which week is being pasted
  const [isDeleteWeekModalOpen, setIsDeleteWeekModalOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState(null); // { weekStart, sessionCount }
  const [isDeletingWeek, setIsDeletingWeek] = useState(false); // Track if week is being deleted
  const [trainingFilter, setTrainingFilter] = useState('all'); // Filter for training view: 'assigned', 'completed', 'all'
  const [weekViewFilter, setWeekViewFilter] = useState(4); // Week view filter: 8 (2 months) or 4 weeks
  const [isDetailedView, setIsDetailedView] = useState(false); // Detailed view mode for training sessions
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which session dropdown is open: 'sessionId-date'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Sidebar collapse state
  const [filterMenuOpen, setFilterMenuOpen] = useState(false); // Track if filter dropdown is open
  const [durationMenuOpen, setDurationMenuOpen] = useState(false); // Track if duration dropdown is open
  const [dropdownPosition, setDropdownPosition] = useState(null); // Store dropdown position
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
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const dateInputRef = useRef(null);
  const statusFilterButtonRef = useRef(null);
  const statusFilterTextRef = useRef(null);
  const [statusFilterMinWidth, setStatusFilterMinWidth] = useState(170); // Default width in px
  const exerciseFilterButtonRef = useRef(null);
  const exerciseFilterTextRef = useRef(null);
  const [exerciseFilterMinWidth, setExerciseFilterMinWidth] = useState(120); // Default width in px
  const dateFilterButtonRef = useRef(null);
  const dateFilterTextRef = useRef(null);
  const [dateFilterMinWidth, setDateFilterMinWidth] = useState(100); // Default width in px
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open
  const [hoveredSessionId, setHoveredSessionId] = useState(null); // Track which session is hovered
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isExerciseFilterOpen, setIsExerciseFilterOpen] = useState(false);

  // Block information state
  const [isCreateBlockModalOpen, setIsCreateBlockModalOpen] = useState(false);
  const [blockNumber, setBlockNumber] = useState(3);
  const [totalBlocks, setTotalBlocks] = useState(3);
  const [blockName, setBlockName] = useState('Prépa Force');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // Limitations state
  const [limitations, setLimitations] = useState([]);
  const [editingLimitationIndex, setEditingLimitationIndex] = useState(null);
  const [editingLimitationText, setEditingLimitationText] = useState('');
  const [isDeleteLimitationModalOpen, setIsDeleteLimitationModalOpen] = useState(false);
  const [limitationToDeleteIndex, setLimitationToDeleteIndex] = useState(null);
  const [isAddingLimitation, setIsAddingLimitation] = useState(false);
  const [newLimitationText, setNewLimitationText] = useState('');

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

  // Close dropdown when scrolling
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleScroll = () => {
      setDropdownOpen(null);
      setDropdownPosition(null);
    };

    // Listen to scroll events on window and all scrollable containers
    window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [dropdownOpen]);

  // Calculate button width based on the longest possible text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateButtonWidth = () => {
      // Possible text values: 'Tous les statuts', 'A feedback', 'Complété'
      const possibleTexts = ['Tous les statuts', 'A feedback', 'Complété'];

      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      document.body.appendChild(tempSpan);

      // Find the widest text
      let maxWidth = 0;
      possibleTexts.forEach(text => {
        tempSpan.textContent = text;
        maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
      });

      document.body.removeChild(tempSpan);

      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setStatusFilterMinWidth(maxWidth + buttonPadding + gap + iconWidth);
    };

    // Calculate on mount
    calculateButtonWidth();
  }, []);

  // Calculate button width for exercise filter based on text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateExerciseButtonWidth = () => {
      // Use "Exercice" as base width to keep button size consistent
      const text = 'Exercice';

      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempSpan.textContent = text;

      document.body.appendChild(tempSpan);
      const width = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setExerciseFilterMinWidth(width + buttonPadding + gap + iconWidth);
    };

    calculateExerciseButtonWidth();
  }, []);

  // Calculate button width for date filter based on text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateDateButtonWidth = () => {
      // Text is always "Date"
      const text = 'Date';

      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempSpan.textContent = text;

      document.body.appendChild(tempSpan);
      const width = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setDateFilterMinWidth(width + buttonPadding + gap + iconWidth);
    };

    calculateDateButtonWidth();
  }, []);

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
    setDragOverSessionId(null);
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
    setDragOverSessionId(null);
  };

  const handleSessionDragOver = (event, session) => {
    if (!draggedSession) return;
    event.preventDefault();
    event.stopPropagation();
    const sessionId = session.id || session.assignmentId || session.workoutSessionId;
    setDragOverSessionId(sessionId);
  };

  const handleSessionDragLeave = (event, session) => {
    if (!draggedSession) return;
    // Check if we're moving to a child element
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return; // Still within the session container
    }
    setDragOverSessionId(null);
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

    // Ne pas permettre la suppression de séances terminées
    if (session && session.status === 'completed') {
      alert('Les séances terminées ne peuvent pas être supprimées');
      return;
    }

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

      // Ne pas permettre la suppression de séances terminées
      if (session && session.status === 'completed') {
        alert('Les séances terminées ne peuvent pas être supprimées');
        setIsDeleteSessionModalOpen(false);
        setSessionToDelete(null);
        setIsDeletingSession(false);
        return;
      }

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
          (trainingFilter === 'completed' && session.status === 'completed')) {
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
  };

  const handlePasteWeek = async (targetWeekStart) => {
    if (!copiedWeek || isPastingWeek) {
      return;
    }

    setIsPastingWeek(true);
    setPastingWeekStart(targetWeekStart);

    try {
      const token = localStorage.getItem('authToken');

      // Copy each session to the target week
      for (const { session, date } of copiedWeek.sessions) {
        const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert Sunday=0 to Monday=0
        const newDate = addDays(targetWeekStart, dayOfWeek);

        // Preserve RPE from completed sessions
        let exercisesToCopy = session.exercises;
        if (Array.isArray(session.exercises)) {
          exercisesToCopy = session.exercises.map(ex => ({
            ...ex,
            // Supprimer les commentaires de l'étudiant au niveau de l'exercice lors de la copie
            student_comment: undefined,
            comment: undefined,
            studentComment: undefined,
            sets: Array.isArray(ex.sets) ? (session.status === 'completed' ? ex.sets.map(set => ({
              ...set,
              // Si useRir est true, stocker la charge précédente (studentWeight) au lieu du RPE
              // Sinon, stocker le RPE précédent
              previousRpe: ex.useRir || ex.use_rir
                ? (set.studentWeight || set.student_weight || null)
                : (set.rpe_rating || set.rpeRating || null),
              // Clear the actual RPE rating for the new session
              rpe_rating: undefined,
              rpeRating: undefined,
              // Clear student comments and video data
              feedback: undefined,
              comment: undefined,
              notes: undefined,
              student_comment: undefined,
              video_url: undefined,
              video: undefined,
              hasVideo: undefined,
              videoStatus: undefined
            })) : ex.sets.map(set => ({
              ...set,
              // Préserver previousRpe même si la séance n'est pas completed (au cas où elle aurait déjà un previousRpe)
              previousRpe: set.previousRpe !== null && set.previousRpe !== undefined ? set.previousRpe : null
            }))) : ex.sets
          }));
        }

        // Always create new sessions as 'assigned', regardless of original status
        const sessionData = {
          title: session.title,
          description: session.description || '',
          exercises: exercisesToCopy,
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

      // Refresh sessions
      await fetchWorkoutSessions();

      // Clear copied week after successful paste
      setCopiedWeek(null);
    } catch (error) {
      console.error('Error pasting week:', error);
      alert('Erreur lors du collage de la semaine');
    } finally {
      setIsPastingWeek(false);
      setPastingWeekStart(null);
    }
  };

  const handleDeleteWeek = (weekStart) => {
    // Get all sessions in this week (excluding completed sessions)
    const weekSessions = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateKey = format(day, 'yyyy-MM-dd');
      const sessions = workoutSessions[dateKey] || [];
      sessions.forEach(session => {
        // Ne pas inclure les séances terminées
        if (session.status === 'completed') {
          return;
        }

        // Only delete sessions that match the current filter
        if (trainingFilter === 'all' ||
          (trainingFilter === 'assigned' && session.status !== 'draft')) {
          weekSessions.push({ session, date: day });
        }
      });
    }

    if (weekSessions.length === 0) {
      alert('Aucune séance à supprimer dans cette semaine (les séances terminées ne peuvent pas être supprimées)');
      return;
    }

    // Open modal instead of using confirm()
    setWeekToDelete({ weekStart, sessionCount: weekSessions.length, weekSessions });
    setIsDeleteWeekModalOpen(true);
  };

  const confirmDeleteWeek = async () => {
    if (!weekToDelete || isDeletingWeek) return;

    setIsDeletingWeek(true);

    try {
      const token = localStorage.getItem('authToken');
      let deletedCount = 0;
      let errorCount = 0;

      // Delete each session automatically without individual confirmations
      for (const { session, date } of weekToDelete.weekSessions) {
        try {
          // Ne pas supprimer les séances terminées
          if (session.status === 'completed') {
            console.log(`Skipping completed session ${session.assignmentId || session.id}`);
            continue;
          }

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

      // Close modal
      setIsDeleteWeekModalOpen(false);
      setWeekToDelete(null);
    } catch (error) {
      console.error('Error deleting week:', error);
      alert('Erreur lors de la suppression de la semaine');
    } finally {
      setIsDeletingWeek(false);
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

      // Fixer hoveredPasteDate sur la date cible pour que l'overlay reste fixe pendant le collage
      setHoveredPasteDate(scheduledDate);

      const originalStatus = copiedSession.session.status;

      // Preserve RPE from completed sessions
      let exercisesToCopy = copiedSession.session.exercises || [];
      if (Array.isArray(copiedSession.session.exercises)) {
        exercisesToCopy = copiedSession.session.exercises.map(ex => ({
          ...ex,
          // Supprimer les commentaires de l'étudiant au niveau de l'exercice lors de la copie
          student_comment: undefined,
          comment: undefined,
          studentComment: undefined,
          sets: Array.isArray(ex.sets) ? (originalStatus === 'completed' ? ex.sets.map(set => ({
            ...set,
            // Si useRir est true, stocker la charge précédente (studentWeight) au lieu du RPE
            // Sinon, stocker le RPE précédent
            previousRpe: ex.useRir || ex.use_rir
              ? (set.studentWeight || set.student_weight || null)
              : (set.rpe_rating || set.rpeRating || null),
            // Clear the actual RPE rating for the new session
            rpe_rating: undefined,
            rpeRating: undefined,
            // Clear student comments and video data
            feedback: undefined,
            comment: undefined,
            notes: undefined,
            student_comment: undefined,
            video_url: undefined,
            video: undefined,
            hasVideo: undefined,
            videoStatus: undefined
          })) : ex.sets.map(set => ({
            ...set,
            // Préserver previousRpe même si la séance n'est pas completed (au cas où elle aurait déjà un previousRpe)
            previousRpe: set.previousRpe !== null && set.previousRpe !== undefined ? set.previousRpe : null
          }))) : ex.sets
        }));
      }

      const sessionData = {
        title: copiedSession.session.title,
        description: copiedSession.session.description || '',
        exercises: exercisesToCopy,
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
  const toggleDropdown = (sessionId, dateKey, event) => {
    const dropdownKey = `${sessionId}-${dateKey}`;

    // Toggle dropdown: if already open for this session, close it; otherwise open it
    if (dropdownOpen === dropdownKey) {
      setDropdownOpen(null);
      setDropdownPosition(null);
    } else {
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
    }
  };

  // Close dropdown menu immediately
  const closeDropdown = () => {
    setDropdownOpen(null);
    setDropdownPosition(null);
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
        const updated = prev.map(v => {
          if (v.id === videoId) {
            // Update feedback, but preserve audio feedback URL if it exists
            // Determine actual status based on feedback presence (text or audio)
            const hasTextFeedback = feedback && feedback.trim() !== '';
            const hasAudioFeedback = v.coach_feedback_audio_url;
            const actualStatus = (hasTextFeedback || hasAudioFeedback) ? 'completed' : status;

            const updatedVideo = {
              ...v,
              coach_feedback: feedback,
              coach_feedback_audio_url: v.coach_feedback_audio_url, // Preserve audio URL
              coach_rating: rating,
              status: actualStatus
            };
            // If feedback is being cleared but audio exists, keep audio
            // If feedback is being set, keep it
            return updatedVideo;
          }
          return v;
        });
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

  const fetchStudentDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

      // Fetch limitations from profile
      try {
        const profileRes = await axios.get(
          `${getApiBaseUrlWithApi()}/coach/student/${student.id}/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (profileRes.data.success) {
          setLimitations(profileRes.data.data.limitations || []);
        }
      } catch (err) {
        console.warn('Error fetching limitations:', err);
      }

      setStudentData(data);
      if (data.blocks) {
        setBlocks(data.blocks);
      }

      // Load block information from student data (use defaults if not set)
      setBlockNumber(data.block_number !== undefined && data.block_number !== null ? data.block_number : 3);
      setTotalBlocks(data.total_blocks !== undefined && data.total_blocks !== null ? data.total_blocks : 3);
      setBlockName(data.block_name || 'Prépa Force');
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      if (!silent) setLoading(false);
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

  // Fetch week notes when overview week changes
  useEffect(() => {
    if (student?.id && overviewWeekDate) {
      fetchWeekNotes();
    }
  }, [student?.id, overviewWeekDate]);

  const fetchWeekNotes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const weekKey = format(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      console.log('📅 Fetching notes for week:', weekKey);

      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/periodization/week-notes/${student.id}/${weekKey}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const loadedNotes = response.data.data.notes || [];
        // Sort by order
        setNotes(loadedNotes.sort((a, b) => a.order - b.order));
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error('Error loading week notes:', err);
      setNotes([]);
    }
  };

  const saveWeekNotes = async (updatedNotes) => {
    try {
      const token = localStorage.getItem('authToken');
      const weekKey = format(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      await axios.post(
        `${getApiBaseUrlWithApi()}/periodization/week-notes`,
        {
          student_id: student.id,
          week_start_date: weekKey,
          notes: updatedNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotes(updatedNotes);
    } catch (err) {
      console.error('Error saving week notes:', err);
      alert('Erreur lors de la sauvegarde des notes');
    }
  };

  // Handle note editing
  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId) => {
    const filtered = notes.filter(n => n.id !== noteId);
    const reordered = filtered.map((n, i) => ({ ...n, order: i }));
    await saveWeekNotes(reordered);
  };

  // Legacy confirmation (kept for compatibility if modal exists)
  const confirmDeleteNote = () => {
    if (noteToDeleteId !== null) {
      handleDeleteNote(noteToDeleteId);
      setIsDeleteNoteModalOpen(false);
      setNoteToDeleteId(null);
    }
  };

  // Handle note save
  const handleSaveNote = async () => {
    if (editingNoteId === null) return;

    if (!editingNoteText.trim()) {
      await handleDeleteNote(editingNoteId);
      setEditingNoteId(null);
      return;
    }

    const updatedNotes = notes.map(n =>
      n.id === editingNoteId ? { ...n, content: editingNoteText.trim() } : n
    );

    await saveWeekNotes(updatedNotes);
    setEditingNoteId(null);
  };

  // Handle note cancel
  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  // Handle adding new note
  const handleStartAddingNote = () => {
    setIsAddingNote(true);
    setNewNoteText('');
  };

  // Handle save new note
  const handleSaveNewNote = async () => {
    if (!newNoteText.trim()) {
      setIsAddingNote(false);
      return;
    }

    const newNote = {
      id: crypto.randomUUID(),
      content: newNoteText.trim(),
      order: notes.length
    };

    const updatedNotes = [...notes, newNote];
    await saveWeekNotes(updatedNotes);

    setNewNoteText('');
    setIsAddingNote(false);
  };

  // Handle cancel adding note
  const handleCancelAddingNote = () => {
    setIsAddingNote(false);
    setNewNoteText('');
  };

  const saveLimitations = async (updatedLimitations) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `${getApiBaseUrlWithApi()}/coach/student/${student.id}/profile`,
        { limitations: updatedLimitations },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLimitations(updatedLimitations);
    } catch (err) {
      console.error('Error saving limitations:', err);
      alert('Erreur lors de la sauvegarde des limitations');
    }
  };

  // Handle limitation editing
  const handleEditLimitation = (index) => {
    setEditingLimitationIndex(index);
    setEditingLimitationText(limitations[index]);
  };

  // Handle limitation deletion
  const handleDeleteLimitation = (index) => {
    setLimitationToDeleteIndex(index);
    setIsDeleteLimitationModalOpen(true);
  };

  // Confirm limitation deletion
  const confirmDeleteLimitation = async () => {
    if (limitationToDeleteIndex !== null) {
      const newLimitations = limitations.filter((_, i) => i !== limitationToDeleteIndex);
      await saveLimitations(newLimitations);
      setIsDeleteLimitationModalOpen(false);
      setLimitationToDeleteIndex(null);
    }
  };

  // Handle limitation save
  const handleSaveLimitation = async () => {
    if (editingLimitationIndex !== null && editingLimitationText.trim()) {
      const newLimitations = [...limitations];
      newLimitations[editingLimitationIndex] = editingLimitationText.trim();
      await saveLimitations(newLimitations);
      setEditingLimitationIndex(null);
      setEditingLimitationText('');
    }
  };

  // Handle limitation cancel
  const handleCancelEditLimitation = () => {
    setEditingLimitationIndex(null);
    setEditingLimitationText('');
  };

  // Handle adding new limitation
  const handleStartAddingLimitation = () => {
    setIsAddingLimitation(true);
    setNewLimitationText('');
  };

  // Handle save new limitation
  const handleSaveNewLimitation = async () => {
    if (newLimitationText.trim()) {
      const newLimitations = [...limitations, newLimitationText.trim()];
      await saveLimitations(newLimitations);
      setNewLimitationText('');
      setIsAddingLimitation(false);
    } else {
      setIsAddingLimitation(false);
    }
  };

  // Handle cancel adding limitation
  const handleCancelAddingLimitation = () => {
    setIsAddingLimitation(false);
    setNewLimitationText('');
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
      // Set default status filter to "A feedback" when opening analyse tab
      if (statusFilter === '') {
        setStatusFilter('A feedback');
      }
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

    // Get current month range for monthly stats
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Get date keys for the ranges
    const weekDateKeys = [];
    const monthDateKeys = [];

    // Generate week date keys
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      weekDateKeys.push(format(date, 'yyyy-MM-dd'));
    }

    // Generate month date keys - all days of the current month
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    monthDays.forEach(date => {
      monthDateKeys.push(format(date, 'yyyy-MM-dd'));
    });

    console.log('Month date range:', {
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      totalDays: monthDateKeys.length,
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
      trainingWeek: {
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

      // Status filter - check actual feedback presence (text or audio), not just status field
      const hasFeedback = (video.coach_feedback && video.coach_feedback.trim() !== '') || video.coach_feedback_audio_url;
      const isCompleted = video.status === 'completed' || video.status === 'reviewed' || hasFeedback;

      if (statusFilter === 'A feedback' && isCompleted) return false;
      if (statusFilter === 'Complété' && !isCompleted) return false;
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

  // Get filtered exercises based on search term
  const filteredExercises = useMemo(() => {
    const uniqueExercises = getUniqueExercises();
    if (!exerciseSearchTerm.trim()) {
      return uniqueExercises;
    }
    const searchLower = exerciseSearchTerm.toLowerCase().trim();
    return uniqueExercises.filter(exercise =>
      exercise.toLowerCase().includes(searchLower)
    );
  }, [studentVideos, exerciseSearchTerm]);

  // Get weight and reps from video data
  const getVideoWeightAndReps = (video) => {
    // Try direct properties first
    let weight = video.weight || video.target_weight || video.requested_weight;
    let reps = video.reps || video.target_reps || video.requested_reps;

    // If not found, try to get from assignment workout session
    if ((!weight || !reps) && video.assignment?.workout_session?.exercises) {
      const exerciseName = video.exercise_name;
      const setNumber = video.set_number || 1;

      for (const exercise of video.assignment.workout_session.exercises) {
        if (exercise.name === exerciseName && exercise.sets && exercise.sets[setNumber - 1]) {
          const set = exercise.sets[setNumber - 1];
          weight = weight || set.weight || set.target_weight;
          reps = reps || set.reps || set.target_reps;
          break;
        }
      }
    }

    return { weight: weight || 0, reps: reps || 0 };
  };

  // Render student videos grouped by session
  const renderStudentVideosGrouped = () => {
    if (groupedVideosBySession.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[320px] py-8">
          <div className="px-6 py-8 text-center font-light flex flex-col items-center gap-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
            <span>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucune vidéo trouvée</span>
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Aucune vidéo ne correspond aux filtres sélectionnés.</span>
            </span>
            <button
              onClick={() => {
                setStatusFilter('');
                setExerciseFilter('');
                setDateFilter('');
              }}
              className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
              style={{
                backgroundColor: 'var(--kaiylo-primary-hex)',
                color: 'var(--tw-ring-offset-color)'
              }}
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[7px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
        {groupedVideosBySession.map((session) => {
          const isOpen = openSessions[session.sessionId];
          const isHovered = hoveredSessionId === session.sessionId;
          const sessionName = session.sessionName;
          const sessionDate = format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr });
          // Si le toggle est ouvert, ne pas changer le background au survol
          const backgroundColor = (isHovered && !isOpen)
            ? 'rgba(255, 255, 255, 0.16)'
            : 'rgba(255, 255, 255, 0.05)';

          return (
            <div
              key={session.sessionId}
              className="px-5 py-3.5 transition-colors cursor-pointer rounded-2xl"
              style={{
                backgroundColor: backgroundColor,
                borderWidth: '0px',
                borderColor: 'rgba(0, 0, 0, 0)',
                borderStyle: 'none',
                borderImage: 'none'
              }}
              onMouseEnter={() => setHoveredSessionId(session.sessionId)}
              onMouseLeave={() => setHoveredSessionId(null)}
              onClick={() => toggleSession(session.sessionId)}
            >
              {/* Session Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 256 512"
                    className={`text-white/50 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''
                      }`}
                    style={{ width: '20px', height: '20px' }}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M247.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L179.2 256 41.9 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-light text-base flex items-center gap-2">
                      {sessionName} <span style={{ opacity: 0.5 }}>- {sessionDate}</span>
                      <span className="text-sm flex items-center gap-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-4 w-4" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                          <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z" />
                        </svg>
                        <span style={{ fontWeight: '400' }}>x{session.videos.length}</span>
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.videos.some(v => v.status === 'pending') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                      A feedback
                    </span>
                  )}
                  {session.videos.every(v => v.status === 'completed' || v.status === 'reviewed') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
                      Complété
                    </span>
                  )}
                </div>
              </div>

              {/* Session Videos (Collapsible) */}
              {isOpen && (
                <div className="mt-2 pt-2 pl-6">
                  <div className="flex flex-col gap-[7px]">
                    {session.videos.map((video) => (
                      <div
                        key={video.id}
                        className="px-2 py-2 transition-all duration-200 cursor-pointer rounded-2xl bg-white/[0.07] hover:bg-white/[0.14]"
                        style={{
                          borderWidth: '0px',
                          borderColor: 'rgba(0, 0, 0, 0)',
                          borderStyle: 'none',
                          borderImage: 'none'
                        }}
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
                            {/* Exercise Tag and Date */}
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-white font-light text-base">
                                {video.exercise_name}
                              </span>
                              <span className="text-white/50">-</span>
                              <span className="text-white/50 text-sm font-extralight">
                                {format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}
                              </span>
                            </div>

                            {/* Series */}
                            <div className="text-white/75 text-sm font-extralight">
                              {(() => {
                                const { weight, reps } = getVideoWeightAndReps(video);
                                const seriesText = `Série ${video.set_number || 1}/3`;
                                const repsText = reps > 0 ? `${reps} reps` : null;
                                const weightText = weight > 0 ? `${weight}kg` : null;

                                if (repsText && weightText) {
                                  return (
                                    <>
                                      {seriesText} • {repsText}{' '}
                                      <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                                    </>
                                  );
                                } else if (repsText) {
                                  return `${seriesText} • ${repsText}`;
                                } else if (weightText) {
                                  return (
                                    <>
                                      {seriesText} •{' '}
                                      <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                                    </>
                                  );
                                }
                                return seriesText;
                              })()}
                            </div>

                            {/* Coach Feedback */}
                            {(video.coach_feedback || video.coach_feedback_audio_url) && (
                              <div className="mt-2 pt-2 flex flex-col gap-1 border-t border-white/10">
                                {video.coach_feedback_audio_url && (
                                  <div className="text-xs">
                                    <VoiceMessage
                                      message={{
                                        file_url: video.coach_feedback_audio_url,
                                        message_type: 'audio',
                                        file_type: 'audio/webm'
                                      }}
                                      isOwnMessage={false}
                                    />
                                  </div>
                                )}
                                {video.coach_feedback && (
                                  <div className="flex items-start gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                                      <path d="M512 240c0 132.5-114.6 240-256 240-37.1 0-72.3-7.4-104.1-20.7L33.5 510.1c-9.4 4-20.2 1.7-27.1-5.8S-2 485.8 2.8 476.8l48.8-92.2C19.2 344.3 0 294.3 0 240 0 107.5 114.6 0 256 0S512 107.5 512 240z" />
                                    </svg>
                                    <div className="text-xs font-normal line-clamp-2 flex-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                                      {video.coach_feedback}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status Tag - Show based on feedback presence (text or audio) */}
                          {(() => {
                            const hasFeedback = (video.coach_feedback && video.coach_feedback.trim() !== '') || video.coach_feedback_audio_url;
                            const isCompleted = video.status === 'completed' || video.status === 'reviewed' || hasFeedback;

                            if (isCompleted) {
                              return (
                                <div className="flex-shrink-0 flex items-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
                                    Complété
                                  </span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex-shrink-0 flex items-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                                    A feedback
                                  </span>
                                </div>
                              );
                            }
                          })()}
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
      case 'completed':
        return sessions.filter(session => session.status === 'completed');
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

  const renderOverviewDayContent = (dayDate, dayKey, isDropTarget = false, draggedSession = null, filteredSessions = null) => {
    const sessions = filteredSessions || workoutSessions[dayKey] || [];
    const hasMultipleSessions = sessions.length > 1;
    const hasMoreThanTwoSessions = sessions.length > 2;

    const sessionList = sessions.length > 0 ? (
      <div
        className={`session-container flex flex-col gap-2 transition-all duration-300 ease-out relative`}
        style={{
          height: '280px',
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
              className={`rounded-xl transition-all duration-200 ${hasMultipleSessions && !hasMoreThanTwoSessions ? '' : hasMoreThanTwoSessions ? 'flex-shrink-0' : 'h-full'} flex flex-col ${session.status === 'draft'
                ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
                : 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedSession && draggedSession.id === (session.id || session.assignmentId) ? 'opacity-50 scale-95' : ''
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
                      <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z" />
                    </svg>
                    <span className={`truncate ${hasMoreThanTwoSessions ? 'text-[12px]' : 'text-[14px]'} font-normal`} style={{ color: 'var(--kaiylo-primary-hex)' }}>{session.title || 'Séance'}</span>
                  </div>

                  {(session.status !== 'completed' && session.status !== 'in_progress') || session.status === 'completed' ? (
                    <div className="h-full flex items-center relative overflow-visible">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(session.id || session.assignmentId, dayKey, e);
                        }}
                        className={`transition-colors flex items-center justify-center ${dropdownOpen === dropdownKey
                          ? 'text-[var(--kaiylo-primary-hex)]'
                          : 'text-white/50 hover:text-white'
                          }`}
                        title="Options de la séance"
                      >
                        <MoreHorizontal className="h-[14px] w-[14px]" />
                      </button>

                      {dropdownOpen === dropdownKey && (
                        <div
                          className="fixed rounded-lg shadow-2xl z-[9999] w-[220px]"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(10px)',
                            borderColor: 'rgba(255, 255, 255, 0.15)',
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
                                <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z" />
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
                                    <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z" />
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
                                  <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z" />
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
                                  <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
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
                    <div className="flex items-center justify-between text-[9px] md:text-[11px] text-white/75">
                      <span className="font-light">+ {exercises.length} exercice{exercises.length > 1 ? 's' : ''}</span>
                    </div>
                  </>
                )}

                {!hasMultipleSessions && (
                  <>
                    <div className="border-b border-white/10 mb-2"></div>

                    <div className="flex flex-col gap-1.5 flex-1" style={{ marginTop: '12px' }}>
                      {exercises.slice(0, 7).map((exercise, index) => {
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
                            {exercise.useRir ? (
                              <span className="text-[#d4845a] font-normal">RPE {exercise.sets?.[0]?.weight || 0}</span>
                            ) : (
                              <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span>
                            )} - <span className="font-light text-white/75">{exercise.name}</span>
                          </div>
                        );
                      })}
                      {exercises.length > 7 && (
                        <div className="text-[11px] text-white/50 font-extralight">
                          + {exercises.length - 7} exercice{(exercises.length - 7) > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-0 text-[9px] md:text-[11px]">
                  <div className="flex items-center gap-1 md:gap-2 flex-1">
                    <span
                      className={`px-1.5 md:px-2.5 py-0.5 rounded-full font-normal shadow-sm flex items-center gap-1 md:gap-1.5 ${session.status === 'completed'
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
                        style={{
                          fill: session.difficulty?.toLowerCase() === 'facile'
                            ? '#2FA064'
                            : session.difficulty?.toLowerCase() === 'moyen'
                              ? '#d4845a'
                              : session.difficulty?.toLowerCase() === 'difficile'
                                ? '#ef4444'
                                : '#2FA064'
                        }}
                      >
                        <path d="M535.1 342.6C547.6 330.1 547.6 309.8 535.1 297.3L375.1 137.3C362.6 124.8 342.3 124.8 329.8 137.3C317.3 149.8 317.3 170.1 329.8 182.6L467.2 320L329.9 457.4C317.4 469.9 317.4 490.2 329.9 502.7C342.4 515.2 362.7 515.2 375.2 502.7L535.2 342.7zM183.1 502.6L343.1 342.6C355.6 330.1 355.6 309.8 343.1 297.3L183.1 137.3C170.6 124.8 150.3 124.8 137.8 137.3C125.3 149.8 125.3 170.1 137.8 182.6L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7z" />
                      </svg>
                    )}

                    {/* Difficulty indicator - Only show for completed sessions with difficulty */}
                    {session.status === 'completed' && session.difficulty && (
                      <svg
                        className={`${session.difficulty.toLowerCase() === 'facile'
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
                        <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 282.9 440.5 289.9 440C296.9 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z" />
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
          minHeight: '280px',
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
              <div className="session-container flex flex-col gap-2 transition-all duration-300 ease-out relative" style={{ height: '280px', overflowY: 'hidden' }}>
                <div className="rounded-xl transition-all duration-200 h-full flex flex-col bg-[rgba(255,255,255,0.05)] opacity-50 scale-95">
                  <div className="pt-3 pb-3 px-3 space-y-2 flex-1 flex flex-col overflow-visible" style={{ width: '100%' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                          <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z" />
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
                          {exercise.useRir ? (
                            <span className="text-[#d4845a] font-normal">RPE {exercise.sets?.[0]?.weight || 0}</span>
                          ) : (
                            <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span>
                          )} - <span className="font-light text-white/75">{exercise.name}</span>
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
                className={`w-full px-5 py-2 rounded-lg text-sm shadow-lg ${isPastingSession ? 'bg-[var(--kaiylo-primary-hex)] text-white opacity-80 cursor-not-allowed' : 'bg-[var(--kaiylo-primary-hex)] text-white hover:bg-[var(--kaiylo-primary-hover)]'
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
      <div className={`session-container flex-1 ${weekViewFilter === 8 ? 'space-y-1.5' : 'space-y-0.5'} overflow-y-auto max-h-full`}>
        {sessions.map((session, sessionIndex) => {
          const canDrag = session.status === 'draft' || session.status === 'assigned';

          return (
            <div
              key={session.id || sessionIndex}
              className={`rounded transition-all duration-200 ${session.status === 'draft'
                ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                : session.status === 'assigned'
                  ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                  : 'bg-[#262626] border-l-2 border-[#d4845a] hover:bg-[#2a2a2a]'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${weekViewFilter === 8 ? 'p-1.5' : 'p-1'} ${draggedSession && draggedSession.id === (session.id || session.assignmentId) ? 'opacity-50 scale-95' : ''
                }`}
              onClick={(e) => {
                e.stopPropagation();
                handleSessionClick(session, day);
              }}
              draggable
              onDragStart={(event) => handleSessionDragStart(event, session, day)}
              onDragEnd={handleSessionDragEnd}
            >
              <div className={`flex items-center justify-between ${weekViewFilter === 8 ? 'mb-2' : 'mb-1'}`}>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className={`font-light truncate ${weekViewFilter === 8 ? 'text-sm' : 'text-[10px]'} max-w-[60%]`}>{session.title || 'Séance'}</div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {session.status === 'in_progress' && (
                      <PlayCircle className={`text-[#d4845a] ${weekViewFilter === 8 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'completed' && (
                      <CheckCircle className={`text-[#22c55e] ${weekViewFilter === 8 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'draft' && (
                      <EyeOff className={`text-white/50 ${weekViewFilter === 8 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                    {session.status === 'assigned' && (
                      <Clock className={`text-[#3b82f6] ${weekViewFilter === 8 ? 'h-3 w-3' : 'h-2 w-2'}`} />
                    )}
                  </div>
                </div>
                {session.status !== 'completed' && session.status !== 'in_progress' && (
                  <div className="relative ml-2 dropdown-container flex-shrink-0 overflow-visible">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(session.id || session.assignmentId, dateKey, e);
                      }}
                      className={`transition-colors flex items-center justify-center ${dropdownOpen === `${session.id || session.assignmentId}-${dateKey}`
                        ? 'text-[var(--kaiylo-primary-hex)]'
                        : 'text-white/50 hover:text-white'
                        }`}
                      title="Options de la séance"
                    >
                      <MoreHorizontal className={weekViewFilter === 8 ? 'h-4 w-4' : 'h-3 w-3'} />
                    </button>
                    {dropdownOpen === `${session.id || session.assignmentId}-${dateKey}` && (
                      <div
                        className="fixed rounded-lg shadow-2xl z-[9999] min-w-[180px]"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(10px)',
                          borderColor: 'rgba(255, 255, 255, 0.15)',
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
                              <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z" />
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
                            <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z" />
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
                            <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`text-white/50 ${weekViewFilter === 8 ? 'text-[10px]' : 'text-[8px]'}`}>
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
                          <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z" />
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
                          {exercise.useRir ? (
                            <span className="text-[#d4845a] font-normal">RPE {exercise.sets?.[0]?.weight || 0}</span>
                          ) : (
                            <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span>
                          )} - <span className="font-light text-white/75">{exercise.name}</span>
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
                className={`w-full px-3 py-1.5 rounded-lg text-xs shadow-lg ${isPastingSession ? 'bg-[var(--kaiylo-primary-hex)] text-white opacity-80 cursor-not-allowed' : 'bg-[var(--kaiylo-primary-hex)] text-white hover:bg-[var(--kaiylo-primary-hover)]'
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

  const handleFeedbackBadgeClick = (student) => {
    if (onStudentChange) {
      onStudentChange(student);
    }
    setActiveTab('analyse');
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar - Hidden on mobile */}
      {students.length > 0 && (
        <div className="hidden md:flex ml-6 mt-3 self-stretch items-end">
          <StudentSidebar
            students={students}
            currentStudentId={student?.id}
            onStudentSelect={handleStudentSelect}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            studentVideoCounts={studentVideoCounts}
            studentMessageCounts={studentMessageCounts}
            studentNextSessions={studentNextSessions}
            onFeedbackBadgeClick={handleFeedbackBadgeClick}
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
              <div className="p-3 md:p-4 relative mt-3">
                {/* Toggle Sidebar Button - Hidden on mobile */}
                {students.length > 0 && (
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex absolute top-0 left-4 z-50 w-5 h-5 items-center justify-center text-white/80 hover:text-white transition-colors"
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                )}
                <div className="flex items-center md:items-start gap-4 md:gap-6 border-b border-b-[rgba(255,255,255,0.1)] ml-0 mt-3">
                  <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0 overflow-hidden relative">
                    <svg
                      className="w-[24px] h-[24px] md:w-[28px] md:h-[28px] text-white/80"
                      viewBox="0 0 448 512"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col md:flex-col">
                    {/* Ligne avec titre et menu déroulant sur mobile */}
                    <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-0">
                      <h1 className="text-lg md:text-xl font-light flex-shrink-0" style={{ fontWeight: 200 }}>
                        {student?.full_name || student?.name || student?.profile?.full_name || 'Étudiant'}
                      </h1>
                      {/* Menu déroulant sur mobile */}
                      <div className="md:hidden relative flex-shrink-0" style={{ minWidth: '120px' }}>
                        <select
                          value={activeTab}
                          onChange={(e) => setActiveTab(e.target.value)}
                          className="w-full bg-transparent border-0 px-2 py-1 pr-6 text-sm text-white focus:outline-none focus:ring-0 transition-colors"
                          style={{
                            color: activeTab === 'overview' || activeTab === 'training' || activeTab === 'periodization' || activeTab === 'analyse' || activeTab === 'suivi' ? '#d4845a' : 'rgba(255, 255, 255, 0.5)',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        >
                          <option value="overview">Tableau de bord</option>
                          <option value="training">Entraînement</option>
                          <option value="periodization">Périodisation</option>
                          <option value="analyse">Analyse vidéo</option>
                          <option value="suivi">Suivi Financier</option>
                        </select>
                        {/* Flèche du dropdown */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: activeTab === 'overview' || activeTab === 'training' || activeTab === 'periodization' || activeTab === 'analyse' || activeTab === 'suivi' ? '#d4845a' : 'rgba(255, 255, 255, 0.5)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Onglets sur desktop */}
                    <div className="hidden md:flex gap-6 mt-1" style={{ paddingLeft: '24px' }}>
                      <button
                        className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'overview' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
                        data-text="Tableau de bord"
                        style={activeTab !== 'overview' ? { fontWeight: 200 } : {}}
                        onClick={() => setActiveTab('overview')}
                      >
                        Tableau de bord
                      </button>
                      <button
                        className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'training' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
                        data-text="Entraînement"
                        style={activeTab !== 'training' ? { fontWeight: 200 } : {}}
                        onClick={() => setActiveTab('training')}
                      >
                        Entraînement
                      </button>
                      <button
                        className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'periodization' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
                        data-text="Périodisation"
                        style={activeTab !== 'periodization' ? { fontWeight: 200 } : {}}
                        onClick={() => setActiveTab('periodization')}
                      >
                        Périodisation
                      </button>
                      <button
                        className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'analyse' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
                        data-text="Analyse vidéo"
                        style={activeTab !== 'analyse' ? { fontWeight: 200 } : {}}
                        onClick={() => setActiveTab('analyse')}
                      >
                        Analyse vidéo
                      </button>
                      <button
                        className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'suivi' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
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
            <div className="p-4 pb-0 pt-0" style={{ overflow: 'hidden', maxWidth: '100%' }}>
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[220px,1fr,250px] gap-3" style={{ marginBottom: '8px' }}>
                    {/* Current Block Card */}
                    <div
                      className="bg-white/5 rounded-2xl px-2 py-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
                      onClick={() => setIsCreateBlockModalOpen(true)}
                    >
                      <h2
                        className="text-base font-normal mb-4 text-center"
                        style={{ color: 'var(--kaiylo-primary-hover)' }}
                      >
                        {(() => {
                          // Find current block from periodization blocks based on the selected week date (overviewWeekDate)
                          // Only display if an active block is found for the selected week
                          if (blocks && blocks.length > 0) {
                            const selectedWeekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });

                            // Find all active blocks for the selected week
                            const matchingBlocks = blocks.filter(b => {
                              const bStart = startOfWeek(new Date(b.start_week_date), { weekStartsOn: 1 });
                              const bEnd = addWeeks(bStart, b.duration);
                              return selectedWeekStart >= bStart && selectedWeekStart < bEnd;
                            });

                            // Sort matching blocks to pick the most relevant one (latest start date, then latest created)
                            matchingBlocks.sort((a, b) => {
                              const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
                              if (dateDiff !== 0) return dateDiff;

                              // Secondary sort by created_at to prefer newer blocks
                              if (a.created_at && b.created_at) {
                                return new Date(a.created_at) - new Date(b.created_at);
                              }
                              return String(a.id).localeCompare(String(b.id));
                            });

                            // Take the last one as the active block
                            const activeBlock = matchingBlocks.length > 0 ? matchingBlocks[matchingBlocks.length - 1] : null;

                            if (activeBlock) {
                              // Calculate block number and total from blocks
                              const sortedBlocks = [...blocks].sort((a, b) => {
                                const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
                                if (dateDiff !== 0) return dateDiff;
                                if (a.created_at && b.created_at) {
                                  return new Date(a.created_at) - new Date(b.created_at);
                                }
                                return String(a.id).localeCompare(String(b.id));
                              });

                              const currentIndex = sortedBlocks.findIndex(b => b.id === activeBlock.id);
                              const displayBlockNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
                              const displayTotalBlocks = sortedBlocks.length;
                              const displayBlockName = activeBlock.name || '';

                              return displayBlockName ? `Bloc ${displayBlockNumber} - ${displayBlockName}` : `Bloc ${displayBlockNumber}`;
                            }
                          }

                          // If no active block found, display a message to create a block
                          return 'Créez un bloc';
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
                            <path d="M144.3 0l224 0c26.5 0 48.1 21.8 47.1 48.2-.2 5.3-.4 10.6-.7 15.8l49.6 0c26.1 0 49.1 21.6 47.1 49.8-7.5 103.7-60.5 160.7-118 190.5-15.8 8.2-31.9 14.3-47.2 18.8-20.2 28.6-41.2 43.7-57.9 51.8l0 73.1 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0 0-73.1c-16-7.7-35.9-22-55.3-48.3-18.4-4.8-38.4-12.1-57.9-23.1-54.1-30.3-102.9-87.4-109.9-189.9-1.9-28.1 21-49.7 47.1-49.7l49.6 0c-.3-5.2-.5-10.4-.7-15.8-1-26.5 20.6-48.2 47.1-48.2zM101.5 112l-52.4 0c6.2 84.7 45.1 127.1 85.2 149.6-14.4-37.3-26.3-86-32.8-149.6zM380 256.8c40.5-23.8 77.1-66.1 83.3-144.8L411 112c-6.2 60.9-17.4 108.2-31 144.8z" />
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
                              <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
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
                      {/* Month indicator */}
                      <div className="relative flex items-center" style={{ paddingLeft: '12px', paddingRight: '12px', height: '40px', marginBottom: '6px' }}>
                        {/* Block info - aligned to left */}
                        <div className="flex items-center justify-start gap-2.5">
                          <button
                            onClick={() => setOverviewWeekDate(new Date())}
                            className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-3 md:px-[15px] rounded-[50px] transition-colors flex items-center gap-1 text-primary-foreground text-xs md:text-sm"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: 'rgba(250, 250, 250, 0.5)',
                              fontWeight: '400'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.1)';
                              e.currentTarget.style.color = '#D48459';
                              e.currentTarget.style.fontWeight = '400';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.color = 'rgba(250, 250, 250, 0.5)';
                              e.currentTarget.style.fontWeight = '400';
                            }}
                          >
                            Aujourd'hui
                          </button>
                          {(() => {
                            if (!blocks || blocks.length === 0) return null;

                            const currentWeekStart = startOfWeek(overviewWeekDate, { weekStartsOn: 1 });
                            // Find all active blocks for the selected week
                            const matchingBlocks = blocks.filter(b => {
                              const bStart = startOfWeek(new Date(b.start_week_date), { weekStartsOn: 1 });
                              const bEnd = addWeeks(bStart, b.duration);
                              return currentWeekStart >= bStart && currentWeekStart < bEnd;
                            });

                            // Sort matching blocks to pick the most relevant one (latest start date, then latest created)
                            matchingBlocks.sort((a, b) => {
                              const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
                              if (dateDiff !== 0) return dateDiff;
                              if (a.created_at && b.created_at) {
                                return new Date(a.created_at) - new Date(b.created_at);
                              }
                              return String(a.id).localeCompare(String(b.id));
                            });

                            // Take the last one as the active block
                            const active = matchingBlocks.length > 0 ? matchingBlocks[matchingBlocks.length - 1] : null;

                            if (active) {
                              const bStart = startOfWeek(new Date(active.start_week_date), { weekStartsOn: 1 });
                              const weekDiff = differenceInCalendarWeeks(currentWeekStart, bStart, { weekStartsOn: 1 });
                              // Calculate current week in block (1-indexed) and total weeks
                              const currentWeekInBlock = weekDiff + 1;
                              const totalWeeksInBlock = active.duration;
                              // Calculate block number by sorting blocks by start date
                              const sortedBlocks = [...blocks].sort((a, b) => {
                                const dateDiff = new Date(a.start_week_date) - new Date(b.start_week_date);
                                if (dateDiff !== 0) return dateDiff;
                                if (a.created_at && b.created_at) {
                                  return new Date(a.created_at) - new Date(b.created_at);
                                }
                                return String(a.id).localeCompare(String(b.id));
                              });
                              const currentIndex = sortedBlocks.findIndex(b => b.id === active.id);
                              const blockNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
                              return (
                                <span className="text-sm text-[#D4845A] font-normal flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor">
                                    <path d="M232.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 149.8C5.4 145.8 0 137.3 0 128s5.4-17.9 13.9-21.8L232.5 5.2zM48.1 218.4l164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 277.8C5.4 273.8 0 265.3 0 256s5.4-17.9 13.9-21.8l34.1-15.8zM13.9 362.2l34.1-15.8 164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 405.8C5.4 401.8 0 393.3 0 384s5.4-17.9 13.9-21.8z" />
                                  </svg>
                                  Bloc {blockNumber} - Semaine {currentWeekInBlock}/{totalWeeksInBlock}
                                </span>
                              );
                            }
                            return (
                              <span className="text-sm text-white/25 font-normal flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="w-3.5 h-3.5" fill="currentColor">
                                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                                </svg>
                                Aucun bloc attribué
                              </span>
                            );
                          })()}
                        </div>
                        {/* Month - centered */}
                        <div className="absolute left-1/2 transform -translate-x-1/2">
                          <span className="text-sm text-white/50 font-light">
                            {(() => {
                              const month = format(overviewWeekDate, 'MMMM', { locale: fr });
                              return month.charAt(0).toUpperCase() + month.slice(1);
                            })()}
                          </span>
                        </div>
                      </div>

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
                      <div className="grid grid-cols-7 gap-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px', paddingRight: '8px', paddingBottom: '4px', marginBottom: '4px' }}>
                        {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day, i) => {
                          const dayDate = addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i);
                          const dayKey = format(dayDate, 'yyyy-MM-dd');
                          const isToday = dayKey === format(new Date(), 'yyyy-MM-dd');
                          const isDropTarget = dragOverDate === dayKey;

                          return (
                            <div
                              key={day}
                              className="rounded-xl px-1 pt-1 pb-2 cursor-pointer transition-all duration-300 relative group min-h-[320px] overflow-hidden"
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
                              onMouseEnter={() => {
                                // Ne pas mettre à jour hoveredPasteDate si on est en train de coller
                                if (!isPastingSession) {
                                  setHoveredPasteDate(dayKey);
                                }
                              }}
                              onMouseLeave={(event) => {
                                // Ne pas mettre à jour hoveredPasteDate si on est en train de coller
                                if (!isPastingSession) {
                                  // Check if relatedTarget is a valid node before calling contains
                                  const relatedTarget = event.relatedTarget;
                                  if (!relatedTarget || !(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
                                    setHoveredPasteDate((current) => (current === dayKey ? null : current));
                                  }
                                }
                              }}
                            >
                              <div className="text-sm text-white/75 mb-1.5 flex justify-end items-center gap-1">
                                <button className="p-1 rounded-[8px] transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:bg-white/10 group-hover:hover:bg-white/25 hover:scale-105 active:scale-95">
                                  <Plus className="h-4 w-4 text-[#BFBFBF] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <span className={`text-[12px] font-extralight ${isToday ? 'text-white rounded-full w-6 h-6 flex items-center justify-center bg-[var(--kaiylo-primary-hover)]' : 'text-white/75'}`}>
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
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-3 mb-0 mt-3 items-stretch">
                    {/* Evolution des Kg/Reps - Left Section (2/3 width) */}
                    <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10 h-full">
                      <div className="mb-4 border-b border-white/10 pb-2">
                        <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                            <path d="M128 128C128 110.3 113.7 96 96 96C78.3 96 64 110.3 64 128L64 464C64 508.2 99.8 544 144 544L544 544C561.7 544 576 529.7 576 512C576 494.3 561.7 480 544 480L144 480C135.2 480 128 472.8 128 464L128 128zM534.6 214.6C547.1 202.1 547.1 181.8 534.6 169.3C522.1 156.8 501.8 156.8 489.3 169.3L384 274.7L326.6 217.4C314.1 204.9 293.8 204.9 281.3 217.4L185.3 313.4C172.8 325.9 172.8 346.2 185.3 358.7C197.8 371.2 218.1 371.2 230.6 358.7L304 285.3L361.4 342.7C373.9 355.2 394.2 355.2 406.7 342.7L534.7 214.7z" />
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
                              <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z" />
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
                    <div className="flex flex-col gap-3 h-full min-h-0">
                      {/* Notes Card */}
                      <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10 flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2 shrink-0">
                          <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 opacity-75" fill="currentColor">
                              <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z" />
                            </svg>
                            Notes de la semaine
                          </h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-2">
                          {notes.map((note) => (
                            <div key={note.id} className="relative group text-xs text-white/75 font-normal flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 transition-all duration-200 hover:backdrop-blur-sm hover:bg-black/30 cursor-pointer">
                              {editingNoteId === note.id ? (
                                <>
                                  <span className="text-[#d4845a] mt-0.5">•</span>
                                  <input
                                    type="text"
                                    value={editingNoteText}
                                    onChange={(e) => setEditingNoteText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveNote();
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditNote();
                                      }
                                    }}
                                    onBlur={handleSaveNote}
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-white/75 font-normal px-0 py-0"
                                    style={{
                                      caretColor: '#d4845a',
                                      width: '100%'
                                    }}
                                    autoFocus
                                  />
                                </>
                              ) : (
                                <>
                                  <span className="text-[#d4845a] mt-0.5 transition-all duration-200 group-hover:blur-sm group-hover:opacity-40">•</span>
                                  <span className="transition-all duration-200 group-hover:blur-sm group-hover:text-white/40 flex-1">{note.content}</span>
                                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditNote(note);
                                      }}
                                      className="p-1 rounded transition-transform duration-200 hover:scale-125 pointer-events-auto"
                                      title="Modifier la note"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 text-[#d4845a] fill-current">
                                        <path d="M352.9 21.2L308 66.1 445.9 204 490.8 159.1C504.4 145.6 512 127.2 512 108s-7.6-37.6-21.2-51.1L455.1 21.2C441.6 7.6 423.2 0 404 0s-37.6 7.6-51.1 21.2zM274.1 100L58.9 315.1c-10.7 10.7-18.5 24.1-22.6 38.7L.9 481.6c-2.3 8.3 0 17.3 6.2 23.4s15.1 8.5 23.4 6.2l127.8-35.5c14.6-4.1 27.9-11.8 38.7-22.6L412 237.9 274.1 100z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(note.id);
                                      }}
                                      className="p-1 rounded transition-transform duration-200 hover:scale-125 pointer-events-auto"
                                      title="Supprimer la note"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 text-[#d4845a] fill-current">
                                        <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z" />
                                      </svg>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add new note */}
                          {isAddingNote ? (
                            <div className="text-xs text-white/75 font-normal flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5">
                              <span className="text-[#d4845a] mt-0.5">•</span>
                              <input
                                type="text"
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveNewNote();
                                  } else if (e.key === 'Escape') {
                                    handleCancelAddingNote();
                                  }
                                }}
                                onBlur={handleSaveNewNote}
                                placeholder="Ajouter une note..."
                                className="flex-1 bg-transparent border-none outline-none text-xs text-white/75 font-normal px-0 py-0 placeholder:text-white/30"
                                style={{
                                  caretColor: '#d4845a',
                                  width: '100%'
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              onClick={handleStartAddingNote}
                              className="w-full text-xs font-normal px-3 py-2 rounded-lg bg-transparent hover:bg-white/5 transition-all duration-200"
                            >
                              <span className="text-white/50 font-light">Ajouter une note de semaine</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Limitations et blessures Card */}
                      <div className="bg-white/5 rounded-2xl pt-4 px-4 pb-4 border border-white/10 flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2 shrink-0">
                          <h3 className="text-sm font-medium flex items-center gap-[10px] text-[#d4845a]" style={{ fontWeight: 400 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 opacity-75" fill="currentColor">
                              <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z" />
                            </svg>
                            Notes Générales
                          </h3>
                        </div>
                        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar pr-2">
                          {limitations.map((limitation, index) => (
                            <div key={index} className="relative group text-xs text-white/75 font-normal flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 transition-all duration-200 hover:backdrop-blur-sm hover:bg-black/30 cursor-pointer">
                              {editingLimitationIndex === index ? (
                                <>
                                  <span className="text-[#d4845a] mt-0.5">•</span>
                                  <input
                                    type="text"
                                    value={editingLimitationText}
                                    onChange={(e) => setEditingLimitationText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveLimitation();
                                      } else if (e.key === 'Escape') {
                                        handleCancelEditLimitation();
                                      }
                                    }}
                                    onBlur={handleSaveLimitation}
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-white/75 font-normal px-0 py-0"
                                    style={{
                                      caretColor: '#d4845a',
                                      width: '100%'
                                    }}
                                    autoFocus
                                  />
                                </>
                              ) : (
                                <>
                                  <span className="text-[#d4845a] mt-0.5 transition-all duration-200 group-hover:blur-sm group-hover:opacity-40">•</span>
                                  <span className="transition-all duration-200 group-hover:blur-sm group-hover:text-white/40 flex-1">{limitation}</span>
                                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditLimitation(index);
                                      }}
                                      className="p-1 rounded transition-transform duration-200 hover:scale-125 pointer-events-auto"
                                      title="Modifier la note"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4 text-[#d4845a] fill-current">
                                        <path d="M352.9 21.2L308 66.1 445.9 204 490.8 159.1C504.4 145.6 512 127.2 512 108s-7.6-37.6-21.2-51.1L455.1 21.2C441.6 7.6 423.2 0 404 0s-37.6 7.6-51.1 21.2zM274.1 100L58.9 315.1c-10.7 10.7-18.5 24.1-22.6 38.7L.9 481.6c-2.3 8.3 0 17.3 6.2 23.4s15.1 8.5 23.4 6.2l127.8-35.5c14.6-4.1 27.9-11.8 38.7-22.6L412 237.9 274.1 100z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLimitation(index);
                                      }}
                                      className="p-1 rounded transition-transform duration-200 hover:scale-125 pointer-events-auto"
                                      title="Supprimer la note"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 text-[#d4845a] fill-current">
                                        <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z" />
                                      </svg>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add new limitation */}
                          {isAddingLimitation ? (
                            <div className="text-xs text-white/75 font-normal flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5">
                              <span className="text-[#d4845a] mt-0.5">•</span>
                              <input
                                type="text"
                                value={newLimitationText}
                                onChange={(e) => setNewLimitationText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveNewLimitation();
                                  } else if (e.key === 'Escape') {
                                    handleCancelAddingLimitation();
                                  }
                                }}
                                onBlur={handleSaveNewLimitation}
                                placeholder="Ajouter une note..."
                                className="flex-1 bg-transparent border-none outline-none text-xs text-white/75 font-normal px-0 py-0 placeholder:text-white/30"
                                style={{
                                  caretColor: '#d4845a',
                                  width: '100%'
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              onClick={handleStartAddingLimitation}
                              className="w-full text-xs font-normal px-3 py-2 rounded-lg bg-transparent hover:bg-white/5 transition-all duration-200"
                            >
                              <span className="text-white/50 font-extralight">Ajouter une note</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'training' && (
                <div className="relative">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3 md:gap-0" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <div className="flex items-center gap-0">
                        <button
                          onClick={() => changeTrainingWeek('prev')}
                          className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-0 rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground group"
                          style={{
                            backgroundColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.75)',
                            fontWeight: '400'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 md:h-4 md:w-4 text-white/75 group-hover:text-white group-active:text-white transition-colors" style={{ transform: 'scaleX(-1)' }}>
                            <path fill="currentColor" d="M247.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L179.2 256 41.9 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
                          </svg>
                        </button>
                        <span className="text-xs md:text-sm font-light text-white/75 min-w-[140px] md:min-w-[180px] text-center">
                          {format(startOfWeek(trainingWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} - {format(addDays(startOfWeek(trainingWeekDate, { weekStartsOn: 1 }), (weekViewFilter * 7) - 1), 'd MMM yyyy', { locale: fr })}
                        </span>
                        <button
                          onClick={() => changeTrainingWeek('next')}
                          className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-0 rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground group"
                          style={{
                            backgroundColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.75)',
                            fontWeight: '400'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 md:h-4 md:w-4 text-white/75 group-hover:text-white group-active:text-white transition-colors">
                            <path fill="currentColor" d="M247.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L179.2 256 41.9 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => setTrainingWeekDate(new Date())}
                        className="bg-primary hover:bg-primary/90 font-normal py-1.5 md:py-2 px-3 md:px-[15px] rounded-[50px] transition-colors flex items-center gap-1 text-primary-foreground text-xs md:text-sm"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(250, 250, 250, 0.5)',
                          fontWeight: '400'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.1)';
                          e.currentTarget.style.color = '#D48459';
                          e.currentTarget.style.fontWeight = '400';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.color = 'rgba(250, 250, 250, 0.5)';
                          e.currentTarget.style.fontWeight = '400';
                        }}
                      >
                        Aujourd'hui
                      </button>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      {/* Detailed View Switch */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="detailed-view-filter"
                          className="text-[10px] md:text-xs text-white/50 font-light cursor-pointer select-none"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          Vue détaillée
                        </label>
                        {/* Toggle Switch */}
                        <div className="relative inline-block w-9 h-[18px] shrink-0">
                          <input
                            type="checkbox"
                            id="detailed-view-filter"
                            checked={isDetailedView}
                            onChange={(e) => setIsDetailedView(e.target.checked)}
                            className="sr-only"
                          />
                          <label
                            htmlFor="detailed-view-filter"
                            className="block h-[18px] rounded-full cursor-pointer transition-colors duration-200"
                            style={{
                              backgroundColor: isDetailedView ? 'var(--kaiylo-primary-hex)' : '#404040'
                            }}
                          >
                            <span
                              className={`absolute top-[3px] left-[3px] w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isDetailedView ? 'translate-x-[18px]' : 'translate-x-0'
                                }`}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="hidden md:block h-5 w-[1px] bg-white/10"></div>

                      {/* Status Filter - Using buttons instead of select for better Kaiylo theme */}
                      <div className="flex items-center gap-0.5 md:gap-1 bg-white/5 rounded-full p-0.5 md:p-1">
                        <button
                          onClick={() => setTrainingFilter('all')}
                          className={`text-[10px] md:text-xs font-light px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all ${trainingFilter === 'all'
                            ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                            : 'text-white/50 hover:text-white/75'
                            }`}
                          style={{ fontWeight: trainingFilter === 'all' ? 400 : 200, width: '73px' }}
                        >
                          <span aria-hidden="true" style={{ fontWeight: 400, visibility: 'hidden', height: 0, display: 'block', overflow: 'hidden' }}>Tous</span>
                          <span>Tous</span>
                        </button>
                        <button
                          onClick={() => setTrainingFilter('assigned')}
                          className={`text-[10px] md:text-xs font-light px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all ${trainingFilter === 'assigned'
                            ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                            : 'text-white/50 hover:text-white/75'
                            }`}
                          style={{ fontWeight: trainingFilter === 'assigned' ? 400 : 200, width: '73px' }}
                        >
                          <span aria-hidden="true" style={{ fontWeight: 400, visibility: 'hidden', height: 0, display: 'block', overflow: 'hidden' }}>Assigné</span>
                          <span>Assigné</span>
                        </button>
                        <button
                          onClick={() => setTrainingFilter('completed')}
                          className={`text-[10px] md:text-xs font-light px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all ${trainingFilter === 'completed'
                            ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                            : 'text-white/50 hover:text-white/75'
                            }`}
                          style={{ fontWeight: trainingFilter === 'completed' ? 400 : 200, width: '73px' }}
                        >
                          <span aria-hidden="true" style={{ fontWeight: 400, visibility: 'hidden', height: 0, display: 'block', overflow: 'hidden' }}>Terminé</span>
                          <span>Terminé</span>
                        </button>
                      </div>

                      <div className="hidden md:block h-5 w-[1px] bg-white/10"></div>

                      {/* Week View Filter - Using buttons instead of select */}
                      <div className="flex items-center gap-0.5 md:gap-1 bg-white/5 rounded-full p-0.5 md:p-1">
                        <button
                          onClick={() => setWeekViewFilter(4)}
                          className={`text-[10px] md:text-xs font-light px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all ${weekViewFilter === 4
                            ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                            : 'text-white/50 hover:text-white/75'
                            }`}
                          style={{ fontWeight: weekViewFilter === 4 ? 400 : 200, width: '89px' }}
                        >
                          <span aria-hidden="true" style={{ fontWeight: 400, visibility: 'hidden', height: 0, display: 'block', overflow: 'hidden' }}>4 semaines</span>
                          <span>4 sem.</span>
                        </button>
                        <button
                          onClick={() => setWeekViewFilter(8)}
                          className={`text-[10px] md:text-xs font-light px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all ${weekViewFilter === 8
                            ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                            : 'text-white/50 hover:text-white/75'
                            }`}
                          style={{ fontWeight: weekViewFilter === 8 ? 400 : 200, width: '89px' }}
                        >
                          <span aria-hidden="true" style={{ fontWeight: 400, visibility: 'hidden', height: 0, display: 'block', overflow: 'hidden' }}>2 mois</span>
                          <span>2 mois</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-white/10 mb-3"></div>

                  {/* Calendar Grid */}
                  <div className="pr-0 md:pr-14 pt-4">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                      {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(day => (
                        <div key={day} className="text-center text-[10px] md:text-[12px] text-white/75 font-extralight">
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

                          // Find active block for this week
                          let weekBlockInfo = null;
                          if (blocks && blocks.length > 0) {
                            const activeBlock = blocks.find(b => {
                              const bStart = startOfWeek(new Date(b.start_week_date), { weekStartsOn: 1 });
                              const bEnd = addWeeks(bStart, b.duration);
                              return weekStart >= bStart && weekStart < bEnd;
                            });

                            if (activeBlock) {
                              const bStart = startOfWeek(new Date(activeBlock.start_week_date), { weekStartsOn: 1 });
                              const weekDiff = differenceInCalendarWeeks(weekStart, bStart, { weekStartsOn: 1 });
                              const currentWeekInBlock = weekDiff + 1;
                              const totalWeeksInBlock = activeBlock.duration;
                              // Calculate block number by sorting blocks by start date
                              const sortedBlocks = [...blocks].sort(
                                (a, b) => new Date(a.start_week_date) - new Date(b.start_week_date)
                              );
                              const currentIndex = sortedBlocks.findIndex(b => b.id === activeBlock.id);
                              const blockNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
                              weekBlockInfo = {
                                name: activeBlock.name || '',
                                currentWeek: currentWeekInBlock,
                                totalWeeks: totalWeeksInBlock,
                                blockNumber: blockNumber
                              };
                            }
                          }

                          return (
                            <div key={weekKey} className="relative week-group group/week">
                              {/* Week Block Info - Display block name and week number at the top left */}
                              <div className="mb-2 px-1 flex items-center justify-start gap-2">
                                {weekBlockInfo ? (
                                  <span className="text-xs md:text-sm text-[#D4845A] font-normal flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor">
                                      <path d="M232.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 149.8C5.4 145.8 0 137.3 0 128s5.4-17.9 13.9-21.8L232.5 5.2zM48.1 218.4l164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 277.8C5.4 273.8 0 265.3 0 256s5.4-17.9 13.9-21.8l34.1-15.8zM13.9 362.2l34.1-15.8 164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 405.8C5.4 401.8 0 393.3 0 384s5.4-17.9 13.9-21.8z" />
                                    </svg>
                                    Bloc {weekBlockInfo.blockNumber} - Semaine {weekBlockInfo.currentWeek}/{weekBlockInfo.totalWeeks}
                                  </span>
                                ) : (
                                  <span className="text-xs md:text-sm text-white/25 font-normal flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor">
                                      <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                                    </svg>
                                    Aucun bloc attribué
                                  </span>
                                )}
                              </div>

                              {/* Week Actions - Side Buttons - Hidden on mobile */}
                              <div className={`hidden md:flex absolute -right-12 top-[28px] flex-col justify-center gap-2 opacity-0 group-hover/week:opacity-100 transition-opacity duration-200 z-10 pl-3 pr-0 ${isDetailedView ? 'min-h-[260px]' : 'h-[142px]'
                                }`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyWeek(weekStart);
                                  }}
                                  className="p-2 rounded-full text-white/25 hover:text-[#d4845a] transition-all hover:scale-110"
                                  title="Copier la semaine"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5 fill-current">
                                    <path d="M288 448l-224 0 0-224 48 0 0-64-48 0c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l224 0c35.3 0 64-28.7 64-64l0-48-64 0 0 48zm-64-96l224 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L224 0c-35.3 0-64 28.7-64 64l0 224c0 35.3 28.7 64 64 64z" />
                                  </svg>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWeek(weekStart);
                                  }}
                                  className="p-2 rounded-full text-white/25 hover:text-[#d4845a] transition-all hover:scale-110"
                                  title="Supprimer la semaine"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5 fill-current">
                                    <path d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z" />
                                  </svg>
                                </button>
                              </div>

                              {/* The Grid for this week */}
                              <div className="relative grid grid-cols-7 gap-1 md:gap-2">
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
                                      className={`bg-[rgba(255,255,255,0.05)] rounded-lg md:rounded-xl p-1.5 md:p-2 flex flex-col transition-all duration-300 relative group cursor-pointer ${isDetailedView
                                        ? 'min-h-[260px]'
                                        : 'h-[142px]'
                                        }`}
                                      style={{
                                        backgroundColor: copiedSession && hoveredPasteDate === dateKey ? 'rgba(212, 132, 90, 0.08)' : 'rgba(255,255,255,0.05)'
                                      }}
                                      onClick={() => handleDayClick(day)}
                                      onDragOver={(e) => handleDayDragOver(e, day)}
                                      onDragEnter={(e) => handleDayDragOver(e, day)}
                                      onDragLeave={(e) => handleDragLeave(e, day)}
                                      onDrop={(e) => handleDayDrop(e, day)}
                                      onMouseEnter={() => {
                                        // Ne pas mettre à jour hoveredPasteDate si on est en train de coller
                                        if (!isPastingSession) {
                                          setHoveredPasteDate(dateKey);
                                        }
                                      }}
                                      onMouseLeave={(event) => {
                                        // Ne pas mettre à jour hoveredPasteDate si on est en train de coller
                                        if (!isPastingSession) {
                                          const relatedTarget = event.relatedTarget;
                                          if (!relatedTarget || !(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
                                            setHoveredPasteDate((current) => (current === dateKey ? null : current));
                                          }
                                        }
                                      }}
                                    >
                                      <div className="text-xs md:text-sm text-white/75 mb-1 md:mb-1.5 flex justify-end items-center gap-0.5 md:gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDayClick(day);
                                          }}
                                          className="hidden md:block p-1 rounded-[8px] transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:bg-white/10 group-hover:hover:bg-white/25 hover:scale-105 active:scale-95 pointer-events-none group-hover:pointer-events-auto"
                                        >
                                          <Plus className="h-3 w-3 md:h-4 md:w-4 text-[#BFBFBF] transition-opacity" />
                                        </button>
                                        <span className={`text-[10px] md:text-[12px] font-extralight ${isToday ? 'bg-[#d4845a] rounded-full flex items-center justify-center h-4 w-4 md:h-5 md:w-5 text-white' : 'text-white/75'}`}>
                                          {format(day, 'd')}
                                        </span>
                                      </div>

                                      {isDetailedView ? (
                                        (() => {
                                          // Apply training filter for detailed view
                                          const filteredSessions = (workoutSessions[dateKey] || []).filter(session => {
                                            if (trainingFilter === 'all') return true;
                                            return session.status === trainingFilter;
                                          });
                                          return renderOverviewDayContent(day, dateKey, isDropTarget, draggedSession, filteredSessions);
                                        })()
                                      ) : (
                                        <div
                                          className={`flex-1 space-y-1 overflow-y-auto transition-all duration-300 ease-out rounded relative`}
                                          style={{
                                            backgroundColor: isDropTarget && !dragOverSessionId ? 'rgba(212, 132, 90, 0.10)' : 'transparent',
                                            borderRadius: '0.75rem',
                                            padding: isDropTarget && !dragOverSessionId ? '4px' : '0',
                                            transition: 'background-color 0.2s ease-out, padding 0.2s ease-out'
                                          }}
                                        >
                                          {sessionsOnDay.map((session, sessionIndex) => {
                                            const exercises = session.exercises || [];
                                            const sessionTitle = session.title || 'Séance';
                                            const canDrag = session.status === 'draft' || session.status === 'assigned';
                                            const dropdownKey = `${session.id || session.assignmentId || session.workoutSessionId}-${dateKey}`;
                                            const hasMultipleSessions = sessionsOnDay.length > 1;

                                            return (
                                              <div
                                                key={session.id || session.workoutSessionId}
                                                className={`rounded-xl transition-all duration-200 flex-shrink-0 flex flex-col relative ${session.status === 'draft'
                                                  ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
                                                  : 'bg-[rgba(255,255,255,0.05)] hover:bg-[#2a2a2a]'
                                                  } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggedSession && (draggedSession.id === session.id || draggedSession.assignmentId === session.assignmentId || draggedSession.workoutSessionId === session.workoutSessionId) ? 'opacity-50 scale-95' : ''
                                                  }`}
                                                draggable={canDrag}
                                                onDragStart={(e) => handleSessionDragStart(e, session, day)}
                                                onDragEnd={handleSessionDragEnd}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSessionClick(session, day);
                                                }}
                                              >
                                                <div className="pt-1 md:pt-2 pb-1 md:pb-2 px-1 md:px-2 space-y-1 md:space-y-2 flex flex-col overflow-visible" style={{ width: '100%' }}>
                                                  <div className="flex items-start justify-between gap-1 md:gap-2">
                                                    <div className="flex items-center gap-0.5 md:gap-1 min-w-0 flex-1">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                                                        <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z" />
                                                      </svg>
                                                      <span className="truncate text-[10px] md:text-[12px] font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>{sessionTitle}</span>
                                                    </div>

                                                    {((session.status !== 'completed' && session.status !== 'in_progress') || session.status === 'completed') && (
                                                      <div className="h-full flex items-center relative overflow-visible">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDropdown(session.id || session.assignmentId || session.workoutSessionId, dateKey, e);
                                                          }}
                                                          className={`transition-colors flex items-center justify-center ${dropdownOpen === dropdownKey
                                                            ? 'text-[var(--kaiylo-primary-hex)]'
                                                            : 'text-white/50 hover:text-white'
                                                            }`}
                                                          title="Options de la séance"
                                                        >
                                                          <MoreHorizontal className="h-3 w-3 md:h-[14px] md:w-[14px]" />
                                                        </button>

                                                        {dropdownOpen === dropdownKey && (
                                                          <div
                                                            className="fixed rounded-lg shadow-2xl z-[9999] w-[220px]"
                                                            style={{
                                                              backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                                              backdropFilter: 'blur(10px)',
                                                              borderColor: 'rgba(255, 255, 255, 0.15)',
                                                              borderWidth: '1px',
                                                              borderStyle: 'solid',
                                                              top: dropdownPosition?.top || 0,
                                                              right: dropdownPosition?.right || 0
                                                            }}
                                                          >
                                                            {session.status === 'completed' ? (
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  closeDropdown();
                                                                  handleCopySession(session, day);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-lg"
                                                              >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                                                  <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z" />
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
                                                                      <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z" />
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
                                                                    <path d="M352 512L128 512L128 288L176 288L176 224L128 224C92.7 224 64 252.7 64 288L64 512C64 547.3 92.7 576 128 576L352 576C387.3 576 416 547.3 416 512L416 464L352 464L352 512zM288 416L512 416C547.3 416 576 387.3 576 352L576 128C576 92.7 547.3 64 512 64L288 64C252.7 64 224 92.7 224 128L224 352C224 387.3 252.7 416 288 416z" />
                                                                  </svg>
                                                                  Copier
                                                                </button>

                                                                <button
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    closeDropdown();
                                                                    handleDeleteSession(session.assignmentId || session.id || session.workoutSessionId, day);
                                                                  }}
                                                                  className="w-full px-3 py-2 text-left text-sm text-white font-light hover:bg-[rgba(212,132,89,0.2)] hover:text-[#D48459] hover:font-normal transition-colors flex items-center gap-2 rounded-b-lg"
                                                                >
                                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                                                                    <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
                                                                  </svg>
                                                                  Supprimer
                                                                </button>
                                                              </>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {exercises.length > 0 && (
                                                    <>
                                                      <div className="border-b border-white/10 mb-1"></div>
                                                      <div className="flex items-center justify-between text-[11px] text-white/75">
                                                        <span className="font-light text-[9px] md:text-[11px]">+ {exercises.length} exercice{exercises.length > 1 ? 's' : ''}</span>
                                                      </div>
                                                    </>
                                                  )}

                                                  <div className="flex items-center justify-between pt-0 text-[9px] md:text-[11px]">
                                                    <div className="flex items-center gap-2 flex-1">
                                                      <span
                                                        className={`px-2.5 py-0.5 rounded-full font-normal shadow-sm flex items-center gap-1.5 ${session.status === 'completed'
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
                                                          <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#2FA064]"></span>
                                                        )}
                                                        {session.status === 'assigned' && (
                                                          <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#5B85B1]"></span>
                                                        )}
                                                        {session.status === 'draft' && (
                                                          <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#4a4a47]"></span>
                                                        )}
                                                        <span className="hidden md:inline">
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
                                                      </span>
                                                      {session.status === 'completed' && (
                                                        <svg
                                                          xmlns="http://www.w3.org/2000/svg"
                                                          viewBox="0 0 640 640"
                                                          className="w-3 h-3 md:w-4 md:h-4"
                                                          style={{
                                                            fill: session.difficulty?.toLowerCase() === 'facile'
                                                              ? '#2FA064'
                                                              : session.difficulty?.toLowerCase() === 'moyen'
                                                                ? '#d4845a'
                                                                : session.difficulty?.toLowerCase() === 'difficile'
                                                                  ? '#ef4444'
                                                                  : '#2FA064'
                                                          }}
                                                        >
                                                          <path d="M535.1 342.6C547.6 330.1 547.6 309.8 535.1 297.3L375.1 137.3C362.6 124.8 342.3 124.8 329.8 137.3C317.3 149.8 317.3 170.1 329.8 182.6L467.2 320L329.9 457.4C317.4 469.9 317.4 490.2 329.9 502.7C342.4 515.2 362.7 515.2 375.2 502.7L535.2 342.7zM183.1 502.6L343.1 342.6C355.6 330.1 355.6 309.8 343.1 297.3L183.1 137.3C170.6 124.8 150.3 124.8 137.8 137.3C125.3 149.8 125.3 170.1 137.8 182.6L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7z" />
                                                        </svg>
                                                      )}
                                                      {session.status === 'completed' && session.difficulty && (
                                                        <svg
                                                          className={`${session.difficulty.toLowerCase() === 'facile'
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
                                                          <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 282.9 440.5 289.9 440C296.9 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z" />
                                                        </svg>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {isDropTarget && draggedSession && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ top: '40px', bottom: '0' }}>
                                          <div className="bg-[#d4845a] bg-opacity-25 text-[#d4845a] px-3 py-1.5 rounded-lg text-xs font-medium shadow-md" style={{ fontWeight: 500 }}>
                                            Déposer ici
                                          </div>
                                        </div>
                                      )}
                                      {!isDetailedView && copiedSession && hoveredPasteDate === dateKey && !draggedSession && (
                                        <>
                                          {/* Overlay avec blur et assombrissement si des séances existent */}
                                          {sessionsOnDay.length > 0 && (
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
                                          {/* Preview de la séance copiée */}
                                          <div className="absolute inset-0 pointer-events-none z-20 flex items-start justify-center pt-2" style={{ top: '40px', bottom: '0' }}>
                                            <div className="space-y-1">
                                              <div className="rounded-xl transition-all duration-200 flex-shrink-0 flex flex-col bg-[rgba(255,255,255,0.05)] opacity-50 scale-95">
                                                <div className="pt-2 pb-2 px-2 space-y-2 flex-1 flex flex-col overflow-visible" style={{ width: '100%' }}>
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                                                        <path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z" />
                                                      </svg>
                                                      <span className="text-[12px] font-normal truncate" style={{ color: 'var(--kaiylo-primary-hex)' }}>{copiedSession.session.title || 'Séance'}</span>
                                                    </div>
                                                  </div>

                                                  {copiedSession.session.exercises && copiedSession.session.exercises.length > 0 && (
                                                    <>
                                                      <div className="border-b border-white/10 mb-1"></div>
                                                      <div className="flex flex-col gap-1 flex-1">
                                                        {copiedSession.session.exercises.slice(0, 2).map((exercise, index) => (
                                                          <div key={index} className="text-[10px] text-white truncate font-extralight">
                                                            <span className="font-light text-white/75">
                                                              {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'}
                                                            </span>
                                                            {' '}
                                                            {exercise.useRir ? (
                                                              <span className="text-[#d4845a] font-normal">RPE {exercise.sets?.[0]?.weight || 0}</span>
                                                            ) : (
                                                              <span className="text-[#d4845a] font-normal">@{exercise.sets?.[0]?.weight || 0}kg</span>
                                                            )} - <span className="font-light text-white/75">{exercise.name}</span>
                                                          </div>
                                                        ))}
                                                        {copiedSession.session.exercises.length > 2 && (
                                                          <div className="text-[10px] text-white/50 font-extralight">
                                                            + {copiedSession.session.exercises.length - 2} ex.
                                                          </div>
                                                        )}
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          {/* Boutons Coller et Annuler */}
                                          <div
                                            className="absolute left-1/2 bottom-3 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-[100px]"
                                            style={{
                                              animation: 'slideUpFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                                            }}
                                          >
                                            <button
                                              className={`w-full px-3 py-1.5 rounded-lg text-xs shadow-lg ${isPastingSession ? 'bg-[var(--kaiylo-primary-hex)] text-white opacity-80 cursor-not-allowed' : 'bg-[var(--kaiylo-primary-hex)] text-white hover:bg-[var(--kaiylo-primary-hover)]'
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
                                              className="w-full px-3 py-1.5 rounded-lg text-xs shadow-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
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
                                    </div>
                                  );
                                })}

                                {/* Overlay pour coller une semaine copiée */}
                                {copiedWeek && (
                                  <div className={`absolute inset-0 bg-[#d4845a]/10 transition-opacity duration-200 rounded-xl flex flex-col items-center justify-center gap-2 z-20 pointer-events-none ${(isPastingWeek && pastingWeekStart && format(pastingWeekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd'))
                                    ? 'opacity-100'
                                    : isPastingWeek
                                      ? 'opacity-0'
                                      : 'opacity-0 group-hover/week:opacity-100'
                                    }`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePasteWeek(weekStart);
                                      }}
                                      disabled={isPastingWeek}
                                      className="bg-[#d4845a] hover:bg-[#c47850] text-white font-normal px-6 py-2.5 rounded-lg transition-all pointer-events-auto shadow-lg hover:scale-110 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                                      title="Coller la semaine copiée ici"
                                    >
                                      {isPastingWeek && pastingWeekStart && format(pastingWeekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd') && (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      )}
                                      <span>{isPastingWeek && pastingWeekStart && format(pastingWeekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd') ? 'Collage…' : 'Coller'}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCopiedWeek(null);
                                      }}
                                      disabled={isPastingWeek}
                                      className="bg-white/10 hover:bg-white/20 text-white font-normal px-6 py-2.5 rounded-lg transition-all pointer-events-auto shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      title="Annuler la copie"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'periodization' && (
                <PeriodizationTab studentId={student?.id} onUpdate={() => fetchStudentDetails(true)} />
              )}

              {activeTab === 'analyse' && (
                <div className="p-4">
                  {/* Filters */}
                  <div className="flex items-center gap-[14px] mb-6">
                    {/* Status Filter */}
                    <DropdownMenu open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen} modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          ref={statusFilterButtonRef}
                          className="bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground text-sm"
                          style={{
                            backgroundColor: isStatusFilterOpen || statusFilter !== '' ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: isStatusFilterOpen || statusFilter !== '' ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                            fontWeight: isStatusFilterOpen || statusFilter !== '' ? '400' : '200',
                            width: `${statusFilterMinWidth}px`,
                            minWidth: `${statusFilterMinWidth}px`
                          }}
                        >
                          <span ref={statusFilterTextRef} style={{ fontSize: '14px', fontWeight: isStatusFilterOpen || statusFilter !== '' ? '400' : 'inherit', flex: '1', whiteSpace: 'nowrap' }}>{statusFilter || 'Tous les statuts'}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 384 512"
                            className="h-4 w-4 transition-transform"
                            style={{ transform: isStatusFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="start"
                        sideOffset={8}
                        disablePortal={true}
                        className="w-56 rounded-xl p-1 [&_span.absolute.left-2]:hidden"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(10px)',
                          borderColor: 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <DropdownMenuRadioGroup
                          value={statusFilter}
                          onValueChange={(value) => {
                            setStatusFilter(value);
                            setIsStatusFilterOpen(false);
                          }}
                          className="flex flex-col gap-0.5 p-0"
                        >
                          <DropdownMenuRadioItem
                            value=""
                            className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${statusFilter === ''
                              ? 'bg-primary/20 text-primary font-normal'
                              : 'text-foreground font-light'
                              }`}
                            style={
                              statusFilter === ''
                                ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (statusFilter !== '') {
                                e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '#D48459';
                                  span.style.fontWeight = '400';
                                }
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (statusFilter !== '') {
                                e.currentTarget.style.backgroundColor = '';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '';
                                  span.style.fontWeight = '';
                                }
                              }
                            }}
                          >
                            <span>Tous les statuts</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 448 512"
                              className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${statusFilter === '' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                            </svg>
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value="A feedback"
                            className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${statusFilter === 'A feedback'
                              ? 'bg-primary/20 text-primary font-normal'
                              : 'text-foreground font-light'
                              }`}
                            style={
                              statusFilter === 'A feedback'
                                ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (statusFilter !== 'A feedback') {
                                e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '#D48459';
                                  span.style.fontWeight = '400';
                                }
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (statusFilter !== 'A feedback') {
                                e.currentTarget.style.backgroundColor = '';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '';
                                  span.style.fontWeight = '';
                                }
                              }
                            }}
                          >
                            <span>A feedback</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 448 512"
                              className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${statusFilter === 'A feedback' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                            </svg>
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem
                            value="Complété"
                            className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${statusFilter === 'Complété'
                              ? 'bg-primary/20 text-primary font-normal'
                              : 'text-foreground font-light'
                              }`}
                            style={
                              statusFilter === 'Complété'
                                ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (statusFilter !== 'Complété') {
                                e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '#D48459';
                                  span.style.fontWeight = '400';
                                }
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (statusFilter !== 'Complété') {
                                e.currentTarget.style.backgroundColor = '';
                                const span = e.currentTarget.querySelector('span');
                                if (span) {
                                  span.style.color = '';
                                  span.style.fontWeight = '';
                                }
                              }
                            }}
                          >
                            <span>Complété</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 448 512"
                              className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${statusFilter === 'Complété' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                            </svg>
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Exercise Filter */}
                    <DropdownMenu
                      open={isExerciseFilterOpen}
                      onOpenChange={(open) => {
                        setIsExerciseFilterOpen(open);
                        if (!open) {
                          setExerciseSearchTerm('');
                        }
                      }}
                      modal={false}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          ref={exerciseFilterButtonRef}
                          className="bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground text-sm focus:outline-none focus-visible:outline-none"
                          style={{
                            backgroundColor: isExerciseFilterOpen || exerciseFilter !== '' ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: isExerciseFilterOpen || exerciseFilter !== '' ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                            fontWeight: isExerciseFilterOpen || exerciseFilter !== '' ? '400' : '200',
                            width: `${exerciseFilterMinWidth}px`,
                            minWidth: `${exerciseFilterMinWidth}px`,
                            outline: 'none'
                          }}
                        >
                          <span ref={exerciseFilterTextRef} style={{ fontSize: '14px', fontWeight: isExerciseFilterOpen || exerciseFilter !== '' ? '400' : 'inherit', flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exerciseFilter || 'Exercice'}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 384 512"
                            className="h-4 w-4 transition-transform"
                            style={{ transform: isExerciseFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="start"
                        sideOffset={8}
                        disablePortal={true}
                        className="w-56 rounded-xl p-0 [&_span.absolute.left-2]:hidden flex flex-col border-0"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(10px)',
                          border: 'none'
                        }}
                      >
                        {/* Search bar */}
                        <div className="pt-3 px-3 pb-2 border-border">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Rechercher un exercice..."
                              value={exerciseSearchTerm}
                              onChange={(e) => setExerciseSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 bg-input border border-border rounded-[10px] text-xs font-light text-foreground placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-ring"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: 'rgba(255, 255, 255, 0.1)'
                              }}
                            />
                          </div>
                        </div>
                        {/* Exercise list */}
                        <div className="overflow-y-auto max-h-48 exercise-dropdown-scrollbar">
                          <DropdownMenuRadioGroup
                            value={exerciseFilter}
                            onValueChange={(value) => {
                              setExerciseFilter(value);
                              setIsExerciseFilterOpen(false);
                              setExerciseSearchTerm('');
                            }}
                          >
                            <DropdownMenuRadioItem
                              value=""
                              className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${exerciseFilter === ''
                                ? 'bg-primary/20 text-primary font-normal'
                                : 'text-foreground font-light'
                                }`}
                              style={
                                exerciseFilter === ''
                                  ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                                  : {}
                              }
                              onMouseEnter={(e) => {
                                if (exerciseFilter !== '') {
                                  e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                                  const span = e.currentTarget.querySelector('span');
                                  if (span) {
                                    span.style.color = '#D48459';
                                    span.style.fontWeight = '400';
                                  }
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (exerciseFilter !== '') {
                                  e.currentTarget.style.backgroundColor = '';
                                  const span = e.currentTarget.querySelector('span');
                                  if (span) {
                                    span.style.color = '';
                                    span.style.fontWeight = '';
                                  }
                                }
                              }}
                            >
                              <span>Exercice</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 448 512"
                                className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${exerciseFilter === '' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                  }`}
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                              </svg>
                            </DropdownMenuRadioItem>
                            {filteredExercises.length > 0 ? (
                              filteredExercises.map(exercise => (
                                <DropdownMenuRadioItem
                                  key={exercise}
                                  value={exercise}
                                  className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${exerciseFilter === exercise
                                    ? 'bg-primary/20 text-primary font-normal'
                                    : 'text-foreground font-light'
                                    }`}
                                  style={
                                    exerciseFilter === exercise
                                      ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                                      : {}
                                  }
                                  onMouseEnter={(e) => {
                                    if (exerciseFilter !== exercise) {
                                      e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                                      const span = e.currentTarget.querySelector('span');
                                      if (span) {
                                        span.style.color = '#D48459';
                                        span.style.fontWeight = '400';
                                      }
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (exerciseFilter !== exercise) {
                                      e.currentTarget.style.backgroundColor = '';
                                      const span = e.currentTarget.querySelector('span');
                                      if (span) {
                                        span.style.color = '';
                                        span.style.fontWeight = '';
                                      }
                                    }
                                  }}
                                >
                                  <span>{exercise}</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 448 512"
                                    className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${exerciseFilter === exercise ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                                      }`}
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z" />
                                  </svg>
                                </DropdownMenuRadioItem>
                              ))
                            ) : (
                              <div className="px-5 py-2 text-sm text-white/25 text-center font-extralight">
                                Aucun exercice trouvé
                              </div>
                            )}
                          </DropdownMenuRadioGroup>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Date Filter */}
                    <div className="relative">
                      <div
                        ref={dateFilterButtonRef}
                        onClick={() => dateInputRef.current?.showPicker()}
                        className="relative rounded-[50px] flex items-center cursor-pointer px-[15px] py-2 transition-colors gap-2"
                        style={{
                          backgroundColor: dateFilter ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: dateFilter ? 'rgb(212, 132, 89)' : 'rgba(250, 250, 250, 0.75)',
                          fontWeight: dateFilter ? '400' : '200',
                          width: `${dateFilterMinWidth}px`,
                          minWidth: `${dateFilterMinWidth}px`
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 448 512"
                          className="h-4 w-4 pointer-events-none flex-shrink-0"
                          style={{ color: dateFilter ? 'rgb(212, 132, 89)' : 'rgba(255, 255, 255, 0.5)' }}
                          fill="currentColor"
                        >
                          <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z" />
                        </svg>
                        {/* Custom Display */}
                        <span ref={dateFilterTextRef} className="text-sm whitespace-nowrap" style={{
                          fontSize: '14px',
                          fontWeight: dateFilter ? '400' : 'inherit',
                          flex: '1'
                        }}>
                          Date
                        </span>

                        {/* Native Input */}
                        <input
                          ref={dateInputRef}
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>

                    {/* Video Count */}
                    <div className="ml-auto text-sm font-normal" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                      {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''} {statusFilter === 'A feedback' ? 'à feedback' : 'trouvée' + (filteredVideos.length > 1 ? 's' : '')}
                    </div>
                  </div>

                  {videosLoading && (
                    <div className="flex items-center justify-center py-8">
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
                  )}

                  {!videosLoading && renderStudentVideosGrouped()}
                </div>
              )}

              {activeTab === 'suivi' && (
                <div className="p-4 flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-12 h-12" style={{ color: 'rgb(212, 132, 90)' }}>
                      <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z" fill="currentColor" />
                    </svg>
                    <p className="text-base" style={{ color: 'rgb(212, 132, 90)' }}>Page en cours de développement</p>
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

            {/* Delete Note Modal */}
            <BaseModal
              isOpen={isDeleteNoteModalOpen}
              onClose={() => {
                setIsDeleteNoteModalOpen(false);
                setNoteToDeleteIndex(null);
              }}
              modalId="delete-note-modal"
              zIndex={80}
              closeOnEsc={isDeleteNoteModalTopMost}
              closeOnBackdrop={isDeleteNoteModalTopMost}
              size="md"
              title="Supprimer la note"
              titleClassName="text-xl font-normal text-white"
            >
              <div className="space-y-6">
                <div className="flex flex-col items-start space-y-4">
                  <div className="text-left space-y-2">
                    <p className="text-sm font-extralight text-white/70">
                      Êtes-vous sûr de vouloir supprimer cette note ?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteNoteModalOpen(false);
                      setNoteToDeleteIndex(null);
                    }}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteNote}
                    className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
                    style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </BaseModal>

            {/* Delete Limitation Modal */}
            <BaseModal
              isOpen={isDeleteLimitationModalOpen}
              onClose={() => {
                setIsDeleteLimitationModalOpen(false);
                setLimitationToDeleteIndex(null);
              }}
              modalId="delete-limitation-modal"
              zIndex={80}
              closeOnEsc={isDeleteLimitationModalTopMost}
              closeOnBackdrop={isDeleteLimitationModalTopMost}
              size="md"
              title="Supprimer la limitation"
              titleClassName="text-xl font-normal text-white"
            >
              <div className="space-y-6">
                <div className="flex flex-col items-start space-y-4">
                  <div className="text-left space-y-2">
                    <p className="text-sm font-extralight text-white/70">
                      Êtes-vous sûr de vouloir supprimer cette limitation ?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteLimitationModalOpen(false);
                      setLimitationToDeleteIndex(null);
                    }}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteLimitation}
                    className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
                    style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </BaseModal>

            {/* Delete Week Modal */}
            <BaseModal
              isOpen={isDeleteWeekModalOpen}
              onClose={() => {
                setIsDeleteWeekModalOpen(false);
                setWeekToDelete(null);
              }}
              modalId="delete-week-modal"
              zIndex={80}
              closeOnEsc={isDeleteWeekModalTopMost}
              closeOnBackdrop={isDeleteWeekModalTopMost}
              size="md"
              title="Supprimer la semaine"
              titleClassName="text-xl font-normal text-white"
            >
              <div className="space-y-6">
                <div className="flex flex-col items-start space-y-4">
                  <div className="text-left space-y-2">
                    <p className="text-sm font-extralight text-white/70">
                      Êtes-vous sûr de vouloir supprimer {weekToDelete?.sessionCount || 0} séance(s) de cette semaine ?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteWeekModalOpen(false);
                      setWeekToDelete(null);
                    }}
                    disabled={isDeletingWeek}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteWeek}
                    disabled={isDeletingWeek}
                    className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                  >
                    {isDeletingWeek && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{isDeletingWeek ? 'Suppression…' : 'Supprimer'}</span>
                  </button>
                </div>
              </div>
            </BaseModal>

          </>
        )}

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


        {/* Block Creation Modal */}
        <CreateBlockModal
          isOpen={isCreateBlockModalOpen}
          onClose={() => setIsCreateBlockModalOpen(false)}
          onSaved={() => {
            fetchStudentDetails();
            setIsCreateBlockModalOpen(false);
          }}
          studentId={student.id}
          existingBlocks={blocks}
          initialDate={overviewWeekDate}
        />
      </div>
    </div>
  );
};

export default StudentDetailView;