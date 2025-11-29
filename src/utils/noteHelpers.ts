import { Note, NoteType } from '../types';

/**
 * Group notes by date
 */
export const groupNotesByDate = (notes: Note[]): Record<string, Note[]> => {
  const groups: Record<string, Note[]> = {};
  
  notes.forEach(note => {
    const dateKey = new Date(note.timestamp).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(note);
  });
  
  return groups;
};

/**
 * Get default title based on note type
 */
export const getDefaultNoteTitle = (type: NoteType): string => {
  return 'Moment';
};
