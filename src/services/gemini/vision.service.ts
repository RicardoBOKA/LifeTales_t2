import { ai, hasApiKey } from './geminiClient';

/**
 * Analyze an image using Gemini Vision
 * Returns a detailed description of what's in the image
 */
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!hasApiKey()) {
    return "Image description unavailable (API key missing)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            },
            {
              text: 'Describe this image in detail. Focus on: the scene, people (if any), emotions, atmosphere, colors, notable objects, and any text visible. Be descriptive but concise (2-3 sentences).'
            }
          ]
        }
      ]
    });

    return response.text || "Unable to analyze image";
  } catch (error) {
    console.error('Image analysis error:', error);
    return "Image analysis failed";
  }
};

/**
 * Analyze a video using Gemini Vision
 * Returns a description of what happens in the video
 */
export const analyzeVideo = async (base64Video: string, mimeType: string): Promise<string> => {
  if (!hasApiKey()) {
    return "Video description unavailable (API key missing)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Video,
                mimeType: mimeType
              }
            },
            {
              text: 'Describe what happens in this video. Focus on: the main action, people and their activities, the setting, atmosphere, and any significant moments. Be descriptive but concise (2-3 sentences).'
            }
          ]
        }
      ]
    });

    return response.text || "Unable to analyze video";
  } catch (error) {
    console.error('Video analysis error:', error);
    return "Video analysis failed";
  }
};

