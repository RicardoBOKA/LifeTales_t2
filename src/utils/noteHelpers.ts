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
  switch (type) {
    case NoteType.AUDIO:
      return 'Voice Note';
    case NoteType.TEXT:
      return 'Text Note';
    case NoteType.IMAGE:
      return 'Image Note';
    default:
      return 'Note';
  }
};

/**
 * Create a new note
 */
export const createNote = (
  type: NoteType,
  content: string,
  transcription?: string,
  audioUrl?: string
): Omit<Note, 'id'> => {
  return {
    type,
    content,
    transcription,
    audioUrl,
    timestamp: Date.now(),
    title: getDefaultNoteTitle(type),
    description: ''
  };
};

