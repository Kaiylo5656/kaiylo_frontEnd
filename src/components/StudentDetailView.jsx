import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, FileText, AlertTriangle, User, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, Loader2, Trash2, Eye, EyeOff, Copy, Clipboard, MoreHorizontal } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import WorkoutSessionDetailsModal from './WorkoutSessionDetailsModal';
import { format, addDays, startOfWeek, subDays, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const StudentDetailView = ({ student, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overviewWeekDate, setOverviewWeekDate] = useState(new Date()); // For overview weekly calendar
  const [trainingMonthDate, setTrainingMonthDate] = useState(new Date()); // For training monthly calendar
  const [workoutSessions, setWorkoutSessions] = useState({}); // Will store arrays of sessions per date
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredWeek, setHoveredWeek] = useState(null); // Track which week is being hovered
  const [copiedWeek, setCopiedWeek] = useState(null); // Store copied week data for pasting
  const [trainingFilter, setTrainingFilter] = useState('all'); // Filter for training view: 'assigned', 'draft', 'all'
  const [weekViewFilter, setWeekViewFilter] = useState(4); // Week view filter: 2 or 4 weeks
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which session dropdown is open: 'sessionId-date'

  // Debug copiedWeek state changes
  useEffect(() => {
    console.log('🔄 copiedWeek state changed:', copiedWeek);
  }, [copiedWeek]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
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
    const newDate = direction === 'next' ? addMonths(trainingMonthDate, 1) : subMonths(trainingMonthDate, 1);
    setTrainingMonthDate(newDate);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setSelectedSession(null); // Réinitialiser selectedSession pour une nouvelle séance
    setIsCreateModalOpen(true);
  };

  const handleSessionClick = (session, day) => {
    setSelectedSession(session);
    setSelectedDate(day);
    
    // Si la séance n'a pas été commencée ou est un brouillon, ouvrir la modale d'édition
    if (session.status !== 'completed' && session.status !== 'in_progress') {
      setIsCreateModalOpen(true);
    } else {
      // Sinon, ouvrir la modale de détails en lecture seule
      setIsDetailsModalOpen(true);
    }
  };

  const handlePublishDraftSession = async (session, day) => {
    if (!confirm('Êtes-vous sûr de vouloir publier cette séance brouillon ? Elle sera visible par l\'étudiant.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // First, update the session status to 'published' in the database
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
        // Rafraîchir les séances pour voir les changements
        await fetchWorkoutSessions();
        alert('Séance publiée avec succès ! Elle est maintenant visible par l\'étudiant.');
      } else {
        throw new Error('Failed to create assignment');
      }
    } catch (error) {
      console.error('Error publishing session:', error);
      alert('Erreur lors de la publication de la séance. Veuillez réessayer.');
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
      
      if (sessionData.isEdit && sessionData.existingSessionId) {
        // Editing existing session - delete old assignment and create new one
        try {
          // First delete the existing assignment
          await axios.delete(
            `${getApiBaseUrlWithApi()}/assignments/${sessionData.existingSessionId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (deleteError) {
          console.warn('Could not delete existing assignment:', deleteError);
          // Continue anyway, the new assignment will be created
        }
      }
      
      // Create new assignment (same endpoint for both create and edit)
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

      setIsCreateModalOpen(false);
      // Refresh workout sessions
      await fetchWorkoutSessions();
    } catch (error) {
      console.error('Error creating/updating workout session and assignment:', error);
      alert('Failed to save workout session. Please try again.');
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

    // Store the copied week data
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
        
        const sessionData = {
          title: session.title,
          description: session.description || '',
          exercises: session.exercises,
          scheduled_date: format(newDate, 'yyyy-MM-dd'),
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
      alert('Erreur lors du passage en mode brouillon. Veuillez réessayer.');
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
  const toggleDropdown = (sessionId, dateKey) => {
    const dropdownKey = `${sessionId}-${dateKey}`;
    setDropdownOpen(dropdownOpen === dropdownKey ? null : dropdownKey);
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
          headers: { Authorization: `Bearer ${token}` }
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
              workoutSessionId: assignment.workout_session_id
            };

          // Initialize array for this date if it doesn't exist
          if (!sessionsMap[dateKey]) {
            sessionsMap[dateKey] = [];
          }
          
          // Add session to the array for this date
          sessionsMap[dateKey].push(sessionData);
        }
      });

      // Also fetch draft sessions for this coach
      try {
        const draftResponse = await axios.get(
          `${getApiBaseUrlWithApi()}/workout-sessions`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log('Fetched draft sessions:', draftResponse.data);

        if (draftResponse.data.sessions) {
          console.log('Total sessions from API:', draftResponse.data.sessions.length);
          const draftSessions = draftResponse.data.sessions.filter(session => session.status === 'draft');
          console.log('Draft sessions found:', draftSessions.length);
          
          draftSessions.forEach(session => {
            console.log('Processing draft session:', { id: session.id, title: session.title, scheduled_date: session.scheduled_date, created_at: session.created_at });
            
            // For draft sessions, use scheduled_date if available, otherwise fall back to created_at
            let displayDate;
            if (session.scheduled_date) {
              displayDate = new Date(session.scheduled_date);
            } else {
              displayDate = new Date(session.created_at);
            }
            
            const dateKey = format(displayDate, 'yyyy-MM-dd');
            console.log('Draft session date key:', dateKey);
            
            const draftSessionData = {
              id: session.id,
              assignmentId: null, // No assignment for drafts
              title: session.title,
              exercises: session.exercises || [],
              status: 'draft',
              startTime: null,
              endTime: null,
              notes: null,
              workoutSessionId: session.id
            };

            // Initialize array for this date if it doesn't exist
            if (!sessionsMap[dateKey]) {
              sessionsMap[dateKey] = [];
            }
            
            // Add draft session to the array for this date
            console.log('Adding draft session to map for date:', dateKey);
            sessionsMap[dateKey].push(draftSessionData);
          });
        }
      } catch (draftError) {
        console.warn('Could not fetch draft sessions:', draftError);
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

  useEffect(() => {
    fetchStudentDetails();
    fetchWorkoutSessions();
  }, [student.id]);

  useEffect(() => {
    fetchWorkoutSessions();
  }, [overviewWeekDate, trainingMonthDate, activeTab]);

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
    const weekSessions = weekDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
    // Count sessions for current month (flatten arrays)
    const monthSessions = monthDateKeys
      .flatMap(dateKey => workoutSessions[dateKey] || [])
      .filter(session => session !== undefined);
    
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
                <h2 className="text-sm font-medium mb-3">Bloc 3/3 - Prépa Force</h2>
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
                  <button className="px-2 py-1 text-xs bg-[#262626] rounded">Open</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#e87c3e]"></div>
                      <span className="text-xs text-gray-400">Muscle-up</span>
                    </div>
                    <p className="text-sm font-medium mt-1">37,5 kg</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div>
                      <span className="text-xs text-gray-400">Pull-up</span>
                    </div>
                    <p className="text-sm font-medium mt-1">80 kg</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
                      <span className="text-xs text-gray-400">Dips</span>
                    </div>
                    <p className="text-sm font-medium mt-1">100 kg</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></div>
                      <span className="text-xs text-gray-400">Squat</span>
                    </div>
                    <p className="text-sm font-medium mt-1">190 kg</p>
                  </div>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-[#262626]">
                  <div>
                    <span className="text-xs text-gray-400">Total</span>
                    <p className="text-sm font-medium">407,5 kg</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">RIS Score</span>
                    <p className="text-sm font-medium">95,99</p>
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

            {/* Weekly Schedule */}
            <div className="grid grid-cols-7 gap-3">
              {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day, i) => (
                <div 
                 key={day} 
                 className="bg-[#1a1a1a] rounded-xl p-2 cursor-pointer hover:bg-[#262626] transition-colors relative group h-[200px] overflow-hidden"
                 onClick={() => handleDayClick(addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i))}
               >
                 <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                   <span>{day} {format(addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i), 'dd')}</span>
                   <Plus className="h-3 w-3 text-[#e87c3e] opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 {loadingSessions ? (
                   <div className="flex items-center justify-center py-6">
                     <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                   </div>
                 ) : (
                   <>
                     {(() => {
                       const dateKey = format(addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i), 'yyyy-MM-dd');
                       const sessions = workoutSessions[dateKey] || [];
                       
                       if (sessions.length > 0) {
                         return (
                           <div className="session-container space-y-1" style={{ height: '150px', overflowY: 'auto' }}>
                             {sessions.map((session, sessionIndex) => (
                               <div 
                                 key={session.id || sessionIndex}
                                 className={`rounded-lg cursor-pointer transition-colors ${
                                   session.status === 'draft' 
                                     ? 'bg-[#3a3a3a] border-2 border-dashed border-gray-500 hover:bg-[#4a4a4a]' 
                                     : 'bg-[#262626] hover:bg-[#2a2a2a]'
                                 }`}
                                 style={{ minHeight: '80px' }}
                             onClick={(e) => {
                               e.stopPropagation();
                                   handleSessionClick(session, addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i));
                             }}
                           >
                             <div className="p-2">
                               <div className="text-[11px] font-medium flex justify-between items-center mb-2">
                                 <span className="truncate pr-1">{session.title || 'Séance'}</span>
                                 <div className="flex items-center gap-0.5 flex-shrink-0">
                                       {/* Status icons: 
                                           ✅ completed (green) - Session terminée
                                           ▶️ in_progress (orange) - Session en cours
                                           🕐 assigned (blue) - Session publiée, pas encore commencée
                                           👁️‍🗨️ draft (gray) - Brouillon, visible seulement par le coach
                                       */}
                                   {session.status === 'in_progress' && (
                                     <PlayCircle className="h-3 w-3 text-[#e87c3e]" />
                                   )}
                                   {session.status === 'completed' && (
                                     <CheckCircle className="h-3 w-3 text-[#22c55e]" />
                                   )}
                                       {session.status === 'draft' && (
                                         <EyeOff className="h-3 w-3 text-gray-400" />
                                       )}
                                       {session.status === 'assigned' && (
                                         <Clock className="h-3 w-3 text-[#3b82f6]" />
                                       )}
                                 </div>
                               </div>
                               <div className="space-y-0.5">
                                 {session.exercises.map((exercise, index) => (
                                   <div key={index} className="text-[10px] text-gray-400 truncate">
                                         {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'} {exercise.name} {exercise.sets?.[0]?.weight ? `@${exercise.sets[0].weight}kg` : ''}
                                   </div>
                                 ))}
                               </div>
                               <div className="mt-2 pt-2 border-t border-[#3a3a3a]">
                                <div className="flex items-center justify-between text-[10px]">
                                       <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                    session.status === 'completed' 
                                      ? 'bg-[#22c55e] text-white' 
                                      : session.status === 'in_progress'
                                      ? 'bg-[#e87c3e] text-white'
                                             : session.status === 'draft'
                                             ? 'bg-gray-500 text-white'
                                             : session.status === 'assigned'
                                             ? 'bg-[#3b82f6] text-white'
                                      : 'bg-gray-600 text-gray-200'
                                  }`}>
                                    {session.status === 'completed' 
                                      ? 'Terminé'
                                      : session.status === 'in_progress'
                                      ? 'En cours'
                                             : session.status === 'draft'
                                             ? 'Brouillon'
                                             : session.status === 'assigned'
                                             ? 'Assigné'
                                      : 'Pas commencé'
                                    }
                                  </span>
                                         {(session.status !== 'completed' && session.status !== 'in_progress') && (
                                           <div className="flex items-center gap-1">
                                             {session.status === 'draft' && (
                                               <button
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handlePublishDraftSession(session, addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i));
                                                 }}
                                                 className="text-green-400 hover:text-green-300 transition-colors"
                                                 title="Publier la séance"
                                               >
                                                 <Eye className="h-3 w-3" />
                                               </button>
                                             )}
                                             <button
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleDeleteSession(session.assignmentId || session.id, addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i));
                                               }}
                                               className="text-red-400 hover:text-red-300 transition-colors"
                                               title="Supprimer la séance"
                                             >
                                               <Trash2 className="h-3 w-3" />
                                             </button>
                                           </div>
                                         )}
                                       </div>
                                  {session.startTime && (
                                    <span className="text-gray-400 flex-shrink-0">
                                      {format(parseISO(session.startTime), 'HH:mm')}
                                    </span>
                                  )}
                                </div>
                              </div>
                             </div>
                               </div>
                             ))}
                           </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>
            ))}
            </div>
          </>
        )}

      {/* Training Tab - Monthly Calendar View */}
      {activeTab === 'training' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <button 
              className="px-4 py-2 bg-[#1a1a1a] rounded-lg text-sm hover:bg-[#262626]"
              onClick={() => setTrainingMonthDate(new Date())}
            >
              Aujourd'hui
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => changeTrainingMonth('prev')} className="p-2 rounded-lg hover:bg-[#1a1a1a]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {format(startOfMonth(trainingMonthDate), 'd MMM', { locale: fr })} - {format(endOfMonth(trainingMonthDate), 'd MMM', { locale: fr })}
                </span>
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
              const monthStart = startOfMonth(trainingMonthDate);
              const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
              const endDate = addDays(startDate, (weekViewFilter * 7) - 1); // Show selected number of weeks
              
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
                          className={`absolute -left-16 top-0 bottom-0 w-20 z-20 transition-all duration-200 ${
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
                            <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-50">
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
                
                return (
                              <div
                                key={dateKey}
                                className={`rounded-lg cursor-pointer hover:bg-[#262626] transition-colors flex flex-col overflow-hidden ${
                                  isCurrentMonth ? 'bg-[#1a1a1a]' : 'bg-[#0a0a0a]'
                                } ${weekViewFilter === 2 ? 'p-4 h-[280px]' : 'p-3 h-[120px]'}`}
                                onClick={() => handleDayClick(day)}
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
                                        {sessions.map((session, sessionIndex) => (
                                          <div 
                                            key={session.id || sessionIndex}
                                            className={`rounded cursor-pointer transition-colors ${
                                              session.status === 'draft' 
                                                ? 'bg-[#3a3a3a] border-l-2 border-dashed border-gray-500 hover:bg-[#4a4a4a]' 
                                                : session.status === 'assigned'
                                                ? 'bg-[#262626] border-l-2 border-[#3b82f6] hover:bg-[#2a2a2a]'
                                                : 'bg-[#262626] border-l-2 border-[#e87c3e] hover:bg-[#2a2a2a]'
                                            } ${weekViewFilter === 2 ? 'p-4' : 'p-2'}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSessionClick(session, day);
                                            }}
                                          >
                                    <div className={`flex items-center justify-between ${weekViewFilter === 2 ? 'mb-2' : 'mb-1'}`}>
                                      <div className="flex items-center gap-1 flex-1">
                                        <div className={`font-medium truncate ${weekViewFilter === 2 ? 'text-sm' : 'text-[10px]'}`}>{session.title || 'Séance'}</div>
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
                                        <div className="relative ml-2 dropdown-container">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleDropdown(session.id || session.assignmentId, dateKey);
                                            }}
                                            className="text-gray-400 hover:text-white transition-colors"
                                            title="Options de la séance"
                                          >
                                            <MoreHorizontal className={weekViewFilter === 2 ? 'h-4 w-4' : 'h-3 w-3'} />
                                          </button>
                                          
                                          {/* Dropdown Menu */}
                                          {dropdownOpen === `${session.id || session.assignmentId}-${dateKey}` && (
                                            <div className="absolute right-0 top-full mt-1 bg-[#262626] border border-[#404040] rounded-lg shadow-lg z-50 min-w-[180px]">
                                              {session.status === 'draft' ? (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDropdownOpen(null);
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
                                        ))}
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
            <p className="text-gray-400">Analyse vidéo - Coming soon</p>
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
      </div>
    </div>
  );
};

export default StudentDetailView;