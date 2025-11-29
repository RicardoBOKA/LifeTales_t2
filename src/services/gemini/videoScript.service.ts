import { Type } from "@google/genai";
import { ai, hasApiKey } from './geminiClient';
import { Chapter, Note, StorySettings } from '../../types';

export interface VideoSceneScript {
  chapterId?: string;
  narrationText: string;
  visualDescription: string;
  durationSeconds: number;
  transition: 'fade' | 'slide' | 'zoom';
}

export interface VideoScript {
  title: string;
  totalDurationSeconds: number;
  scenes: VideoSceneScript[];
  musicMood: 'upbeat' | 'calm' | 'emotional' | 'dramatic' | 'neutral';
}

/**
 * Generate a video narration script from story chapters
 * This optimizes the story content for spoken narration
 */
export const generateVideoScript = async (
  chapters: Chapter[],
  spaceTitle: string,
  settings: StorySettings
): Promise<VideoScript> => {
  if (chapters.length === 0) {
    throw new Error('No chapters provided for video script generation');
  }
  
  if (!hasApiKey()) {
    console.warn("API_KEY is missing. Video script generation mocked.");
    return {
      title: spaceTitle,
      totalDurationSeconds: chapters.length * 10,
      musicMood: 'neutral',
      scenes: chapters.map((chapter, idx) => ({
        chapterId: chapter.sourceNoteId,
        narrationText: chapter.content.substring(0, 200) + '...',
        visualDescription: chapter.illustrationPrompt || 'Scene description',
        durationSeconds: 10,
        transition: 'fade' as const
      }))
    };
  }

  const chaptersContext = chapters.map((ch, idx) => `
=== CHAPTER ${idx + 1}: ${ch.title} ===
Content: ${ch.content}
Visual: ${ch.illustrationPrompt || 'No visual description'}
Has Images: ${ch.userImageIds && ch.userImageIds.length > 0 ? 'Yes' : 'No'}
Has AI Image: ${ch.generatedImageUrl ? 'Yes' : 'No'}
`).join('\n\n');

  const prompt = `
You are a professional video script writer creating a narrated video for a personal story titled "${spaceTitle}".

The video will have:
- Voice narration read by text-to-speech
- Visual scenes (photos or AI-generated images)
- Background music
- Smooth transitions between scenes

TONE: ${settings.narrativeTone}

=== STORY CHAPTERS ===
${chaptersContext}
=== END CHAPTERS ===

YOUR TASK:
Create a video script with scenes. For each scene:
1. Write NARRATION text optimized for voice reading:
   - Use natural, spoken language (avoid complex punctuation)
   - Write in complete sentences that flow well when spoken
   - Keep sentences medium length (not too long or choppy)
   - Aim for 15-30 seconds of narration per scene
   - Make it engaging and emotional where appropriate

2. Describe the VISUAL for that scene:
   - What should be shown during this narration
   - Reference if we have user photos or need AI generation
   - Keep it vivid but concise

3. Set the DURATION (in seconds):
   - Based on narration length (estimate ~150 words per minute)
   - Minimum 8 seconds, maximum 45 seconds per scene

4. Choose a TRANSITION effect:
   - fade: Gentle cross-fade (most common)
   - slide: Side-to-side slide
   - zoom: Zoom in/out effect

5. Select overall MUSIC MOOD:
   - upbeat: Energetic, positive
   - calm: Peaceful, relaxed
   - emotional: Touching, sentimental
   - dramatic: Intense, powerful
   - neutral: Balanced background

IMPORTANT:
- Create one scene per chapter (${chapters.length} scenes total)
- Keep the narration conversational and easy to listen to
- Total video should be ${Math.max(3, chapters.length * 0.75)} to ${chapters.length * 2} minutes
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            totalDurationSeconds: { type: Type.NUMBER },
            musicMood: { 
              type: Type.STRING,
              enum: ['upbeat', 'calm', 'emotional', 'dramatic', 'neutral']
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  narrationText: { type: Type.STRING },
                  visualDescription: { type: Type.STRING },
                  durationSeconds: { type: Type.NUMBER },
                  transition: {
                    type: Type.STRING,
                    enum: ['fade', 'slide', 'zoom']
                  }
                },
                required: ['narrationText', 'visualDescription', 'durationSeconds', 'transition']
              }
            }
          },
          required: ['title', 'totalDurationSeconds', 'musicMood', 'scenes']
        }
      }
    });

    const jsonStr = response.text || '{}';
    const script = JSON.parse(jsonStr) as VideoScript;
    
    // Map scenes back to chapters
    script.scenes = script.scenes.map((scene, idx) => ({
      ...scene,
      chapterId: chapters[idx]?.sourceNoteId
    }));
    
    return script;

  } catch (error) {
    console.error("Video script generation error:", error);
    throw error;
  }
};

