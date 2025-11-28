import { Note, Chapter, StorySpace } from './models';
import { StorySettings } from './settings';

// ========================================
// Request Types
// ========================================

export interface TranscribeAudioRequest {
  audioData: string; // base64
  mimeType: string;
}

export interface GenerateStoryRequest {
  notes: Note[];
  spaceTitle: string;
  settings?: StorySettings;
}

export interface GenerateIllustrationRequest {
  prompt: string;
  style?: string;
}

export interface CreateNoteRequest {
  spaceId: string;
  note: Omit<Note, 'id'>;
}

export interface UpdateNoteRequest {
  spaceId: string;
  noteId: string;
  updates: Partial<Note>;
}

// ========================================
// Response Types
// ========================================

export interface TranscribeAudioResponse {
  transcription: string;
  success: boolean;
  error?: string;
}

export interface GenerateStoryResponse {
  chapters: Chapter[];
  success: boolean;
  error?: string;
}

export interface GenerateIllustrationResponse {
  imageUrl?: string;
  success: boolean;
  error?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  success: boolean;
  error?: string;
}

// ========================================
// API Error
// ========================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

