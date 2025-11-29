/**
 * Shared types between frontend and backend
 * These types should be kept in sync with src/types/
 */

export enum NoteType {
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface Note {
  id: string;
  type: NoteType;
  content: string;
  audioUrl?: string;
  transcription?: string;
  timestamp: number;
  location?: string;
  title?: string;
  description?: string;
}

export interface Chapter {
  title: string;
  content: string;
  illustrationPrompt?: string;
  sourceNoteId?: string;              // Reference to the source note
  userImageIds?: string[];            // ALL images from this note
  generatedImageUrl?: string;         // AI-generated image if no user images
}

export type GenerationStep = 'idle' | 'analyzing' | 'writing' | 'images' | 'done';

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

export interface StorySettings {
  narrativeTone: 'cinematic' | 'funny' | 'neutral' | 'emotional' | 'journalistic' | 'poetic';
  storyMode: 'transcription' | 'clean' | 'creative' | 'chapter';
  creativity: number;
  imageStyle: 'illustration' | 'cinematic' | 'pastel' | 'realistic';
  imagesPerChapter: number;
  voiceStyle: 'serious' | 'calm' | 'warm' | 'storyteller';
  backgroundMusic: boolean;
}

