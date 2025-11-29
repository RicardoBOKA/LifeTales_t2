/**
 * Background Music Service
 * Provides royalty-free background music options
 */

export interface BackgroundMusic {
  id: string;
  name: string;
  mood: 'upbeat' | 'calm' | 'emotional' | 'dramatic' | 'neutral';
  duration: number; // seconds
  url: string;
  artist?: string;
  license: string;
}

/**
 * Curated background music tracks
 * NOTE: These are placeholder URLs. Replace with actual royalty-free music URLs
 * Good sources:
 * - YouTube Audio Library (https://www.youtube.com/audiolibrary)
 * - Free Music Archive (https://freemusicarchive.org)
 * - Incompetech (https://incompetech.com)
 * - Bensound (https://www.bensound.com)
 */
export const BACKGROUND_MUSIC_LIBRARY: BackgroundMusic[] = [
  {
    id: 'calm-1',
    name: 'Peaceful Piano',
    mood: 'calm',
    duration: 180,
    url: 'https://www.bensound.com/bensound-music/bensound-dreams.mp3',
    artist: 'Bensound',
    license: 'CC BY-ND'
  },
  {
    id: 'upbeat-1',
    name: 'Happy Acoustic',
    mood: 'upbeat',
    duration: 180,
    url: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3',
    artist: 'Bensound',
    license: 'CC BY-ND'
  },
  {
    id: 'emotional-1',
    name: 'Cinematic Emotion',
    mood: 'emotional',
    duration: 200,
    url: 'https://www.bensound.com/bensound-music/bensound-emotional.mp3',
    artist: 'Bensound',
    license: 'CC BY-ND'
  },
  {
    id: 'dramatic-1',
    name: 'Epic Adventure',
    mood: 'dramatic',
    duration: 190,
    url: 'https://www.bensound.com/bensound-music/bensound-epic.mp3',
    artist: 'Bensound',
    license: 'CC BY-ND'
  },
  {
    id: 'neutral-1',
    name: 'Soft Background',
    mood: 'neutral',
    duration: 170,
    url: 'https://www.bensound.com/bensound-music/bensound-clearday.mp3',
    artist: 'Bensound',
    license: 'CC BY-ND'
  }
];

/**
 * Get music tracks filtered by mood
 */
export const getMusicByMood = (mood: BackgroundMusic['mood']): BackgroundMusic[] => {
  return BACKGROUND_MUSIC_LIBRARY.filter(track => track.mood === mood);
};

/**
 * Get music track by ID
 */
export const getMusicById = (id: string): BackgroundMusic | undefined => {
  return BACKGROUND_MUSIC_LIBRARY.find(track => track.id === id);
};

/**
 * Select best music for video based on script mood
 */
export const selectMusicForScript = (mood: string): BackgroundMusic => {
  const tracks = getMusicByMood(mood as BackgroundMusic['mood']);
  return tracks[0] || BACKGROUND_MUSIC_LIBRARY[0];
};

