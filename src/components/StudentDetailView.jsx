import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, FileText, AlertTriangle, User, Clock, CheckCircle, PlayCircle, PauseCircle, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import CreateWorkoutSessionModal from './CreateWorkoutSessionModal';
import { format, addDays, startOfWeek, subDays, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const StudentDetailView = ({ student, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overviewWeekDate, setOverviewWeekDate] = useState(new Date()); // For overview weekly calendar
  const [trainingMonthDate, setTrainingMonthDate] = useState(new Date()); // For training monthly calendar
  const [workoutSessions, setWorkoutSessions] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(false);

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
      
      // Determine date range based on active tab
      let rangeStart, rangeEnd;
      
      if (activeTab === 'training') {
        // For training tab, get the entire month (4 weeks from start of month)
        const monthStart = startOfMonth(trainingMonthDate);
        rangeStart = format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        rangeEnd = format(addDays(startOfWeek(monthStart, { weekStartsOn: 1 }), 27), 'yyyy-MM-dd');
      } else {
        // For overview tab, get only the current week
        rangeStart = format(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        rangeEnd = format(addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
      }
      
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/assignments/student/${student.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Fetched assignments:', response.data);
      console.log('Date range:', { rangeStart, rangeEnd });

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

          // Include assignments for the current range
          if (dateKey >= rangeStart && dateKey <= rangeEnd) {
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
  }, [overviewWeekDate, trainingMonthDate, activeTab]);

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
                          strokeDashoffset="130"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">1/5</span>
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
                          strokeDashoffset="98"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">6/20</span>
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
                 className="bg-[#1a1a1a] rounded-xl p-2 cursor-pointer hover:bg-[#262626] transition-colors relative group h-[200px]"
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
                       const session = workoutSessions[dateKey];
                       
                       if (session) {
                         return (
                           <div 
                             className="bg-[#262626] rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors overflow-y-auto"
                             style={{ height: '150px' }}
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedDate(addDays(startOfWeek(overviewWeekDate, { weekStartsOn: 1 }), i));
                               setIsCreateModalOpen(true);
                             }}
                           >
                             <div className="p-2">
                               <div className="text-[11px] font-medium flex justify-between items-center mb-2">
                                 <span className="truncate pr-1">{session.title || 'Séance'}</span>
                                 <div className="flex items-center gap-0.5 flex-shrink-0">
                                   {session.status === 'in_progress' && (
                                     <PlayCircle className="h-3 w-3 text-[#e87c3e]" />
                                   )}
                                   {session.status === 'completed' && (
                                     <CheckCircle className="h-3 w-3 text-[#22c55e]" />
                                   )}
                                 </div>
                               </div>
                               <div className="space-y-0.5">
                                 {session.exercises.map((exercise, index) => (
                                   <div key={index} className="text-[10px] text-gray-400 truncate">
                                     {exercise.sets}×{exercise.reps} {exercise.name} {exercise.weight ? `@${exercise.weight}kg` : ''}
                                   </div>
                                 ))}
                               </div>
                               <div className="mt-2 pt-2 border-t border-[#3a3a3a]">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                    session.status === 'completed' 
                                      ? 'bg-[#22c55e] text-white' 
                                      : session.status === 'in_progress'
                                      ? 'bg-[#e87c3e] text-white'
                                      : 'bg-gray-600 text-gray-200'
                                  }`}>
                                    {session.status === 'completed' 
                                      ? 'Terminé'
                                      : session.status === 'in_progress'
                                      ? 'En cours'
                                      : 'Pas commencé'
                                    }
                                  </span>
                                  {session.startTime && (
                                    <span className="text-gray-400 flex-shrink-0">
                                      {format(parseISO(session.startTime), 'HH:mm')}
                                    </span>
                                  )}
                                </div>
                              </div>
                             </div>
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
              <button className="px-4 py-2 bg-[#e87c3e] text-white rounded-lg text-sm">Assigné</button>
              <button className="px-4 py-2 bg-[#1a1a1a] text-gray-400 rounded-lg text-sm">Brouillon</button>
              <button className="px-3 py-2 bg-[#1a1a1a] rounded-lg text-sm">2 semaines</button>
              <button className="px-3 py-2 bg-[#1a1a1a] rounded-lg text-sm">4 semaines</button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((day) => (
              <div key={day} className="text-center text-xs text-gray-400 py-2">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {(() => {
              const monthStart = startOfMonth(trainingMonthDate);
              const monthEnd = endOfMonth(trainingMonthDate);
              const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
              const endDate = addDays(startDate, 27); // Show 4 weeks
              const days = eachDayOfInterval({ start: startDate, end: endDate });
              
              return days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const session = workoutSessions[dateKey];
                const isCurrentMonth = isSameMonth(day, trainingMonthDate);
                
                return (
                  <div
                    key={dateKey}
                    className={`rounded-lg p-2 min-h-[120px] cursor-pointer hover:bg-[#262626] transition-colors ${
                      isCurrentMonth ? 'bg-[#1a1a1a]' : 'bg-[#0a0a0a]'
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className={`text-sm mb-2 ${isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                      {format(day, 'd')}
                    </div>
                    {session && (
                      <div className="bg-[#262626] rounded p-2 border-l-2 border-[#e87c3e]">
                        <div className="text-[10px] font-medium truncate mb-1">{session.title || 'Séance'}</div>
                        <div className="text-[9px] text-gray-400">
                          + {session.exercises.length} exercises en plus
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <button className="w-full mt-4 py-3 bg-[#1a1a1a] rounded-lg text-sm text-gray-400 hover:bg-[#262626] transition-colors">
            Copier la semaine
          </button>
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