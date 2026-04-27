import logger from '../utils/logger';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ExerciseYoutubeEmbed from './ExerciseYoutubeEmbed';
import { parseYoutubeVideoId } from '../utils/youtube';

const ExerciseInfoCard = ({ exercise, onClose }) => {
  const { getAuthToken, refreshAuthToken } = useAuth();
  const videoRef = useRef(null);
  const [exerciseDetails, setExerciseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);

  useEffect(() => {
    const fetchExerciseDetails = async () => {
      if (!exercise) {
        setExerciseDetails(null);
        return;
      }
      const hasInstr = exercise.instructions && exercise.instructions.trim();
      const hasFileDemo = exercise.demoVideoURL && exercise.demoVideoURL.trim();
      const hasYtDemo = exercise.youtubeDemoURL && exercise.youtubeDemoURL.trim();
      if (hasInstr && (hasFileDemo || hasYtDemo)) {
        setExerciseDetails(exercise);
        return;
      }
      if (exercise.exerciseId) {
        try {
          setLoading(true);
          setIsVideoLoading(true);
          setVideoError(null);
          let token = await getAuthToken();
          if (!token) {
            try { token = await refreshAuthToken(); } 
            catch (err) { setExerciseDetails(exercise); return; }
          }
          const response = await fetch(buildApiUrl(`/exercises/public/${exercise.exerciseId}`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.exercise) {
              setExerciseDetails({
                ...exercise,
                instructions: data.exercise.instructions || exercise.instructions,
                demoVideoURL: data.exercise.demoVideoURL || exercise.demoVideoURL,
                youtubeDemoURL: data.exercise.youtubeDemoURL || exercise.youtubeDemoURL,
                title: data.exercise.title || exercise.title || exercise.name,
                name: data.exercise.title || exercise.name || exercise.title
              });
            } else {
              setExerciseDetails(exercise);
            }
          } else {
            setExerciseDetails(exercise);
          }
        } catch (error) {
          setExerciseDetails(exercise);
        } finally {
          setLoading(false);
        }
      } else {
        setExerciseDetails(exercise);
      }
    };
    if (exercise) {
      fetchExerciseDetails();
    } else {
      setExerciseDetails(null);
      setIsVideoLoading(false);
      setVideoError(null);
    }
  }, [exercise, getAuthToken, refreshAuthToken]);

  useEffect(() => {
    if (exerciseDetails?.demoVideoURL) {
      setIsVideoLoading(true);
      setVideoError(null);
      const loadingTimeout = setTimeout(() => { setIsVideoLoading(false); }, 3000);
      return () => clearTimeout(loadingTimeout);
    }
  }, [exerciseDetails?.demoVideoURL]);

  const parseInstructions = (instructions) => {
    if (!instructions) return [];
    const lines = instructions.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    return lines.map(line => line.replace(/^[•\-\*]\s+/, '').trim()).filter(line => line.length > 0);
  };
  const instructionList = parseInstructions(exerciseDetails?.instructions);

  return (
    <div className="flex-none w-full min-w-full h-full flex flex-col justify-start">
      <div className="flex items-center justify-center px-[35px] text-center pb-[15px]">
        <h2 id={`exercise-info-title-${exercise?.exerciseId || 0}`} className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">
          {exerciseDetails?.title || exerciseDetails?.name || exercise?.name || exercise?.title}
        </h2>
      </div>

      <div className="px-[25px] py-0 space-y-4 flex-1 overflow-y-auto">
        {(() => {
          const ytId = exerciseDetails?.youtubeDemoURL
            ? parseYoutubeVideoId(exerciseDetails.youtubeDemoURL)
            : null;
          if (ytId) {
            return (
              <ExerciseYoutubeEmbed
                videoId={ytId}
                title={`Démo — ${exerciseDetails?.title || exerciseDetails?.name || 'exercice'}`}
              />
            );
          }
          if (exerciseDetails?.demoVideoURL) {
            const url = exerciseDetails.demoVideoURL;
            const isImage = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(url) || (url.includes('/files/') && !url.includes('/videos/'));
            if (isImage) {
              return (
                <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10">
                  <img src={url} alt="Démonstration de l'exercice" className="w-full h-auto max-h-[200px] object-contain" />
                </div>
              );
            }
            return (
              <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center min-h-[150px]">
                <video
                  ref={videoRef}
                  src={url}
                  controls
                  playsInline
                  className="w-full h-auto max-h-[200px] object-contain"
                  onLoadedMetadata={() => { if (videoRef.current) setIsVideoLoading(false); }}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onError={(e) => {
                    const videoElement = e.target;
                    const error = videoElement?.error;
                    if (error) {
                      let errorMessage = 'Erreur lors du chargement de la vidéo';
                      switch (error.code) {
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = 'Format de vidéo non supporté ou URL invalide'; break;
                        default: errorMessage = `Erreur vidéo: ${error.message || 'Erreur inconnue'}`;
                      }
                      setVideoError(errorMessage);
                    } else {
                      setVideoError('Erreur lors du chargement de la vidéo');
                    }
                    setIsVideoLoading(false);
                  }}
                  tabIndex={-1}
                />
                {isVideoLoading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <div className="text-white text-center">
                      <Loader2
                        className="h-10 w-10 animate-smooth-spin mx-auto mb-3"
                        style={{ color: 'var(--kaiylo-primary-hex)' }}
                        aria-hidden="true"
                      />
                      <p className="text-sm">Chargement...</p>
                    </div>
                  </div>
                )}
                {videoError && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <div className="text-red-400 text-center px-4">
                      <p className="text-sm mb-3">{videoError}</p>
                      <button type="button" onClick={() => { setVideoError(null); setIsVideoLoading(true); if (videoRef.current) videoRef.current.load(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">Réessayer</button>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          if (loading) {
            return (
              <div className="bg-[#262626] rounded-lg border border-white/10 h-[125px] flex items-center justify-center text-gray-400 text-xs font-light">
                Chargement vidéo...
              </div>
            );
          }
          return null;
        })()}

        <div>
          <p className="text-gray-400 text-xs font-light leading-relaxed mb-3 text-center">Instruction</p>
          {loading ? (
            <div className="bg-[#262626] rounded-lg border border-white/10 px-3 py-3">
              <p className="text-gray-400 text-xs font-light italic text-center">Chargement...</p>
            </div>
          ) : instructionList.length > 0 ? (
            <div className="bg-[#262626] rounded-lg border border-white/10 px-3 py-3 max-h-[150px] overflow-y-auto">
              <ul className="text-[#d4845a] text-xs space-y-1 list-none">
                {instructionList.map((instruction, index) => (
                  <li key={index} className="leading-relaxed">
                    <span className="text-white font-normal">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-[#262626] rounded-lg border border-white/10 px-3 py-3">
              <p className="text-gray-400 text-xs font-light italic text-center">Aucune instruction disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExerciseInfoModal = ({
  isOpen,
  onClose,
  exercise, // legacy prop
  exercises = [] // new prop for superset array
}) => {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const exercisesArray = useMemo(() => {
    let rawArray = [];
    if (exercises && exercises.length > 0) {
      rawArray = exercises;
    } else if (exercise) {
      rawArray = [exercise];
    }
    
    // Remove duplicates based on exercise identifier
    const seen = new Set();
    return rawArray.filter(ex => {
      const identifier = ex.exerciseId || ex.id || ex.name;
      if (!identifier) return true; // Keep it if we can't identify it
      if (seen.has(identifier)) return false;
      seen.add(identifier);
      return true;
    });
  }, [exercise, exercises]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'instant' });
      }
    }
  }, [isOpen, exercisesArray.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollPosition = scrollRef.current.scrollLeft;
      const cardWidth = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollPosition / cardWidth);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  const scrollToCard = (index) => {
    if (scrollRef.current && index >= 0 && index < exercisesArray.length) {
      const cardWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || exercisesArray.length === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-info-title"
        style={{ maxHeight: '90vh' }}
      >
        <div className="pt-[20px] flex-1 min-h-0 flex flex-col relative w-full">
          {exercisesArray.length > 1 && (
            <div className="absolute top-[20px] left-0 right-0 flex justify-between px-3 z-10 pointer-events-none">
              <button 
                className={`pointer-events-auto p-1.5 rounded-full text-white transition-opacity ${currentIndex > 0 ? 'opacity-100 hover:text-white/80' : 'opacity-30'}`}
                onClick={() => scrollToCard(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                className={`pointer-events-auto p-1.5 rounded-full text-white transition-opacity ${currentIndex < exercisesArray.length - 1 ? 'opacity-100 hover:text-white/80' : 'opacity-30'}`}
                onClick={() => scrollToCard(currentIndex + 1)}
                disabled={currentIndex === exercisesArray.length - 1}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <div 
            ref={scrollRef}
            className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={handleScroll}
          >
            {exercisesArray.map((ex, idx) => (
              <ExerciseInfoCard key={ex.exerciseId || ex.id || idx} exercise={ex} onClose={onClose} />
            ))}
          </div>

          {exercisesArray.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-2 pt-2">
              {exercisesArray.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-[#d4845a]' : 'w-1.5 bg-white/20'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 px-[25px] pt-[5px] pb-[20px]">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>,
    document.body
  );
};

export default ExerciseInfoModal;
