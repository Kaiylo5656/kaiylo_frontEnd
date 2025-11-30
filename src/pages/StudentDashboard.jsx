import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, addDays, startOfWeek, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, Circle, CheckCircle2, Search, User, Calendar, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { buildApiUrl } from '../config/api';
import WorkoutSessionExecution from '../components/WorkoutSessionExecution';
import { useNavigate, useSearchParams } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, getAuthToken, refreshAuthToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Track scroll attempts when at bottom (forcing scroll)
  const forceScrollAttempts = useRef(0);
  const isAtBottom = useRef(false);
  const lastScrollTop = useRef(0);

  // Handle scroll to navigate to monthly view - based on forcing scroll at bottom
  useEffect(() => {
    const handleScroll = (e) => {
      // Find the scrollable container (from MainLayout)
      const scrollContainer = document.querySelector('.dashboard-scrollbar') || 
                              document.querySelector('.overflow-y-auto');
      
      if (!scrollContainer) return;
      
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Check if we're at or very close to the bottom (within 5px)
      const atBottom = distanceFromBottom <= 5;
      
      // Check if user is trying to scroll down
      const isScrollingDown = scrollTop >= lastScrollTop.current;
      lastScrollTop.current = scrollTop;
      
      if (atBottom && isScrollingDown) {
        // User is at bottom and trying to scroll down (forcing)
        isAtBottom.current = true;
        forceScrollAttempts.current += 1;
        
        // Require multiple force attempts (user trying to scroll when already at bottom)
        // This indicates intentional "pull" to navigate
        if (forceScrollAttempts.current >= 5) {
          navigate('/student/monthly');
          forceScrollAttempts.current = 0;
          isAtBottom.current = false;
        }
      } else {
        // Reset if user scrolls away from bottom or scrolls up
        if (!atBottom || !isScrollingDown) {
          forceScrollAttempts.current = 0;
          isAtBottom.current = false;
        }
      }
    };

    // Also handle wheel events when at bottom to detect "forcing"
    const handleWheel = (e) => {
      const scrollContainer = document.querySelector('.dashboard-scrollbar') || 
                              document.querySelector('.overflow-y-auto');
      
      if (!scrollContainer) return;
      
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If at bottom and user scrolls down with wheel, count as force attempt
      if (distanceFromBottom <= 5 && e.deltaY > 0) {
        forceScrollAttempts.current += 1;
        
        if (forceScrollAttempts.current >= 3) {
          navigate('/student/monthly');
          forceScrollAttempts.current = 0;
        }
      } else {
        // Reset if not at bottom or scrolling up
        forceScrollAttempts.current = 0;
      }
    };

    const scrollContainer = document.querySelector('.dashboard-scrollbar') || 
                            document.querySelector('.overflow-y-auto');
    
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      scrollContainer.addEventListener('wheel', handleWheel, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        scrollContainer.removeEventListener('wheel', handleWheel);
      };
    }
  }, [navigate]);

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

  const selectedAssignment = selectedAssignments[0]; // Keep for backward compatibility
  
  useEffect(() => {
    fetchAssignments();
  }, []);

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

  const changeWeek = (direction) => {
    const newDate = direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
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
            
            if (setData && typeof setData === 'object' && 'status' in setData) {
              set.validation_status = setData.status;
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
        // Refresh assignments to show updated status
        await fetchAssignments();
        setCurrentView('planning');
        setExecutingSession(null);
        alert('Séance terminée avec succès !');
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 400 && errorData.message === 'Workout is already marked as completed') {
          alert('Cette séance est déjà terminée !');
          // Refresh assignments and go back to planning
          await fetchAssignments();
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
        />
      </div>
    );
  }

  return (
    <div 
      className="text-foreground w-full min-h-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #050505 55%, #000000 100%)'
      }}
    >
      {/* Top glow to match WorkoutSessionExecution */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(191,191,191,0.1) 45%, rgba(0,0,0,0) 70%)',
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
        className="p-4 pb-20 w-full max-w-6xl mx-auto relative z-10"
        style={{ 
          scrollBehavior: 'auto',
          // Add resistance at the bottom to prevent accidental navigation
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Titre du mois */}
        <h1 className="text-[28px] font-light text-center text-white mb-6">
          {capitalizeMonth(displayMonth)}
        </h1>

        {/* Planning de la semaine - Design Figma */}
        <div className="relative mb-6">
          <div className="flex items-center justify-between gap-2">
            {/* Flèche gauche */}
            <button
              onClick={() => changeWeek('prev')}
              className="flex items-center justify-center w-[15px] h-[15px] flex-shrink-0"
            >
              <ChevronLeft className="w-[15px] h-[15px] text-white/50" />
            </button>
            
            {/* Jours de la semaine - Tous visibles sur une ligne */}
            <div className="flex-1 flex items-center justify-between gap-0 min-w-0">
              {week.map((day, index) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const assignmentsForDay = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
                
                // Determine the overall status for the day
                const completedCount = assignmentsForDay.filter(a => a.status === 'completed').length;
                const totalCount = assignmentsForDay.length;
                const allCompleted = totalCount > 0 && completedCount === totalCount;
                const hasAssignments = totalCount > 0;
                
                return (
                  <div key={dayStr} className="flex-1 flex flex-col items-center min-w-0">
                    <button
                      onClick={() => setSelectedDate(day)}
                      className={`w-full flex flex-col items-center gap-[5px] px-0 py-[5px] rounded-[5px] text-[10px] font-normal transition-colors ${
                        isSelected 
                          ? 'bg-[#d4845a] text-white' 
                          : hasAssignments && !allCompleted
                            ? 'text-white/75'
                            : 'text-white/50'
                      }`}
                    >
                      <p className="leading-normal whitespace-nowrap uppercase">
                        {format(day, 'eee', { locale: fr }).substring(0, 3)}
                      </p>
                      <p className="leading-normal whitespace-nowrap">
                        {format(day, 'd')}
                      </p>
                      
                      {/* Indicateur de statut sous chaque jour avec nombre de séances */}
                      {/* Toujours afficher un espace pour garder la même hauteur */}
                      <div className="mt-[2px] flex items-center justify-center gap-1 h-[8px]">
                        {hasAssignments ? (
                          <>
                            {allCompleted ? (
                              <div className="bg-[#2fa064] rounded-[10px] w-[8px] h-[8px] flex-shrink-0" />
                            ) : completedCount > 0 ? (
                              <div className={`rounded-[10px] w-[8px] h-[8px] border-[0.5px] flex-shrink-0 ${
                                isSelected 
                                  ? 'bg-white/20 border-white/30' 
                                  : 'bg-white/5 border-white/5'
                              }`} />
                            ) : (
                              <div className={`rounded-[10px] w-[8px] h-[8px] flex-shrink-0 ${
                                isSelected 
                                  ? 'bg-white' 
                                  : 'bg-white'
                              }`} />
                            )}
                            {/* Nombre de séances à côté de la pastille */}
                            {totalCount > 0 && (
                              <span className={`text-[8px] font-normal leading-normal ${
                                isSelected ? 'text-white' : 'text-white/60'
                              }`}>
                                {totalCount}
                              </span>
                            )}
                          </>
                        ) : (
                          // Espace réservé invisible pour les jours sans séance pour garder la même hauteur
                          <div className="w-[8px] h-[8px] flex-shrink-0 opacity-0" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Flèche droite */}
            <button
              onClick={() => changeWeek('next')}
              className="flex items-center justify-center w-[15px] h-[15px] flex-shrink-0"
            >
              <ChevronRight className="w-[15px] h-[15px] text-white/50" />
            </button>
          </div>
        </div>

        {selectedAssignments.length > 0 ? (
          <div className="space-y-4 w-full max-w-4xl mx-auto">
            {selectedAssignments.map((assignment, index) => (
              <Card key={assignment.id || index} className="bg-card border-border rounded-lg w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#e87c3e] text-xl font-bold">
                    {assignment.workout_sessions?.title || 'Workout'}
                    {selectedAssignments.length > 1 && (
                      <span className="text-sm text-gray-400 ml-2">({index + 1}/{selectedAssignments.length})</span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-400">Durée estimée : 1h30</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    {assignment.workout_sessions?.exercises?.map((ex, exIndex) => (
                      <div key={exIndex} className="flex justify-between items-center">
                        <p className="truncate text-white font-medium">{ex.name}</p>
                        <p className="text-gray-400 whitespace-nowrap">
                          {ex.sets?.length || 0}x{ex.sets?.[0]?.reps || '?'} <span className="text-[#d4845a]">@{ex.sets?.[0]?.weight || 'N/A'} kg</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    {assignment.workout_sessions?.exercises?.length || 0} exercices
                  </p>
                  <Button 
                    className={`w-full py-3 rounded-lg font-medium ${
                      assignment.status === 'completed'
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-[#e87c3e] hover:bg-[#d66d35] text-white'
                    }`}
                    onClick={() => handleStartSession(assignment)}
                    disabled={assignment.status === 'completed'}
                  >
                    {assignment.status === 'completed' ? 'Séance terminée' : 'Commencer la séance'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400">Pas de séance prévue pour aujourd'hui.</p>
          </div>
        )}

        {/* Icon to navigate to monthly view */}
        <div className="flex items-center justify-center mt-8 mb-4">
          <button 
            onClick={() => navigate('/student/monthly')}
            className="flex items-center justify-center w-[15px] h-[15px] text-white/60 hover:text-white transition-colors"
            title="Voir le calendrier mensuel"
          >
            <ChevronDown className="h-[15px] w-[15px]" />
          </button>
        </div>
        
        {/* Extra padding at bottom to add scroll resistance and prevent accidental navigation */}
        <div className="h-[200px] w-full" aria-hidden="true" />
      </div>
    </div>
  );
};

export default StudentDashboard;