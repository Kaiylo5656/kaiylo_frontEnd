import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, startOfDay, parseISO, startOfWeek, addWeeks, differenceInCalendarWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

const StudentHistoryPage = () => {
  const navigate = useNavigate();
  const { getAuthToken, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planningBlocks, setPlanningBlocks] = useState([]);
  const [collapsedUpcomingSessionIds, setCollapsedUpcomingSessionIds] = useState(new Set());
  const [collapsedCompletedSessionIds, setCollapsedCompletedSessionIds] = useState(new Set());
  const [sessionListView, setSessionListView] = useState('upcoming'); // 'upcoming' | 'past'

  // Helper function to capitalize first letter of month
  const capitalizeMonth = (date) => {
    const monthName = format(date, 'MMMM', { locale: fr });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Get all days in the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group days into weeks, placing each day directly under its corresponding day of week
  const weeks = useMemo(() => {
    const weeksMap = new Map(); // Map week index to array of 7 days
    
    daysInMonth.forEach(day => {
      // Get day of week (0 = Monday, 6 = Sunday)
      const dayOfWeek = getDay(day) === 0 ? 6 : getDay(day) - 1;
      
      // Calculate which week this day belongs to
      // Find the first day of the month's day of week
      const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
      // Calculate the day's position in the month (0-indexed)
      const dayIndex = Math.floor((day.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      // Calculate which week (0-indexed)
      const weekIndex = Math.floor((dayIndex + firstDayOfWeek) / 7);
      
      // Initialize week if it doesn't exist
      if (!weeksMap.has(weekIndex)) {
        weeksMap.set(weekIndex, new Array(7).fill(null));
      }
      
      // Place day in the correct position
      const week = weeksMap.get(weekIndex);
      week[dayOfWeek] = day;
    });
    
    // Convert map to sorted array
    const weeksArray = Array.from(weeksMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);
    
    return weeksArray;
  }, [daysInMonth, monthStart]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Fetch assignments on component mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  // Fetch periodization blocks for block info (Bloc X - S Y/Z)
  const fetchPlanningBlocks = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getAuthToken();
      const response = await fetch(
        buildApiUrl(`/periodization/blocks/student/${user.id}?t=${Date.now()}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPlanningBlocks(data.data);
      } else {
        setPlanningBlocks([]);
      }
    } catch (err) {
      console.error('Error fetching planning blocks:', err);
      setPlanningBlocks([]);
    }
  }, [user?.id, getAuthToken]);

  useEffect(() => {
    fetchPlanningBlocks();
  }, [fetchPlanningBlocks]);

  const fetchAssignments = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/assignments/student'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if a day has assignments
  const hasAssignments = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return assignments.some(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
  };

  // Check if assignments are completed
  const isCompleted = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayAssignments = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
    return dayAssignments.length > 0 && dayAssignments.every(a => a.status === 'completed');
  };

  // Check if there are failed/skipped sessions
  const hasFailed = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayAssignments = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
    return dayAssignments.some(a => a.status === 'skipped' || a.status === 'failed');
  };

  // Check if day has pending (not completed) assignments
  const hasPending = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayAssignments = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
    return dayAssignments.some(a => a.status !== 'completed' && a.status !== 'skipped' && a.status !== 'failed');
  };

  // Séances à venir : assignées, non réalisées, sur des jours à venir
  const upcomingSessions = useMemo(() => {
    const today = startOfDay(new Date());
    return assignments
      .filter((a) => {
        if (!a.workout_sessions) return false;
        const st = (a.status || '').toLowerCase();
        if (st === 'completed' || st === 'skipped' || st === 'failed') return false;
        const dateStr = a.scheduled_date || a.due_date || a.created_at;
        if (!dateStr) return false;
        const d = parseISO(dateStr);
        return d >= today;
      })
      .map((a) => ({
        id: a.id,
        assignmentId: a.id,
        title: a.workout_sessions?.title || 'Séance',
        exercises: a.workout_sessions?.exercises || [],
        status: a.status || 'assigned',
        scheduled_date: a.scheduled_date || a.due_date || a.created_at,
      }))
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [assignments]);

  // Séances terminées du mois affiché dans le calendrier
  const completedSessionsThisMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return assignments
      .filter((a) => {
        if (!a.workout_sessions) return false;
        if ((a.status || '').toLowerCase() !== 'completed') return false;
        const dateStr = a.scheduled_date || a.due_date || a.created_at;
        if (!dateStr) return false;
        const d = parseISO(dateStr);
        return d >= monthStart && d <= monthEnd;
      })
      .map((a) => ({
        id: a.id,
        assignmentId: a.id,
        title: a.workout_sessions?.title || 'Séance',
        exercises: a.workout_sessions?.exercises || [],
        status: 'completed',
        scheduled_date: a.scheduled_date || a.due_date || a.created_at,
      }))
      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)); // plus récent en premier
  }, [assignments, currentMonth]);

  const getBlockInfoForSession = (scheduledDate) => {
    if (!scheduledDate || !planningBlocks?.length) return null;
    const sessionWeekStart = startOfWeek(parseISO(scheduledDate), { weekStartsOn: 1 });
    const sortedBlocks = [...planningBlocks].sort((a, b) => new Date(a.start_week_date) - new Date(b.start_week_date));
    const activeBlock = sortedBlocks.find((b) => {
      const bStart = startOfWeek(new Date(b.start_week_date), { weekStartsOn: 1 });
      const bEnd = addWeeks(bStart, parseInt(b.duration, 10) || 0);
      return sessionWeekStart >= bStart && sessionWeekStart < bEnd;
    });
    if (!activeBlock) return null;
    const bStart = startOfWeek(new Date(activeBlock.start_week_date), { weekStartsOn: 1 });
    const weekInBlock = differenceInCalendarWeeks(sessionWeekStart, bStart, { weekStartsOn: 1 }) + 1;
    const totalWeeks = parseInt(activeBlock.duration, 10) || 1;
    const blockNumber = sortedBlocks.findIndex((bl) => bl.id === activeBlock.id) + 1;
    return { blockNumber, weekInBlock, totalWeeks };
  };

  const formatSetsForDisplay = (exercise) => {
    const sets = exercise.sets || [];
    if (sets.length === 0) return '';
    if (exercise.useRir) {
      const firstReps = sets[0]?.reps ?? '?';
      const firstRpe = sets[0]?.weight ?? 0;
      const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
      const allSameRpe = sets.every((s) => String(s.weight ?? 0) === String(firstRpe));
      if (allSameReps && allSameRpe) return `${sets.length}x${firstReps} RPE ${firstRpe}`;
      return sets.map((s) => `${s.reps ?? '?'} RPE ${s.weight ?? 0}`).join(', ');
    }
    const withWeight = sets.every((s) => s.weight != null && s.weight !== '');
    const firstReps = sets[0]?.reps ?? '?';
    const firstWeight = sets[0]?.weight;
    const allSameReps = sets.every((s) => String(s.reps ?? '?') === String(firstReps));
    const allSameWeight = !withWeight || sets.every((s) => String(s.weight) === String(firstWeight));
    if (withWeight && allSameReps && allSameWeight && firstWeight != null) return `${sets.length}x${firstReps} @${firstWeight}kg`;
    if (!withWeight && allSameReps) return `${sets.length}x${firstReps} reps`;
    return sets.map((s) => (s.weight ? `${s.reps ?? '?'}@${s.weight}kg` : `${s.reps ?? '?'}reps`)).join(', ');
  };

  const handleDayClick = (day) => {
    if (day) {
      setSelectedDate(day);
      // Navigate to dashboard with selected date as query parameter
      const dateStr = format(day, 'yyyy-MM-dd');
      navigate(`/student/dashboard?date=${dateStr}`);
    }
  };

  const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  return (
    <div 
      className="text-foreground w-full min-h-full relative overflow-hidden"
      style={{
        background: 'unset',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'none'
      }}
    >
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
          top: '-175px',
          left: '0',
          transform: 'translateY(-50%)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite'
        }}
      />
      
      {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
      <div 
        style={{
          position: 'absolute',
          top: '-175px',
          left: '50vw',
          transform: 'translateY(-50%) scaleX(-1)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite 1.5s'
        }}
      />

      {/* Top glow to match WorkoutSessionExecution */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
          opacity: 0.35
        }}
      />
      {/* Warm orange glow from timeline */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
        style={{
          background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
          opacity: 0.45
        }}
      />
      {/* Subtle bottom depth glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
        style={{
          background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
          opacity: 0.25
        }}
      />

      {/* Header */}
      <div className="px-[47px] pt-[40px] pb-[40px] relative z-10">
        {/* Month title and navigation */}
        <div className="flex items-center justify-center gap-4 mb-1">
          <button
            onClick={handlePreviousMonth}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[28px] font-light text-center text-white">
            {capitalizeMonth(currentMonth)}
          </h1>
          <button
            onClick={handleNextMonth}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-[17px] relative z-10">
        {/* Day names header */}
        <div className="flex gap-0 mb-0">
          {dayNames.map((dayName, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-[5px] px-0 py-[5px] min-w-0"
            >
              <p className="text-[10px] font-normal text-white/50 leading-normal uppercase">
                {dayName}
              </p>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex flex-col gap-[10px] mt-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-0">
              {week.map((day, dayIndex) => {
                if (!day) {
                  // Empty cell for days before month start
                  return (
                    <div
                      key={`empty-${dayIndex}`}
                      className="flex-1 flex flex-col gap-[15px] items-center px-0 py-[5px] min-w-0 h-[50px]"
                    />
                  );
                }

                const dayStr = format(day, 'yyyy-MM-dd');
                const assignmentsForDay = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
                const dayHasAssignments = assignmentsForDay.length > 0;
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`flex-1 flex flex-col gap-[15px] items-center px-0 py-[5px] min-w-0 h-[50px] transition-colors ${
                      isSelected
                        ? 'border-[0.5px] border-[rgba(255,255,255,0.05)] rounded-[7.5px]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`flex flex-col gap-[5px] items-center ${
                      isSelected ? 'bg-[#d4845a] rounded-[5px] w-[19px] shrink-0' : ''
                    }`}>
                      <p className={`text-[10px] font-normal leading-normal text-center ${
                        isSelected ? 'text-white' : isToday ? 'text-white' : 'text-white/50'
                      }`}>
                        {format(day, 'd')}
                      </p>
                    </div>
                    {/* Indicateur de statut - un point par séance */}
                    <div className="flex items-center justify-center gap-0.5">
                      {dayHasAssignments ? (
                        assignmentsForDay.map((assignment, idx) => (
                          <div
                            key={assignment.id || idx}
                            className={`rounded-full w-[6px] h-[6px] flex-shrink-0 transition-colors ${
                              assignment.status === 'completed'
                                ? 'bg-[#2fa064]'
                                : isSelected
                                  ? 'bg-white'
                                  : 'bg-white/60'
                            }`}
                          />
                        ))
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Séances à venir + Séances terminées du mois - même frame, vue toggle */}
      {(upcomingSessions.length > 0 || completedSessionsThisMonth.length > 0) && (
        <div className="px-4 pb-16 pt-6 relative z-10">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSessionListView('upcoming')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                sessionListView === 'upcoming'
                  ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/75'
              }`}
            >
              Séances à venir ({upcomingSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setSessionListView('past')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                sessionListView === 'past'
                  ? 'bg-[var(--kaiylo-primary-hex)] text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/75'
              }`}
            >
              Séances passées ({completedSessionsThisMonth.length})
            </button>
          </div>

          {sessionListView === 'upcoming' && (
            <div className="flex flex-col gap-2">
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-white/40 py-4 text-center">Aucune séance à venir</p>
                ) : (
                <>
                {upcomingSessions.map((session, idx) => {
              const sessionId = session.id || session.assignmentId || idx;
              const isExpanded = !collapsedUpcomingSessionIds.has(sessionId);
              const exercisesList = session.exercises || [];
              const blockInfo = getBlockInfoForSession(session.scheduled_date);
              const scheduledDateFormatted = session.scheduled_date
                ? format(parseISO(session.scheduled_date), 'd MMM yyyy', { locale: fr })
                : '';
              const toggleExpanded = () => {
                setCollapsedUpcomingSessionIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(sessionId)) next.delete(sessionId);
                  else next.add(sessionId);
                  return next;
                });
              };
              return (
                <div key={sessionId} className="rounded-xl bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                        <path d="M160.5-26.4c9.3-7.8 23-7.5 31.9 .9 12.3 11.6 23.3 24.4 33.9 37.4 13.5 16.5 29.7 38.3 45.3 64.2 5.2-6.8 10-12.8 14.2-17.9 1.1-1.3 2.2-2.7 3.3-4.1 7.9-9.8 17.7-22.1 30.8-22.1 13.4 0 22.8 11.9 30.8 22.1 1.3 1.7 2.6 3.3 3.9 4.8 10.3 12.4 24 30.3 37.7 52.4 27.2 43.9 55.6 106.4 55.6 176.6 0 123.7-100.3 224-224 224S0 411.7 0 288c0-91.1 41.1-170 80.5-225 19.9-27.7 39.7-49.9 54.6-65.1 8.2-8.4 16.5-16.7 25.5-24.2zM225.7 416c25.3 0 47.7-7 68.8-21 42.1-29.4 53.4-88.2 28.1-134.4-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5-17.3-22.1-49.1-62.4-65.3-83-5.4-6.9-15.2-8-21.5-1.9-18.3 17.8-51.5 56.8-51.5 104.3 0 68.6 50.6 109.2 113.7 109.2z" />
                      </svg>
                      <span className="text-[13px] font-medium text-white min-w-0 truncate" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                        {session.title}
                      </span>
                      {scheduledDateFormatted && (
                        <>
                          <span className="text-[13px] text-white/50 flex-shrink-0"> · </span>
                          <span className="text-[11px] text-white/50 flex-shrink-0 whitespace-nowrap pt-0.5 pb-0.5">
                            {scheduledDateFormatted}
                          </span>
                        </>
                      )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className={`h-4 w-4 flex-shrink-0 text-white/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-90'}`} fill="currentColor">
                      <path d="M169.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L192 205.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z" />
                    </svg>
                  </button>
                  {isExpanded && exercisesList.length > 0 && (
                    <div className="px-3 pb-4 pt-1 bg-white/5">
                      <div className="relative flex flex-col">
                        {exercisesList.map((exercise, exIdx) => {
                          const setsStr = formatSetsForDisplay(exercise);
                          const setCount = exercise.sets?.length || 0;
                          return (
                            <div key={exIdx} className="flex items-center gap-2 py-1">
                              <div className="w-3 flex-shrink-0 relative self-stretch flex justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 flex-shrink-0 relative z-10 my-auto" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }} aria-hidden>
                                  <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[12px] font-normal text-white truncate">{exercise.name}</div>
                                  {setsStr && (
                                    <div className="text-[10px] text-white/75 font-normal truncate">
                                      {setsStr.split(/(@[\d.]+kg|RPE\s*[\d.]+)/g).map((part, i) =>
                                        part.match(/@[\d.]+kg|RPE\s*[\d.]+/) ? (
                                          <span key={i} style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>{part}</span>
                                        ) : (
                                          <span key={i}>{part}</span>
                                        )
                                      )}
                                    </div>
                                  )}
                                  {(exercise.tempo || exercise.per_side) && (
                                    <div className="text-[10px] text-white/50 font-normal mt-0.5">
                                      {exercise.tempo ? `Tempo : ${exercise.tempo}` : ''}
                                      {exercise.tempo && exercise.per_side ? ' · ' : ''}
                                      {exercise.per_side ? 'Charge par main' : ''}
                                    </div>
                                  )}
                                  {(exercise.coach_feedback || exercise.coachFeedback || exercise.notes) && (
                                    <div className="text-[10px] text-white/50 font-normal mt-0.5">
                                      <span className="text-white/40">Commentaire coach : </span>
                                      <span className="whitespace-pre-wrap">{(exercise.coach_feedback || exercise.coachFeedback || exercise.notes).trim()}</span>
                                    </div>
                                  )}
                                </div>
                                {setCount > 0 && (
                                  <span className="text-[11px] text-white/75 flex-shrink-0">x{setCount}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
                </>
                )}
            </div>
          )}

          {sessionListView === 'past' && (
            <div className="flex flex-col gap-2">
                {completedSessionsThisMonth.length === 0 ? (
                  <p className="text-sm text-white/40 py-4 text-center">Aucune séance passée ce mois</p>
                ) : (
                <>
                {completedSessionsThisMonth.map((session, idx) => {
                  const sessionId = session.id || session.assignmentId || idx;
                  const isExpanded = !collapsedCompletedSessionIds.has(sessionId);
                  const exercisesList = session.exercises || [];
                  const scheduledDateFormatted = session.scheduled_date
                    ? format(parseISO(session.scheduled_date), 'd MMM yyyy', { locale: fr })
                    : '';
                  const toggleExpanded = () => {
                    setCollapsedCompletedSessionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(sessionId)) next.delete(sessionId);
                      else next.add(sessionId);
                      return next;
                    });
                  };
                  return (
                    <div key={sessionId} className="rounded-xl bg-white/5 overflow-hidden">
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                            <path d="M160.5-26.4c9.3-7.8 23-7.5 31.9 .9 12.3 11.6 23.3 24.4 33.9 37.4 13.5 16.5 29.7 38.3 45.3 64.2 5.2-6.8 10-12.8 14.2-17.9 1.1-1.3 2.2-2.7 3.3-4.1 7.9-9.8 17.7-22.1 30.8-22.1 13.4 0 22.8 11.9 30.8 22.1 1.3 1.7 2.6 3.3 3.9 4.8 10.3 12.4 24 30.3 37.7 52.4 27.2 43.9 55.6 106.4 55.6 176.6 0 123.7-100.3 224-224 224S0 411.7 0 288c0-91.1 41.1-170 80.5-225 19.9-27.7 39.7-49.9 54.6-65.1 8.2-8.4 16.5-16.7 25.5-24.2zM225.7 416c25.3 0 47.7-7 68.8-21 42.1-29.4 53.4-88.2 28.1-134.4-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5-17.3-22.1-49.1-62.4-65.3-83-5.4-6.9-15.2-8-21.5-1.9-18.3 17.8-51.5 56.8-51.5 104.3 0 68.6 50.6 109.2 113.7 109.2z" />
                          </svg>
                          <span className="text-[13px] font-medium text-white min-w-0 truncate" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                            {session.title}
                          </span>
                          {scheduledDateFormatted && (
                            <>
                              <span className="text-[13px] text-white/50 flex-shrink-0"> · </span>
                              <span className="text-[11px] text-white/50 flex-shrink-0 whitespace-nowrap pt-0.5 pb-0.5">
                                {scheduledDateFormatted}
                              </span>
                            </>
                          )}
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className={`h-4 w-4 flex-shrink-0 text-white/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-90'}`} fill="currentColor">
                          <path d="M169.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L192 205.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z" />
                        </svg>
                      </button>
                      {isExpanded && exercisesList.length > 0 && (
                        <div className="px-3 pb-4 pt-1 bg-white/5">
                          <div className="relative flex flex-col">
                            {exercisesList.map((exercise, exIdx) => {
                              const setsStr = formatSetsForDisplay(exercise);
                              const setCount = exercise.sets?.length || 0;
                              return (
                                <div key={exIdx} className="flex items-center gap-2 py-1">
                                  <div className="w-3 flex-shrink-0 relative self-stretch flex justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-3 w-3 flex-shrink-0 relative z-10 my-auto" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }} aria-hidden>
                                      <path d="M249.3 235.8c10.2 12.6 9.5 31.1-2.2 42.8l-128 128c-9.2 9.2-22.9 11.9-34.9 6.9S64.5 396.9 64.5 384l0-256c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l128 128 2.2 2.4z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12px] font-normal text-white truncate">{exercise.name}</div>
                                      {setsStr && (
                                        <div className="text-[10px] text-white/75 font-normal truncate">
                                          {setsStr.split(/(@[\d.]+kg|RPE\s*[\d.]+)/g).map((part, i) =>
                                            part.match(/@[\d.]+kg|RPE\s*[\d.]+/) ? (
                                              <span key={i} style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>{part}</span>
                                            ) : (
                                              <span key={i}>{part}</span>
                                            )
                                          )}
                                        </div>
                                      )}
                                      {(exercise.tempo || exercise.per_side) && (
                                        <div className="text-[10px] text-white/50 font-normal mt-0.5">
                                          {exercise.tempo ? `Tempo : ${exercise.tempo}` : ''}
                                          {exercise.tempo && exercise.per_side ? ' · ' : ''}
                                          {exercise.per_side ? 'Charge par main' : ''}
                                        </div>
                                      )}
                                      {(exercise.coach_feedback || exercise.coachFeedback || exercise.notes) && (
                                        <div className="text-[10px] text-white/50 font-normal mt-0.5">
                                          <span className="text-white/40">Commentaire coach : </span>
                                          <span className="whitespace-pre-wrap">{(exercise.coach_feedback || exercise.coachFeedback || exercise.notes).trim()}</span>
                                        </div>
                                      )}
                                    </div>
                                    {setCount > 0 && (
                                      <span className="text-[11px] text-white/75 flex-shrink-0">x{setCount}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentHistoryPage;

