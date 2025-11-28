import { ai, hasApiKey } from './geminiClient';

/**
 * Transcription Agent
 * Transcribes audio to text using Gemini
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    // Ensure clean mimeType (e.g. 'audio/webm;codecs=opus' -> 'audio/webm')
    // The API sometimes rejects complex mime-types in inlineData causing XHR errors
    const cleanMimeType = mimeType.split(';')[0].trim();
    
    // Check for missing API key to avoid opaque 500 errors from the proxy
    if (!hasApiKey()) {
      console.warn("API_KEY is missing. Transcription mocked.");
      return "Transcription unavailable (Missing API Key).";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe this voice note accurately. Ignore background noise. If the speaker corrects themselves, output the corrected version. Do not add any preamble or explanation, just the transcript."
          }
        ]
      }
    });
    
    return response.text || "Transcription failed (no text returned).";
  } catch (error) {
    console.error("Transcription error details:", error);
    // Return a graceful error string so the UI flow continues
    return "Transcription unavailable (Network/API Error).";
  }
};

