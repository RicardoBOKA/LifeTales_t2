import { ai, hasApiKey } from './geminiClient';
import { StorySettings } from '../../types';

/**
 * Get style prompt based on imageStyle setting
 */
const getStylePrompt = (style: StorySettings['imageStyle']): string => {
  const styles: Record<StorySettings['imageStyle'], string> = {
    illustration: 'artistic illustration, clean bold lines, warm vibrant colors, professional editorial style',
    cinematic: 'cinematic film still, dramatic lighting, shallow depth of field, movie-quality composition',
    pastel: 'soft pastel colors, dreamy watercolor aesthetic, gentle brushstrokes, ethereal atmosphere',
    realistic: 'photorealistic, highly detailed, natural lighting, sharp focus'
  };
  return styles[style];
};

/**
 * Visual Agent
 * Generates illustrations for story chapters using Gemini
 */
export const generateChapterIllustration = async (
  prompt: string,
  style: StorySettings['imageStyle'] = 'illustration'
): Promise<string | undefined> => {
  if (!hasApiKey()) return undefined;

  const stylePrompt = getStylePrompt(style);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create an image in this style: ${stylePrompt}. Subject: ${prompt}` }
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
