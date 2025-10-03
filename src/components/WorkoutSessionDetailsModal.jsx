import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, PlayCircle, CheckCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const WorkoutSessionDetailsModal = ({ isOpen, onClose, session, selectedDate }) => {
  if (!session) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-content max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="workout-modal-header">
          <DialogTitle className="text-lg font-medium text-white">
            {session.title || 'Séance d\'entraînement'}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="workout-modal-content">
          {/* Session Info */}
          <div className="px-4 py-4 border-b border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(session.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                  {getStatusText(session.status)}
                </span>
              </div>
              {session.startTime && (
                <div className="text-sm text-gray-400">
                  Début: {format(new Date(session.startTime), 'HH:mm')}
                </div>
              )}
            </div>
            
            {session.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Description</h3>
                <p className="text-sm text-gray-400">{session.description}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Exercices:</span>
                <span className="text-white ml-2">{session.exercises?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Séries totales:</span>
                <span className="text-white ml-2">
                  {session.exercises?.reduce((total, exercise) => total + (exercise.sets?.length || 0), 0) || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Durée estimée:</span>
                <span className="text-white ml-2">~45 min</span>
              </div>
            </div>
          </div>

          {/* Exercises List */}
          <div className="workout-modal-body">
            <div className="space-y-4">
              {session.exercises?.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                  {/* Exercise Header */}
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a]">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      <span className="text-white font-medium text-lg">{exercise.name}</span>
                      <div className="flex gap-1 flex-wrap">
                        {exercise.tags && exercise.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                            tag.toLowerCase() === 'pull' ? 'bg-orange-500' :
                            tag.toLowerCase() === 'push' ? 'bg-green-500' :
                            tag.toLowerCase() === 'legs' ? 'bg-purple-500' :
                            'bg-gray-500'
                          }`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Exercise Sets */}
                  {exercise.sets && exercise.sets.length > 0 && (
                    <div className="bg-[#0a0a0a] p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-xs border-b border-[#262626]">
                              <th className="text-left pb-3">Série</th>
                              <th className="text-center pb-3">Charge (kg)</th>
                              <th className="text-center pb-3">Reps</th>
                              <th className="text-center pb-3">Repos</th>
                              <th className="text-center pb-3">Vidéo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercise.sets.map((set, setIndex) => (
                              <tr key={setIndex} className="border-b border-[#262626]">
                                <td className="py-3 text-white font-medium">{set.serie || setIndex + 1}</td>
                                <td className="py-3 text-center text-white">{set.weight || '-'}</td>
                                <td className="py-3 text-center text-white">{set.reps || '-'}</td>
                                <td className="py-3 text-center text-white">{set.rest || '-'}</td>
                                <td className="py-3 text-center">
                                  {set.video ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <div className="h-4 w-4 border border-gray-500 rounded mx-auto"></div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Exercise Notes */}
                      {exercise.notes && (
                        <div className="mt-4 pt-4 border-t border-[#262626]">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Notes</h4>
                          <p className="text-sm text-gray-400">{exercise.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="workout-modal-footer">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Séance créée le {format(new Date(session.created_at || Date.now()), 'dd/MM/yyyy à HH:mm')}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutSessionDetailsModal;
