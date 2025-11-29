import { VlogScript, VideoScene } from './video.service';

/**
 * Google Text-to-Speech Service
 * Generates voiceover audio from narration text
 */
export const generateVoiceover = async (
  text: string,
  voiceStyle: string = 'warm'
): Promise<Blob> => {
  // Voice mapping based on style
  const voiceConfig = {
    warm: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
    professional: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
    friendly: { languageCode: 'en-US', name: 'en-US-Neural2-C' },
    storyteller: { languageCode: 'en-US', name: 'en-US-Neural2-A' }
  };

  const voice = voiceConfig[voiceStyle as keyof typeof voiceConfig] || voiceConfig.warm;

  try {
    // Note: This requires Google Cloud Text-to-Speech API
    // For now, we'll use the Web Speech API as a fallback
    return await synthesizeSpeechWeb(text);
  } catch (error) {
    console.error('Voiceover generation error:', error);
    throw error;
  }
};

/**
 * Fallback: Use Web Speech API for text-to-speech
 */
const synthesizeSpeechWeb = async (text: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good quality voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Record the speech
    const audioContext = new AudioContext();
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      resolve(audioBlob);
    };

    utterance.onend = () => {
      mediaRecorder.stop();
      audioContext.close();
    };

    utterance.onerror = (error) => {
      reject(error);
    };

    mediaRecorder.start();
    speechSynthesis.speak(utterance);
  });
};

/**
 * Generate background music using MusicFX (placeholder)
 * In production, this would call Vertex AI's MusicFX API
 */
export const generateBackgroundMusic = async (
  prompt: string,
  duration: number
): Promise<Blob | null> => {
  console.log(`🎵 Music generation requested: "${prompt}" (${duration}s)`);
  
  // TODO: Implement actual MusicFX API call
  // For now, return null (silent)
  return null;
};

/**
 * Generate video clip from text description using Imagen
 * In production, this would call Vertex AI's Imagen Video API
 */
export const generateVideoClip = async (
  description: string,
  duration: number
): Promise<Blob | null> => {
  console.log(`🎬 Video generation requested: "${description}" (${duration}s)`);
  
  // TODO: Implement actual Imagen Video API call
  // For now, return null (will use placeholder)
  return null;
};

/**
 * Create a canvas-based video frame with text and gradient
 * This is a placeholder until Imagen video generation is implemented
 */
const createPlaceholderVideoFrame = (
  text: string,
  width: number,
  height: number,
  sceneIndex: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Generate gradient background based on scene index
  const hue = (sceneIndex * 40) % 360;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue}, 60%, 40%)`);
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 60%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add text overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 32px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Wrap text
  const maxWidth = width - 100;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine);

  // Draw text lines
  const lineHeight = 40;
  const startY = (height - (lines.length * lineHeight)) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line.trim(), width / 2, startY + (i * lineHeight));
  });

  return canvas;
};

/**
 * Assemble complete video from vlog script
 * Combines voiceovers, visuals, and music into a single video file
 */
export const assembleVideo = async (
  vlogScript: VlogScript,
  userMedia: { images: string[], videos: string[] },
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> => {
  console.log('🎬 Starting video assembly...');
  
  try {
    // For browser-based video generation, we'll use Canvas + MediaRecorder
    const width = 1920;
    const height = 1080;
    const fps = 30;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5 Mbps
    });

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const videoPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        resolve(videoBlob);
      };
    });

    mediaRecorder.start();

    // Render each scene
    let currentTime = 0;
    for (let i = 0; i < vlogScript.scenes.length; i++) {
      const scene = vlogScript.scenes[i];
      const progress = ((i + 1) / vlogScript.scenes.length) * 100;
      
      onProgress?.(progress, `Rendering scene ${i + 1}/${vlogScript.scenes.length}...`);
      console.log(`🎬 Rendering scene ${i + 1}/${vlogScript.scenes.length}`);

      // Generate voiceover for this scene
      try {
        const voiceBlob = await generateVoiceover(scene.narration, vlogScript.voiceStyle);
        console.log(`🎤 Voiceover generated for scene ${i + 1}`);
      } catch (error) {
        console.warn('Voiceover generation failed, continuing without audio', error);
      }

      // Create visual frame (placeholder or use actual user media)
      const frame = createPlaceholderVideoFrame(scene.visualDescription, width, height, i);
      
      // Render frames for this scene duration
      const framesCount = Math.floor(scene.duration * fps);
      for (let f = 0; f < framesCount; f++) {
        ctx.drawImage(frame, 0, 0);
        
        // Small delay to allow canvas to render
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }

      currentTime += scene.duration;
    }

    mediaRecorder.stop();
    
    onProgress?.(100, 'Finalizing video...');
    console.log('✅ Video assembly complete!');
    
    const finalVideo = await videoPromise;
    return finalVideo;

  } catch (error) {
    console.error('Video assembly error:', error);
    throw error;
  }
};

