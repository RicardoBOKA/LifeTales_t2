import { GoogleGenAI, Type } from "@google/genai";
import { Chapter, Note, NoteType } from "../types";

// Initialize the API client
// Note: In a real app, ensure process.env.API_KEY is defined.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// ---------------------------------------------------------
// 1. Transcription Agent
// ---------------------------------------------------------
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe this voice note accurately. Ignore background noise. If the speaker corrects themselves, output the corrected version. Do not add any preamble or explanation, just the transcript."
          }
        ]
      }
    });
    
    return response.text || "Transcription failed.";
  } catch (error) {
    console.error("Transcription error:", error);
    return "Error transcribing audio.";
  }
};

// ---------------------------------------------------------
// 2. Story Builder Agent
// ---------------------------------------------------------
export const generateStoryFromNotes = async (notes: Note[], spaceTitle: string): Promise<Chapter[]> => {
  if (notes.length === 0) return [];

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

// ---------------------------------------------------------
// 3. Visual Agent
// ---------------------------------------------------------
export const generateChapterIllustration = async (prompt: string): Promise<string | undefined> => {
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
