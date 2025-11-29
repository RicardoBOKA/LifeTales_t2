import { Type } from "@google/genai";
import { ai, hasApiKey } from './geminiClient';
import { Chapter, Note, NoteType } from '../../types';

/**
 * Story Builder Agent
 * Generates story chapters from notes using Gemini
 */
export const generateStoryFromNotes = async (notes: Note[], spaceTitle: string): Promise<Chapter[]> => {
  if (notes.length === 0) return [];
  
  if (!hasApiKey()) {
    console.warn("API_KEY is missing. Story generation mocked.");
    return [{
      title: "Sample Chapter (Demo)",
      content: "This is a placeholder story because the API Key is missing. Please add your Gemini API Key to generate real stories from your notes.",
      illustrationPrompt: "A placeholder image"
    }];
  }

  // Prepare context from notes with new structure
  const context = notes.map(n => {
    const parts: string[] = [];
    const timestamp = new Date(n.timestamp).toLocaleString();
    parts.push(timestamp);
    
    // Text content
    if (n.textContent) {
      parts.push(`Text: ${n.textContent}`);
    }
    
    // Voice recordings (multiple)
    if (n.audioFileIds && n.audioFileIds.length > 0) {
      n.transcriptions?.forEach((transcription, idx) => {
        parts.push(`Voice ${idx + 1}: ${transcription}`);
      });
    }
    
    // Images
    if (n.imageFileIds && n.imageFileIds.length > 0) {
      const count = n.imageFileIds.length;
      parts.push(`[${count} Photo${count > 1 ? 's' : ''}]`);
    }
    
    // Videos
    if (n.videoFileIds && n.videoFileIds.length > 0) {
      const count = n.videoFileIds.length;
      parts.push(`[${count} Video${count > 1 ? 's' : ''}]`);
    }
    
    return parts.join("\n");
  }).join("\n\n---\n\n");

  const prompt = `
    You are a professional travel writer and ghostwriter. 
    You are writing a story for the collection "${spaceTitle}".
    
    Here are the raw memory fragments (notes, transcriptions, moments) collected by the user:
    
    ${context}
    
    Goal: Transform these fragments into a coherent, warm, and engaging narrative. 
    Structure the story into logical chapters based on time or themes.
    The tone should be personal, slightly cinematic, and reflective.
    
    For each chapter, also provide a short visual description (prompt) that could be used to generate an illustration (e.g., "watercolor painting of a busy Tokyo street in rain").
    
    Return the result strictly as a JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              illustrationPrompt: { type: Type.STRING }
            },
            required: ["title", "content", "illustrationPrompt"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr) as Chapter[];

  } catch (error) {
    console.error("Story generation error:", error);
    throw error;
  }
};
