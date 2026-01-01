import React, { useState, useEffect } from 'react';
import { Calendar, Play, Tag, FileText } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';
import HumanDetails from './HumanDetails';
import ExerciseHistory from './ExerciseHistory';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';
import { formatRelative } from '../utils/formatting';

const ExerciseDetailModal = ({ 
  isOpen, 
  onClose, 
  exerciseId,
  onAddToSession
}) => {
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleted, setIsDeleted] = useState(false);
  
  // Use modal manager for proper event handling
  const { isTopMost } = useModalManager();
  const modalId = 'exercise-detail-modal';

  // Fetch exercise details when modal opens
  useEffect(() => {
    if (isOpen && exerciseId) {
      fetchExerciseDetails();
    }
  }, [isOpen, exerciseId]);



  const fetchExerciseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsDeleted(false);
      
      console.log('🔍 Fetching exercise details for ID:', exerciseId);
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token exists:', !!token);
      
      const url = buildApiUrl(`/exercises/${exerciseId}`);
      console.log('🌐 API URL:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📡 Response received:', response.data);
      
      if (response.data.success) {
        setExercise(response.data.exercise);
        console.log('✅ Exercise loaded successfully:', response.data.exercise);
        console.log('🔍 Available fields:', Object.keys(response.data.exercise));
        console.log('🔍 Created at:', response.data.exercise.created_at);
        console.log('🔍 Updated at:', response.data.exercise.updated_at);
      } else {
        throw new Error('Failed to fetch exercise details');
      }
    } catch (err) {
      console.error('❌ Error fetching exercise details:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      if (err.response?.status === 404) {
        setIsDeleted(true);
      } else {
        setError('Failed to load exercise details');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get modal title (simple title for BaseModal)
  const getModalTitle = () => {
    if (loading) return 'Chargement...';
    if (exercise) return exercise.title;
    return 'Détails de l\'exercice';
  };

  // Create footer with action button
  const createFooter = () => {
    if (!onAddToSession || !exercise) return null;
    
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => {
            onAddToSession(exercise);
            onClose();
          }}
          className="px-4 py-2 bg-[#e87c3e] text-white rounded-lg hover:bg-[#d66d35] transition-colors text-sm font-medium"
          title="Add to session"
        >
          Ajouter à la séance
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId={modalId}
      zIndex={90}
      closeOnEsc={isTopMost}
      closeOnBackdrop={isTopMost}
      size="lg"
      className="max-w-3xl"
      title=""
      footer={createFooter()}
      noPadding={true}
    >
          {loading ? (
            <div className="px-6 py-6 space-y-4">
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center">
              <div className="text-red-400 mb-2">Error loading exercise</div>
              <div className="text-white/60 text-sm">{error}</div>
            </div>
          ) : isDeleted ? (
            <div className="px-6 py-8 text-center">
              <div className="text-red-400 mb-2">Exercise not found</div>
              <div className="text-white/60 text-sm">This exercise may have been deleted.</div>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          ) : exercise ? (
            <>
              {/* Custom Header matching BaseModal style */}
              <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
                <div className="flex-1 flex items-center gap-2">
                  <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                      <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z"/>
                    </svg>
                    {exercise.title}
                  </h2>
                  {/* Instructions Icon */}
                  <div 
                    className="flex items-center"
                    title={exercise.instructions && exercise.instructions.trim() ? "Instructions renseignées" : "Aucune instruction"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 640 640" 
                      className="h-4 w-4"
                      style={{ 
                        fill: exercise.instructions && exercise.instructions.trim() 
                          ? 'rgba(212, 132, 89, 0.8)' 
                          : 'rgba(255, 255, 255, 0.2)' 
                      }}
                    >
                      <path d="M192 112L304 112L304 200C304 239.8 336.2 272 376 272L464 272L464 512C464 520.8 456.8 528 448 528L192 528C183.2 528 176 520.8 176 512L176 128C176 119.2 183.2 112 192 112zM352 131.9L444.1 224L376 224C362.7 224 352 213.3 352 200L352 131.9zM192 64C156.7 64 128 92.7 128 128L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 250.5C512 233.5 505.3 217.2 493.3 205.2L370.7 82.7C358.7 70.7 342.5 64 325.5 64L192 64zM248 320C234.7 320 224 330.7 224 344C224 357.3 234.7 368 248 368L392 368C405.3 368 416 357.3 416 344C416 330.7 405.3 320 392 320L248 320zM248 416C234.7 416 224 426.7 224 440C224 453.3 234.7 464 248 464L392 464C405.3 464 416 453.3 416 440C416 426.7 405.3 416 392 416L248 416z"/>
                    </svg>
                  </div>
                  {/* Video Icon */}
                  <div 
                    className="flex items-center"
                    title={exercise.demoVideoURL ? "Vidéo renseignée" : "Aucune vidéo"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 640 640" 
                      className="h-4 w-4"
                      style={{ 
                        fill: exercise.demoVideoURL 
                          ? 'rgba(212, 132, 89, 0.8)' 
                          : 'rgba(255, 255, 255, 0.2)' 
                      }}
                    >
                      <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L384 512C419.3 512 448 483.3 448 448L448 192C448 156.7 419.3 128 384 128L128 128zM496 400L569.5 458.8C573.7 462.2 578.9 464 584.3 464C597.4 464 608 453.4 608 440.3L608 199.7C608 186.6 597.4 176 584.3 176C578.9 176 573.7 177.8 569.5 181.2L496 240L496 400z"/>
                    </svg>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                    <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                  </svg>
                </button>
              </div>
              {/* Border line */}
              <div className="border-b border-white/10 mx-6"></div>
              {/* Created Date */}
              {exercise.created_at && (
                <div className="text-sm text-white/60 px-6 pt-2 pb-4">
                  Créé {formatRelative(exercise.created_at)}
                </div>
              )}
              
              <div className="px-6 py-6 space-y-6">
              
              {/* Instructions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-white/60" />
                  <h3 className="text-lg font-medium text-white">Instructions</h3>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  {exercise.instructions ? (
                    <div className="text-white/80 whitespace-pre-wrap break-words">
                      {exercise.instructions}
                    </div>
                  ) : (
                    <div className="text-white/40 italic">No instructions provided</div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-white/60" />
                  <h3 className="text-lg font-medium text-white">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.tags && exercise.tags.length > 0 ? (
                    exercise.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-white/10 text-white text-sm rounded-full border border-white/20"
                      >
                        {tag.toLowerCase()}
                      </span>
                    ))
                  ) : (
                    <div className="text-white/40 italic">No tags assigned</div>
                  )}
                </div>
              </div>

              {/* Demo Video */}
              {exercise.demoVideoURL && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="h-4 w-4 text-white/60" />
                    <h3 className="text-lg font-medium text-white">Demo Video</h3>
                  </div>
                  <div className="bg-black/50 rounded-lg overflow-hidden border border-white/10 max-h-[60vh] sm:max-h-[70vh] w-full">
                    <VideoPlayer
                      src={exercise.demoVideoURL}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Human Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-white/60" />
                  <h3 className="text-lg font-medium text-white">Details</h3>
                </div>
                <HumanDetails exercise={exercise} />
              </div>

              {/* Exercise History */}
              <ExerciseHistory exerciseId={exerciseId} />
              </div>
            </>
          ) : null}
    </BaseModal>
  );
};

export default ExerciseDetailModal;
