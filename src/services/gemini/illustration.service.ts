import { ai, hasApiKey } from './geminiClient';
import { StorySettings } from '../../types';

/**
 * Style prompt templates for different image styles
 */
const STYLE_PROMPTS: Record<StorySettings['imageStyle'], string> = {
  illustration: 'Create a soft watercolor illustration with gentle brush strokes, warm and inviting colors, artistic and dreamlike quality.',
  cinematic: 'Create a cinematic photograph with dramatic lighting, professional composition, shallow depth of field, movie-like atmosphere.',
  pastel: 'Create a dreamy pastel artwork with soft muted colors, gentle gradients, ethereal and calming aesthetic.',
  realistic: 'Create a photorealistic digital artwork with high detail, natural lighting, lifelike textures and accurate proportions.'
};

/**
 * Visual Agent
 * Generates illustrations for story chapters using Gemini with configurable style
 */
export const generateChapterIllustration = async (
  prompt: string, 
  imageStyle: StorySettings['imageStyle'] = 'illustration'
): Promise<string | undefined> => {
  if (!hasApiKey()) return undefined;

  const stylePrompt = STYLE_PROMPTS[imageStyle];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `${stylePrompt} Subject: ${prompt}` }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: "4:3", // Good for story books
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
         return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    return undefined;

  } catch (error) {
    console.error("Image generation error:", error);
    return undefined; // Fail gracefully
  }
};

