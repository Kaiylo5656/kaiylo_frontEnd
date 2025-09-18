import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, TrendingUp, FileText, AlertTriangle, User, Clock, CheckCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const StudentDetailView = ({ student, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to create weekly schedule from assignments
  const createWeeklySchedule = (assignments) => {
    const days = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
    const today = new Date();
    const currentWeek = [];
    
    // Create 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + 1 + i); // Start from Monday
      const dayNumber = date.getDate();
      
      // Find assignments for this day (for now, we'll distribute them across the week)
      const assignment = assignments[i] || null;
      
      if (assignment && assignment.workout_sessions) {
        const workout = assignment.workout_sessions;
        currentWeek.push({
          day: `${days[i]} ${dayNumber}`,
          workout: workout.title,
          status: assignment.status === 'completed' ? 'completed' : 
                  assignment.status === 'in_progress' ? 'in-progress' : 'not-started',
          duration: "19:24 → 20:48 (84 min)", // Mock duration
          exercises: workout.exercises ? 
            workout.exercises.map(ex => `${ex.sets || 3}x${ex.reps || 8} - ${ex.name || 'Exercise'}`) : 
            ["3x1-X", "1x3-X", "3x8-X", "3x6-X", "3x8-X", "3x8-X"]
        });
      } else {
        currentWeek.push({
          day: `${days[i]} ${dayNumber}`,
          workout: null,
          status: 'empty'
        });
      }
    }
    
    return currentWeek;
  };

  // Helper function to create progress data from assignments
  const createProgressData = (assignments) => {
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalAssignments = assignments.length;
    
    if (totalAssignments === 0) {
      return [
        { exercise: "Muscle-up", current: "0 kg", change: "0%", trend: "stable" },
        { exercise: "Pull-up", current: "0 kg", change: "0%", trend: "stable" },
        { exercise: "Dips", current: "0 kg", change: "0%", trend: "stable" },
        { exercise: "Squat", current: "0 kg", change: "0%", trend: "stable" }
      ];
    }

    const completionRate = Math.round((completedAssignments.length / totalAssignments) * 100);
    
    return [
      { exercise: "Muscle-up", current: "26,1 kg", change: `+${completionRate}%`, trend: "up" },
      { exercise: "Pull-up", current: "72 kg", change: `+${completionRate}%`, trend: "up" },
      { exercise: "Dips", current: "88 kg", change: `-${100-completionRate}%`, trend: "down" },
      { exercise: "Squat", current: "163 kg", change: `-${100-completionRate}%`, trend: "down" }
    ];
  };

  useEffect(() => {
    if (student) {
      fetchStudentDetails();
    }
  }, [student]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      // Fetch student's workout assignments
      const assignmentsResponse = await axios.get(`${getApiBaseUrlWithApi()}/assigned-sessions/student/${student.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      console.log('📋 Student assignments:', assignmentsResponse.data);

      // Transform the assignments data into the format expected by the UI
      const assignments = assignmentsResponse.data.assignments || [];
      
      // Create a weekly schedule from the assignments
      const weeklySchedule = createWeeklySchedule(assignments);
      
      // Create progress data from assignments
      const progressData = createProgressData(assignments);

      const studentDetails = {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        joined_at: student.joined_at,
        last_activity: student.last_activity,
        // Real data from assignments
        assignments: assignments,
        weeklySchedule: weeklySchedule,
        progressData: progressData,
        // Mock data for fields not yet implemented
        currentBlock: "Bloc 3/3 - Prépa Force",
        weeklyProgress: { 
          completed: assignments.filter(a => a.status === 'completed').length, 
          total: assignments.length 
        },
        monthlyProgress: { 
          completed: assignments.filter(a => a.status === 'completed').length, 
          total: assignments.length 
        },
        oneRepMax: {
          muscleUp: 37.5,
          pullUp: 80,
          dips: 100,
          squat: 190,
          total: 407.5,
          risScore: 95.99
        },
        profile: {
          discipline: "Street Lifting",
          age: 23,
          weight: 61,
          height: 166
        },
        notes: [
          "A besoin d'une prog pour le bloc prochain azap",
          "Part en vacance 2 semaines", 
          "A pas fait la séance du 13/09"
        ],
        limitations: []
      };

      setStudentData(studentDetails);
    } catch (error) {
      console.error('Error fetching student details:', error);
      console.log('Using mock data for development...');
      
      // Show error message to user but still display mock data
      const errorMessage = error.response?.status === 404 
        ? 'No workout assignments found for this student'
        : 'Failed to load student details';
      
      console.log(`⚠️ ${errorMessage}`);
      
      // Use mock data for development - this will be replaced with real data once the API endpoint is working
      setStudentData({
        currentBlock: "Bloc 3/3 - Prépa Force",
        weeklyProgress: { completed: 1, total: 5 },
        monthlyProgress: { completed: 6, total: 20 },
        oneRepMax: {
          muscleUp: 37.5,
          pullUp: 80,
          dips: 100,
          squat: 190,
          total: 407.5,
          risScore: 95.99
        },
        profile: {
          discipline: "Street Lifting",
          age: 23,
          weight: 61,
          height: 166
        },
        weeklySchedule: [
          {
            day: "lun. 9",
            workout: "Mu / Pu",
            status: "completed",
            duration: "13:13 -> 14:27 (74 min)",
            exercises: ["3x1 - Muscle up @15kg", "1x3 - Traction @60 kg", "3x8 - Traction @40 kg"]
          },
          {
            day: "mar. 10", 
            workout: "Dips / Squat",
            status: "in-progress",
            duration: "17:58 -> 20:07 (129 min)",
            exercises: ["3x1-X", "1x3-X", "3x8-X", "3x6-X", "3x8-X", "3x8-X"]
          },
          {
            day: "mer. 11",
            workout: null,
            status: "empty"
          },
          {
            day: "jeu. 12",
            workout: null,
            status: "empty"
          },
          {
            day: "ven. 13",
            workout: "Pu",
            status: "not-started",
            duration: "19:24 -> 20:48 (84 min)",
            exercises: ["3x1-X", "1x3-X", "3x8-X", "3x6-X", "3x8-X", "3x8-X"]
          },
          {
            day: "sam. 14",
            workout: "Dips",
            status: "not-started",
            duration: "18:43 -> 19:43 (60 min)",
            exercises: ["3x1-X", "1x3-X", "3x8-X", "3x6-X", "3x8-X", "3x8-X"]
          },
          {
            day: "dim. 15",
            workout: "Squat",
            status: "not-started",
            duration: "18:43 -> 20:18 (95 min)",
            exercises: ["3x1-X", "1x3-X", "3x8-X", "3x6-X", "3x8-X", "3x8-X"]
          }
        ],
        progressData: [
          { exercise: "Muscle-up", current: "26,1 kg", change: "+13%", trend: "up" },
          { exercise: "Pull-up", current: "72 kg", change: "+19%", trend: "up" },
          { exercise: "Dips", current: "88 kg", change: "-19%", trend: "down" },
          { exercise: "Squat", current: "163 kg", change: "-24%", trend: "down" }
        ],
        notes: [
          "A besoin d'une prog pour le bloc prochain azap",
          "Part en vacance 2 semaines", 
          "A pas fait la séance du 13/09"
        ],
        limitations: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'not-started':
        return <PauseCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in-progress':
        return 'En cours';
      case 'not-started':
        return 'Pas commencé';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-white flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-black">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{student.name}</h1>
              <p className="text-sm text-muted-foreground">Student</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-card border-b border-border px-6">
        <div className="flex space-x-8">
          {['overview', 'training', 'analyse', 'suivi'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'training' && 'Training'}
              {tab === 'analyse' && 'Analyse vidéo'}
              {tab === 'suivi' && 'Suivi Financier'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'overview' && studentData && (
          <div className="space-y-6">
            {/* Current Block & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">{studentData.currentBlock}</h3>
                  <div className="flex space-x-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center mb-2">
                        <span className="text-sm font-bold">{studentData.weeklyProgress.completed}/{studentData.weeklyProgress.total}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">This Week</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center mb-2">
                        <span className="text-sm font-bold">{studentData.monthlyProgress.completed}/{studentData.monthlyProgress.total}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">1 RM actuel</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Muscle-up:</span>
                    <span className="font-semibold">{studentData.oneRepMax.muscleUp} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Traction:</span>
                    <span className="font-semibold">{studentData.oneRepMax.pullUp} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dips:</span>
                    <span className="font-semibold">{studentData.oneRepMax.dips} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Squat:</span>
                    <span className="font-semibold">{studentData.oneRepMax.squat} kg</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold">{studentData.oneRepMax.total} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RIS Score:</span>
                      <span className="font-semibold">{studentData.oneRepMax.risScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Profile</h3>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
                  Open
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Discipline: {studentData.profile.discipline} • {studentData.profile.age} ans • {studentData.profile.weight} kg • {studentData.profile.height} cm
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
              <div className="grid grid-cols-7 gap-4">
                {studentData.weeklySchedule.map((day, index) => (
                  <div key={index} className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">{day.day}</p>
                    {day.workout ? (
                      <div className="bg-muted rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">{day.workout}</h4>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(day.status)}`}>
                          {getStatusText(day.status)}
                        </div>
                        {day.duration && (
                          <p className="text-xs text-muted-foreground mt-2">{day.duration}</p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-center">
                        <span className="text-2xl text-muted-foreground">+</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Workout Assignments */}
            {studentData.assignments && studentData.assignments.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Workout Assignments</h3>
                <div className="space-y-4">
                  {studentData.assignments.map((assignment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{assignment.workout_sessions?.title || 'Unknown Workout'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {assignment.workout_sessions?.general_objective || 'No description available'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          assignment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          assignment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {assignment.status === 'completed' ? 'Completed' :
                           assignment.status === 'in_progress' ? 'In Progress' :
                           'Not Started'}
                        </span>
                        {assignment.workout_sessions?.exercises && (
                          <span className="text-xs text-muted-foreground">
                            {assignment.workout_sessions.exercises.length} exercises
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Charts & Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Evolution des Kg/Reps</h3>
                <p className="text-sm text-muted-foreground mb-4">Last 4 weeks</p>
                <div className="space-y-4">
                  {studentData.progressData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.exercise}</p>
                        <p className="text-sm text-muted-foreground">{item.current}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                          {item.change}
                        </p>
                        <div className="w-16 h-2 bg-muted rounded-full mt-1">
                          <div className={`h-2 rounded-full ${item.trend === 'up' ? 'bg-green-500' : 'bg-red-500'} w-3/4`}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
                      Open
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {studentData.notes.map((note, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Limitations et blessures</h3>
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
                      Open
                    </button>
                  </div>
                  {studentData.limitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No limitations recorded</p>
                  ) : (
                    <ul className="space-y-2">
                      {studentData.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                          <span className="text-sm">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Training View</h3>
            <p className="text-muted-foreground">Training management features coming soon</p>
          </div>
        )}

        {activeTab === 'analyse' && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Video Analysis</h3>
            <p className="text-muted-foreground">Video analysis features coming soon</p>
          </div>
        )}

        {activeTab === 'suivi' && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Financial Tracking</h3>
            <p className="text-muted-foreground">Financial tracking features coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailView;
