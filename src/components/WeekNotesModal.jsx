import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
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

  // Ajuster la hauteur de tous les textareas après le rendu
  useEffect(() => {
    if (!loading) {
      const textareas = document.querySelectorAll('textarea[placeholder="Ajouter une note"]');
      textareas.forEach((textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
  }, [notes, loading]);

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

  // Identifier la première note affichée (celle qui s'affiche sur la semaine)
  const getFirstDisplayedNoteIndex = () => {
    const firstNoteWithContent = notes.findIndex(n => n.content && n.content.trim() !== '');
    return firstNoteWithContent !== -1 ? firstNoteWithContent : null;
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

  const weekNumber = Math.ceil(
    (weekStartDate.getDate() + weekStartDate.getDay()) / 7
  );

  return (
    <>
      {/* Backdrop - covers entire screen */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur z-[100]"
        style={{
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        onClick={onClose}
      />
      {/* Modal container - centered with padding */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        <div 
          className="relative mx-auto w-full max-w-2xl min-w-[min(500px,calc(100vw-2rem))] max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col !w-full md:!w-[448px] !max-w-full md:!max-w-[448px] !min-w-0 md:!min-w-[448px] pointer-events-auto"
          style={{
            background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
            opacity: 0.95
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 384 512" 
              className="w-5 h-5 flex-shrink-0"
              style={{ fill: 'var(--kaiylo-primary-hex)' }}
            >
              <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/>
            </svg>
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Notes de la semaine - S{weekNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
              <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
            </svg>
          </button>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-4 md:py-6 space-y-5">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* All Notes List */}
              {notes.map((note, index) => {
                const isFirstDisplayedNote = getFirstDisplayedNoteIndex() === index;
                return (
                <div
                  key={note.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <textarea
                    value={note.content}
                    onChange={(e) => {
                      handleNoteChange(note.id, e.target.value);
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = textarea.scrollHeight + 'px';
                    }}
                    onFocus={(e) => {
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = textarea.scrollHeight + 'px';
                    }}
                    placeholder="Ajouter une note"
                    className={`flex-1 px-[14px] py-2.5 rounded-[10px] bg-[rgba(0,0,0,0.5)] border-[0.5px] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight outline-none focus:outline-none focus:border-[0.5px] transition-colors resize-none min-h-[42px] overflow-hidden ${
                      isFirstDisplayedNote 
                        ? 'border-[var(--kaiylo-primary-hex)] focus:border-[var(--kaiylo-primary-hex)]' 
                        : 'border-[rgba(255,255,255,0.05)] focus:border-[rgba(255,255,255,0.2)]'
                    }`}
                    autoFocus={note.content === '' && index === notes.length - 1}
                    rows={1}
                    style={{ height: 'auto', maxHeight: 'none' }}
                  />
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 transition-colors group"
                    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--kaiylo-primary-hex)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                      <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                    </svg>
                  </button>
                  <button
                    className="p-1 transition-colors"
                    title="Glisser pour réordonner"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 320 512" 
                      className="h-4 w-4 flex-shrink-0"
                      fill="currentColor"
                      style={{ color: 'rgba(255, 255, 255, 0.25)' }}
                    >
                      <path d="M128 40c0-22.1-17.9-40-40-40L40 0C17.9 0 0 17.9 0 40L0 88c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zm0 192c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM0 424l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 40c0-22.1-17.9-40-40-40L232 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM192 232l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 424c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48z"/>
                    </svg>
                  </button>
                </div>
                );
              })}

              {/* Add Note Button */}
              <button
                onClick={handleAddNote}
                className="w-full text-xs font-normal px-3 py-2 rounded-lg bg-transparent hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-white/50 font-light">Ajouter une note</span>
              </button>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default WeekNotesModal;
