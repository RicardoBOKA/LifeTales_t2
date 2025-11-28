import { useState, useCallback } from 'react';
import { Chapter, Note } from '../types';
import { generateStoryFromNotes, generateChapterIllustration } from '../services/gemini';

export function useStoryGeneration(
  initialChapters: Chapter[],
  onUpdate: (chapters: Chapter[]) => void
) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStory = useCallback(async (notes: Note[], spaceTitle: string) => {
    setIsGenerating(true);

    try {
      // Step 1: Generate chapters
      const generatedChapters = await generateStoryFromNotes(notes, spaceTitle);
      setChapters(generatedChapters);
      onUpdate(generatedChapters);

      // Step 2: Generate illustrations for each chapter
      const updatedChaptersWithImages = [...generatedChapters];
      for (let i = 0; i < updatedChaptersWithImages.length; i++) {
        const chapter = updatedChaptersWithImages[i];
        if (chapter.illustrationPrompt) {
          const imageUrl = await generateChapterIllustration(chapter.illustrationPrompt);
          if (imageUrl) {
            updatedChaptersWithImages[i] = { ...chapter, illustrationUrl: imageUrl };
            setChapters([...updatedChaptersWithImages]);
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

