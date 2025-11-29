import { Type } from "@google/genai";
import { ai, hasApiKey } from './geminiClient';
import { Chapter, Note, NoteType, StorySettings, DEFAULT_SETTINGS } from '../../types';

/**
 * Get tone instruction based on narrativeTone setting
 */
const getToneInstruction = (tone: StorySettings['narrativeTone']): string => {
  const tones: Record<StorySettings['narrativeTone'], string> = {
    cinematic: 'Use a cinematic, dramatic tone with vivid imagery and tension. Write like a movie narrator.',
    funny: 'Use a light, humorous tone. Add wit and playful observations. Make the reader smile.',
    neutral: 'Use a balanced, clear tone. Be informative and straightforward without excessive emotion.',
    emotional: 'Use a deeply emotional, heartfelt tone. Focus on feelings, connections, and meaningful moments.',
    journalistic: 'Use a factual, documentary-style tone. Report events clearly with objective observations.',
    poetic: 'Use a lyrical, poetic tone. Employ metaphors, rhythm, and beautiful prose.'
  };
  return tones[tone];
};

/**
 * Get mode instruction based on storyMode setting
 */
const getModeInstruction = (mode: StorySettings['storyMode']): string => {
  const modes: Record<StorySettings['storyMode'], string> = {
    transcription: `IMPORTANT: Your task is to faithfully transcribe and organize the voice notes. 
      Do NOT rewrite or embellish the content. Keep the original words and expressions as much as possible.
      Simply clean up filler words and organize chronologically. Preserve the speaker's authentic voice.`,
    clean: `Rewrite the content in a clean, polished way while staying faithful to the original meaning.
      Fix grammar, remove redundancies, but keep the core message and personal voice intact.`,
    creative: `Transform these fragments into a creative narrative, like a short story or novel excerpt.
      You have freedom to embellish, add transitions, and create a compelling narrative arc.`,
    chapter: `Structure the content into distinct thematic chapters. Each chapter should have a clear focus.
      Create smooth transitions between chapters and build a coherent overall narrative.`
  };
  return modes[mode];
};

/**
 * Get image style instruction for illustration prompts
 */
const getImageStyleInstruction = (style: StorySettings['imageStyle']): string => {
  const styles: Record<StorySettings['imageStyle'], string> = {
    illustration: 'artistic illustration with clean lines and warm colors',
    cinematic: 'cinematic film still with dramatic lighting and composition',
    pastel: 'soft pastel colors, dreamy watercolor aesthetic',
    realistic: 'photorealistic, highly detailed'
  };
  return styles[style];
};

/**
 * Extract user images from notes (IMAGE type or attachedImageUrl on audio notes)
 */
export const extractUserImages = (notes: Note[]): Array<{ timestamp: number; imageUrl: string }> => {
  const images: Array<{ timestamp: number; imageUrl: string }> = [];
  
  for (const note of notes) {
    // Image notes
    if (note.type === NoteType.IMAGE && note.content) {
      images.push({ timestamp: note.timestamp, imageUrl: note.content });
    }
    // Audio notes with attached images
    if (note.attachedImageUrl) {
      images.push({ timestamp: note.timestamp, imageUrl: note.attachedImageUrl });
    }
  }
  
  return images.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Story Builder Agent
 * Generates story chapters from notes using Gemini
 */
export const generateStoryFromNotes = async (
  notes: Note[], 
  spaceTitle: string,
  settings: StorySettings = DEFAULT_SETTINGS
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

  // Extract user images for later assignment
  const userImages = extractUserImages(notes);

  // Prepare context from notes
  const context = notes.map(n => {
    let content = "";
    if (n.type === NoteType.AUDIO) {
      content = `[Voice Note]: ${n.transcription || '(No transcription)'}`;
      if (n.attachedImageUrl) content += `\n[Photo attached to this voice note]`;
    }
    else if (n.type === NoteType.TEXT) content = `[Text Note]: ${n.content}`;
    else if (n.type === NoteType.IMAGE) content = `[Photo taken at this moment]`;
    
    // Include user title/description if provided
    const meta = [];
    if (n.title && n.title !== 'Voice Note' && n.title !== 'Text Note' && n.title !== 'Image Note') {
      meta.push(`Title: "${n.title}"`);
    }
    if (n.description) meta.push(`Description: "${n.description}"`);
    
    const metaStr = meta.length > 0 ? `\n${meta.join(' | ')}` : '';
    
    return `Timestamp: ${new Date(n.timestamp).toLocaleString()}${metaStr}\n${content}`;
  }).join("\n\n---\n\n");

  // Build dynamic prompt based on settings
  const toneInstruction = getToneInstruction(settings.narrativeTone);
  const modeInstruction = getModeInstruction(settings.storyMode);
  const imageStyleInstruction = getImageStyleInstruction(settings.imageStyle);

  const prompt = `
You are a skilled writer crafting a personal story for the collection "${spaceTitle}".

## Writing Style
${toneInstruction}

## Task
${modeInstruction}

## Source Material
Here are the raw memory fragments (notes, transcriptions, moments) collected by the user:

${context}

## Instructions
1. Transform these fragments according to the task above
2. Structure into logical sections/chapters based on time or themes
3. For each chapter, provide a visual description (illustrationPrompt) for an image in this style: "${imageStyleInstruction}"
4. Note: Some moments have photos attached - consider these when writing, as they capture important visual moments

Return the result strictly as a JSON array of chapter objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: settings.creativity, // 0-2 range maps directly to Gemini temperature
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
    let chapters = JSON.parse(jsonStr) as Chapter[];

    // Assign user images to chapters (distribute evenly)
    if (userImages.length > 0 && chapters.length > 0) {
      const imagesPerChapter = Math.ceil(userImages.length / chapters.length);
      let imageIndex = 0;
      
      chapters = chapters.map((chapter, idx) => {
        // Assign first available user image to this chapter if any remain
        if (imageIndex < userImages.length) {
          const assignedImage = userImages[imageIndex];
          imageIndex++;
          return { ...chapter, userImageUrl: assignedImage.imageUrl };
        }
        return chapter;
      });
    }

    return chapters;

  } catch (error) {
    console.error("Story generation error:", error);
    throw error;
  }
};
