import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Play, Volume2, Maximize, Send, List, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import SessionExercisesModal from './SessionExercisesModal';

const CoachSessionReviewModal = ({ isOpen, onClose, session, selectedDate, studentId }) => {
  const { getAuthToken, refreshAuthToken } = useAuth();
  const [sessionVideos, setSessionVideos] = useState([]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [sessionDifficulty, setSessionDifficulty] = useState('');
  const [sessionComment, setSessionComment] = useState('');
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const [coachComment, setCoachComment] = useState('');
  const textareaRef = React.useRef(null);
  const [isExercisesModalOpen, setIsExercisesModalOpen] = useState(false);
  const [exercisesPosition, setExercisesPosition] = useState({ 
    top: 0, 
    left: 800,
    width: 340 
  });
  const contentRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => { 
      document.body.style.overflow = prev; 
    };
  }, [isOpen]);

  // Fetch videos for this session and load student feedback
  useEffect(() => {
    if (isOpen && session && studentId) {
      setSessionVideos([]);
      setSelectedExerciseIndex(0);
      setSelectedVideo(null);
      setSelectedSetIndex(0);
      setFeedback('');
      setCoachComment('');
      setLoading(true);
      
      // Debug: Log session data to see what fields are available
      console.log('📝 CoachSessionReviewModal - Session data:', {
        notes: session.notes,
        comment: session.comment,
        studentComment: session.studentComment,
        student_comment: session.student_comment,
        difficulty: session.difficulty,
        exercises: session.exercises?.map(ex => ({
          name: ex.name,
          comment: ex.comment,
          studentComment: ex.studentComment,
          student_comment: ex.student_comment
        })),
        fullSession: session
      });
      
      fetchSessionVideos();
      setSessionDifficulty(session.difficulty || '');
      
      // Try multiple possible fields for student comment
      // First check global session comment
      let studentComment = session.notes || session.comment || session.studentComment || session.student_comment || '';
      
      // If no global comment, check if there are exercise-level comments and aggregate them
      if (!studentComment && session.exercises && session.exercises.length > 0) {
        const exerciseComments = session.exercises
          .map((ex, index) => {
            // Check multiple possible fields for exercise comment
            const comment = ex.comment || ex.studentComment || ex.student_comment || '';
            if (comment && comment.trim() !== '') {
              return `${ex.name || `Exercice ${index + 1}`}: ${comment.trim()}`;
            }
            return null;
          })
          .filter(comment => comment !== null);
        
        if (exerciseComments.length > 0) {
          // Aggregate exercise comments with exercise names
          studentComment = exerciseComments.join('\n\n');
        }
      }
      
      console.log('📝 Setting sessionComment to:', studentComment);
      console.log('📝 Exercise comments found:', session.exercises?.map((ex, i) => ({
        index: i,
        name: ex.name,
        comment: ex.comment,
        studentComment: ex.studentComment,
        student_comment: ex.student_comment
      })));
      setSessionComment(studentComment);
    }
  }, [isOpen, session, studentId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [coachComment]);

  // Update exercises modal position and adjust main modal size if needed
  const updateExercisesPosition = useCallback(() => {
    if (!contentRef.current) return;
    
    const modalRect = contentRef.current.getBoundingClientRect();
    const gap = 20;
    const panelWidth = 340;
    const minModalWidth = 600; // Minimum width for the main modal
    const screenPadding = 40; // Padding from screen edges

    // Calculate available screen width
    const availableWidth = window.innerWidth - screenPadding * 2;
    
    // Check if modal + panel would overflow
    const totalWidthNeeded = modalRect.width + gap + panelWidth;
    const wouldOverflow = totalWidthNeeded > availableWidth;

    // If overflow, reduce main modal width
    if (wouldOverflow) {
      const maxModalWidth = availableWidth - gap - panelWidth;
      const newModalWidth = Math.max(minModalWidth, maxModalWidth);
      
      // Apply reduced width to the modal
      if (contentRef.current) {
        contentRef.current.style.width = `${newModalWidth}px`;
        contentRef.current.style.maxWidth = `${newModalWidth}px`;
      }
      
      // Recalculate position after width change
      const newModalRect = contentRef.current.getBoundingClientRect();
      let left = newModalRect.width + gap;
      let top = 0;
      
      // Check if panel would still overflow on the right
      const panelRightEdge = newModalRect.left + left + panelWidth;
      if (panelRightEdge > window.innerWidth - screenPadding) {
        // Position to the left instead
        left = -(panelWidth + gap);
      }
      
      setExercisesPosition({ top, left, width: panelWidth });
    } else {
      // Reset modal width to original if no overflow
      if (contentRef.current) {
        contentRef.current.style.width = '';
        contentRef.current.style.maxWidth = '';
      }
      
      // Position relative to the modal container (using absolute positioning)
      // Place to the right of the modal by default
      let left = modalRect.width + gap;
      let top = 0; // Align with top of modal

      // Check if panel would overflow on the right
      const panelRightEdge = modalRect.left + left + panelWidth;
      if (panelRightEdge > window.innerWidth - screenPadding) {
        // Position to the left instead
        left = -(panelWidth + gap);
      }

      setExercisesPosition({ top, left, width: panelWidth });
    }
  }, []);

  useEffect(() => {
    if (!isExercisesModalOpen) {
      // Reset modal width when exercises modal is closed
      if (contentRef.current) {
        contentRef.current.style.width = '';
        contentRef.current.style.maxWidth = '';
      }
      return;
    }
    
    updateExercisesPosition();

    const handlers = [
      ['resize', updateExercisesPosition],
      ['scroll', updateExercisesPosition, true],
    ];

    handlers.forEach(([event, handler, useCapture]) => {
      window.addEventListener(event, handler, useCapture);
    });

    return () => {
      handlers.forEach(([event, handler, useCapture]) => {
        window.removeEventListener(event, handler, useCapture);
      });
      // Reset modal width on cleanup
      if (contentRef.current) {
        contentRef.current.style.width = '';
        contentRef.current.style.maxWidth = '';
      }
    };
  }, [isExercisesModalOpen, updateExercisesPosition]);

  const fetchSessionVideos = async () => {
    try {
      setLoading(true);
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        console.warn('No auth token available for coach videos fetch. Skipping.');
        setSessionVideos([]);
        return;
      }
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            studentId: studentId,
            assignmentId: session.assignmentId || session.id
          }
        }
      );
      
      if (response.data.success) {
        const videos = response.data.data || [];
        console.log('📹 Fetched session videos:', videos.length, videos);
        setSessionVideos(videos);
        // Auto-select first exercise and first set
        if (session.exercises && session.exercises.length > 0) {
          setSelectedExerciseIndex(0);
          setSelectedSetIndex(0);
          const firstExercise = session.exercises[0];
          const firstExerciseVideos = getVideosForExercise(firstExercise, 0);
          console.log('📹 First exercise videos:', firstExerciseVideos);
          if (firstExerciseVideos.length > 0) {
            const firstSetVideo = firstExerciseVideos.find(v => v.set_number === 1) || firstExerciseVideos[0];
            setSelectedVideo(firstSetVideo);
            setFeedback(firstSetVideo.coach_feedback || '');
            setCoachComment('');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching session videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideosForExercise = (exercise, exerciseIndex) => {
    if (!exercise) return [];
    
    console.log('🔍 getVideosForExercise called:', {
      exerciseName: exercise.name,
      exerciseIndex,
      exerciseId: exercise.exerciseId || exercise.id || exercise.exercise_id,
      totalVideos: sessionVideos.length,
      sessionVideos: sessionVideos
    });
    
    if (exerciseIndex !== undefined && exerciseIndex !== null) {
      const filtered = sessionVideos.filter(
        (video) => video.exercise_index === exerciseIndex && video.exercise_name === exercise.name
      );
      if (filtered.length > 0) {
        return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
      }
    }
    
    const exerciseId = exercise.id || exercise.exercise_id || exercise.exerciseId || null;
    if (exerciseId) {
      const hasDuplicates = session?.exercises && 
        session.exercises.filter(ex => ex.name === exercise.name).length > 1;
      
      if (hasDuplicates && exerciseIndex !== undefined && exerciseIndex !== null) {
        const filtered = sessionVideos.filter(
          (video) => video.exercise_id && video.exercise_id === exerciseId && 
          (video.exercise_index === exerciseIndex || video.exercise_index === null || video.exercise_index === undefined)
        );
        if (filtered.length > 0) {
          return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
        }
      } else {
        const filtered = sessionVideos.filter(
          (video) => video.exercise_id && video.exercise_id === exerciseId
        );
        if (filtered.length > 0) {
          return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
        }
      }
    }
    
    if (exercise.name) {
      const allVideosForName = sessionVideos.filter(
        (video) => video.exercise_name === exercise.name
      );
      
      if (exerciseIndex !== undefined && exerciseIndex !== null && session?.exercises) {
        const exercisesWithSameName = session.exercises.filter(ex => ex.name === exercise.name);
        
        if (exercisesWithSameName.length > 1) {
          const firstOccurrenceIndex = session.exercises.findIndex(ex => ex.name === exercise.name);
          
          if (exerciseIndex === firstOccurrenceIndex) {
            const filtered = allVideosForName.filter(video => 
              video.exercise_index === null || video.exercise_index === undefined
            );
            return filtered.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
          } else {
            return [];
          }
        }
      }
      
      return allVideosForName.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
    }
    
    return [];
  };

  const handleSetSelect = (setIndex, exercise, exerciseIndex) => {
    setSelectedSetIndex(setIndex);
    setSelectedExerciseIndex(exerciseIndex);
    const exerciseVideos = getVideosForExercise(exercise, exerciseIndex);
    const setVideo = exerciseVideos.find(v => v.set_number === setIndex + 1);
    if (setVideo) {
      setSelectedVideo(setVideo);
      setFeedback(setVideo.coach_feedback || '');
      setCoachComment('');
    } else {
      setSelectedVideo(null);
      setFeedback('');
      setCoachComment('');
    }
  };

  const handleSaveComment = async (videoToSave = null) => {
    // Use the provided video, or fallback to selectedVideo
    const video = videoToSave || selectedVideo;
    
    if (!video || !video.id) {
      console.warn('No video selected for saving feedback');
      return;
    }
    
    if (!coachComment.trim()) {
      console.warn('No comment to save');
      return;
    }
    
    try {
      setSavingFeedback(true);
      const token = await getAuthToken();
      
      if (!token) {
        alert('Erreur d\'authentification. Veuillez vous reconnecter.');
        return;
      }
      
      await axios.patch(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos/${video.id}/feedback`,
        {
          feedback: coachComment.trim(),
          rating: 5,
          status: 'completed'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update the video in sessionVideos to reflect the saved feedback
      const updatedVideo = { ...video, coach_feedback: coachComment.trim() };
      setSessionVideos(prev => prev.map(v => 
        v.id === video.id 
          ? updatedVideo
          : v
      ));
      
      // Update selectedVideo to reflect the saved feedback immediately
      if (selectedVideo && selectedVideo.id === video.id) {
        setSelectedVideo(updatedVideo);
      }
      
      // Clear the input after successful save
      setCoachComment('');
    } catch (error) {
      console.error('Error saving feedback:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert('Erreur lors de la sauvegarde du commentaire. Veuillez réessayer.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleSaveAndQuit = async () => {
    // Save comment first if there is one
    if (selectedVideo && coachComment.trim()) {
      await handleSaveComment();
    }
    // Then close the modal
    onClose();
  };

  if (!session) return null;

  const selectedExercise = session.exercises && session.exercises[selectedExerciseIndex] 
    ? session.exercises[selectedExerciseIndex] 
    : null;
  const exerciseVideos = selectedExercise ? getVideosForExercise(selectedExercise, selectedExerciseIndex) : [];
  const currentSetVideo = exerciseVideos.find(v => v.set_number === selectedSetIndex + 1);
  const currentSet = selectedExercise?.sets?.[selectedSetIndex];
  const currentSetRpe = currentSet?.rpe || currentSet?.rpe_rating || currentSetVideo?.rpe_rating || null;

  // Calculate session duration
  const sessionDuration = session.startTime && session.endTime
    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={contentRef}
        className="
          w-[800px] max-w-[800px]
          bg-gradient-to-r from-[rgba(19,20,22,0.75)] via-[61.058%] via-[rgba(43,44,48,0.75)] to-[rgba(89,93,101,0.38)]
          border border-[#262626]
          rounded-[15px]
          p-0
          max-h-[90vh]
          h-auto
          overflow-visible
          flex flex-col
          !top-[35%] !translate-y-[-35%]
        "
      >
        <DialogTitle className="sr-only">
          {session?.title || 'Détails de la séance'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Affiche les détails de la séance d'entraînement avec les exercices, les sets et les vidéos
        </DialogDescription>
        {/* Header Section */}
        <div className="px-[40px] pt-[20px] pb-0 relative">
          <div className="flex items-start justify-between mb-[6px]">
            <div className="flex flex-col gap-[4px] w-[323px]">
              <h2 className="text-[24px] font-normal text-[#D4845A] leading-tight">
                {session.title || 'Séance d\'entraînement'}
              </h2>
              <div className="flex items-center gap-[8px]">
                <p className="text-[14px] font-light text-white/50 leading-tight">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  {session.startTime && session.endTime && (
                    <span>
                      {' - '}
                      {format(new Date(session.startTime), 'HH:mm')}
                      {' à '}
                      {format(new Date(session.endTime), 'HH:mm')}
                      {sessionDuration && ` (${sessionDuration}min)`}
                    </span>
                  )}
                </p>
                <div className="bg-[rgba(47,160,100,0.75)] px-[5px] py-[3px] rounded-[5px] h-[21px] flex items-center justify-center">
                  <span className="text-[9px] font-normal text-white">Terminé</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExercisesModalOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => updateExercisesPosition(), 0);
                    }
                    return next;
                  });
                }}
                aria-expanded={isExercisesModalOpen}
                aria-label={isExercisesModalOpen ? "Masquer les exercices" : "Voir tous les exercices de la séance"}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4845a]/60 bg-[#d4845a] text-black transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4845a]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] shadow-[0_10px_24px_rgba(212,132,90,0.25)] hover:scale-105 active:scale-95"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-[1px] w-full mt-[6px] bg-white/20"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-[40px] py-0">
          {/* Difficulty Section */}
          <div className="mt-[12px] mb-[10px]">
            <h3 className="text-[20px] font-light text-white text-center leading-tight mb-[4px]">Difficulté</h3>
            <div className="flex gap-[6px] justify-center">
              {['Facile', 'Moyen', 'Difficile'].map((level) => {
                const isSelected = sessionDifficulty?.toLowerCase() === level.toLowerCase();
                return (
                  <button
                    key={level}
                    className={`
                      h-[30px] px-[32px] py-[8px] rounded-[10px] text-[12px] font-light leading-tight
                      border-[0.5px] border-white/20 shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)]
                      flex items-center justify-center text-center whitespace-nowrap
                      ${
                        isSelected
                          ? 'bg-[#D4845A] text-white'
                          : 'bg-[#121214] text-white/50'
                      }
                    `}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Comment Section */}
          <div className="mb-[12px]">
            <div className="bg-[#121214] border-[0.5px] border-white/20 rounded-[10px] px-[32px] py-[8px] min-h-[45px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)]">
              <p className="text-[12px] font-light text-white/75 leading-tight whitespace-pre-wrap">
                {sessionComment || 'Aucun commentaire de l\'étudiant'}
              </p>
            </div>
            <div className="h-[1px] w-full mt-[12px] bg-white/20"></div>
          </div>

          {/* Exercise Title */}
          {selectedExercise && (
            <div className="mb-[10px]">
              <h3 className="text-[16px] font-light text-white leading-tight">
                {selectedExercise.name}
                {selectedExercise.sets?.[0]?.weight && (
                  <span className="text-[#D4845A]"> @{selectedExercise.sets[0].weight}kg</span>
                )}
              </h3>
            </div>
          )}

          {/* Exercise and Sets Section */}
          <div className="flex gap-[20px] mb-[20px]">
            {/* Left: Exercise Sets */}
            <div className="w-[320px] space-y-[7px] flex-shrink-0">
              {selectedExercise && selectedExercise.sets?.map((set, setIndex) => {
                    // Try to find video by set_number (1-indexed) or set_index (0-indexed)
                    const setVideo = exerciseVideos.find(v => 
                      v.set_number === setIndex + 1 || 
                      v.set_index === setIndex ||
                      (v.set_number && v.set_number === set.serie) ||
                      (v.set_index !== undefined && v.set_index === setIndex)
                    );
                    // Try multiple sources for RPE value
                    // Check set first (RPE might be stored directly in the set after completion)
                    // The RPE could be in various fields depending on how it was saved
                    let rpeValue = set.rpe || 
                                   set.rpe_rating || 
                                   set.rpeRating || 
                                   set.RPE || // Sometimes uppercase
                                   (set.completedSets && typeof set.completedSets === 'object' && set.completedSets.rpeRating) ||
                                   null;
                    
                    // Convert to number if it's a string
                    if (rpeValue && typeof rpeValue === 'string') {
                      rpeValue = parseInt(rpeValue, 10) || null;
                    }
                    
                    // If not in set, check video
                    if (!rpeValue && setVideo) {
                      rpeValue = setVideo.rpe_rating || setVideo.rpe || null;
                      if (rpeValue && typeof rpeValue === 'string') {
                        rpeValue = parseInt(rpeValue, 10) || null;
                      }
                    }
                    
                    // If still no RPE, try to find it in any video for this set number
                    if (!rpeValue && exerciseVideos.length > 0) {
                      const anySetVideo = exerciseVideos.find(v => 
                        (v.set_number === setIndex + 1 || v.set_index === setIndex) && 
                        (v.rpe_rating || v.rpe)
                      );
                      if (anySetVideo) {
                        rpeValue = anySetVideo.rpe_rating || anySetVideo.rpe || null;
                        if (rpeValue && typeof rpeValue === 'string') {
                          rpeValue = parseInt(rpeValue, 10) || null;
                        }
                      }
                    }
                    
                    // Ensure rpeValue is a valid number (1-10) or null
                    if (rpeValue !== null && (isNaN(rpeValue) || rpeValue < 1 || rpeValue > 10)) {
                      rpeValue = null;
                    }
                    const setStatus = set.validation_status || (setVideo?.status === 'completed' ? 'completed' : null);
                    const isSelected = selectedSetIndex === setIndex;
                    const isFailed = setStatus === 'failed';
                    
                    // Debug RPE for this set - show full set object
                    if (setIndex === 0) {
                      console.log('🔍 RPE Debug for first set:', {
                        setIndex,
                        set: JSON.parse(JSON.stringify(set)), // Deep clone to see all properties
                        setKeys: Object.keys(set), // Show all keys in the set object
                        setVideo: setVideo,
                        rpeValue: rpeValue,
                        setRpe: set.rpe,
                        setRpeRating: set.rpe_rating,
                        setRpeRating2: set.rpeRating,
                        setRPE: set.RPE, // Sometimes uppercase
                        videoRpeRating: setVideo?.rpe_rating,
                        videoRpe: setVideo?.rpe,
                        exerciseVideos: exerciseVideos,
                        allVideos: sessionVideos,
                        allSets: selectedExercise?.sets?.map(s => ({ keys: Object.keys(s), rpe: s.rpe, rpe_rating: s.rpe_rating, rpeRating: s.rpeRating, RPE: s.RPE }))
                      });
                    }
                    
                    return (
                      <div
                        key={setIndex}
                        onClick={() => handleSetSelect(setIndex, selectedExercise, selectedExerciseIndex)}
                        className={`
                          h-[37.5px] px-[15px] py-[16px] ${isSelected ? 'rounded-[5px]' : 'rounded-[10px]'}
                          flex items-center justify-between
                          shadow-[0px_0px_10px_0px_rgba(0,0,0,0.5)]
                          cursor-pointer transition-colors
                          ${
                            isSelected
                              ? 'bg-[#D4845A]'
                              : 'bg-[#121214] border-[0.5px] border-white/20'
                          }
                        `}
                      >
                        <div className="flex items-center gap-[15px]">
                          <span className={`text-[12px] ${isSelected ? 'font-normal text-white/75' : 'font-light text-white/50'}`}>
                            Set {setIndex + 1}
                          </span>
                          <span className={`text-[12px] font-light ${isSelected ? 'text-white' : 'text-white'}`}>
                            {set.reps || '?'} reps
                            {set.weight && (
                              <span className={isSelected ? 'text-white/75' : 'text-[#D4845A]'}>
                                {' @'}{set.weight}kg
                              </span>
                            )}
                          </span>
                          {setVideo && setVideo.video_url && (
                            <Video className={`h-3.5 w-3.5 ${isSelected ? 'text-white/75' : 'text-[#D4845A]'}`} />
                          )}
                        </div>
                        <div className="flex items-center gap-[15px]">
                          {rpeValue && (
                            <div className="bg-[#262626] h-[15px] px-[5px] py-0 rounded-[3px] flex items-center justify-center">
                              <span className="text-[9px] font-normal text-white">RPE : {rpeValue}</span>
                            </div>
                          )}
                          {setStatus === 'completed' && (
                            <div className="bg-[rgba(148,228,164,0.25)] h-[14px] px-[8px] py-0 rounded-[2px] flex items-center justify-center">
                              <span className="text-[7px] font-medium text-[#84DC9C]">Validé</span>
                            </div>
                          )}
                          {setStatus === 'failed' && (
                            <div className="bg-[#DA3336] h-[14px] px-[8px] py-0 rounded-[2px] flex items-center justify-center">
                              <span className="text-[7px] font-medium text-white">Echec</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              
              {/* Student Comment for this Exercise - Display at bottom of sets list */}
              {selectedExercise && (
                <div className="mt-[12px] pt-[12px] border-t border-white/10">
                  <div className="text-[10px] font-light text-white/50 mb-[6px]">Commentaire de l'étudiant :</div>
                  <div className="text-[12px] font-light text-white bg-[#090A0A] rounded-[5px] px-[12px] py-[8px] border-[0.5px] border-white/10 break-words">
                    {selectedExercise.comment || selectedExercise.studentComment || selectedExercise.student_comment || 'Aucun commentaire de l\'étudiant'}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Video Player */}
            <div className="flex-1 flex flex-col min-w-[300px]">
              {currentSetVideo && currentSetVideo.video_url ? (
                <div className="bg-[#1A1A1D] border-[0.5px] border-white/10 rounded-[10px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] relative min-h-[320px] flex flex-col pt-[14px] px-[14px] pb-[14px]">
                  {/* Video Player Container */}
                  <div className="bg-black rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)] overflow-hidden mb-[12px] flex-shrink-0 relative flex flex-col">
                    {/* Video Player */}
                    <div className="h-[158px] w-full overflow-hidden">
                      <video
                        src={currentSetVideo.video_url}
                        controls
                        className="w-full h-full object-contain"
                        poster={currentSetVideo.thumbnail_url}
                      />
                    </div>
                  </div>

                  {/* RPE Label */}
                  {currentSetRpe && (
                    <div className="flex items-center justify-between mb-[8px] flex-shrink-0">
                      <span className="text-[5px] font-light text-white/75">RPE : {currentSetRpe}</span>
                      <span className="text-[5px] font-light text-white/50">
                        {selectedExercise?.name} - Série {selectedSetIndex + 1}
                      </span>
                    </div>
                  )}

                  {/* Comment Display Section - In gray container, not in black video box */}
                  <div className="flex flex-col gap-[8px] mb-[12px] flex-shrink-0">
                    <div className="text-[10px] font-light text-white/50 flex-shrink-0">Commentaire :</div>
                    <div className="text-[14px] font-light text-white overflow-y-auto pr-1 break-words bg-[#090A0A] rounded-[10px] px-[12px] py-[12px] border-[0.5px] border-white/10 flex items-center min-h-[35px]">
                      <div className="w-full">
                        {currentSetVideo.coach_feedback || currentSetVideo.comment || 'Aucun commentaire'}
                      </div>
                    </div>
                  </div>

                  {/* Coach Comment Input - Below video box */}
                  <div className="w-full min-h-[48px] bg-[#121214] border-t-[0.5px] border-white/10 rounded-[10px] px-[8px] py-[8px] flex items-center justify-between flex-shrink-0 mt-auto">
                    <textarea
                      ref={textareaRef}
                      value={coachComment}
                      onChange={(e) => {
                        setCoachComment(e.target.value);
                        setFeedback(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (coachComment.trim() && currentSetVideo) {
                            handleSaveComment(currentSetVideo);
                          }
                        }
                      }}
                      placeholder="Ajouter un commentaire ..."
                      rows={1}
                      className="flex-1 bg-transparent text-[12px] font-light text-white placeholder-white/50 outline-none resize-none overflow-y-auto"
                      style={{ minHeight: '24px', maxHeight: '100px' }}
                    />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (coachComment.trim() && currentSetVideo) {
                          handleSaveComment(currentSetVideo);
                        }
                      }}
                      className="flex items-center justify-center cursor-pointer p-0 w-[12px] h-[12px] ml-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!coachComment.trim() || savingFeedback || !currentSetVideo}
                      type="button"
                    >
                      <Send className="h-3 w-3 text-[#D4845A]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1A1A1D] border-[0.5px] border-white/10 rounded-[10px] p-[17.5px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)]">
                  <div className="bg-black h-[158px] rounded-[10px] flex items-center justify-center">
                    <p className="text-white/50 text-sm">Aucune vidéo pour cette série</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#121214] h-[66px] px-[18px] py-[13px] flex items-center justify-end gap-[10px] shadow-[0px_-7px_10px_0px_rgba(0,0,0,0.25)] mt-auto">
          <button
            onClick={onClose}
            className="bg-white/3 border-[0.5px] border-white/10 rounded-[5px] h-[35px] px-[11px] py-[5px] text-[12px] font-normal text-white/50 hover:bg-white/5 transition-colors w-[100px]"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveAndQuit}
            disabled={savingFeedback}
            className="bg-[#D4845A] rounded-[5px] h-[35px] px-[11px] py-[5px] text-[12px] font-normal text-white hover:bg-[#D4845A]/90 transition-colors disabled:opacity-50 w-[170px]"
          >
            {savingFeedback ? 'Sauvegarde...' : 'Sauvegarder & Quitter'}
          </button>
        </div>

        {/* Exercises modal rendered inside DialogContent to prevent click-outside detection */}
        {isExercisesModalOpen && (
          <SessionExercisesModal
            isOpen={isExercisesModalOpen}
            onClose={() => setIsExercisesModalOpen(false)}
            session={session}
            position={exercisesPosition}
            onExerciseSelect={(exerciseIndex) => {
              setSelectedExerciseIndex(exerciseIndex);
              setSelectedSetIndex(0);
              // Update video selection for the new exercise
              const newExercise = session.exercises[exerciseIndex];
              if (newExercise) {
                const exerciseVideos = getVideosForExercise(newExercise, exerciseIndex);
                const firstSetVideo = exerciseVideos.find(v => v.set_number === 1) || exerciseVideos[0];
                if (firstSetVideo) {
                  setSelectedVideo(firstSetVideo);
                  setFeedback(firstSetVideo.coach_feedback || '');
                  setCoachComment('');
                } else {
                  setSelectedVideo(null);
                  setFeedback('');
                  setCoachComment('');
                }
              }
            }}
            selectedExerciseIndex={selectedExerciseIndex}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoachSessionReviewModal;
