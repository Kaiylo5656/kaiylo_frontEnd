import logger from '../utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Modal pour afficher les informations d'un exercice (instructions et vidéo)
 * Design basé sur Figma node-id=2-13235
 */
const ExerciseInfoModal = ({ 
  isOpen, 
  onClose, 
  exercise 
}) => {
  const { getAuthToken, refreshAuthToken } = useAuth();
  const videoRef = useRef(null);
  const [exerciseDetails, setExerciseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Récupérer les détails publics de l'exercice (instructions et vidéo)
  useEffect(() => {
    const fetchExerciseDetails = async () => {
      if (!exercise) {
        setExerciseDetails(null);
        return;
      }

      // Si l'exercice a déjà les instructions et la vidéo, les utiliser directement
      if (exercise.instructions && exercise.demoVideoURL) {
        setExerciseDetails(exercise);
        return;
      }

      // Sinon, récupérer depuis l'API si on a un exerciseId
      if (exercise.exerciseId) {
        try {
          setLoading(true);
          setIsVideoLoading(true);
          setVideoError(null);
          
          // Utiliser useAuth pour obtenir le token avec rafraîchissement automatique
          let token = await getAuthToken();
          if (!token) {
            try {
              token = await refreshAuthToken();
            } catch (refreshError) {
              logger.warn('No auth token available for fetching exercise details');
              setExerciseDetails(exercise);
              return;
            }
          }

          // Utiliser l'endpoint public qui est accessible aux étudiants
          const response = await fetch(buildApiUrl(`/exercises/public/${exercise.exerciseId}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.exercise) {
              // Fusionner les données de l'API avec l'exercice existant
              setExerciseDetails({
                ...exercise,
                instructions: data.exercise.instructions || exercise.instructions,
                demoVideoURL: data.exercise.demoVideoURL || exercise.demoVideoURL,
                title: data.exercise.title || exercise.title || exercise.name,
                name: data.exercise.title || exercise.name || exercise.title
              });
            } else {
              // Si l'API ne retourne pas les données, utiliser l'exercice tel quel
              setExerciseDetails(exercise);
            }
          } else {
            logger.warn('Failed to fetch exercise public details:', response.status);
            // En cas d'erreur, utiliser l'exercice tel quel
            setExerciseDetails(exercise);
          }
        } catch (error) {
          logger.error('Error fetching exercise public details:', error);
          // En cas d'erreur, utiliser l'exercice tel quel
          setExerciseDetails(exercise);
        } finally {
          setLoading(false);
        }
      } else {
        // Pas d'exerciseId, utiliser l'exercice tel quel
        setExerciseDetails(exercise);
      }
    };

    if (isOpen && exercise) {
      fetchExerciseDetails();
    } else {
      setExerciseDetails(null);
      setIsVideoLoading(false);
      setVideoError(null);
    }
  }, [isOpen, exercise, getAuthToken, refreshAuthToken]);

  // Gérer le chargement vidéo
  useEffect(() => {
    if (exerciseDetails?.demoVideoURL) {
      setIsVideoLoading(true);
      setVideoError(null);
      
      // Auto-hide loading after 3 seconds as fallback
      const loadingTimeout = setTimeout(() => {
        setIsVideoLoading(false);
      }, 3000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [exerciseDetails?.demoVideoURL]);

  // Parser les instructions en liste à puces
  const parseInstructions = (instructions) => {
    if (!instructions) return [];
    
    // Diviser par lignes et filtrer les lignes vides
    const lines = instructions.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Si les instructions sont déjà formatées avec des puces/tirets, les extraire
    // Sinon, traiter chaque ligne comme un élément de liste
    return lines.map(line => {
      // Enlever les puces/tirets existants (•, -, *, etc.)
      return line.replace(/^[•\-\*]\s+/, '').trim();
    }).filter(line => line.length > 0);
  };

  const instructionList = parseInstructions(exerciseDetails?.instructions);

  // Empêcher la fermeture par clic sur le backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Empêcher la fermeture par ESC
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

  if (!isOpen || !exercise) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-info-title"
      >
        {/* Header */}
        <div className="flex items-center justify-center px-4 text-center" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
          <h2 id="exercise-info-title" className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">
            {exerciseDetails?.title || exerciseDetails?.name || exercise?.name || exercise?.title}
          </h2>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4">
          {/* Démo vidéo ou image */}
          {exerciseDetails?.demoVideoURL ? (
            (() => {
              const url = exerciseDetails.demoVideoURL;
              const isImage = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(url) || (url.includes('/files/') && !url.includes('/videos/'));
              if (isImage) {
                return (
                  <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={exerciseDetails.demoVideoURL}
                      alt="Démonstration de l'exercice"
                      className="w-full h-auto max-h-[200px] object-contain"
                    />
                  </div>
                );
              }
              return (
            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-white/10">
              <video
                ref={videoRef}
                src={exerciseDetails.demoVideoURL}
                controls
                playsInline
                className="w-full h-auto max-h-[200px] object-contain"
                onLoadedMetadata={() => {
                  const videoElement = videoRef.current;
                  if (videoElement) {
                    setIsVideoLoading(false);
                  }
                }}
                onCanPlay={() => setIsVideoLoading(false)}
                onError={(e) => {
                  const videoElement = e.target;
                  const error = videoElement?.error;
                  if (error) {
                    let errorMessage = 'Erreur lors du chargement de la vidéo';
                    switch (error.code) {
                      case error.MEDIA_ERR_ABORTED:
                        errorMessage = 'Le chargement de la vidéo a été interrompu';
                        break;
                      case error.MEDIA_ERR_NETWORK:
                        errorMessage = 'Erreur réseau lors du chargement de la vidéo';
                        break;
                      case error.MEDIA_ERR_DECODE:
                        errorMessage = 'Erreur de décodage de la vidéo';
                        break;
                      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        const videoUrl = videoElement?.src || '';
                        if (videoUrl.toLowerCase().endsWith('.mov')) {
                          errorMessage = 'Format .mov non supporté par le navigateur. Veuillez utiliser MP4.';
                        } else {
                          errorMessage = 'Format de vidéo non supporté ou URL invalide';
                        }
                        break;
                      default:
                        errorMessage = `Erreur vidéo: ${error.message || 'Erreur inconnue'}`;
                    }
                    logger.error('Video error:', {
                      code: error.code,
                      message: error.message,
                      src: videoElement?.src
                    });
                    setVideoError(errorMessage);
                  } else {
                    logger.error('Video error: Unable to load video');
                    setVideoError('Erreur lors du chargement de la vidéo');
                  }
                  setIsVideoLoading(false);
                }}
                tabIndex={-1}
              />

              {isVideoLoading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mx-auto mb-3"></div>
                    <p className="text-sm">Chargement...</p>
                  </div>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-red-400 text-center px-4">
                    <p className="text-sm mb-3">{videoError}</p>
                    {exerciseDetails?.demoVideoURL && (
                      <div className="flex flex-col gap-2">
                        <a
                          href={exerciseDetails.demoVideoURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm touch-target transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ouvrir la vidéo dans un nouvel onglet
                        </a>
                        <button
                          onClick={() => {
                            setVideoError(null);
                            setIsVideoLoading(true);
                            if (videoRef.current) {
                              videoRef.current.load();
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm touch-target transition-colors"
                        >
                          Réessayer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
              );
            })()
          ) : loading ? (
            <div className="bg-[#262626] rounded-lg border border-white/10 h-[125px] flex items-center justify-center text-gray-400 text-xs font-light">
              Chargement vidéo...
            </div>
          ) : null}

          {/* Section Instructions */}
          <div>
            <p className="text-gray-400 text-xs font-light leading-relaxed mb-3 text-center">
              Instruction
            </p>
            
            {loading ? (
              <div className="bg-[#262626] rounded-lg border border-white/10 px-3 py-3">
                <p className="text-gray-400 text-xs font-light italic text-center">
                  Chargement...
                </p>
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
                <p className="text-gray-400 text-xs font-light italic text-center">
                  Aucune instruction disponible
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExerciseInfoModal;

