import logger from '../utils/logger';
import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import { getApiBaseUrlWithApi } from '../config/api';

const CoachWeeklySchedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);

  const week = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/workout-sessions/assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.assignments || []);
      }
    } catch (error) {
      logger.error('Error fetching sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentDate]); // Fetch when week changes

  const changeWeek = (direction) => {
    const newDate = direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSessionCreated = async (sessionData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/workout-sessions/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        // Refresh sessions after creating a new one
        await fetchSessions();
        setIsCreateModalOpen(false);
      } else {
        logger.error('Failed to create session:', await response.json());
      }
    } catch (error) {
      logger.error('Error creating session:', error);
    }
  };

  const getSessionForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sessions.find(session => 
      format(new Date(session.scheduled_date || session.created_at), 'yyyy-MM-dd') === dayStr
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <div className="bg-background text-foreground">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Planning de la semaine</h2>
        
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex justify-around flex-1 overflow-x-auto">
            {week.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = format(selectedDate, 'yyyy-MM-dd') === dayStr;
              const isToday = format(new Date(), 'yyyy-MM-dd') === dayStr;
              const session = getSessionForDay(day);
              
              return (
                <div 
                  key={dayStr}
                  className={`text-center p-3 rounded-lg cursor-pointer min-w-[100px] transition-colors ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : isToday
                      ? 'bg-muted border-2 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <p className="text-xs uppercase opacity-70 mb-1">
                    {format(day, 'eee', { locale: fr })}
                  </p>
                  <p className="font-bold text-base">
                    {format(day, 'd')}
                  </p>
                  {session ? (
                    <div className="mt-2 text-sm">
                      <p className="font-medium truncate">{session.workout_sessions?.title || 'Session'}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs mt-1 ${getStatusColor(session.status)}`}>
                        {session.status === 'completed' ? 'Terminé' :
                         session.status === 'in_progress' ? 'En cours' : 'À faire'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <Plus className="h-4 w-4 mx-auto opacity-50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Sessions for selected day */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            Sessions pour {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </h3>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune session prévue.</p>
              <p className="text-sm">Cliquez sur un jour pour en créer une.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions
                .filter(session => 
                  format(new Date(session.scheduled_date || session.created_at), 'yyyy-MM-dd') === 
                  format(selectedDate, 'yyyy-MM-dd')
                )
                .map(session => (
                  <div key={session.id} className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{session.workout_sessions?.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {session.workout_sessions?.exercises?.length || 0} exercices
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                        {session.status === 'completed' ? 'Terminé' :
                         session.status === 'in_progress' ? 'En cours' : 'À faire'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <CreateWorkoutSessionModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};

export default CoachWeeklySchedule;