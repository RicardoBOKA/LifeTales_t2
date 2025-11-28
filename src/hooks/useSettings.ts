import { useLocalStorage } from './useLocalStorage';
import { StorySettings, DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<StorySettings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_SETTINGS
  );

  const updateNarrativeTone = (tone: StorySettings['narrativeTone']) => {
    setSettings(prev => ({ ...prev, narrativeTone: tone }));
  };

  const updateStoryMode = (mode: StorySettings['storyMode']) => {
    setSettings(prev => ({ ...prev, storyMode: mode }));
  };

  const updateCreativity = (creativity: number) => {
    setSettings(prev => ({ ...prev, creativity }));
  };

  const updateImageStyle = (style: StorySettings['imageStyle']) => {
    setSettings(prev => ({ ...prev, imageStyle: style }));
  };

  const updateImagesPerChapter = (count: number) => {
    setSettings(prev => ({ ...prev, imagesPerChapter: count }));
  };

  const updateVoiceStyle = (voice: StorySettings['voiceStyle']) => {
    setSettings(prev => ({ ...prev, voiceStyle: voice }));
  };

  const toggleBackgroundMusic = () => {
    setSettings(prev => ({ ...prev, backgroundMusic: !prev.backgroundMusic }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateNarrativeTone,
    updateStoryMode,
    updateCreativity,
    updateImageStyle,
    updateImagesPerChapter,
    updateVoiceStyle,
    toggleBackgroundMusic,
    resetSettings
  };
}

