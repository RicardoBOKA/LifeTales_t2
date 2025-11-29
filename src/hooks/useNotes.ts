import { useState, useCallback } from 'react';
import { Note, NoteType } from '../types';

export function useNotes(
  initialNotes: Note[],
  onUpdate: (notes: Note[]) => void
) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const addNote = useCallback((note: Omit<Note, 'id' | 'timestamp'>) => {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    onUpdate(updatedNotes);
    
    return newNote;
  }, [notes, onUpdate]);

  const updateNote = useCallback((updatedNote: Note) => {
    const updatedNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
    setNotes(updatedNotes);
    onUpdate(updatedNotes);
  }, [notes, onUpdate]);

  const deleteNote = useCallback((noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    onUpdate(updatedNotes);
  }, [notes, onUpdate]);

  // Sync with external changes
  const syncNotes = useCallback((externalNotes: Note[]) => {
    setNotes(externalNotes);
  }, []);

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    syncNotes
  };
}
