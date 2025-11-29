export enum NoteType {
  MOMENT = 'MOMENT'  // A moment can have text, images, videos, and audio all together
}

export interface Note {
  id: string;
  type: NoteType;
  timestamp: number;
  title?: string;
  
  // Text content / caption
  textContent?: string;
  
  // Media attachments (can have multiple of each)
  audioFileIds?: string[];       // Voice recordings (multiple allowed)
  transcriptions?: string[];     // Auto-transcribed text for each audio
  imageFileIds?: string[];       // Photos
  videoFileIds?: string[];       // Videos
}

export interface MediaFile {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface Chapter {
  title: string;
  content: string;
  illustrationPrompt?: string;
  sourceNoteId?: string;              // Reference to the source note
  userImageIds?: string[];            // ALL images from this note (from fileStorage)
  generatedImageUrl?: string;         // AI-generated image if no user images
}

// Generation workflow steps for UI feedback
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
