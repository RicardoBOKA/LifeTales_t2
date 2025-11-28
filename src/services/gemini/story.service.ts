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

  // Prepare context from notes
  const context = notes.map(n => {
    let content = "";
    if (n.type === NoteType.AUDIO) content = `[Voice Note]: ${n.transcription || '(No transcription)'}`;
    else if (n.type === NoteType.TEXT) content = `[Text Note]: ${n.content}`;
    else if (n.type === NoteType.IMAGE) content = `[Image uploaded at ${new Date(n.timestamp).toLocaleTimeString()}]`;
    
    return `Timestamp: ${new Date(n.timestamp).toLocaleString()}\n${content}`;
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

