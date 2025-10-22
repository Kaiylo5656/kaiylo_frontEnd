import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, PlayCircle, CheckCircle, Clock, Video, MessageSquare, Save, Folder, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const CoachSessionReviewModal = ({ isOpen, onClose, session, selectedDate, studentId }) => {
  const [sessionVideos, setSessionVideos] = useState([]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [sessionDifficulty, setSessionDifficulty] = useState('');
  const [sessionComment, setSessionComment] = useState('');

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
      // Reset state each time the modal opens for a new session
      setSessionVideos([]);
      setSelectedExerciseIndex(null);
      setSelectedVideo(null);
      setFeedback('');
      setLoading(true);
      
      fetchSessionVideos();
      // Load student's session feedback
      setSessionDifficulty(session.difficulty || '');
      setSessionComment(session.notes || session.comment || '');
    }
  }, [isOpen, session, studentId]);

  const fetchSessionVideos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
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
        setSessionVideos(response.data.data);
        console.log('📹 Session videos loaded:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching session videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      default:
        return 'Pas commencé';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'in_progress':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-600 text-gray-200';
    }
  };

  const getVideosForExercise = (exerciseName) => {
    return sessionVideos
      .filter(video => video.exercise_name === exerciseName)
      .sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setFeedback(video.coach_feedback || '');
  };

  const handleSaveFeedback = async () => {
    if (!selectedVideo) return;

    try {
      setSavingFeedback(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.patch(
        `${getApiBaseUrlWithApi()}/workout-sessions/videos/${selectedVideo.id}/feedback`,
        {
          feedback: feedback,
          rating: 5, // Default rating, can be enhanced later
          status: 'completed' // Mark video as completed when feedback is provided
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update local state
        setSessionVideos(prev => prev.map(video => 
          video.id === selectedVideo.id 
            ? { ...video, coach_feedback: feedback, status: 'completed' }
            : video
        ));
        
        setSelectedVideo(prev => ({ ...prev, coach_feedback: feedback, status: 'completed' }));
        console.log('✅ Feedback saved successfully');

        // Clear the input field after sending
        setFeedback('');
        
        // No longer closing the modal, allowing for review of other videos.
        // onClose(); 
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleExerciseSelect = (exercise, index) => {
    setSelectedExerciseIndex(index);
    const exerciseVideos = getVideosForExercise(exercise.name);
    if (exerciseVideos.length > 0) {
      setSelectedVideo(exerciseVideos[0]);
      setFeedback(exerciseVideos[0].coach_feedback || '');
    } else {
      setSelectedVideo(null);
      setFeedback('');
    }
  };

  if (!session) return null;

  const selectedExercise = selectedExerciseIndex !== null && session.exercises ? session.exercises[selectedExerciseIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        role="dialog"
        aria-modal="true"
        className="
          w-full max-w-5xl
          bg-[#1A1A1A] text-[#F5F5F7]
          rounded-2xl shadow-2xl
          border border-white/10
          max-h-[85vh] sm:max-h-[88vh]
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header (non-scrollable) */}
        <header className="shrink-0 px-6 pt-5 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-medium text-white">
            {session.title || 'Séance d\'entraînement'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            {session.startTime && session.endTime && (
              <span className="ml-2">
                - {format(new Date(session.startTime), 'HH:mm')} à {format(new Date(session.endTime), 'HH:mm')} 
                ({Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)} min)
              </span>
            )}
          </DialogDescription>
        </header>

        {/* Body (scrollable) */}
        <div
          className="
            flex-1 min-h-0
            overflow-y-auto
            overscroll-contain
            px-6 py-5
            scrollbar-gutter:stable
          "
        >
          <div className="flex gap-6 h-full">
            {/* Left Panel - Session Overview */}
            <div className="flex-1 bg-[#1a1a1a] rounded-lg p-6 min-w-0">
            {/* Session Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {getStatusIcon(session.status)}
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                  {getStatusText(session.status)}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Séance créée le {format(new Date(session.created_at || Date.now()), 'dd/MM/yyyy à HH:mm')}
              </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{session.exercises?.length || 0}</div>
                <div className="text-sm text-gray-400">Exercices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {session.exercises?.reduce((total, exercise) => total + (exercise.sets?.length || 0), 0) || 0}
                </div>
                <div className="text-sm text-gray-400">Séries totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">~45 min</div>
                <div className="text-sm text-gray-400">Durée estimée</div>
              </div>
            </div>

            {/* Session Difficulty and Comment */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Difficulté (évaluée par l'étudiant)</label>
                <div className="flex gap-2">
                  {['Facile', 'Moyen', 'Difficile'].map((level) => (
                    <div
                      key={level}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        sessionDifficulty?.toLowerCase() === level.toLowerCase()
                          ? 'bg-[#e87c3e] text-white'
                          : 'bg-[#262626] text-gray-400'
                      }`}
                    >
                      {level}
                    </div>
                  ))}
                </div>
                {!sessionDifficulty && (
                  <p className="text-xs text-gray-500 mt-1">Aucune évaluation de difficulté</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Commentaire global (de l'étudiant)</label>
                <div className="w-full bg-[#262626] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm min-h-[80px]">
                  {sessionComment ? (
                    <p className="text-gray-300">{sessionComment}</p>
                  ) : (
                    <p className="text-gray-500 italic">Aucun commentaire de l'étudiant</p>
                  )}
                </div>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-3">
              <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-[#1a1a1a]/80 backdrop-blur border-b border-white/5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Séance complète
                </h3>
              </div>
              <div className="min-w-0">
                {session.exercises?.map((exercise, exerciseIndex) => {
                console.log(`Exercise ${exerciseIndex + 1} (${exercise.name}) data:`, {
                  exercise,
                  sets: exercise.sets,
                  hasValidation: exercise.sets?.some(s => s.validation_status || s.status)
                });
                
                const exerciseVideos = getVideosForExercise(exercise.name);
                const hasVideos = exerciseVideos.length > 0;
                
                return (
                  <div
                    key={exerciseIndex}
                    onClick={() => handleExerciseSelect(exercise, exerciseIndex)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedExerciseIndex === exerciseIndex
                        ? 'bg-[#e87c3e] text-white'
                        : 'bg-[#262626] text-gray-300 hover:bg-[#333333]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{exercise.name}</span>
                        <span className="text-sm opacity-75">
                          {exercise.sets?.length || 0}×{exercise.sets?.[0]?.reps || '?'} reps @{exercise.sets?.[0]?.weight || '?'}kg
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasVideos && (
                          <div className="flex items-center gap-1 text-sm">
                            <Video className="h-4 w-4" />
                            <span>{exerciseVideos.length}</span>
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Right Panel - Video Review */}
          <div className="w-96 bg-[#1a1a1a] rounded-lg p-6 flex-shrink-0">
            {selectedExercise ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">{selectedExercise.name}</h3>
                  <div className="text-sm text-gray-400">
                    {selectedExercise.sets?.length || 0} séries • {selectedExercise.sets?.[0]?.reps || '?'} reps @{selectedExercise.sets?.[0]?.weight || '?'}kg
                  </div>
                </div>

                {/* Exercise Sets Status */}
                <div className="space-y-2">
                  {selectedExercise.sets?.map((set, setIndex) => {
                    const setVideos = getVideosForExercise(selectedExercise.name).filter(v => v.set_number === setIndex + 1);
                    const hasVideo = setVideos.length > 0;
                    
                    // Get the validation status from the exercise data
                    const setStatus = set.validation_status;
                    
                    // Debug log to see set data
                    console.log(`Set ${setIndex + 1} data:`, {
                      set,
                      validation_status: set.validation_status,
                      hasVideo,
                      setVideos
                    });
                    
                    return (
                      <div 
                        key={setIndex} 
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors border-2 ${
                          hasVideo 
                            ? selectedVideo && selectedVideo.set_number === (setIndex + 1)
                              ? 'bg-[#e87c3e] text-white border-[#e87c3e] cursor-pointer'
                              : 'bg-[#262626] hover:bg-[#333333] cursor-pointer border-transparent'
                            : 'bg-[#1a1a1a] border-transparent'
                        }`}
                        onClick={() => {
                          if (hasVideo) {
                            const setVideo = setVideos[0];
                            setSelectedVideo(setVideo);
                            setFeedback(setVideo.coach_feedback || '');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="min-w-[50px]">
                            <span className="text-sm font-medium text-white">Set {setIndex + 1}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-300">{set.reps} reps @{set.weight}kg</span>
                            {hasVideo && (
                              <div className="flex items-center gap-1 text-[#e87c3e]">
                                <Video className="h-4 w-4" />
                              </div>
                            )}
                            {hasVideo && setVideos[0].student_comment && (
                              <MessageSquare className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {hasVideo && setVideos[0].rpe_rating && (
                            <div className="text-xs text-gray-300 bg-[#333] px-1.5 py-0.5 rounded">
                              RPE: {setVideos[0].rpe_rating}
                            </div>
                          )}
                          {setStatus === 'completed' && (
                            <span className="px-3 py-1 bg-green-600 text-white text-xs rounded">Validé</span>
                          )}
                          {setStatus === 'failed' && (
                            <span className="px-3 py-1 bg-red-600 text-white text-xs rounded">Echec</span>
                          )}
                          {setStatus === 'skipped' && (
                            <span className="px-3 py-1 bg-yellow-600 text-white text-xs rounded">Skip</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Video Player and Feedback Section */}
                {selectedVideo ? (
                  <div className="space-y-4 mt-4">
                    {/* Video Player */}
                    <div className="bg-black rounded-lg overflow-hidden">
                      <video
                        src={selectedVideo.video_url}
                        controls
                        className="w-full h-64 object-contain"
                        poster={selectedVideo.thumbnail_url}
                        preload="metadata"
                      />
                    </div>

                    {/* Student Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Commentaire de l'étudiant :</label>
                      <div className="bg-[#262626] p-3 rounded-lg min-h-[40px]">
                        <p className="text-sm text-gray-400 italic">
                          {selectedVideo.student_comment || "Aucun commentaire de l'étudiant"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Existing Coach Feedback */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Feedback du coach :</label>
                      <div className="bg-[#262626] p-3 rounded-lg min-h-[40px]">
                        <p className="text-sm text-gray-300">
                          {sessionVideos.find(v => v.id === selectedVideo.id)?.coach_feedback || "Aucun feedback du coach pour le moment"}
                        </p>
                      </div>
                    </div>

                    {/* New Feedback Textarea */}
                    <div>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Écrire un feedback pour l'étudiant..."
                        className="w-full bg-[#262626] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveFeedback}
                        disabled={savingFeedback}
                        className="flex-1 bg-[#e87c3e] hover:bg-[#d66d35] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingFeedback ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Envoyer le feedback
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune vidéo pour cet exercice</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sélectionnez un exercice pour voir les détails</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer (non-scrollable) */}
        <footer className="shrink-0 px-6 py-4 border-t border-white/10">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
};

export default CoachSessionReviewModal;
