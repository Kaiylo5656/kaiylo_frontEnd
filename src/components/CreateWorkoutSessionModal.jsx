import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Plus, Trash2, MoreHorizontal, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { getApiBaseUrlWithApi } from '../config/api';

const CreateWorkoutSessionModal = ({ isOpen, onClose, selectedDate, onSessionCreated, studentId }) => {
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
      exerciseId: selectedExercise.id,
      description: selectedExercise.description || '',
      sets: [
        { serie: 1, weight: '', reps: '', rest: '03:00', video: false },
        { serie: 2, weight: '', reps: '', rest: '03:00', video: false },
        { serie: 3, weight: '', reps: '', rest: '00:00', video: false }
      ],
      notes: '',
      isExpanded: true,
      tempo: ''
    };
    
    setExercises([...exercises, newExercise]);
    setShowExerciseSelector(false);
    setSearchTerm('');
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleAddSet = (exerciseIndex) => {
    const updatedExercises = [...exercises];
    const newSetNumber = updatedExercises[exerciseIndex].sets.length + 1;
    updatedExercises[exerciseIndex].sets.push({
      serie: newSetNumber,
      weight: '',
      reps: '',
      rest: '03:00',
      video: false
    });
    setExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    // Renumber remaining sets
    updatedExercises[exerciseIndex].sets.forEach((set, idx) => {
      set.serie = idx + 1;
    });
    setExercises(updatedExercises);
  };

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updatedExercises);
  };

  const toggleExerciseExpanded = (exerciseIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].isExpanded = !updatedExercises[exerciseIndex].isExpanded;
    setExercises(updatedExercises);
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
        sets: ex.sets.map(set => ({
          serie: set.serie,
          weight: parseFloat(set.weight) || 0,
          reps: parseInt(set.reps) || 0,
          rest: set.rest,
          video: set.video
        })),
        notes: ex.notes,
        tempo: ex.tempo
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
      <DialogContent className="bg-[#121212] border-none p-0 gap-0 max-w-[700px] max-h-[90vh]">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="text-lg font-medium text-white">
            Nom de la séance
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-4">
            <Input
              placeholder="Nom de la séance"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-transparent border-none text-white placeholder-gray-500 text-lg font-medium focus-visible:ring-0"
            />
          </div>

          <div className="px-4 mt-2">
            <label className="text-xs text-gray-400 mb-1 block">DESCRIPTION</label>
            <Input
              placeholder="Ajoute une description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-transparent border-none text-white placeholder-gray-500 text-sm focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-4 px-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 300px)' }}>
            {exercises.map((exercise, exerciseIndex) => (
              <div key={exercise.id} className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                {/* Exercise Header */}
                <div className="flex items-center justify-between p-3 bg-[#1a1a1a]">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span className="text-white font-medium">{exercise.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      exercise.type === 'Pull' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {exercise.type}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exercise.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                {/* Exercise Table */}
                {exercise.isExpanded && (
                  <div className="bg-[#0a0a0a] p-3">
                    {/* Table Container with Scroll */}
                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                          <tr className="text-gray-400 text-xs">
                            <th className="text-left pb-2">Série</th>
                            <th className="text-center pb-2">Charge (kg)</th>
                            <th className="text-center pb-2">Reps</th>
                            <th className="text-center pb-2">Repos</th>
                            <th className="text-center pb-2">Vidéo</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercise.sets.map((set, setIndex) => (
                            <tr key={setIndex} className="border-t border-[#262626]">
                              <td className="py-2 text-white">{set.serie}</td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={set.weight}
                                  onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)}
                                  placeholder="55"
                                  className="bg-[#262626] border-none text-white text-center h-8 w-16 mx-auto"
                                />
                              </td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  value={set.reps}
                                  onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', e.target.value)}
                                  placeholder="3"
                                  className="bg-[#262626] border-none text-white text-center h-8 w-12 mx-auto"
                                />
                              </td>
                              <td className="py-2">
                                <Input
                                  type="text"
                                  value={set.rest}
                                  onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'rest', e.target.value)}
                                  placeholder="03:00"
                                  className="bg-[#262626] border-none text-white text-center h-8 w-16 mx-auto"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={set.video}
                                  onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'video', e.target.checked)}
                                  className="w-4 h-4 rounded bg-[#262626] border-gray-600 text-orange-500 focus:ring-orange-500"
                                />
                              </td>
                              <td className="py-2 text-right">
                                {exercise.sets.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Set and Options Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262626]">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`tempo-${exercise.id}`}
                          checked={exercise.tempo !== ''}
                          onChange={(e) => {
                            const updatedExercises = [...exercises];
                            updatedExercises[exerciseIndex].tempo = e.target.checked ? '' : '';
                            setExercises(updatedExercises);
                          }}
                          className="w-4 h-4 rounded bg-[#262626] border-gray-600"
                        />
                        <label htmlFor={`tempo-${exercise.id}`} className="text-sm text-gray-400">
                          Tempo
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSet(exerciseIndex)}
                        className="text-sm text-[#e87c3e] hover:text-[#e87c3e]/80 flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une série
                      </button>
                    </div>

                    {/* Notes Input */}
                    <Input
                      value={exercise.notes}
                      onChange={(e) => {
                        const updatedExercises = [...exercises];
                        updatedExercises[exerciseIndex].notes = e.target.value;
                        setExercises(updatedExercises);
                      }}
                      placeholder="Ajouter une note pour cette exercice"
                      className="bg-[#262626] border-none text-white placeholder-gray-500 mt-3"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Exercise Selector or Add Button */}
          <div className="px-6 mt-2">
            {showExerciseSelector ? (
              <div className="bg-[#1a1a1a] rounded-lg border border-[#262626]">
                <div className="relative border-b border-[#262626]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Choisir un exercice"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-transparent border-none text-white placeholder-gray-500 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowExerciseSelector(false);
                      setSearchTerm('');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      onClick={() => handleAddExercise(exercise)}
                      className="p-3 hover:bg-[#262626] cursor-pointer transition-colors border-b border-[#1a1a1a] last:border-b-0"
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
                  {filteredExercises.length === 0 && (
                    <div className="p-4 text-center text-gray-400">
                      Aucun exercice trouvé
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowExerciseSelector(true)}
                className="w-full bg-[#6b4e2e] hover:bg-[#7a5a37] text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" />
                Ajouter exercice
              </button>
            )}
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkoutSessionModal;