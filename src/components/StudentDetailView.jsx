import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, FileText, AlertTriangle, User, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import { format, addDays, startOfWeek, subDays, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const StudentDetailView = ({ student, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workoutSessions, setWorkoutSessions] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(false);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  const changeWeek = (direction) => {
    const newDate = direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7);
    setCurrentDate(newDate);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setIsCreateModalOpen(true);
  };

  const handleSessionCreated = async (sessionData) => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Use the createAndAssignSession endpoint
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
      console.error('Error creating workout session and assignment:', error);
      alert('Failed to create workout session. Please try again.');
    }
  };

  const fetchWorkoutSessions = async () => {
    try {
      setLoadingSessions(true);
      const token = localStorage.getItem('authToken');
      
      // Get start and end of current week
      const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
      
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/assignments/student/${student.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Fetched assignments:', response.data);
      console.log('Current week:', { weekStart, weekEnd });

      // Convert array to object with date as key
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

          // Only include assignments for the current week
          if (dateKey >= weekStart && dateKey <= weekEnd) {
            sessionsMap[dateKey] = {
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
          }
        }
      });
      
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
  }, [currentDate]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!studentData) {
    return <div className="p-6">Student data not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-[#1a1a1a]">
        <div className="w-12 h-12 rounded-full bg-[#1a1a1a] overflow-hidden">
          <img src={studentData.avatar || "default-avatar.png"} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-semibold">Théo Chomarat</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-8 px-6 border-b border-[#1a1a1a]">
        <button className="py-4 text-[#e87c3e] border-b-2 border-[#e87c3e]">Overview</button>
        <button className="py-4 text-gray-400">Training</button>
        <button className="py-4 text-gray-400">Analyse vidéo</button>
        <button className="py-4 text-gray-400">Suivi Financier</button>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-[250px,1fr,250px] gap-4 mb-4">
            {/* Current Block Card */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#262626] rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Bloc 3/3 - Prépa Force</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#2a2a2a"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#e87c3e"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray="226"
                      strokeDashoffset="181"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400">This Week</span>
                    <span className="text-lg font-semibold">1/5</span>
                  </div>
                </div>
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#2a2a2a"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#e87c3e"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray="226"
                      strokeDashoffset="151"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400">This Month</span>
                    <span className="text-lg font-semibold">6/20</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1RM Stats Card */}
            <div className="bg-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">1 RM actuel</h3>
                <button className="px-3 py-1 text-sm bg-[#262626] rounded-lg">Open</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#e87c3e]"></div>
                    <span className="text-sm text-gray-400">Muscle-up</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">37,5 kg</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
                    <span className="text-sm text-gray-400">Pull-up</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">80 kg</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                    <span className="text-sm text-gray-400">Dips</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">100 kg</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#a855f7]"></div>
                    <span className="text-sm text-gray-400">Squat</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">190 kg</p>
                </div>
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-[#262626]">
                <div>
                  <span className="text-sm text-gray-400">Total</span>
                  <p className="text-lg font-semibold">407,5 kg</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-400">RIS Score</span>
                  <p className="text-lg font-semibold">95,99</p>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Profile</h3>
                <button className="px-3 py-1 text-sm bg-[#262626] rounded-lg">Open</button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Théo Chomarat</span>
                  <span className="text-xs text-[#e87c3e]">♂</span>
                </div>
                <div className="text-sm text-gray-400">Discipline : Street Lifting</div>
                <div className="text-sm text-gray-400">23 ans</div>
                <div className="text-sm text-gray-400">61 kg</div>
                <div className="text-sm text-gray-400">1m56</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Schedule */}
        <div className="px-4">
          <div className="grid grid-cols-7 gap-3">
            {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day, i) => (
              <div 
                key={day} 
                className="bg-[#1a1a1a] rounded-xl p-4 cursor-pointer hover:bg-[#262626] transition-colors relative group"
                onClick={() => handleDayClick(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i))}
              >
                <div className="text-sm text-gray-400 mb-2 flex justify-between items-center">
                  <span>{day} {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i), 'dd')}</span>
                  <Plus className="h-4 w-4 text-[#e87c3e] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {(() => {
                      const dateKey = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i), 'yyyy-MM-dd');
                      const session = workoutSessions[dateKey];
                      
                      if (session) {
                        return (
                          <div 
                            className="bg-[#262626] rounded-lg p-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
                              setIsCreateModalOpen(true);
                            }}
                          >
                            <div className="text-sm font-semibold mb-2 flex justify-between items-center">
                              <span>{session.title}</span>
                              <div className="flex items-center gap-2">
                                {session.status === 'in_progress' && (
                                  <PlayCircle className="h-4 w-4 text-[#e87c3e]" />
                                )}
                                {session.status === 'completed' && (
                                  <CheckCircle className="h-4 w-4 text-[#22c55e]" />
                                )}
                              </div>
                            </div>
                            {session.exercises.map((exercise, index) => (
                              <div key={index} className="text-xs text-gray-400">
                                {exercise.sets}×{exercise.reps} - {exercise.name} {exercise.weight ? `@${exercise.weight}kg` : ''}
                              </div>
                            ))}
                            <div className={`mt-2 text-xs ${
                              session.status === 'completed' 
                                ? 'text-[#22c55e]' 
                                : session.status === 'in_progress'
                                ? 'text-[#e87c3e]'
                                : 'text-gray-400'
                            }`}>
                              {session.status === 'completed' 
                                ? 'Terminé'
                                : session.status === 'in_progress'
                                ? 'En cours'
                                : 'Pas commencé'
                              }
                            </div>
                            {session.startTime && (
                              <div className="mt-1 text-xs text-gray-400">
                                {format(parseISO(session.startTime), 'HH:mm')} → {format(parseISO(session.endTime), 'HH:mm')} ({Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60)} minutes)
                              </div>
                            )}
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
        </div>

      {/* Schedule Tab - Weekly Calendar for Creating Sessions */}
      {activeTab === 'schedule' && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Planning Hebdomadaire</h2>
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => changeWeek('prev')} className="p-2 rounded-full hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex justify-around flex-1">
              {weekDays.map(day => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`text-center p-2 rounded-lg cursor-pointer ${
                    format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="text-sm font-medium">{format(day, 'EEE', { locale: fr })}</div>
                  <div className="text-lg font-bold">{format(day, 'dd')}</div>
                  <Plus className="h-4 w-4 mx-auto mt-1 text-muted-foreground" />
                </div>
              ))}
            </div>
            <button onClick={() => changeWeek('next')} className="p-2 rounded-full hover:bg-muted">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Sessions pour {format(selectedDate, 'PPP', { locale: fr })}</h3>
            <div className="text-muted-foreground">Aucune session prévue. Cliquez sur un jour pour en créer une.</div>
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Évolution des Kg/Reps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studentData.progressData?.map((item, index) => (
              <div key={index} className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-2">{item.exercise}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Actuel</p>
                    <p className="text-2xl font-bold">{item.current}</p>
                  </div>
                  <div className={`text-right ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    <p className="text-sm">Évolution</p>
                    <p className="text-xl font-bold">{item.change}</p>
                    {item.trend === 'up' ? '↗' : '↘'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Notes</h2>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              <Plus className="h-4 w-4 inline-block mr-2" />
              Ajouter une note
            </button>
          </div>
          <div className="space-y-3">
            {studentData.notes?.map((note, index) => (
              <div key={index} className="bg-card p-4 rounded-lg border border-border">
                <p className="text-sm">{note}</p>
              </div>
            ))}
            {(!studentData.notes || studentData.notes.length === 0) && (
              <p className="text-muted-foreground">Aucune note</p>
            )}
          </div>
        </div>
      )}

      {/* Limitations Tab */}
      {activeTab === 'limitations' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Limitations et blessures</h2>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              <Plus className="h-4 w-4 inline-block mr-2" />
              Ajouter une limitation
            </button>
          </div>
          <div className="space-y-3">
            {studentData.limitations?.map((limitation, index) => (
              <div key={index} className="bg-card p-4 rounded-lg border border-border flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-1" />
                <p className="text-sm">{limitation}</p>
              </div>
            ))}
            {(!studentData.limitations || studentData.limitations.length === 0) && (
              <p className="text-muted-foreground">Aucune limitation signalée</p>
            )}
          </div>
        </div>
      )}

      <CreateWorkoutSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
        onSessionCreated={handleSessionCreated}
        studentId={student.id}
        existingSession={workoutSessions[format(selectedDate, 'yyyy-MM-dd')]}
      />
      </div>
    </div>
  );
};

export default StudentDetailView;