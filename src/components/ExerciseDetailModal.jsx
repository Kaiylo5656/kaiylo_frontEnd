import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';
import ExerciseHistory from './ExerciseHistory';
import { useModalManager } from './ui/modal/ModalManager';
import BaseModal from './ui/modal/BaseModal';
import { formatRelative } from '../utils/formatting';
import { getTagColor } from '../utils/tagColors';

const ExerciseDetailModal = ({ 
  isOpen, 
  onClose, 
  exerciseId,
  onAddToSession,
  tagColorMap = null
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
      className="max-w-xl"
      title=""
      footer={createFooter()}
      noPadding={true}
      borderRadius="16px"
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
              <div className="shrink-0 px-6 pt-6 pb-0 flex items-center justify-between">
                <div className="flex-1 flex items-center gap-2">
                  <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                    {exercise.title}
                  </h2>
                  {/* Instructions Icon */}
                  <div 
                    className="flex items-center"
                    title={exercise.instructions && exercise.instructions.trim() ? "Instructions renseignées" : "Aucune instruction"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 384 512"
                      className="h-5 w-5 flex-shrink-0"
                      style={{ 
                        fill: exercise.instructions && exercise.instructions.trim() 
                          ? 'rgba(212, 132, 89, 0.8)' 
                          : 'rgba(255, 255, 255, 0.2)',
                        width: '1.25rem',
                        height: '1.25rem'
                      }}
                    >
                      <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
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
                      className="h-5 w-5"
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
              {/* Created Date */}
              {exercise.created_at && (
                <div className="text-xs font-light text-white/50 px-6 pt-1 pb-3">
                  Créé {formatRelative(exercise.created_at)}
                </div>
              )}
              {/* Border line */}
              <div className="border-b border-white/10 mx-6"></div>
              
              <div className="px-6 py-6 space-y-6">
              
              {/* Instructions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[14px] font-[200] text-[rgba(255,255,255,0.5)]">Instructions</h3>
                </div>
                <div className="w-full px-4 py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)]">
                  {exercise.instructions ? (
                    <div className="text-white/80 whitespace-pre-wrap break-words">
                      {exercise.instructions}
                    </div>
                  ) : (
                    <div className="text-white/40 font-extralight text-xs">Aucune instruction fournie</div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[14px] font-[200] text-[rgba(255,255,255,0.5)]">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  {exercise.tags && exercise.tags.length > 0 ? (
                    exercise.tags.map(tag => {
                      const tagStyle = getTagColor(tag, tagColorMap);
                      return (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-xs font-light"
                          style={tagStyle}
                        >
                          {tag}
                        </span>
                      );
                    })
                  ) : (
                    <div className="text-white/25 font-extralight text-sm">Aucun tag assigné</div>
                  )}
                </div>
              </div>

              {/* Demo vidéo ou image */}
              {exercise.demoVideoURL && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="h-4 w-4 text-white/60" />
                    <h3 className="text-lg font-medium text-white">
                      {(/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(exercise.demoVideoURL) || (exercise.demoVideoURL.includes('/files/') && !exercise.demoVideoURL.includes('/videos/'))) ? 'Image démo' : 'Vidéo démo'}
                    </h3>
                  </div>
                  <div className="bg-black/50 rounded-lg overflow-hidden border border-white/10 max-h-[60vh] sm:max-h-[70vh] w-full">
                    {(/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(exercise.demoVideoURL) || (exercise.demoVideoURL.includes('/files/') && !exercise.demoVideoURL.includes('/videos/'))) ? (
                      <img
                        src={exercise.demoVideoURL}
                        alt="Démonstration de l'exercice"
                        className="w-full h-full object-contain max-h-[60vh] sm:max-h-[70vh]"
                      />
                    ) : (
                      <VideoPlayer
                        src={exercise.demoVideoURL}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Exercise History */}
              <ExerciseHistory exerciseId={exerciseId} />
              </div>
            </>
          ) : null}
    </BaseModal>
  );
};

export default ExerciseDetailModal;
