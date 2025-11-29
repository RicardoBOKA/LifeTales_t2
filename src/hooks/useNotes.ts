import { useState, useCallback } from 'react';
import { Note, NoteType, StorySpace } from '../types';
import { createNote, getDefaultNoteTitle } from '../utils/noteHelpers';

export function useNotes(
  initialNotes: Note[],
  onUpdate: (notes: Note[]) => void
) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const addNote = useCallback((
    type: NoteType,
    content: string,
    transcription?: string,
    audioUrl?: string
  ) => {
    const noteData = createNote(type, content, transcription, audioUrl);
    const newNote: Note = {
      id: Date.now().toString(),
      ...noteData
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

