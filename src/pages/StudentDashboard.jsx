import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentPlanning } from '../contexts/StudentPlanningContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, addDays, startOfWeek, subDays, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Search, User, Calendar, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { buildApiUrl } from '../config/api';
import WorkoutSessionExecution from '../components/WorkoutSessionExecution';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SessionSuccessModal from '../components/SessionSuccessModal';
import { motion, AnimatePresence } from 'framer-motion';

const StudentDashboard = () => {
  const { user, getAuthToken, refreshAuthToken } = useAuth();
  const planningContext = useStudentPlanning();
  const assignments = planningContext?.assignments ?? [];
  const assignmentsLoading = planningContext?.assignmentsLoading ?? false;
  const refreshAssignments = planningContext?.refreshAssignments ?? (() => { });
  const loading = assignmentsLoading && assignments.length === 0;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize dates from URL parameter if present, otherwise use current date
  const initializeDate = () => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const parsedDate = parseISO(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (error) {
        console.error('Error parsing date from URL:', error);
      }
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(initializeDate());
  const [selectedDate, setSelectedDate] = useState(initializeDate());
  const [currentView, setCurrentView] = useState('planning'); // 'planning' or 'execution'
  const [executingSession, setExecutingSession] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [shouldCloseCompletionModal, setShouldCloseCompletionModal] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollContainerRef = useRef(null);
  const weekSwipeRef = useRef({ startX: null, startY: null });

  // Update dates when URL parameter changes
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const parsedDate = parseISO(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setCurrentDate(parsedDate);
          setSelectedDate(parsedDate);
        }
      } catch (error) {
        console.error('Error parsing date from URL:', error);
      }
    }
  }, [searchParams]);

  // Helper function to capitalize first letter of month
  const capitalizeMonth = (date) => {
    const monthName = format(date, 'MMMM', { locale: fr });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const week = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  // Determine which month to display based on which month has the most days in the week
  const displayMonth = useMemo(() => {
    const monthCounts = new Map();

    week.forEach(day => {
      const monthKey = format(day, 'yyyy-MM');
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });

    // Find the month with the most days
    let maxCount = 0;
    let dominantMonth = currentDate;

    monthCounts.forEach((count, monthKey) => {
      if (count > maxCount) {
        maxCount = count;
        // Parse the month key to get the date
        const [year, month] = monthKey.split('-');
        dominantMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      }
    });

    return dominantMonth;
  }, [week, currentDate]);

  const selectedAssignments = useMemo(() => {
    return assignments.filter(a =>
      format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );
  }, [assignments, selectedDate]);

  // Reset card index when selected assignments change
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [selectedAssignments.length]);

  const selectedAssignment = selectedAssignments[0]; // Keep for backward compatibility

  // Données chargées par StudentPlanningContext (préchargées dès la connexion étudiant)

  const changeWeek = (dir) => {
    if (isAnimating) return;

    setIsAnimating(true);
    setDirection(dir === 'next' ? 1 : -1);

    const newDate = dir === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
    setCurrentDate(newDate);
    // Note: setSelectedDate might need to be removed generally if selectedDate shouldn't jump, 
    // but the user requirement implies moving to next/prev week so updating selectedDate makes sense
    setSelectedDate(newDate);
  };

  // Gestionnaires de swipe pour changer de semaine
  const handleWeekSwipeStart = (e) => {
    const touch = e.touches[0];
    weekSwipeRef.current.startX = touch.clientX;
    weekSwipeRef.current.startY = touch.clientY;
  };

  const handleWeekSwipeMove = (e) => {
    // Empêcher le scroll pendant le swipe
    if (weekSwipeRef.current.startX !== null) {
      e.preventDefault();
    }
  };

  const handleWeekSwipeEnd = (e) => {
    if (weekSwipeRef.current.startX === null || weekSwipeRef.current.startY === null) {
      return;
    }

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const diffX = weekSwipeRef.current.startX - endX;
    const diffY = weekSwipeRef.current.startY - endY;

    // Seuil minimum pour déclencher un swipe (50px)
    const minSwipeDistance = 50;

    // Vérifier que c'est un swipe horizontal (plus horizontal que vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swipe vers la gauche = semaine suivante
        changeWeek('next');
      } else {
        // Swipe vers la droite = semaine précédente
        changeWeek('prev');
      }
    }

    // Réinitialiser
    weekSwipeRef.current.startX = null;
    weekSwipeRef.current.startY = null;
  };


  const handleStartSession = (assignment) => {
    // Prevent starting already completed sessions
    if (assignment.status === 'completed') {
      alert('Cette séance est déjà terminée ! Vous ne pouvez pas la recommencer.');
      return;
    }

    setExecutingSession(assignment);
    setCurrentView('execution');
  };

  const handleBackToPlanning = () => {
    setCurrentView('planning');
    setExecutingSession(null);
  };

  const handleCompleteSession = async (session) => {
    try {
      const token = await getAuthToken();

      // Extract completion data and set statuses from session
      const completionData = session.completionData || {};
      const completedSets = session.completedSets || {};
      const exerciseComments = session.exerciseComments || {};

      // Create a deep copy of exercises to modify
      const updatedExercises = JSON.parse(JSON.stringify(session.workout_sessions.exercises));

      // Inject validation_status into each set and add student comments
      updatedExercises.forEach((exercise, exerciseIndex) => {
        // Add student comment to exercise if it exists
        if (exerciseComments[exerciseIndex]) {
          exercise.student_comment = exerciseComments[exerciseIndex];
        }

        if (exercise.sets && Array.isArray(exercise.sets)) {
          exercise.sets.forEach((set, setIndex) => {
            const key = `${exerciseIndex}-${setIndex}`;
            const setData = completedSets[key];

            if (setData && typeof setData === 'object') {
              // Inject validation_status
              if ('status' in setData) {
                set.validation_status = setData.status;
              }
              // Inject RPE rating if present
              if ('rpeRating' in setData && setData.rpeRating !== null && setData.rpeRating !== undefined) {
                set.rpe_rating = setData.rpeRating;
                set.rpe = setData.rpeRating; // Also set rpe for compatibility
              }

              // Inject studentWeight if present (CRITICAL FIX)
              if ('studentWeight' in setData && setData.studentWeight !== null && setData.studentWeight !== undefined) {
                set.student_weight = setData.studentWeight;
                set.studentWeight = setData.studentWeight; // Set both camelCase and snake_case just to be safe
              }
            } else if (setData && typeof setData === 'string') {
              set.validation_status = setData;
            }
          });
        }
      });

      let response = await fetch(buildApiUrl(`/api/assignments/${session.id}/complete`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          difficulty: completionData.difficulty,
          comment: completionData.comment,
          exercises: updatedExercises // Send updated exercises with validation statuses
        })
      });

      // If we get a 401 error, try to refresh the token and retry once
      if (response.status === 401) {
        console.log('🔄 Token expired, attempting to refresh...');
        try {
          const refreshedToken = await refreshAuthToken();
          console.log('✅ Token refreshed, retrying session completion...');

          response = await fetch(buildApiUrl(`/api/assignments/${session.id}/complete`), {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${refreshedToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              difficulty: completionData.difficulty,
              comment: completionData.comment,
              exercises: updatedExercises
            })
          });
        } catch (refreshError) {
          console.error('❌ Failed to refresh token:', refreshError);
          throw new Error('Authentication failed. Please log in again.');
        }
      }

      if (response.ok) {
        // Call onSuccess callback if provided (to close completion modal)
        if (session.onSuccess) {
          session.onSuccess();
        }

        // Refresh assignments to show updated status
        await refreshAssignments();
        setCurrentView('planning');
        setExecutingSession(null);

        // Show success modal instead of alert
        setIsSuccessModalOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 400 && errorData.message === 'Workout is already marked as completed') {
          alert('Cette séance est déjà terminée !');
          // Refresh assignments and go back to planning
          await refreshAssignments();
          setCurrentView('planning');
          setExecutingSession(null);
        } else {
          throw new Error(errorData.message || 'Failed to complete session');
        }
      }
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Erreur lors de la validation de la séance');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  // Show execution view if a session is being executed
  if (currentView === 'execution' && executingSession) {
    return (
      <div className="-m-6 lg:-m-8 md:-m-6 -mb-20 md:-mb-6 w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] md:w-[calc(100%+3rem)] -ml-6 lg:-ml-8 md:-ml-6">
        <WorkoutSessionExecution
          session={executingSession}
          onBack={handleBackToPlanning}
          onCompleteSession={handleCompleteSession}
          shouldCloseCompletionModal={shouldCloseCompletionModal}
        />
      </div>
    );
  }

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
      <div
        className="px-10 pt-4 md:pt-6 pb-20 w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center"
        style={{
          scrollBehavior: 'auto',
          minHeight: '100vh',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          color: 'rgba(255, 255, 255, 0)'
        }}
      >
        {/* Titre du mois */}
        <div className="flex items-center justify-center gap-4 mb-4 md:mb-6">
          <h1 className="text-2xl md:text-[28px] font-light text-center text-white">
            {capitalizeMonth(displayMonth)}
          </h1>
        </div>

        {/* Planning de la semaine - Design Figma */}
        <div
          className="relative mb-6 md:mb-8 -mx-10 md:-mx-10 px-2 md:px-5"
          onTouchStart={handleWeekSwipeStart}
          onTouchMove={handleWeekSwipeMove}
          onTouchEnd={handleWeekSwipeEnd}
        >
          <div className="flex items-center justify-center gap-0 w-full">
            {/* Flèche gauche */}
            <button
              onClick={() => changeWeek('prev')}
              className="flex items-center justify-center min-w-[36px] md:min-w-[44px] min-h-[36px] md:min-h-[44px] w-[36px] md:w-[44px] h-[36px] md:h-[44px] flex-shrink-0 touch-target pl-3 md:pl-[25px]"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-white/50" style={{ strokeWidth: 2.5 }} />
            </button>

            {/* Jours de la semaine - 7 jours visibles */}
            <div className="flex-1 min-w-0 relative overflow-hidden">
              <div className="grid grid-cols-1 grid-rows-1 w-full">
                <AnimatePresence
                  initial={false}
                  custom={direction}
                  mode="popLayout"
                  onExitComplete={() => setIsAnimating(false)}
                >
                  <motion.div
                    key={format(week[0], 'yyyy-MM-dd')}
                    custom={direction}
                    variants={{
                      enter: (direction) => ({
                        x: direction > 0 ? '100%' : '-100%',
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                      },
                      exit: (direction) => ({
                        x: direction > 0 ? '-100%' : '100%',
                        opacity: 0,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className="flex items-center gap-0 w-full col-start-1 row-start-1"
                  >
                    {week.map((day, index) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const assignmentsForDay = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
                      const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
                      const isToday = isSameDay(day, new Date());

                      // Determine the overall status for the day
                      const completedCount = assignmentsForDay.filter(a => a.status === 'completed').length;
                      const totalCount = assignmentsForDay.length;
                      const allCompleted = totalCount > 0 && completedCount === totalCount;
                      const hasAssignments = totalCount > 0;

                      return (
                        <div key={dayStr} className="flex flex-col items-center flex-shrink-0" style={{ width: 'calc(100% / 7)', minWidth: '40px' }}>
                          <button
                            onClick={() => !isAnimating && setSelectedDate(day)}
                            className={`flex flex-col items-center gap-0.5 md:gap-1 px-0.5 md:px-1.5 sm:px-2.5 pt-2 md:pt-2.5 pb-[10px] md:pb-[12px] rounded-[7px] text-[10px] md:text-[11px] font-normal transition-colors ${isSelected
                              ? 'bg-[#d4845a] text-white'
                              : hasAssignments && !allCompleted
                                ? 'text-white/75'
                                : 'text-white/50'
                              }`}
                            style={{ width: 'calc(100% - 2px)' }}
                          >
                            <p className={`leading-normal whitespace-nowrap uppercase ${isSelected ? 'text-white font-normal' : isToday && !isSelected ? 'font-semibold !text-[#d4845a]' : hasAssignments && !allCompleted ? 'font-normal' : 'font-light'}`}>
                              {format(day, 'eee', { locale: fr }).substring(0, 3)}
                            </p>
                            <p className={`leading-normal whitespace-nowrap ${isSelected ? 'text-white font-normal' : isToday && !isSelected ? 'font-semibold !text-[#d4845a]' : hasAssignments && !allCompleted ? 'font-normal' : 'font-light'}`}>
                              {format(day, 'd')}
                            </p>

                            {/* Indicateur de statut sous chaque jour - un point par séance */}
                            <div className="mt-[2px] flex items-center justify-center gap-0.5 h-[7px]">
                              {hasAssignments ? (
                                assignmentsForDay.map((assignment, idx) => (
                                  <div
                                    key={assignment.id || idx}
                                    className={`rounded-full w-[6px] h-[6px] flex-shrink-0 transition-colors ${assignment.status === 'completed'
                                      ? 'bg-[#2fa064]'
                                      : isSelected
                                        ? 'bg-white'
                                        : 'bg-white/60'
                                      }`}
                                  />
                                ))
                              ) : (
                                // Espace réservé invisible pour les jours sans séance pour garder la même hauteur
                                <div className="w-[6px] h-[6px] flex-shrink-0 opacity-0" />
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Flèche droite */}
            <button
              onClick={() => changeWeek('next')}
              className="flex items-center justify-center min-w-[36px] md:min-w-[44px] min-h-[36px] md:min-h-[44px] w-[36px] md:w-[44px] h-[36px] md:h-[44px] flex-shrink-0 touch-target pr-3 md:pr-[25px]"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/50" style={{ strokeWidth: 2.5 }} />
            </button>
          </div>
        </div>

        {selectedAssignments.length > 0 ? (
          selectedAssignments.length > 1 ? (
            // Mode horizontal avec scroll pour plusieurs séances
            <div className="w-full max-w-xl mx-auto px-2 md:px-4 flex-1 flex flex-col relative overflow-hidden" style={{ minHeight: 0, marginBottom: '50px' }}>
              <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-4 scrollbar-hide items-stretch"
                style={{
                  scrollSnapType: 'x mandatory',
                  flex: '1 1 0',
                  minHeight: 0,
                  width: '100%',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={(e) => {
                  const container = e.target;
                  const scrollLeft = container.scrollLeft;
                  const containerWidth = container.clientWidth;
                  // Calculer la largeur d'une carte (width + gap)
                  const cardWidth = containerWidth;
                  const gap = 16; // gap-4 = 16px
                  const totalCardWidth = cardWidth + gap;
                  const newIndex = Math.round(scrollLeft / totalCardWidth);
                  setCurrentCardIndex(Math.min(Math.max(0, newIndex), selectedAssignments.length - 1));
                }}
              >
                {selectedAssignments.map((assignment, index) => (
                  <Card key={assignment.id || index} className="border-border rounded-[25px] border-0 flex flex-col flex-shrink-0" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.07)',
                    borderImage: 'none',
                    borderColor: 'transparent',
                    marginBottom: '10px',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: '100%',
                    height: '100%',
                    scrollSnapAlign: 'start'
                  }}>
                    <CardHeader className="pb-0 px-4 space-y-0 pt-6 mx-5">
                      <CardTitle className="text-[#e87c3e] text-[19px] font-normal px-0 flex items-center gap-2">
                        <span>{assignment.workout_sessions?.title || 'Workout'}</span>
                        {selectedAssignments.length > 1 && (
                          <span className="text-white/40 text-[14px] font-light">
                            {index + 1}/{selectedAssignments.length}
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-400" style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 200, fontSize: '11px' }}>Durée estimée : 1h30</p>
                    </CardHeader>
                    <CardContent className="px-4 mx-5 flex-1 flex flex-col">
                      <div className="space-y-3 mb-0 pt-5 pb-5 flex-1">
                        {assignment.workout_sessions?.exercises?.map((ex, exIndex) => (
                          <div key={exIndex} className="flex justify-between items-center gap-4">
                            <p className="truncate text-white font-light flex-1 min-w-0 max-w-[60%]" style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '13px' }}>{ex.name}</p>
                            <p className="text-white/50 whitespace-nowrap font-light text-sm flex-shrink-0">
                              {ex.sets?.length || 0}x{ex.sets?.[0]?.reps || '?'} {' '}
                              {ex.useRir ? (
                                <span className="text-[#d4845a] font-normal">RPE {ex.sets?.[0]?.weight ?? 0}</span>
                              ) : (
                                <span className="text-[#d4845a] font-normal">@{ex.sets?.[0]?.weight ?? 0} kg</span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-white/25 font-light mb-4 pt-3 border-t border-border">
                        {assignment.workout_sessions?.exercises?.length || 0} exercices
                      </p>
                      <Button
                        className={`w-full py-2 rounded-lg font-normal ${assignment.status === 'completed'
                          ? 'bg-[var(--surface-700)] text-gray-400 cursor-not-allowed'
                          : 'bg-[#e87c3e] hover:bg-[#d66d35] text-white'
                          }`}
                        onClick={() => handleStartSession(assignment)}
                        disabled={assignment.status === 'completed'}
                      >
                        {assignment.status === 'completed' ? 'Séance terminée' : 'Aperçu de la séance'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Dots de pagination */}
              <div className="flex justify-center items-center gap-2 flex-shrink-0" style={{ pointerEvents: 'auto', marginTop: '0px', paddingTop: '16px', paddingBottom: '0px' }}>
                {selectedAssignments.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (scrollContainerRef.current) {
                        const container = scrollContainerRef.current;
                        const containerWidth = container.clientWidth;
                        const cardWidth = containerWidth;
                        const gap = 16; // gap-4 = 16px
                        const totalCardWidth = cardWidth + gap;
                        container.scrollTo({
                          left: index * totalCardWidth,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className={`transition-all duration-200 rounded-full font-light ${index === currentCardIndex
                      ? 'w-1.5 h-1.5 bg-[#e87c3e]'
                      : 'w-1.5 h-1.5 bg-white/10'
                      }`}
                    style={{
                      boxShadow: index === currentCardIndex ? '0 0 10px rgba(232, 124, 62, 0.6)' : '0 0 4px rgba(255, 255, 255, 0.2)',
                      fontWeight: index === currentCardIndex ? 300 : undefined
                    }}
                    aria-label={`Aller à la séance ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Mode vertical pour une seule séance
            <div className="space-y-4 w-full max-w-xl mx-auto px-2 md:px-4 flex-1 flex flex-col">
              {selectedAssignments.map((assignment, index) => (
                <Card key={assignment.id || index} className="border-border rounded-[22px] w-full border-0 flex-1 flex flex-col" style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', borderImage: 'none', borderColor: 'transparent', marginBottom: '50px' }}>
                  <CardHeader className="pb-0 px-4 space-y-0 pt-6 mx-5">
                    <CardTitle className="text-[#e87c3e] text-[19px] font-normal px-0">
                      {assignment.workout_sessions?.title || 'Workout'}
                    </CardTitle>
                    <p className="text-sm text-gray-400" style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 200, fontSize: '11px' }}>Durée estimée : 1h30</p>
                  </CardHeader>
                  <CardContent className="px-4 mx-5 flex-1 flex flex-col">
                    <div className="space-y-3 mb-0 pt-5 pb-5 flex-1">
                      {assignment.workout_sessions?.exercises?.map((ex, exIndex) => (
                        <div key={exIndex} className="flex justify-between items-center gap-4">
                          <p className="truncate text-white font-light flex-1 min-w-0 max-w-[60%]" style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '13px' }}>{ex.name}</p>
                          <p className="text-white/50 whitespace-nowrap font-light text-sm flex-shrink-0">
                            {ex.sets?.length || 0}x{ex.sets?.[0]?.reps || '?'} {' '}
                            {ex.useRir ? (
                              <span className="text-[#d4845a] font-normal">RPE {ex.sets?.[0]?.weight ?? 0}</span>
                            ) : (
                              <span className="text-[#d4845a] font-normal">@{ex.sets?.[0]?.weight ?? 0} kg</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/25 font-light mb-4 pt-3 border-t border-border">
                      {assignment.workout_sessions?.exercises?.length || 0} exercices
                    </p>
                    <Button
                      className={`w-full py-2 rounded-lg font-normal ${assignment.status === 'completed'
                        ? 'bg-[var(--surface-700)] text-gray-400 cursor-not-allowed'
                        : 'bg-[#e87c3e] hover:bg-[#d66d35] text-white'
                        }`}
                      onClick={() => handleStartSession(assignment)}
                      disabled={assignment.status === 'completed'}
                    >
                      {assignment.status === 'completed' ? 'Séance terminée' : 'Aperçu de la séance'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4 w-full max-w-xl mx-auto px-2 md:px-4 flex-1 flex flex-col">
            <Card className="border-border rounded-[22px] w-full border-0 flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderImage: 'none', borderColor: 'transparent', marginBottom: '50px' }}>
              <CardContent className="px-4 mx-5 flex-1 flex items-center justify-center">
                <p className="text-white/25 font-light text-sm text-center" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: 100, fontSize: '13px' }}>
                  Aucune séance aujourd'hui
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SessionSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />
    </div>
  );
};

export default StudentDashboard;