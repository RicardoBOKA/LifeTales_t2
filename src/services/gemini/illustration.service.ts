import { ai, hasApiKey } from './geminiClient';

/**
 * Visual Agent
 * Generates illustrations for story chapters using Gemini
 */
export const generateChapterIllustration = async (prompt: string): Promise<string | undefined> => {
  if (!hasApiKey()) return undefined;

  try {
    // Using gemini-2.5-flash-image as requested for general image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create an artistic illustration, soft watercolor style, warm lighting. Subject: ${prompt}` }
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

