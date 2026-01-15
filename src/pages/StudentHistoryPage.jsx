import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

const StudentHistoryPage = () => {
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="px-[47px] pt-[40px] pb-2 relative z-10">
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
    </div>
  );
};

export default StudentHistoryPage;

