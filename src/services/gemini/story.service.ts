import { Type } from "@google/genai";
import { ai, hasApiKey } from './geminiClient';
import { Chapter, Note, StorySettings, DEFAULT_SETTINGS } from '../../types';

/**
 * Tone descriptions for the narrative
 */
const TONE_DESCRIPTIONS: Record<StorySettings['narrativeTone'], string> = {
  cinematic: 'cinematic and visually evocative, like a movie narration with dramatic pauses and vivid imagery',
  funny: 'light-hearted and humorous, finding the comedy in everyday moments with witty observations',
  neutral: 'balanced and factual, presenting events clearly without excessive embellishment',
  emotional: 'deeply emotional and introspective, focusing on feelings and personal growth',
  journalistic: 'documentary-style and informative, like a well-crafted travel article or memoir piece',
  poetic: 'lyrical and poetic, with beautiful prose, metaphors and literary flourishes'
};

/**
 * Image style descriptions for illustration prompts
 */
const IMAGE_STYLE_DESCRIPTIONS: Record<StorySettings['imageStyle'], string> = {
  illustration: 'soft watercolor illustration style with gentle colors',
  cinematic: 'cinematic photography style with dramatic lighting and composition',
  pastel: 'dreamy pastel artwork with soft, muted colors',
  realistic: 'photorealistic digital art with high detail'
};

/**
 * Build mode-specific instructions
 */
const getModeInstructions = (mode: StorySettings['storyMode'], notesCount: number): string => {
  switch (mode) {
    case 'transcription':
      return `
MODE: TRANSCRIPTION (Faithful)
- Create EXACTLY ${notesCount} sections, ONE for each note/moment
- Keep the original voice recordings and text as close to verbatim as possible
- Only fix grammar and flow, do not add creative embellishments
- Each section must reference its sourceNoteId
- Preserve all details from the original`;
    
    case 'clean':
      return `
MODE: CLEAN (Organized Summary)
- You may group related notes into fewer chapters if it makes sense
- Clean up and organize the content while preserving the original meaning
- Summarize the most relevant parts intelligently
- Create ${Math.max(1, Math.ceil(notesCount / 2))} to ${notesCount} chapters`;
    
    case 'creative':
      return `
MODE: CREATIVE (Artistic Freedom)
- Take creative liberty to enhance the story with vivid descriptions
- Use narrative techniques, metaphors, and storytelling devices
- You can reorganize content for dramatic effect
- Create a compelling narrative arc
- Aim for ${Math.max(2, Math.ceil(notesCount / 2))} chapters with strong themes`;
    
    case 'chapter':
    default:
      return `
MODE: CHAPTER (Structured & Complete)
- Create EXACTLY ${notesCount} sections, ONE distinct section for each note/moment
- Each section MUST have its sourceNoteId set to the note's ID
- Rewrite the content with proper narrative structure while keeping all information
- Give each section a compelling title that captures the moment
- Include ALL details from voice recordings, text, and note context
- This is a complete, multimodal story where every moment is represented`;
  }
};

/**
 * Prepare notes context with IDs for reference
 */
const prepareNotesContext = (notes: Note[]): string => {
  return notes.map((n, idx) => {
    const parts: string[] = [];
    const timestamp = new Date(n.timestamp).toLocaleString();
    
    parts.push(`=== NOTE ID: "${n.id}" ===`);
    parts.push(`Moment ${idx + 1} | ${timestamp}`);
    
    if (n.title) {
      parts.push(`Title: ${n.title}`);
    }
    
    if (n.textContent) {
      parts.push(`Text: ${n.textContent}`);
    }
    
    if (n.audioFileIds && n.audioFileIds.length > 0 && n.transcriptions) {
      n.transcriptions.forEach((transcription, i) => {
        parts.push(`Voice Recording ${i + 1}: "${transcription}"`);
      });
    }
    
    const imageCount = n.imageFileIds?.length || 0;
    if (imageCount > 0) {
      parts.push(`[Has ${imageCount} photo${imageCount > 1 ? 's' : ''} - IDs: ${n.imageFileIds!.join(', ')}]`);
    }
    
    const videoCount = n.videoFileIds?.length || 0;
    if (videoCount > 0) {
      parts.push(`[Has ${videoCount} video${videoCount > 1 ? 's' : ''}]`);
    }
    
    return parts.join('\n');
  }).join('\n\n---\n\n');
};

/**
 * Story Builder Agent
 * Generates story chapters from notes using Gemini with configurable settings
 */
export const generateStoryFromNotes = async (
  notes: Note[], 
  spaceTitle: string, 
  settings: StorySettings = DEFAULT_SETTINGS
): Promise<Chapter[]> => {
  if (notes.length === 0) return [];
  
  if (!hasApiKey()) {
    console.warn("API_KEY is missing. Story generation mocked.");
    return notes.map((note, idx) => ({
      title: note.title || `Moment ${idx + 1}`,
      content: "This is a placeholder story because the API Key is missing. Please add your Gemini API Key to generate real stories from your notes.",
      illustrationPrompt: "A placeholder image",
      sourceNoteId: note.id,
      userImageIds: note.imageFileIds || []
    }));
  }

  const context = prepareNotesContext(notes);
  const modeInstructions = getModeInstructions(settings.storyMode, notes.length);

  const prompt = `
You are a professional writer crafting a personal story for "${spaceTitle}".

TONE: ${TONE_DESCRIPTIONS[settings.narrativeTone]}

${modeInstructions}

=== SOURCE MATERIAL ===

${context}

=== END SOURCE MATERIAL ===

CRITICAL INSTRUCTIONS:
1. Write with a ${settings.narrativeTone} tone throughout
2. For illustration prompts, describe scenes in "${IMAGE_STYLE_DESCRIPTIONS[settings.imageStyle]}" style
3. The sourceNoteId field MUST contain the exact note ID from the source material
4. Return a JSON array of chapter objects

Each chapter object must have:
- title: A compelling chapter/section title
- content: The narrative content (multiple paragraphs allowed)
- illustrationPrompt: Visual description for AI image generation
- sourceNoteId: The ID of the source note (from "NOTE ID: xxx" in the source)
`;

  try {
    const temperature = Math.min(1.5, settings.creativity * 0.75);
    
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
              illustrationPrompt: { type: Type.STRING },
              sourceNoteId: { type: Type.STRING, nullable: true }
            },
            required: ["title", "content", "illustrationPrompt"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    const rawChapters = JSON.parse(jsonStr) as Array<{
      title: string;
      content: string;
      illustrationPrompt: string;
      sourceNoteId?: string;
    }>;
    
    // Post-process: attach user images from source notes
    const chapters: Chapter[] = rawChapters.map(ch => {
      const sourceNote = notes.find(n => n.id === ch.sourceNoteId);
      return {
        title: ch.title,
        content: ch.content,
        illustrationPrompt: ch.illustrationPrompt,
        sourceNoteId: ch.sourceNoteId,
        userImageIds: sourceNote?.imageFileIds || [],
        generatedImageUrl: undefined
      };
    });
    
    return chapters;

  } catch (error) {
    console.error("Story generation error:", error);
    throw error;
  }
};
