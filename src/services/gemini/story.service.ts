import { Type } from "@google/genai";
import { ai, hasApiKey } from './geminiClient';
import { Chapter, Note, NoteType } from '../../types';
import { transcribeAudio } from './transcription.service';
import { analyzeImage, analyzeVideo } from './vision.service';
import { fileStorage } from '../fileStorage';

interface StorySettings {
  narrativeTone?: string;
  storyMode?: string;
  creativity?: number;
  imageStyle?: string;
}

interface EnrichedNote extends Note {
  imageDescriptions?: string[];
  videoDescriptions?: string[];
}

/**
 * Story Builder Agent
 * Generates story chapters from notes using Gemini
 */
export const generateStoryFromNotes = async (
  notes: Note[], 
  spaceTitle: string,
  settings?: StorySettings
): Promise<Chapter[]> => {
  if (notes.length === 0) return [];
  
  if (!hasApiKey()) {
    console.warn("API_KEY is missing. Story generation mocked.");
    return [{
      title: "Sample Chapter (Demo)",
      content: "This is a placeholder story because the API Key is missing. Please add your Gemini API Key to generate real stories from your notes.",
      illustrationPrompt: "A placeholder image"
    }];
  }

  console.log('🔍 Analyzing moments...');

  // Step 1: Enrich notes with transcriptions and vision analysis
  const enrichedNotes: EnrichedNote[] = await Promise.all(notes.map(async (note) => {
    const enriched: EnrichedNote = { ...note };
    
    // Transcribe audio files
    if (note.audioFileIds && note.audioFileIds.length > 0) {
      const needsTranscription = !note.transcriptions || note.transcriptions.length < note.audioFileIds.length;
      
      if (needsTranscription) {
        const transcriptions: string[] = note.transcriptions || [];
        
        for (let i = transcriptions.length; i < note.audioFileIds.length; i++) {
          const audioFileId = note.audioFileIds[i];
          const mediaFile = await fileStorage.getFile(audioFileId);
          
          if (mediaFile) {
            console.log(`🎤 Transcribing audio ${i + 1}...`);
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(mediaFile.blob);
            });
            
            const base64Audio = await base64Promise;
            const transcription = await transcribeAudio(base64Audio, mediaFile.mimeType);
            transcriptions.push(transcription);
          }
        }
        
        enriched.transcriptions = transcriptions;
      }
    }
    
    // Analyze images
    if (note.imageFileIds && note.imageFileIds.length > 0) {
      enriched.imageDescriptions = [];
      
      for (let i = 0; i < note.imageFileIds.length; i++) {
        const imageFileId = note.imageFileIds[i];
        const mediaFile = await fileStorage.getFile(imageFileId);
        
        if (mediaFile) {
          console.log(`📸 Analyzing image ${i + 1}...`);
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(mediaFile.blob);
          });
          
          const base64Image = await base64Promise;
          const description = await analyzeImage(base64Image, mediaFile.mimeType);
          enriched.imageDescriptions.push(description);
        }
      }
    }
    
    // Analyze videos
    if (note.videoFileIds && note.videoFileIds.length > 0) {
      enriched.videoDescriptions = [];
      
      for (let i = 0; i < note.videoFileIds.length; i++) {
        const videoFileId = note.videoFileIds[i];
        const mediaFile = await fileStorage.getFile(videoFileId);
        
        if (mediaFile) {
          console.log(`🎬 Analyzing video ${i + 1}...`);
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(mediaFile.blob);
          });
          
          const base64Video = await base64Promise;
          const description = await analyzeVideo(base64Video, mediaFile.mimeType);
          enriched.videoDescriptions.push(description);
        }
      }
    }
    
    return enriched;
  }));

  console.log('✨ Generating story...');

  // Step 2: Prepare enriched context from notes
  console.log('✨ Generating story...');

  // Step 2: Prepare enriched context from notes
  const context = enrichedNotes.map(n => {
    const parts: string[] = [];
    const timestamp = new Date(n.timestamp).toLocaleString();
    parts.push(`[${timestamp}]`);
    
    // Title
    if (n.title) {
      parts.push(`Title: ${n.title}`);
    }
    
    // Text content (keep as-is)
    if (n.textContent) {
      parts.push(`Caption: "${n.textContent}"`);
    }
    
    // Voice recordings with transcriptions
    if (n.audioFileIds && n.audioFileIds.length > 0 && n.transcriptions) {
      n.transcriptions.forEach((transcription, idx) => {
        parts.push(`🎤 Voice Recording ${idx + 1}: "${transcription}"`);
      });
    }
    
    // Images with AI descriptions
    if (n.imageDescriptions && n.imageDescriptions.length > 0) {
      n.imageDescriptions.forEach((description, idx) => {
        parts.push(`📸 Photo ${idx + 1}: ${description}`);
      });
    }
    
    // Videos with AI descriptions
    if (n.videoDescriptions && n.videoDescriptions.length > 0) {
      n.videoDescriptions.forEach((description, idx) => {
        parts.push(`🎬 Video ${idx + 1}: ${description}`);
      });
    }
    
    return parts.join("\n");
  }).join("\n\n---\n\n");

  // Build tone description
  const tone = settings?.narrativeTone || 'cinematic';
  const toneDescriptions: Record<string, string> = {
    cinematic: 'personal, slightly cinematic, and reflective',
    funny: 'lighthearted, humorous, and playful',
    neutral: 'clear, objective, and straightforward',
    emotional: 'warm, deeply personal, and heartfelt',
    journalistic: 'factual, observational, and descriptive',
    poetic: 'lyrical, metaphorical, and evocative'
  };

  // Build mode description
  const mode = settings?.storyMode || 'creative';
  const modeDescriptions: Record<string, string> = {
    clean: 'Keep the narrative very close to the original moments. Minimize embellishment and maintain factual accuracy.',
    creative: 'Add creative flourishes and narrative elements while staying true to the essence of the moments.',
    chapter: 'Structure the story with clear chapter breaks, thematic organization, and narrative arcs.'
  };

  // Build creativity temperature mapping
  const creativityMap = [0.3, 0.7, 1.0]; // Factual, Balanced, Expressive
  const temperature = creativityMap[settings?.creativity ?? 1];

  const prompt = `
    You are a professional writer and storyteller crafting a personal narrative.
    You are writing a story for the collection titled "${spaceTitle}".
    
    TONE: The narrative should be ${toneDescriptions[tone]}.
    APPROACH: ${modeDescriptions[mode]}
    
    Here are the chronological moments captured by the user:
    
    ${context}
    
    TASK: Transform these raw moments into a coherent, engaging narrative story.
    - Weave the moments together into a flowing narrative
    - Add context and transitions where appropriate
    - Structure the story into logical chapters or sections
    - ${mode === 'chapter' ? 'Create clear chapter breaks with descriptive titles' : 'Maintain narrative flow'}
    - Honor the voice recordings as direct quotes or inner thoughts
    - Reference photos and videos naturally in the narrative
    
    For each chapter, also provide a visual description (illustration prompt) that captures the essence of that section.
    The illustration style should be: ${settings?.imageStyle || 'illustration'}.
    
    Return the result strictly as a JSON array of chapter objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature,
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
