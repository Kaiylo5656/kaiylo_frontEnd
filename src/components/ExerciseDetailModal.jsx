import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Plus, Calendar, User, Play, Tag, FileText } from 'lucide-react';
import { buildApiUrl } from '../config/api';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import VideoPlayer from './VideoPlayer';
import HumanDetails from './HumanDetails';
import ExerciseHistory from './ExerciseHistory';
import { useModalManager } from './ui/modal/ModalManager';

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
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  // Use modal manager for proper event handling
  const { registerModal, unregisterModal, isTopMost } = useModalManager();
  const modalId = 'exercise-detail-modal';

  // Register/unregister modal with modal manager
  useEffect(() => {
    if (isOpen) {
      registerModal(modalId);
    } else {
      unregisterModal(modalId);
    }
    
    return () => {
      unregisterModal(modalId);
    };
  }, [isOpen, registerModal, unregisterModal, modalId]);

  // Fetch exercise details when modal opens
  useEffect(() => {
    if (isOpen && exerciseId) {
      fetchExerciseDetails();
    }
  }, [isOpen, exerciseId]);

  // Store previous active element and manage focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && isTopMost(modalId)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, isTopMost, modalId]);



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

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && isTopMost(modalId)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      style={{ pointerEvents: isTopMost(modalId) ? 'auto' : 'none' }}
    >
      <div 
        ref={modalRef}
        className="relative mx-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 bg-white/10 rounded animate-pulse" />
            ) : exercise ? (
              <h2 id="exercise-title" className="text-xl font-semibold text-white truncate">
                {exercise.title}
              </h2>
            ) : (
              <h2 id="exercise-title" className="text-xl font-semibold text-white">
                Exercise Details
              </h2>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {onAddToSession && exercise && (
              <button
                onClick={() => {
                  onAddToSession(exercise);
                  onClose(); // Close the modal after adding to session
                }}
                className="px-4 py-2 bg-[#e87c3e] text-white rounded-lg hover:bg-[#d66d35] transition-colors text-sm font-medium"
                title="Add to session"
              >
                Ajouter à la séance
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6" style={{ scrollbarGutter: 'stable' }}>
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-white/10 rounded animate-pulse" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">Error loading exercise</div>
              <div className="text-white/60 text-sm">{error}</div>
            </div>
          ) : isDeleted ? (
            <div className="text-center py-8">
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
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExerciseDetailModal;
