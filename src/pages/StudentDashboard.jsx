import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { buildApiUrl } from '../config/api';

const StudentDashboard = () => {
  const { user, getAuthToken } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const week = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  const selectedAssignment = useMemo(() => {
    return assignments.find(a => 
      format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );
  }, [assignments, selectedDate]);
  
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen p-4 md:p-6">
      <main>
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Planning de la semaine</h1>

        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex justify-around flex-1 overflow-x-auto">
            {week.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const assignmentForDay = assignments.find(a => format(new Date(a.due_date || a.created_at), 'yyyy-MM-dd') === dayStr);
              const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
              
              return (
                <div 
                  key={dayStr}
                  className={`text-center p-2 rounded-lg cursor-pointer min-w-[40px] sm:min-w-[50px] ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <p className="text-xs uppercase opacity-70">{format(day, 'eee', { locale: fr })}</p>
                  <p className="font-bold text-base sm:text-lg">{format(day, 'd')}</p>
                  <div className="h-4 flex justify-center items-center mt-1">
                    {assignmentForDay && (
                      assignmentForDay.status === 'completed' 
                        ? <CheckCircle2 className="h-3 w-3 text-green-400" />
                        : <Circle className="h-2 w-2 fill-current" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {selectedAssignment ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-primary">{selectedAssignment.workout_sessions?.title || 'Workout'}</CardTitle>
              <p className="text-sm text-muted-foreground">Durée estimée : 1h30</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {selectedAssignment.workout_sessions?.exercises?.map((ex, index) => (
                  <div key={index} className="flex justify-between">
                    <p className="truncate">{ex.name}</p>
                    <p className="text-muted-foreground whitespace-nowrap">{ex.sets}x{ex.reps} reps @{ex.weight || 'N/A'} kg</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedAssignment.workout_sessions?.exercises?.length || 0} exercices
              </p>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Commencer la séance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Pas de séance prévue pour aujourd'hui.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;