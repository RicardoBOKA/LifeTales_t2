import { ai, hasApiKey } from './geminiClient';
import { Note } from '../../types';
import { transcribeAudio } from './transcription.service';
import { analyzeImage, analyzeVideo } from './vision.service';
import { fileStorage } from '../fileStorage';

export interface VideoScene {
  startTime: number;
  duration: number;
  narration: string;
  visualDescription: string;
  musicMood: string;
}

export interface VlogScript {
  title: string;
  totalDuration: number;
  scenes: VideoScene[];
  musicPrompt: string;
  voiceStyle: string;
}

interface EnrichedNote extends Note {
  imageDescriptions?: string[];
  videoDescriptions?: string[];
}

/**
 * Generate a vlog script from moments
 * This creates a structured video narrative with scenes, narration, and visual descriptions
 */
export const generateVlogScript = async (
  notes: Note[],
  spaceTitle: string,
  settings?: {
    narrativeTone?: string;
    voiceStyle?: string;
    duration?: 'short' | 'medium' | 'long'; // 1-2min, 3-5min, 5-10min
  }
): Promise<VlogScript> => {
  if (notes.length === 0) {
    throw new Error('No moments to generate vlog from');
  }

  if (!hasApiKey()) {
    throw new Error('API key is required for vlog generation');
  }

  console.log('🎬 Analyzing moments for vlog...');

  // Step 1: Enrich notes with all media analysis
  const enrichedNotes: EnrichedNote[] = await Promise.all(notes.map(async (note) => {
    const enriched: EnrichedNote = { ...note };
    
    // Transcribe audio
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

  console.log('🎥 Generating vlog script...');

  // Step 2: Build context for vlog generation
  const momentsContext = enrichedNotes.map(n => {
    const parts: string[] = [];
    const timestamp = new Date(n.timestamp).toLocaleString();
    parts.push(`[${timestamp}]`);
    
    if (n.title) parts.push(`Title: ${n.title}`);
    if (n.textContent) parts.push(`Caption: "${n.textContent}"`);
    
    if (n.transcriptions && n.transcriptions.length > 0) {
      n.transcriptions.forEach((t, idx) => {
        parts.push(`Voice ${idx + 1}: "${t}"`);
      });
    }
    
    if (n.imageDescriptions && n.imageDescriptions.length > 0) {
      n.imageDescriptions.forEach((d, idx) => {
        parts.push(`Photo ${idx + 1}: ${d}`);
      });
    }
    
    if (n.videoDescriptions && n.videoDescriptions.length > 0) {
      n.videoDescriptions.forEach((d, idx) => {
        parts.push(`Video ${idx + 1}: ${d}`);
      });
    }
    
    return parts.join("\n");
  }).join("\n\n---\n\n");

  const tone = settings?.narrativeTone || 'cinematic';
  const duration = settings?.duration || 'medium';
  const voiceStyle = settings?.voiceStyle || 'warm';

  const durationGuide = {
    short: '1-2 minutes (3-5 scenes)',
    medium: '3-5 minutes (6-10 scenes)',
    long: '5-10 minutes (10-15 scenes)'
  };

  const prompt = `
You are a professional vlog editor and storyteller. Create a compelling video vlog script from these travel moments.

VLOG TITLE: "${spaceTitle}"
TARGET DURATION: ${durationGuide[duration]}
TONE: ${tone}
VOICE STYLE: ${voiceStyle}

RAW MOMENTS:
${momentsContext}

TASK: Create a structured vlog script with the following:

1. SCENES: Break the story into visual scenes (each 10-30 seconds)
   - Each scene should have a specific visual focus
   - Include what should be shown on screen
   - Write engaging narration for voiceover
   - Specify the mood/emotion for music

2. NARRATION: Write natural, engaging voiceover script
   - Conversational tone, like talking to a friend
   - Reference the actual moments and details
   - Use direct quotes from voice recordings where appropriate
   - Keep it personal and authentic

3. VISUALS: Describe what should be shown in each scene
   - Reference the actual photos/videos when available
   - Describe transitions and pacing
   - Include text overlays or titles if needed

4. MUSIC: Provide an overall music prompt and mood for each scene
   - Should match the emotional arc of the story

Return a JSON object with this structure:
{
  "title": "Vlog title",
  "totalDuration": estimated_seconds,
  "scenes": [
    {
      "startTime": seconds_from_start,
      "duration": scene_duration_seconds,
      "narration": "What the narrator says during this scene",
      "visualDescription": "Detailed description of what's shown on screen",
      "musicMood": "emotional mood for this scene (e.g., 'upbeat', 'reflective', 'dramatic')"
    }
  ],
  "musicPrompt": "Overall description for background music generation (e.g., 'uplifting acoustic guitar with gentle percussion, travel vlog style')",
  "voiceStyle": "${voiceStyle}"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    });

    const jsonStr = response.text || "{}";
    const vlogScript = JSON.parse(jsonStr) as VlogScript;
    
    console.log('✅ Vlog script generated:', vlogScript);
    return vlogScript;

  } catch (error) {
    console.error('Vlog generation error:', error);
    throw error;
  }
};

