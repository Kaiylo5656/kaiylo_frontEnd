import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Search, User, Calendar, Settings, Home, Clock, MessageCircle, Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { buildApiUrl } from '../config/api';
import WorkoutSessionExecution from '../components/WorkoutSessionExecution';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, getAuthToken } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('planning'); // 'planning' or 'execution'
  const [executingSession, setExecutingSession] = useState(null);

  const week = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

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
      
      // Extract completion data from session
      const completionData = session.completionData || {};
      
      const response = await fetch(buildApiUrl(`/api/assignments/${session.id}/complete`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          difficulty: completionData.difficulty,
          comment: completionData.comment
        })
      });

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
      <WorkoutSessionExecution
        session={executingSession}
        onBack={handleBackToPlanning}
        onCompleteSession={handleCompleteSession}
      />
    );
  }

  return (
    <div className="bg-[#121212] text-white min-h-screen">
      <main className="p-4 pb-20">
        <h1 className="text-2xl font-bold mb-6 text-white">Planning de la semaine</h1>

        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')} className="text-white hover:bg-[#1a1a1a]">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex justify-around flex-1 overflow-x-auto gap-2">
            {week.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const assignmentsForDay = assignments.filter(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
              const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
              
              // Determine the overall status for the day
              const completedCount = assignmentsForDay.filter(a => a.status === 'completed').length;
              const totalCount = assignmentsForDay.length;
              const allCompleted = totalCount > 0 && completedCount === totalCount;
              const someCompleted = completedCount > 0 && completedCount < totalCount;
              
              return (
                <div 
                  key={dayStr}
                  className={`text-center p-2 rounded-lg cursor-pointer min-w-[60px] ${isSelected ? 'bg-[#e87c3e] text-white' : 'text-white'}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <p className="text-xs uppercase opacity-70">{format(day, 'eee', { locale: fr })}</p>
                  <p className="font-bold text-base">{format(day, 'd')}</p>
                  <div className="h-4 flex justify-center items-center mt-1">
                    {assignmentsForDay.length > 0 && (
                      <>
                        {allCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                        ) : someCompleted ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-2 w-2 text-green-400" />
                            <Circle className="h-2 w-2 fill-current" />
                          </div>
                        ) : (
                          <Circle className="h-2 w-2 fill-current" />
                        )}
                        {assignmentsForDay.length > 1 && (
                          <span className="text-xs text-gray-400 ml-1">{assignmentsForDay.length}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeWeek('next')} className="text-white hover:bg-[#1a1a1a]">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {selectedAssignments.length > 0 ? (
          <div className="space-y-4">
            {selectedAssignments.map((assignment, index) => (
              <Card key={assignment.id || index} className="bg-[#1a1a1a] border-[#262626] rounded-lg">
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
                        <p className="text-gray-400 whitespace-nowrap">{ex.sets?.length || 0}x{ex.sets?.[0]?.reps || '?'} reps @{ex.sets?.[0]?.weight || 'N/A'} kg</p>
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
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#262626] rounded-t-lg">
        <div className="flex items-center justify-around py-2">
          <div className="flex flex-col items-center py-2">
            <Home className="h-6 w-6 text-[#e87c3e]" />
            <span className="text-xs text-[#e87c3e] font-medium mt-1">Accueil</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Clock className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Historique</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <MessageCircle className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Messages</span>
          </div>
          <button 
            onClick={() => navigate('/student/videos')}
            className="flex flex-col items-center py-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Video className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Vidéothèque</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;