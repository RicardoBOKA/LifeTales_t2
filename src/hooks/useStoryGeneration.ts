import { useState, useCallback } from 'react';
import { Chapter, Note } from '../types';
import { generateStoryFromNotes, generateChapterIllustration } from '../services/gemini';
import { useSettings } from './useSettings';

export function useStoryGeneration(
  initialChapters: Chapter[],
  onUpdate: (chapters: Chapter[]) => void
) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);
  const { settings } = useSettings();

  const generateStory = useCallback(async (notes: Note[], spaceTitle: string) => {
    setIsGenerating(true);

    try {
      // Step 1: Generate chapters with user settings
      const generatedChapters = await generateStoryFromNotes(notes, spaceTitle, {
        narrativeTone: settings.narrativeTone,
        storyMode: settings.storyMode,
        creativity: settings.creativity,
        imageStyle: settings.imageStyle
      });
      setChapters(generatedChapters);
      onUpdate(generatedChapters);

      // Step 2: Generate illustrations for each chapter using the image style
      // Add delay between requests to avoid rate limiting
      const updatedChaptersWithImages = [...generatedChapters];
      for (let i = 0; i < updatedChaptersWithImages.length; i++) {
        const chapter = updatedChaptersWithImages[i];
        if (chapter.illustrationPrompt) {
          try {
            // Add delay between requests (2 seconds)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Pass image style to illustration generation
            const styledPrompt = `${settings.imageStyle} style: ${chapter.illustrationPrompt}`;
            const imageUrl = await generateChapterIllustration(styledPrompt);
            if (imageUrl) {
              updatedChaptersWithImages[i] = { ...chapter, illustrationUrl: imageUrl };
              setChapters([...updatedChaptersWithImages]);
              onUpdate([...updatedChaptersWithImages]);
            }
          } catch (error: any) {
            // If rate limited, wait longer and retry once
            if (error?.message?.includes('429') || error?.message?.includes('quota')) {
              console.warn(`Rate limited on illustration ${i + 1}, waiting 20s...`);
              await new Promise(resolve => setTimeout(resolve, 20000));
              
              try {
                const styledPrompt = `${settings.imageStyle} style: ${chapter.illustrationPrompt}`;
                const imageUrl = await generateChapterIllustration(styledPrompt);
                if (imageUrl) {
                  updatedChaptersWithImages[i] = { ...chapter, illustrationUrl: imageUrl };
                  setChapters([...updatedChaptersWithImages]);
                  onUpdate([...updatedChaptersWithImages]);
                }
              } catch (retryError) {
                console.error(`Failed to generate illustration ${i + 1} after retry:`, retryError);
                // Continue without this illustration
              }
            } else {
              throw error;
            }
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
  }, [onUpdate, settings]);

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

