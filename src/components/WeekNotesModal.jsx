import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, GripVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const WeekNotesModal = ({ isOpen, onClose, weekStartDate, studentId, onSave }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (isOpen && weekStartDate && studentId) {
      loadNotes();
    }
  }, [isOpen, weekStartDate, studentId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const weekKey = format(weekStartDate, 'yyyy-MM-dd');
      
      const response = await axios.get(
        buildApiUrl(`/periodization/week-notes/${studentId}/${weekKey}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const loadedNotes = response.data.data.notes || [];
        setNotes(loadedNotes.sort((a, b) => a.order - b.order));
      }
    } catch (err) {
      console.error('Error loading week notes:', err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = () => {
    const newNote = {
      id: crypto.randomUUID(),
      content: '',
      order: notes.length
    };
    setNotes([...notes, newNote]);
  };

  const handleDeleteNote = (noteId) => {
    const filtered = notes.filter(n => n.id !== noteId);
    // Reorder after deletion
    const reordered = filtered.map((note, index) => ({ ...note, order: index }));
    setNotes(reordered);
  };

  const handleNoteChange = (noteId, newContent) => {
    setNotes(notes.map(note => 
      note.id === noteId ? { ...note, content: newContent } : note
    ));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newNotes = [...notes];
    const draggedNote = newNotes[draggedIndex];
    newNotes.splice(draggedIndex, 1);
    newNotes.splice(index, 0, draggedNote);
    
    // Reorder
    const reordered = newNotes.map((note, idx) => ({ ...note, order: idx }));
    setNotes(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      const weekKey = format(weekStartDate, 'yyyy-MM-dd');

      // Filter out empty notes before saving
      const validNotes = notes.filter(n => n.content.trim() !== '');

      const response = await axios.post(
        buildApiUrl('/periodization/week-notes'),
        {
          student_id: studentId,
          week_start_date: weekKey,
          notes: validNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSave?.(validNotes);
        onClose();
      }
    } catch (err) {
      console.error('Error saving week notes:', err);
      alert('Erreur lors de la sauvegarde des notes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekNumber = Math.ceil(
    (weekStartDate.getDate() + weekStartDate.getDay()) / 7
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#D4845A]" />
            <h2 className="text-white font-medium">
              Notes de la semaine - S{weekNumber} ({format(weekStartDate, 'd', { locale: fr })}-{format(weekEnd, 'd MMM', { locale: fr })})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center text-white/50 py-8">Chargement...</div>
          ) : (
            <>
              {/* All Notes List */}
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <input
                    type="text"
                    value={note.content}
                    onChange={(e) => handleNoteChange(note.id, e.target.value)}
                    placeholder="Ajouter une note"
                    className="flex-1 px-[14px] py-2.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] border-[rgba(255,255,255,0.05)] text-white text-sm outline-none focus:border-[rgba(255,255,255,0.2)] transition-colors"
                    autoFocus={note.content === '' && index === notes.length - 1}
                  />
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 hover:bg-white/10 rounded transition-colors group"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-white/30 group-hover:text-red-400 transition-colors" />
                  </button>
                  <button
                    className="p-2 cursor-grab active:cursor-grabbing hover:bg-white/10 rounded transition-colors"
                    title="Glisser pour réordonner"
                  >
                    <GripVertical className="w-4 h-4 text-white/30" />
                  </button>
                </div>
              ))}

              {/* Add Note Button */}
              <button
                onClick={handleAddNote}
                className="w-full py-2.5 text-[#D4845A] text-sm font-light hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter une note
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-[14px] py-[10px] text-white/70 text-sm hover:text-white transition-colors"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4845A] border-[0.5px] border-[rgba(255,255,255,0.2)] px-[14px] py-[10px] rounded-[10px] text-white text-sm hover:bg-[#c47950] transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeekNotesModal;
