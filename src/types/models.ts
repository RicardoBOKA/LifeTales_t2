export enum NoteType {
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface Note {
  id: string;
  type: NoteType;
  content: string; // Text content or Image URL (base64)
  audioUrl?: string; // For playback (base64 data URL)
  transcription?: string; // For audio notes
  timestamp: number;
  location?: string;
  title?: string;       // User editable title
  description?: string; // User editable description
  attachedImageUrl?: string; // Optional photo attached to audio notes (base64)
}

export interface Chapter {
  title: string;
  content: string;
  illustrationPrompt?: string;
  illustrationUrl?: string;
  userImageUrl?: string; // User-provided image from notes
}

export interface StorySpace {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  startDate: number;
  notes: Note[];
  generatedStory: Chapter[];
  isGenerating: boolean;
}

