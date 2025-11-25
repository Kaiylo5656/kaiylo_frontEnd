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
              console.warn('No auth token available for fetching exercise details');
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
            console.warn('Failed to fetch exercise public details:', response.status);
            // En cas d'erreur, utiliser l'exercice tel quel
            setExerciseDetails(exercise);
          }
        } catch (error) {
          console.error('Error fetching exercise public details:', error);
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

  if (!isOpen || !exercise) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[111] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#1b1b1b] rounded-[20px] w-[270px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-info-title"
      >
        {/* Titre de l'exercice */}
        <div className="px-[25px] pt-[24px]">
          <h2 id="exercise-info-title" className="text-[15px] font-normal text-white leading-normal">
            {exerciseDetails?.title || exerciseDetails?.name || exercise?.name || exercise?.title}
          </h2>
        </div>

        {/* Lecteur vidéo */}
        {exerciseDetails?.demoVideoURL ? (
          <div className="px-[25px] pt-[19px]">
            <div className="relative w-full bg-black rounded-[10px] overflow-hidden shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)]">
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
                onError={(error) => {
                  console.error('Video error:', error);
                  setVideoError('Erreur lors du chargement de la vidéo');
                  setIsVideoLoading(false);
                }}
                tabIndex={-1}
              />

              {/* Loading Overlay */}
              {isVideoLoading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mx-auto mb-3"></div>
                    <p className="text-sm">Chargement...</p>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {videoError && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="text-red-400 text-center px-4">
                    <p className="text-sm mb-3">{videoError}</p>
                    <button
                      onClick={() => {
                        setVideoError(null);
                        setIsVideoLoading(true);
                        if (videoRef.current) {
                          videoRef.current.load();
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded text-sm touch-target"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="px-[25px] pt-[19px]">
            <div className="bg-black/15 rounded-[10px] h-[125px] w-[220px] flex items-center justify-center text-white/50 text-[10px]">
              Chargement vidéo...
            </div>
          </div>
        ) : null}

        {/* Section Instructions */}
        <div className="px-[25px] pt-[10px]">
          <p className="text-[8px] font-light text-white/25 leading-normal mb-[10px]">
            Instruction
          </p>
          
          {loading ? (
            <div className="bg-black/15 rounded-[10px] px-[5px] py-[11px] w-[220px]">
              <p className="text-[8px] font-light text-white/25 italic">
                Chargement...
              </p>
            </div>
          ) : instructionList.length > 0 ? (
            <div className="bg-black/15 rounded-[10px] px-[5px] py-[11px] w-[220px] max-h-[150px] overflow-y-auto overflow-x-hidden break-words">
              <ul className="list-disc text-[#d4845a] text-[12px] font-light space-y-0 break-words">
                {instructionList.map((instruction, index) => (
                  <li key={index} className="ml-[12px] leading-normal break-words">
                    <span className="text-[#d4845a] break-words">{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-black/15 rounded-[10px] px-[5px] py-[11px] w-[220px]">
              <p className="text-[8px] font-light text-white/25 italic">
                Aucune instruction disponible
              </p>
            </div>
          )}
        </div>

        {/* Bouton Quitter */}
        <div className="px-[25px] pb-[20px] pt-[15px] flex justify-center">
          <button
            onClick={onClose}
            className="bg-white/2 border-[0.5px] border-white/10 h-[20px] rounded-[5px] w-[80px] flex items-center justify-center px-[14px] py-[4px] transition-colors hover:bg-white/5"
          >
            <span className="text-[10px] font-normal text-white/75 text-center whitespace-nowrap">
              Quitter
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExerciseInfoModal;

