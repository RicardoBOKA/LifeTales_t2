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
 * Build note context for prompt
 */
function buildNoteContext(note: Note, index: number): string {
  const parts: string[] = [];
  const timestamp = new Date(note.timestamp).toLocaleString();
  parts.push(`[Note ID: ${note.id}] [Moment ${index + 1}] ${timestamp}`);
  
  if (note.title) {
    parts.push(`Title: ${note.title}`);
  }
  
  if (note.textContent) {
    parts.push(`Text: ${note.textContent}`);
  }
  
  if (note.audioFileIds && note.audioFileIds.length > 0) {
    note.transcriptions?.forEach((transcription, idx) => {
      parts.push(`Voice Recording ${idx + 1}: "${transcription}"`);
    });
  }
  
  if (note.imageFileIds && note.imageFileIds.length > 0) {
    parts.push(`[${note.imageFileIds.length} Photo(s) attached - IDs: ${note.imageFileIds.join(', ')}]`);
  }
  
  if (note.videoFileIds && note.videoFileIds.length > 0) {
    parts.push(`[${note.videoFileIds.length} Video(s) attached]`);
  }
  
  return parts.join("\n");
}

/**
 * Mode-specific prompt builders
 */
const MODE_PROMPTS = {
  /**
   * TRANSCRIPTION mode: Faithful to original, 1 section per note
   */
  transcription: (notes: Note[], spaceTitle: string, settings: StorySettings) => {
    const context = notes.map((n, i) => buildNoteContext(n, i)).join("\n\n---\n\n");
    
    return `
You are transcribing memories for "${spaceTitle}".

STYLE: ${TONE_DESCRIPTIONS[settings.narrativeTone]} tone, but staying FAITHFUL to the original words.

NOTES TO TRANSCRIBE:
${context}

INSTRUCTIONS:
- Create EXACTLY ${notes.length} sections, one for each note/moment
- Keep the original voice recordings and text as close to verbatim as possible
- Only fix grammar and improve flow slightly
- Each section must include the sourceNoteId matching the Note ID provided
- For illustrationPrompt, describe the scene in "${IMAGE_STYLE_DESCRIPTIONS[settings.imageStyle]}" style

Return a JSON array with ${notes.length} chapters.
`;
  },

  /**
   * CLEAN mode: Summarizes intelligently, can group notes
   */
  clean: (notes: Note[], spaceTitle: string, settings: StorySettings) => {
    const context = notes.map((n, i) => buildNoteContext(n, i)).join("\n\n---\n\n");
    
    return `
You are organizing memories for "${spaceTitle}" into a clean narrative.

STYLE: ${TONE_DESCRIPTIONS[settings.narrativeTone]} tone.

NOTES:
${context}

INSTRUCTIONS:
- Clean up and organize the content while preserving original meaning
- You may group related notes into fewer chapters if it makes sense
- Remove redundancies but keep all important details
- Each chapter should reference at least one sourceNoteId
- For illustrationPrompt, describe scenes in "${IMAGE_STYLE_DESCRIPTIONS[settings.imageStyle]}" style
- Create ${Math.max(1, Math.ceil(notes.length / 2))} to ${notes.length} chapters

Return a JSON array.
`;
  },

  /**
   * CREATIVE mode: Free-form, artistic interpretation
   */
  creative: (notes: Note[], spaceTitle: string, settings: StorySettings) => {
    const context = notes.map((n, i) => buildNoteContext(n, i)).join("\n\n---\n\n");
    
    return `
You are a creative writer crafting an artistic story for "${spaceTitle}".

STYLE: ${TONE_DESCRIPTIONS[settings.narrativeTone]} tone with FULL CREATIVE LIBERTY.

SOURCE MATERIAL:
${context}

INSTRUCTIONS:
- Take creative liberty to transform these memories into a compelling narrative
- Add vivid descriptions, sensory details, and narrative techniques
- Create an original structure that serves the story best
- You can combine, rearrange, or reimagine the moments
- Make it feel like a published story or memoir
- Each chapter should still reference relevant sourceNoteId(s)
- For illustrationPrompt, create evocative scene descriptions in "${IMAGE_STYLE_DESCRIPTIONS[settings.imageStyle]}" style
- Create ${Math.max(1, Math.ceil(notes.length / 3))} to ${Math.ceil(notes.length / 2)} chapters

Return a JSON array.
`;
  },

  /**
   * CHAPTER mode: One distinct section per note with all its media
   */
  chapter: (notes: Note[], spaceTitle: string, settings: StorySettings) => {
    const context = notes.map((n, i) => buildNoteContext(n, i)).join("\n\n---\n\n");
    
    return `
You are creating a structured memory book for "${spaceTitle}".

STYLE: ${TONE_DESCRIPTIONS[settings.narrativeTone]} tone.

NOTES (each becomes ONE chapter):
${context}

CRITICAL INSTRUCTIONS:
- Create EXACTLY ${notes.length} chapters - ONE chapter for EACH note/moment
- Each chapter MUST have its sourceNoteId set to the corresponding Note ID
- Enhance and polish the content but keep each moment distinct
- Give each chapter a meaningful title based on its content
- The content should expand on the original while preserving its essence
- For illustrationPrompt, describe the scene in "${IMAGE_STYLE_DESCRIPTIONS[settings.imageStyle]}" style

This is a structured chapter-by-chapter memory book where every moment is preserved and enhanced.

Return a JSON array with EXACTLY ${notes.length} chapters in the same order as the notes.
`;
  }
};

/**
 * Story Builder Agent
 * Generates story chapters from notes using Gemini with mode-specific behavior
 */
export const generateStoryFromNotes = async (
  notes: Note[], 
  spaceTitle: string, 
  settings: StorySettings = DEFAULT_SETTINGS
): Promise<Chapter[]> => {
  if (notes.length === 0) return [];
  
  if (!hasApiKey()) {
    console.warn("API_KEY is missing. Story generation mocked.");
    // Return mock chapters matching notes for chapter mode
    return notes.map((note, i) => ({
      title: note.title || `Moment ${i + 1}`,
      content: "This is a placeholder. Please add your Gemini API Key to generate real stories.",
      illustrationPrompt: "A placeholder scene",
      sourceNoteId: note.id,
      sourceNoteTimestamp: note.timestamp,
      userImageIds: note.imageFileIds || []
    }));
  }

  // Get mode-specific prompt
  const promptBuilder = MODE_PROMPTS[settings.storyMode];
  const prompt = promptBuilder(notes, spaceTitle, settings);

  try {
    // Map creativity (0-2) to temperature (0.0-1.5)
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
      // Find the source note to get its images
      const sourceNote = ch.sourceNoteId 
        ? notes.find(n => n.id === ch.sourceNoteId)
        : undefined;
      
      return {
        title: ch.title,
        content: ch.content,
        illustrationPrompt: ch.illustrationPrompt,
        sourceNoteId: ch.sourceNoteId || undefined,
        sourceNoteTimestamp: sourceNote?.timestamp,
        userImageIds: sourceNote?.imageFileIds || []
      };
    });

    // For chapter mode, ensure we have all notes represented
    if (settings.storyMode === 'chapter' && chapters.length < notes.length) {
      console.warn(`Chapter mode: Expected ${notes.length} chapters, got ${chapters.length}. Adding missing...`);
      const coveredNoteIds = new Set(chapters.map(c => c.sourceNoteId).filter(Boolean));
      
      for (const note of notes) {
        if (!coveredNoteIds.has(note.id)) {
          chapters.push({
            title: note.title || `Moment`,
            content: note.textContent || note.transcriptions?.join('\n\n') || 'A captured moment.',
            illustrationPrompt: `Scene depicting: ${note.title || 'a personal moment'}`,
            sourceNoteId: note.id,
            sourceNoteTimestamp: note.timestamp,
            userImageIds: note.imageFileIds || []
          });
        }
      }
    }

    return chapters;

  } catch (error) {
    console.error("Story generation error:", error);
    throw error;
  }
};
