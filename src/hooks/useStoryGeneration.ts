import { useState, useCallback } from 'react';
import { Chapter, Note, StorySettings, DEFAULT_SETTINGS } from '../types';
import { generateStoryFromNotes, generateChapterIllustration } from '../services/gemini';

export function useStoryGeneration(
  initialChapters: Chapter[],
  onUpdate: (chapters: Chapter[]) => void
) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStory = useCallback(async (
    notes: Note[], 
    spaceTitle: string,
    settings: StorySettings = DEFAULT_SETTINGS
  ) => {
    setIsGenerating(true);

    try {
      // Step 1: Generate chapters with settings
      const generatedChapters = await generateStoryFromNotes(notes, spaceTitle, settings);
      setChapters(generatedChapters);
      onUpdate(generatedChapters);

      // Step 2: Generate illustrations for chapters that need them
      const updatedChaptersWithImages = [...generatedChapters];
      
      for (let i = 0; i < updatedChaptersWithImages.length; i++) {
        const chapter = updatedChaptersWithImages[i];
        
        // Count how many images this chapter should have
        const targetImages = settings.imagesPerChapter;
        let currentImages = 0;
        
        // User image already assigned counts as one
        if (chapter.userImageUrl) {
          currentImages++;
        }
        
        // Generate AI illustrations if needed and if we have a prompt
        if (chapter.illustrationPrompt && currentImages < targetImages) {
          const imageUrl = await generateChapterIllustration(
            chapter.illustrationPrompt,
            settings.imageStyle
          );
          if (imageUrl) {
            updatedChaptersWithImages[i] = { ...chapter, illustrationUrl: imageUrl };
            setChapters([...updatedChaptersWithImages]);
            onUpdate([...updatedChaptersWithImages]);
          }
        }
      }
      
      onUpdate(updatedChaptersWithImages);
      return updatedChaptersWithImages;
      
    } catch (error) {
      console.error('Story generation error:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [onUpdate]);

  const syncChapters = useCallback((externalChapters: Chapter[]) => {
    setChapters(externalChapters);
  }, []);

  return {
    chapters,
    isGenerating,
    generateStory,
    syncChapters
  };
}
