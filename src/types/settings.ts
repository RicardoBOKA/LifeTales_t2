export interface StorySettings {
  narrativeTone: 'cinematic' | 'funny' | 'neutral' | 'emotional' | 'journalistic' | 'poetic';
  storyMode: 'transcription' | 'clean' | 'creative' | 'chapter';
  creativity: number; // 0-2
  imageStyle: 'illustration' | 'cinematic' | 'pastel' | 'realistic';
  imagesPerChapter: number;
  voiceStyle: 'serious' | 'calm' | 'warm' | 'storyteller';
  backgroundMusic: boolean;
}

export const DEFAULT_SETTINGS: StorySettings = {
  narrativeTone: 'cinematic',
  storyMode: 'chapter',
  creativity: 1,
  imageStyle: 'illustration',
  imagesPerChapter: 1,
  voiceStyle: 'storyteller',
  backgroundMusic: true
};

