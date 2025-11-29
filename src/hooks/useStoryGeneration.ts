import { useState, useCallback } from 'react';
import { Chapter, Note, StorySettings, DEFAULT_SETTINGS, GenerationStep } from '../types';
import { generateStoryFromNotes, generateChapterIllustration } from '../services/gemini';
import { fileStorage } from '../services/fileStorage';

export function useStoryGeneration(
  initialChapters: Chapter[],
  onUpdate: (chapters: Chapter[]) => void
) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const generateStory = useCallback(async (
    notes: Note[], 
    spaceTitle: string,
    settings: StorySettings = DEFAULT_SETTINGS
  ) => {
    setIsGenerating(true);
    setChapters([]); // Clear previous chapters for visual feedback
    onUpdate([]);

    try {
      // === STEP 1: ANALYZING ===
      setGenerationStep('analyzing');
      setGenerationProgress({ current: 0, total: notes.length });
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // === STEP 2: WRITING ===
      setGenerationStep('writing');
      
      const generatedChapters = await generateStoryFromNotes(
        notes, 
        spaceTitle, 
        settings
      );
      
      setChapters(generatedChapters);
      onUpdate(generatedChapters);

      // === STEP 3: IMAGES ===
      setGenerationStep('images');
      
      const updatedChaptersWithImages = [...generatedChapters];
      
      // Count chapters needing image generation
      const chaptersNeedingImages = generatedChapters.filter(
        ch => (!ch.userImageIds || ch.userImageIds.length === 0) && ch.illustrationPrompt
      );
      setGenerationProgress({ current: 0, total: chaptersNeedingImages.length });
      
      let imagesGenerated = 0;
      
      for (let i = 0; i < updatedChaptersWithImages.length; i++) {
        const chapter = updatedChaptersWithImages[i];
        
        // If chapter has user images, they're already referenced by IDs
        // The UI will load them from fileStorage
        if (chapter.userImageIds && chapter.userImageIds.length > 0) {
          // User images exist - no AI generation needed
          continue;
        }
        
        // No user images - generate an AI illustration
        if (chapter.illustrationPrompt) {
          const imageUrl = await generateChapterIllustration(
            chapter.illustrationPrompt, 
            settings.imageStyle
          );
          
          if (imageUrl) {
            updatedChaptersWithImages[i] = { 
              ...chapter, 
              generatedImageUrl: imageUrl
            };
            setChapters([...updatedChaptersWithImages]);
            onUpdate([...updatedChaptersWithImages]);
          }
          
          imagesGenerated++;
          setGenerationProgress({ current: imagesGenerated, total: chaptersNeedingImages.length });
        }
      }

      // === STEP 4: DONE ===
      setGenerationStep('done');
      
      // Reset to idle after a short delay
      setTimeout(() => {
        setGenerationStep('idle');
      }, 2000);

      return updatedChaptersWithImages;
    } catch (error) {
      console.error('Story generation error:', error);
      setGenerationStep('idle');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [onUpdate]);

  const syncChapters = useCallback((externalChapters: Chapter[]) => {
    setChapters(externalChapters);
  }, []);

  const resetGeneration = useCallback(() => {
    setGenerationStep('idle');
    setGenerationProgress({ current: 0, total: 0 });
  }, []);

  return {
    chapters,
    isGenerating,
    generationStep,
    generationProgress,
    generateStory,
    syncChapters,
    resetGeneration
  };
}

