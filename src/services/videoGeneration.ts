import { VlogScript } from './gemini/video.service';
import { generateSpeech, generateMusic } from './googleCloud';

export interface VideoAsset {
  type: 'narration' | 'music';
  audioData: string; // base64
  startTime: number;
  duration: number;
}

/**
 * Simplified video generation:
 * 1. Generate all audio assets (narration + music)
 * 2. Return data for client-side assembly or download
 */
export const generateVideoAssets = async (
  vlogScript: VlogScript,
  onProgress?: (progress: number, status: string) => void
): Promise<{
  narrations: VideoAsset[];
  music: VideoAsset | null;
  script: VlogScript;
}> => {
  console.log('🎬 Generating video assets...');
  
  const narrations: VideoAsset[] = [];
  
  try {
    // Generate narration for each scene with rate limiting
    for (let i = 0; i < vlogScript.scenes.length; i++) {
      const scene = vlogScript.scenes[i];
      const progress = ((i + 1) / vlogScript.scenes.length) * 80; // 0-80%
      
      onProgress?.(progress, `Generating voiceover ${i + 1}/${vlogScript.scenes.length}...`);
      
      // Add delay between requests (1 second) to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      try {
        const audioBase64 = await generateSpeech(scene.narration, vlogScript.voiceStyle);
        narrations.push({
          type: 'narration',
          audioData: audioBase64,
          startTime: scene.startTime,
          duration: scene.duration
        });
        console.log(`✅ Narration ${i + 1} generated`);
      } catch (error: any) {
        console.error(`Failed to generate narration for scene ${i + 1}:`, error);
        
        // If rate limited, wait and retry
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
          console.warn('Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const audioBase64 = await generateSpeech(scene.narration, vlogScript.voiceStyle);
            narrations.push({
              type: 'narration',
              audioData: audioBase64,
              startTime: scene.startTime,
              duration: scene.duration
            });
            console.log(`✅ Narration ${i + 1} generated (after retry)`);
          } catch (retryError) {
            console.error(`Failed narration ${i + 1} after retry, skipping`);
          }
        }
      }
    }

    // Generate background music
    onProgress?.(90, 'Generating background music...');
    let musicAsset: VideoAsset | null = null;
    
    try {
      const musicBase64 = await generateMusic(
        vlogScript.musicPrompt,
        vlogScript.totalDuration
      );
      
      if (musicBase64) {
        musicAsset = {
          type: 'music',
          audioData: musicBase64,
          startTime: 0,
          duration: vlogScript.totalDuration
        };
        console.log('✅ Background music generated');
      }
    } catch (error) {
      console.error('Failed to generate music:', error);
      // Continue without music
    }

    onProgress?.(100, 'Assets ready!');
    
    return {
      narrations,
      music: musicAsset,
      script: vlogScript
    };

  } catch (error) {
    console.error('Asset generation error:', error);
    throw error;
  }
};

/**
 * Download vlog script and assets as a package
 */
export const downloadVlogPackage = (
  vlogScript: VlogScript,
  narrations: VideoAsset[],
  music: VideoAsset | null,
  spaceTitle: string
) => {
  const packageData = {
    title: vlogScript.title,
    totalDuration: vlogScript.totalDuration,
    scenes: vlogScript.scenes,
    musicPrompt: vlogScript.musicPrompt,
    narrations: narrations.map(n => ({
      startTime: n.startTime,
      duration: n.duration,
      audioData: n.audioData
    })),
    music: music ? {
      audioData: music.audioData,
      duration: music.duration
    } : null,
    generatedAt: new Date().toISOString()
  };

  const dataStr = JSON.stringify(packageData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spaceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_vlog_package.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📦 Vlog package downloaded');
};

/**
 * Create individual audio file from base64
 */
export const downloadAudioAsset = (
  base64Audio: string,
  filename: string
) => {
  if (base64Audio === 'BROWSER_TTS_PLACEHOLDER') {
    console.warn('Cannot download browser TTS audio');
    return;
  }
  
  const audioData = atob(base64Audio);
  const bytes = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    bytes[i] = audioData.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'audio/mp3' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Assemble a video file from vlog script and assets
 * Creates a WebM video with visuals and synchronized audio narration
 */
export const assembleVideoFile = async (
  vlogScript: VlogScript,
  narrations: VideoAsset[],
  music: VideoAsset | null,
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> => {
  console.log('🎬 Starting video assembly...');
  onProgress?.(0, 'Initializing video canvas...');

  const width = 1920;
  const height = 1080;
  const fps = 30;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create video stream from canvas
  const stream = canvas.captureStream(fps);

  // Setup MediaRecorder
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp8',
    videoBitsPerSecond: 5000000 // 5 Mbps
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const videoPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      console.log('✅ Video file created:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
      resolve(videoBlob);
    };
    mediaRecorder.onerror = (e) => {
      reject(new Error('MediaRecorder error'));
    };
  });

  mediaRecorder.start(100); // Collect data every 100ms

  // Render scenes
  const frameDuration = 1000 / fps;
  
  for (let i = 0; i < vlogScript.scenes.length; i++) {
    const scene = vlogScript.scenes[i];
    const progress = ((i + 1) / vlogScript.scenes.length) * 90;
    
    onProgress?.(progress, `Rendering scene ${i + 1}/${vlogScript.scenes.length}...`);
    console.log(`🎬 Scene ${i + 1}/${vlogScript.scenes.length}: "${scene.narration.substring(0, 40)}..."`);

    // Create gradient background
    const hue = (i * 50) % 360;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 40%)`);
    gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 70%, 60%)`);
    
    // Text setup
    const maxWidth = width - 200;
    const words = scene.narration.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    ctx.font = 'bold 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    
    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine.trim());

    // Render frames for this scene
    const totalFrames = Math.floor(scene.duration * fps);
    
    for (let frame = 0; frame < totalFrames; frame++) {
      // Draw background
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw text box
      const boxHeight = Math.min(300, lines.length * 80 + 100);
      const boxY = height - boxHeight - 50;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(50, boxY, width - 100, boxHeight);

      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textStartY = boxY + boxHeight / 2 - ((lines.length - 1) * 40);
      lines.forEach((line, lineIdx) => {
        ctx.fillText(line, width / 2, textStartY + (lineIdx * 80));
      });

      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, frameDuration));
    }
  }

  onProgress?.(95, 'Finalizing video...');
  mediaRecorder.stop();
  
  const finalVideo = await videoPromise;
  onProgress?.(100, 'Video ready!');
  
  return finalVideo;
};

/**
 * Download the assembled video file
 */
export const downloadVideoFile = (videoBlob: Blob, spaceTitle: string) => {
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spaceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_vlog.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Video downloaded');
};

