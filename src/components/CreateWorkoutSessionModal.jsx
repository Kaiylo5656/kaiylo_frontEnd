import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Plus, Trash2, MoreHorizontal, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { getApiBaseUrlWithApi } from '../config/api';

const CreateWorkoutSessionModal = ({ isOpen, onClose, selectedDate, onSessionCreated, studentId }) => {
  // ... existing state code ...
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  // ... existing useEffect and functions ...
  useEffect(() => {
    if (isOpen) {
      fetchExercises();
    }
  }, [isOpen]);

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleAddExercise = (selectedExercise) => {
    const newExercise = {
      id: Date.now(),
      name: selectedExercise.title,
      type: selectedExercise.tags?.includes('Push') ? 'Push' : 'Pull',
      sets: '',
      reps: '',
      weight: '',
      rest: '03:00',
      recordVideo: false,
      notes: selectedExercise.description || '',
      exerciseId: selectedExercise.id,
      description: selectedExercise.description || ''
    };
    
    setExercises([...exercises, newExercise]);
    setShowExerciseSelector(false);
    setSearchTerm('');
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate exercises
    if (exercises.length === 0) {
      alert('Veuillez ajouter au moins un exercice');
      return;
    }

    const sessionData = {
      title: sessionName.trim() || `Séance du ${format(selectedDate, 'dd/MM/yyyy')}`,
      description: description.trim(),
      exercises: exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        type: ex.type,
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
        weight: ex.weight ? parseFloat(ex.weight) : null,
        rest: ex.rest,
        recordVideo: ex.recordVideo,
        notes: ex.notes
      })),
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      student_id: studentId
    };

    console.log('Sending session data:', sessionData);

    try {
      onSessionCreated(sessionData);
      handleClose();
    } catch (error) {
      console.error('Error creating workout session:', error);
    }
  };

  const handleClose = () => {
    setSessionName('');
    setDescription('');
    setExercises([]);
    setSearchTerm('');
    setShowExerciseSelector(false);
    onClose();
  };

  const filteredExercises = availableExercises.filter(exercise =>
    exercise.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#121212] border-none p-0 gap-0 max-w-[600px]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-white">
            Nom de la séance
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="px-6">
            <Input
              placeholder="Nom de la séance"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-[#1a1a1a] border-none text-white placeholder-gray-500"
            />
          </div>

          <div className="px-6">
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#1a1a1a] border-none text-white placeholder-gray-500"
            />
          </div>

          <div className="flex flex-col gap-2 px-6">
            {exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-[#1a1a1a] rounded-lg p-4 relative">
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exercise.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button type="button" className="text-gray-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Input
                      value={exercise.name}
                      readOnly
                      className="flex-1 bg-[#262626] border-none text-white"
                    />
                    <select
                      value={exercise.type}
                      onChange={(e) => {
                        const updatedExercises = [...exercises];
                        updatedExercises[index].type = e.target.value;
                        setExercises(updatedExercises);
                      }}
                      className="bg-[#262626] text-white border-none rounded-md px-3 py-2 outline-none"
                    >
                      <option value="Pull">Pull</option>
                      <option value="Push">Push</option>
                    </select>
                  </div>

                  {exercise.description && (
                    <div className="text-sm text-gray-400 bg-[#262626] p-3 rounded-md">
                      {exercise.description}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => {
                          const updatedExercises = [...exercises];
                          updatedExercises[index].sets = e.target.value;
                          setExercises(updatedExercises);
                        }}
                        placeholder="Série"
                        className="bg-[#262626] border-none text-white placeholder-gray-500"
                      />
                      <span className="text-xs text-gray-500 px-2">Série</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        value={exercise.reps}
                        onChange={(e) => {
                          const updatedExercises = [...exercises];
                          updatedExercises[index].reps = e.target.value;
                          setExercises(updatedExercises);
                        }}
                        placeholder="Reps"
                        className="bg-[#262626] border-none text-white placeholder-gray-500"
                      />
                      <span className="text-xs text-gray-500 px-2">Reps</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        value={exercise.weight}
                        onChange={(e) => {
                          const updatedExercises = [...exercises];
                          updatedExercises[index].weight = e.target.value;
                          setExercises(updatedExercises);
                        }}
                        placeholder="Charge"
                        className="bg-[#262626] border-none text-white placeholder-gray-500"
                      />
                      <span className="text-xs text-gray-500 px-2">Charge (kg)</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="text"
                        value={exercise.rest}
                        onChange={(e) => {
                          const updatedExercises = [...exercises];
                          updatedExercises[index].rest = e.target.value;
                          setExercises(updatedExercises);
                        }}
                        placeholder="03:00"
                        className="bg-[#262626] border-none text-white placeholder-gray-500"
                      />
                      <span className="text-xs text-gray-500 px-2">Tempo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exercise.recordVideo}
                      onChange={(e) => {
                        const updatedExercises = [...exercises];
                        updatedExercises[index].recordVideo = e.target.checked;
                        setExercises(updatedExercises);
                      }}
                      className="rounded border-gray-600 bg-[#262626]"
                    />
                    <span className="text-sm text-gray-400">Vidéo</span>
                  </div>

                  <Input
                    value={exercise.notes}
                    onChange={(e) => {
                      const updatedExercises = [...exercises];
                      updatedExercises[index].notes = e.target.value;
                      setExercises(updatedExercises);
                    }}
                    placeholder="Ajouter une note pour cette exercice"
                    className="bg-[#262626] border-none text-white placeholder-gray-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="px-6">
            {showExerciseSelector ? (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Rechercher un exercice..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-[#262626] border-none text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredExercises.map(exercise => (
                      <div
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="p-3 hover:bg-[#262626] rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="font-medium text-white">{exercise.title}</div>
                        {exercise.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {exercise.description}
                          </div>
                        )}
                        {exercise.tags && exercise.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {exercise.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-[#333] text-gray-300 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowExerciseSelector(true)}
                className="w-full bg-[#1a1a1a] hover:bg-[#262626] text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter exercice
              </button>
            )}
          </div>

          <div className="flex justify-between p-6 mt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#e87c3e] hover:bg-[#e87c3e]/90 text-white rounded-lg transition-colors"
            >
              Sauvegarder & Quitter
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkoutSessionModal;