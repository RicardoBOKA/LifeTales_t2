import { useState, useCallback } from 'react';
import { Chapter, Note, StorySettings, DEFAULT_SETTINGS } from '../types';
import { generateStoryFromNotes, generateChapterIllustration } from '../services/gemini';
import { fileStorage } from '../services/fileStorage';

/**
 * Generation workflow steps
 */
export type GenerationStep = 
  | 'idle'
  | 'analyzing'   // Analyzing notes...
  | 'writing'     // Writing story...
  | 'images'      // Processing images...
  | 'done';       // Complete

export interface GenerationProgress {
  step: GenerationStep;
  currentChapter?: number;
  totalChapters?: number;
  message: string;
}

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: '',
  analyzing: 'Analyzing your moments...',
  writing: 'Crafting your story...',
  images: 'Processing images...',
  done: 'Story complete!'
};

export function useStoryGeneration(
  initialChapters: Chapter[],
  onUpdate: (chapters: Chapter[]) => void
) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    step: 'idle',
    message: ''
  });

  /**
   * Update progress state
   */
  const updateProgress = (step: GenerationStep, extra?: Partial<GenerationProgress>) => {
    setProgress({
      step,
      message: STEP_MESSAGES[step],
      ...extra
    });
  };

  /**
   * Resolve user image URLs from fileStorage
   */
  const resolveUserImageUrls = async (imageIds: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const id of imageIds) {
      const url = await fileStorage.getFileUrl(id);
      if (url) urls.push(url);
    }
    return urls;
  };

  /**
   * Main story generation function with workflow feedback
   */
  const generateStory = useCallback(async (
    notes: Note[], 
    spaceTitle: string,
    settings: StorySettings = DEFAULT_SETTINGS
  ) => {
    setIsGenerating(true);
    setChapters([]); // Clear existing chapters to show workflow
    onUpdate([]);

    try {
      // ========== STEP 1: ANALYZING ==========
      updateProgress('analyzing');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
      
      // ========== STEP 2: WRITING ==========
      updateProgress('writing');
      
      const generatedChapters = await generateStoryFromNotes(
        notes, 
        spaceTitle, 
        settings
      );
      
      // Initial update with chapters (no images yet)
      setChapters(generatedChapters);
      onUpdate(generatedChapters);

      // ========== STEP 3: IMAGES ==========
      updateProgress('images', { 
        currentChapter: 0, 
        totalChapters: generatedChapters.length 
      });
      
      const updatedChapters = [...generatedChapters];
      let generatedImagesCount = 0;
      
      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i];
        
        updateProgress('images', {
          currentChapter: i + 1,
          totalChapters: updatedChapters.length,
          message: `Processing images (${i + 1}/${updatedChapters.length})...`
        });
        
        // Check if chapter has user images
        const hasUserImages = chapter.userImageIds && chapter.userImageIds.length > 0;
        
        if (hasUserImages) {
          // Resolve all user image URLs
          const userImageUrls = await resolveUserImageUrls(chapter.userImageIds!);
          updatedChapters[i] = { 
            ...chapter, 
            userImageUrls 
          };
        } else {
          // No user images - generate AI illustration if allowed
          // Respect imagesPerChapter limit for AI generation
          const shouldGenerate = generatedImagesCount < settings.imagesPerChapter * updatedChapters.length;
          
          if (shouldGenerate && chapter.illustrationPrompt) {
            const generatedUrl = await generateChapterIllustration(
              chapter.illustrationPrompt,
              settings.imageStyle
            );
            
            if (generatedUrl) {
              updatedChapters[i] = {
                ...chapter,
                generatedImageUrl: generatedUrl
              };
              generatedImagesCount++;
            }
          }
        }
        
        // Update state progressively
        setChapters([...updatedChapters]);
        onUpdate([...updatedChapters]);
      }

      // ========== DONE ==========
      updateProgress('done');
      
      // Reset to idle after a brief moment
      setTimeout(() => {
        updateProgress('idle');
      }, 2000);

      return updatedChapters;
    } catch (error) {
      console.error('Story generation error:', error);
      updateProgress('idle');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [onUpdate]);

  /**
   * Sync chapters from external source
   */
  const syncChapters = useCallback((externalChapters: Chapter[]) => {
    setChapters(externalChapters);
  }, []);

  /**
   * Reset progress to idle
   */
  const resetProgress = useCallback(() => {
    updateProgress('idle');
  }, []);

  return {
    chapters,
    isGenerating,
    progress,
    generateStory,
    syncChapters,
    resetProgress
  };
}
