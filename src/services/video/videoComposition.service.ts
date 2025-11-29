/**
 * Video Generation Service
 * Creates a video from story chapters with narration, images, and music
 * Uses browser APIs and Canvas for video composition
 */

import { Chapter } from '../../types';
import { VideoScript, VideoSceneScript } from '../gemini/videoScript.service';
import { textToSpeech, base64ToAudioBlob } from '../api/tts.api';
import { fileStorage } from '../fileStorage';

export interface VideoGenerationProgress {
  step: 'script' | 'narration' | 'composing' | 'encoding' | 'done';
  progress: number; // 0-100
  message: string;
}

export interface VideoScene {
  narration: Blob; // Audio blob
  image: Blob | string; // Image blob or URL
  duration: number;
  transition: 'fade' | 'slide' | 'zoom';
}

export interface VideoOptions {
  width?: number;
  height?: number;
  fps?: number;
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number; // 0-1
  narratorPhotoBlob?: Blob; // Photo to animate as narrator
  narratorPhotoUrl?: string; // Or URL to photo
}

const DEFAULT_OPTIONS: Required<VideoOptions> = {
  width: 1920,
  height: 1080,
  fps: 30,
  backgroundMusicUrl: '',
  backgroundMusicVolume: 0.3,
  narratorPhotoBlob: undefined as any,
  narratorPhotoUrl: ''
};

/**
 * Generate narration audio for all scenes
 */
export const generateNarrationAudio = async (
  script: VideoScript,
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, Blob>> => {
  const audioMap = new Map<number, Blob>();
  
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    
    try {
      // Generate TTS audio
      const audioBase64 = await textToSpeech(scene.narrationText, {
        voice: 'en-US-Journey-F', // Natural expressive voice
        speakingRate: 0.95, // Slightly slower for clarity
        pitch: 0.0
      });
      
      const audioBlob = base64ToAudioBlob(audioBase64);
      audioMap.set(i, audioBlob);
      
      if (onProgress) {
        onProgress(i + 1, script.scenes.length);
      }
    } catch (error) {
      console.error(`Failed to generate audio for scene ${i}:`, error);
      // Continue with next scene
    }
  }
  
  return audioMap;
};

/**
 * Load images for all scenes (from user uploads or generated images)
 * Now supports multiple images per scene for variety
 */
export const loadSceneImages = async (
  chapters: Chapter[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, (Blob | string)[]>> => {
  const imageMap = new Map<number, (Blob | string)[]>();
  
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const sceneImages: (Blob | string)[] = [];
    
    try {
      // Load ALL user images for this scene (not just first one)
      if (chapter.userImageIds && chapter.userImageIds.length > 0) {
        for (const imageId of chapter.userImageIds) {
          const imageFile = await fileStorage.getFile(imageId);
          if (imageFile) {
            sceneImages.push(imageFile.blob);
          }
        }
      }
      
      // Also include generated image if available
      if (chapter.generatedImageUrl) {
        sceneImages.push(chapter.generatedImageUrl);
      }
      
      if (sceneImages.length > 0) {
        imageMap.set(i, sceneImages);
      }
      
      if (onProgress) {
        onProgress(i + 1, chapters.length);
      }
    } catch (error) {
      console.error(`Failed to load image for scene ${i}:`, error);
      // Continue with next scene
    }
  }
  
  return imageMap;
};

/**
 * Create a video blob from scenes using MediaRecorder API
 * Now with animated photo narrator!
 */
export const composeVideo = async (
  script: VideoScript,
  narrationAudio: Map<number, Blob>,
  images: Map<number, (Blob | string)[]>,
  options: VideoOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Load narrator photo if provided
  let narratorImage: HTMLImageElement | null = null;
  if (opts.narratorPhotoBlob || opts.narratorPhotoUrl) {
    const photoSource = opts.narratorPhotoUrl || URL.createObjectURL(opts.narratorPhotoBlob);
    narratorImage = await loadImage(photoSource);
  }
  
  // Always use vlog style
  return composeVlogStyleVideo(script, narrationAudio, images, narratorImage, opts, onProgress);
};

/**
 * Compose vlog-style video with Vertex AI Veo narrator and image overlays
 */
async function composeVlogStyleVideo(
  script: VideoScript,
  narrationAudio: Map<number, Blob>,
  images: Map<number, (Blob | string)[]>,
  narratorVideoBlob: Blob | undefined,
  options: Required<VideoOptions>,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d')!;
  
  // Load narrator video if available
  let narratorVideo: HTMLVideoElement | null = null;
  if (narratorVideoBlob) {
    narratorVideo = document.createElement('video');
    narratorVideo.src = URL.createObjectURL(narratorVideoBlob);
    narratorVideo.muted = true;
    await new Promise(resolve => { narratorVideo!.onloadeddata = resolve; });
  }
  
  // Setup MediaRecorder
  const stream = canvas.captureStream(options.fps);
  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // Mix background music if provided
  if (options.backgroundMusicUrl) {
    await loadAndPlayBackgroundMusic(audioContext, audioDestination, options.backgroundMusicUrl, options.backgroundMusicVolume);
  }
  
  stream.addTrack(audioDestination.stream.getAudioTracks()[0]);
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000
  });
  
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  
  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      audioContext.close();
      if (narratorVideo) {
        URL.revokeObjectURL(narratorVideo.src);
      }
      resolve(videoBlob);
    };
    
    mediaRecorder.onerror = reject;
    mediaRecorder.start();
    
    renderVlogScenes(
      canvas,
      ctx,
      script.scenes,
      narrationAudio,
      images,
      narratorVideo,
      audioContext,
      audioDestination,
      options,
      onProgress
    ).then(() => {
      mediaRecorder.stop();
    }).catch(reject);
  });
}

/**
 * Compose original slideshow-style video
 */
async function composeSlideshowVideo(
  script: VideoScript,
  narrationAudio: Map<number, Blob>,
  images: Map<number, (Blob | string)[]>,
  options: Required<VideoOptions>,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d')!;
  
  const stream = canvas.captureStream(options.fps);
  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // Mix background music
  if (options.backgroundMusicUrl) {
    await loadAndPlayBackgroundMusic(audioContext, audioDestination, options.backgroundMusicUrl, options.backgroundMusicVolume);
  }
  
  stream.addTrack(audioDestination.stream.getAudioTracks()[0]);
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000
  });
  
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  
  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      audioContext.close();
      resolve(videoBlob);
    };
    
    mediaRecorder.onerror = reject;
    mediaRecorder.start();
    
    renderScenes(
      canvas,
      ctx,
      script.scenes,
      narrationAudio,
      images,
      audioContext,
      audioDestination,
      options,
      onProgress
    ).then(() => {
      mediaRecorder.stop();
    }).catch(reject);
  });
}

/**
 * Render vlog-style scenes with Veo narrator and image overlays
 */
async function renderVlogScenes(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scenes: VideoSceneScript[],
  narrationAudio: Map<number, Blob>,
  images: Map<number, (Blob | string)[]>,
  narratorVideo: HTMLVideoElement | null,
  audioContext: AudioContext,
  audioDestination: MediaStreamAudioDestinationNode,
  options: Required<VideoOptions>,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  let elapsedTime = 0;
  
  // Start narrator video if available
  if (narratorVideo) {
    narratorVideo.play();
  }
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const audioBlob = narrationAudio.get(i);
    const sceneImages = images.get(i) || [];
    
    // Play narration audio
    if (audioBlob) {
      playAudioInContext(audioContext, audioDestination, audioBlob);
    }
    
    // Render scene with narrator + overlays
    await renderVlogScene(
      canvas,
      ctx,
      scene,
      sceneImages,
      narratorVideo,
      scene.durationSeconds,
      i
    );
    
    elapsedTime += scene.durationSeconds;
    
    if (typeof onProgress === 'function') {
      onProgress((elapsedTime / totalDuration) * 100);
    }
  }
  
  if (narratorVideo) {
    narratorVideo.pause();
  }
}

/**
 * Render a single vlog scene with Veo narrator video and image overlays
 */
async function renderVlogScene(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scene: VideoSceneScript,
  images: (Blob | string)[],
  narratorVideo: HTMLVideoElement | null,
  duration: number,
  sceneIndex: number
): Promise<void> {
  const fps = 30;
  const totalFrames = Math.floor(duration * fps);
  const frameDuration = 1000 / fps;
  
  // Load images for this scene
  const loadedImages = images.length > 0 
    ? await Promise.all(images.map(img => loadImage(img)))
    : [];
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    
    if (narratorVideo) {
      // Draw the Veo-generated narrator video as base layer
      ctx.drawImage(narratorVideo, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback: gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw AI avatar fallback
      drawAINarrator(ctx, canvas.width, canvas.height, progress);
    }
    
    // Add overlay images if available (top-right)
    if (loadedImages.length > 0) {
      const imageIndex = Math.floor(progress * loadedImages.length);
      const currentImage = loadedImages[Math.min(imageIndex, loadedImages.length - 1)];
      drawImageOverlay(ctx, currentImage, canvas.width, canvas.height, progress);
    }
    
    // Add title overlay at start
    if (frame < fps * 2.5) {
      const textOpacity = frame < fps * 0.5 ? frame / (fps * 0.5) : 
                         frame > fps * 2 ? (fps * 2.5 - frame) / (fps * 0.5) : 1;
      drawVlogTitleOverlay(ctx, scene.visualDescription, canvas.width, canvas.height, textOpacity);
    }
    
    await sleep(frameDuration);
  }
}

/**
 * Draw animated narrator from uploaded photo
 * Adds subtle animations to make it look like they're talking
 */
function drawAnimatedNarrator(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  width: number,
  height: number,
  progress: number
): void {
  ctx.save();
  
  const size = 350;
  const x = 60;
  const y = height - size - 60;
  
  // Talking animation (head bob and zoom)
  const talkCycle = Math.sin(progress * 40) * 0.02 + 1; // Subtle zoom in/out
  const headBob = Math.sin(progress * 30) * 3; // Small vertical movement
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  // Draw white border/frame
  ctx.fillStyle = '#ffffff';
  const borderRadius = 20;
  roundRect(ctx, x - 10, y - 10 + headBob, size + 20, size + 20, borderRadius);
  ctx.fill();
  
  // Reset shadow for photo
  ctx.shadowColor = 'transparent';
  
  // Clip to rounded rectangle for photo
  ctx.save();
  roundRect(ctx, x, y + headBob, size, size, borderRadius - 5);
  ctx.clip();
  
  // Draw photo with slight zoom animation
  const photoAspect = photo.width / photo.height;
  const frameAspect = 1; // Square
  
  let drawWidth, drawHeight, offsetX, offsetY;
  
  if (photoAspect > frameAspect) {
    drawHeight = size * talkCycle;
    drawWidth = photo.width * (drawHeight / photo.height);
    offsetX = (size - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = size * talkCycle;
    drawHeight = photo.height * (drawWidth / photo.width);
    offsetX = 0;
    offsetY = (size - drawHeight) / 2;
  }
  
  ctx.drawImage(
    photo,
    x + offsetX,
    y + headBob + offsetY,
    drawWidth,
    drawHeight
  );
  
  ctx.restore();
  
  // Add subtle "speaking" indicator
  const speakPulse = Math.abs(Math.sin(progress * 45)) * 0.7 + 0.3;
  ctx.strokeStyle = `rgba(255, 107, 107, ${speakPulse})`;
  ctx.lineWidth = 4;
  roundRect(ctx, x - 5, y - 5 + headBob, size + 10, size + 10, borderRadius);
  ctx.stroke();
  
  // Label
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Your Narrator', x + size / 2, y + size + 50);
  
  ctx.restore();
}

/**
 * Helper to draw rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw AI-generated narrator visual (fallback if no photo)
 */
function drawAINarrator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number
): void {
  ctx.save();
  
  const size = 280;
  const x = 80;
  const y = height - size - 80;
  
  // Animated circle with wave effect (represents talking)
  const waveIntensity = Math.sin(progress * 50) * 0.15 + 1; // Pulsing effect
  
  // Outer glow
  const glowGradient = ctx.createRadialGradient(
    x + size / 2, y + size / 2, 0,
    x + size / 2, y + size / 2, size / 2 * waveIntensity
  );
  glowGradient.addColorStop(0, 'rgba(255, 107, 107, 0.4)');
  glowGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 * waveIntensity, 0, Math.PI * 2);
  ctx.fill();
  
  // Main avatar circle
  const avatarGradient = ctx.createRadialGradient(
    x + size / 2, y + size / 2, 0,
    x + size / 2, y + size / 2, size / 2
  );
  avatarGradient.addColorStop(0, '#FF6B6B');
  avatarGradient.addColorStop(1, '#EE5A6F');
  ctx.fillStyle = avatarGradient;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw simple face
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  // Eyes
  ctx.beginPath();
  ctx.arc(x + size / 2 - 40, y + size / 2 - 20, 12, 0, Math.PI * 2);
  ctx.arc(x + size / 2 + 40, y + size / 2 - 20, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Mouth (animated)
  const mouthOpen = Math.abs(Math.sin(progress * 40)) * 30;
  ctx.beginPath();
  ctx.ellipse(
    x + size / 2, 
    y + size / 2 + 40, 
    50, 
    10 + mouthOpen, 
    0, 
    0, 
    Math.PI * 2
  );
  ctx.fill();
  
  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.fillText('AI Narrator', x + size / 2, y + size + 40);
  
  ctx.restore();
}

/**
 * Draw image overlay in vlog style (appears in corner or side)
 */
function drawImageOverlay(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  progress: number
): void {
  ctx.save();
  
  // Position: top-right corner with margin
  const overlayWidth = canvasWidth * 0.35; // 35% of screen
  const overlayHeight = overlayWidth * (9/16); // 16:9 aspect
  const margin = 40;
  const x = canvasWidth - overlayWidth - margin;
  const y = margin;
  
  // Animate entry (slide in from right)
  const entryProgress = Math.min(progress * 3, 1); // First 1/3 of duration
  const animX = x + (1 - entryProgress) * 200;
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  // Draw white border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(animX - 5, y - 5, overlayWidth + 10, overlayHeight + 10);
  
  // Draw image
  ctx.shadowColor = 'transparent';
  const imgAspect = image.width / image.height;
  const overlayAspect = overlayWidth / overlayHeight;
  
  let drawWidth, drawHeight, offsetX, offsetY;
  
  if (imgAspect > overlayAspect) {
    drawHeight = overlayHeight;
    drawWidth = image.width * (overlayHeight / image.height);
    offsetX = (overlayWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = overlayWidth;
    drawHeight = image.height * (overlayWidth / image.width);
    offsetX = 0;
    offsetY = (overlayHeight - drawHeight) / 2;
  }
  
  ctx.save();
  ctx.beginPath();
  ctx.rect(animX, y, overlayWidth, overlayHeight);
  ctx.clip();
  ctx.drawImage(image, animX + offsetX, y + offsetY, drawWidth, drawHeight);
  ctx.restore();
  
  ctx.restore();
}

/**
 * Draw vlog-style title overlay (lower third)
 */
function drawVlogTitleOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  width: number,
  height: number,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Lower third bar
  const barHeight = 120;
  const barY = height - barHeight - 60;
  
  // Background bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, barY, width * 0.6, barHeight);
  
  // Accent line
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(0, barY, 8, barHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  const text = title.substring(0, 60);
  ctx.fillText(text, 40, barY + barHeight / 2);
  
  ctx.restore();
}

/**
 * Load and play background music
 */
async function loadAndPlayBackgroundMusic(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  musicUrl: string,
  volume: number
): Promise<void> {
  try {
    const response = await fetch(musicUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true; // Loop background music
    
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    
    // Connect: source -> gain -> destination
    source.connect(gainNode);
    gainNode.connect(destination);
    
    source.start(0);
    
    console.log(`🎵 Background music loaded and playing at ${volume * 100}% volume`);
  } catch (error) {
    console.error('Failed to load background music:', error);
    // Continue without music
  }
}

/**
 * Render all scenes to canvas with timing and transitions
 */
async function renderScenes(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scenes: VideoSceneScript[],
  narrationAudio: Map<number, Blob>,
  images: Map<number, (Blob | string)[]>,
  audioContext: AudioContext,
  audioDestination: MediaStreamAudioDestinationNode,
  options: Required<VideoOptions>,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  let elapsedTime = 0;
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const audioBlob = narrationAudio.get(i);
    const sceneImages = images.get(i) || [];
    
    // Play narration audio
    if (audioBlob) {
      playAudioInContext(audioContext, audioDestination, audioBlob);
    }
    
    // Render scene with dynamic visuals
    if (sceneImages.length > 0) {
      await renderDynamicScene(
        canvas,
        ctx,
        scene,
        sceneImages,
        scene.durationSeconds,
        i
      );
    } else {
      // Fallback: gradient background with text
      await renderTextScene(canvas, ctx, scene, scene.durationSeconds);
    }
    
    // Apply transition to next scene
    if (i < scenes.length - 1) {
      await applyTransition(ctx, canvas, scene.transition);
    }
    
    elapsedTime += scene.durationSeconds;
    
    if (onProgress) {
      onProgress((elapsedTime / totalDuration) * 100);
    }
  }
}

/**
 * Render a dynamic scene with Ken Burns effect and text overlays
 */
async function renderDynamicScene(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scene: VideoSceneScript,
  images: (Blob | string)[],
  duration: number,
  sceneIndex: number
): Promise<void> {
  const fps = 30;
  const totalFrames = Math.floor(duration * fps);
  const frameDuration = 1000 / fps;
  
  // Load all images for this scene
  const loadedImages = await Promise.all(
    images.map(img => loadImage(img))
  );
  
  // Determine Ken Burns effect parameters
  const kenBurnsEffect = sceneIndex % 2 === 0 ? 'zoom-in' : 'pan-right';
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    
    // Select image (cycle through if multiple)
    const imageIndex = Math.floor((progress * loadedImages.length));
    const currentImage = loadedImages[Math.min(imageIndex, loadedImages.length - 1)];
    
    // Apply Ken Burns effect
    applyKenBurnsEffect(
      ctx,
      currentImage,
      canvas.width,
      canvas.height,
      progress,
      kenBurnsEffect
    );
    
    // Add vignette effect
    applyVignette(ctx, canvas.width, canvas.height);
    
    // Add text overlay at the beginning
    if (frame < fps * 3) { // Show for first 3 seconds
      const textOpacity = frame < fps ? frame / fps : 
                         frame > fps * 2 ? (fps * 3 - frame) / fps : 1;
      drawTextOverlay(ctx, scene, canvas.width, canvas.height, textOpacity);
    }
    
    await sleep(frameDuration);
  }
}

/**
 * Render a text-based scene (when no images available)
 */
async function renderTextScene(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scene: VideoSceneScript,
  duration: number
): Promise<void> {
  const fps = 30;
  const totalFrames = Math.floor(duration * fps);
  const frameDuration = 1000 / fps;
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    
    // Animated gradient background
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    const hue = (progress * 360 + 200) % 360;
    gradient.addColorStop(0, `hsl(${hue}, 30%, 15%)`);
    gradient.addColorStop(1, `hsl(${hue + 40}, 40%, 25%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw narration text (animated)
    drawAnimatedText(ctx, scene.narrationText, canvas.width, canvas.height, progress);
    
    await sleep(frameDuration);
  }
}

/**
 * Apply Ken Burns effect (zoom/pan animation)
 */
function applyKenBurnsEffect(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  progress: number,
  effect: 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left'
): void {
  ctx.save();
  
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  const baseScale = Math.max(
    canvasWidth / image.width,
    canvasHeight / image.height
  );
  
  let scale = baseScale;
  let offsetX = (canvasWidth - image.width * baseScale) / 2;
  let offsetY = (canvasHeight - image.height * baseScale) / 2;
  
  switch (effect) {
    case 'zoom-in':
      scale = baseScale * (1 + progress * 0.2); // Zoom from 100% to 120%
      offsetX = (canvasWidth - image.width * scale) / 2;
      offsetY = (canvasHeight - image.height * scale) / 2;
      break;
      
    case 'zoom-out':
      scale = baseScale * (1.2 - progress * 0.2); // Zoom from 120% to 100%
      offsetX = (canvasWidth - image.width * scale) / 2;
      offsetY = (canvasHeight - image.height * scale) / 2;
      break;
      
    case 'pan-right':
      scale = baseScale * 1.1;
      offsetX = (canvasWidth - image.width * scale) / 2 + (progress * 100);
      offsetY = (canvasHeight - image.height * scale) / 2;
      break;
      
    case 'pan-left':
      scale = baseScale * 1.1;
      offsetX = (canvasWidth - image.width * scale) / 2 - (progress * 100);
      offsetY = (canvasHeight - image.height * scale) / 2;
      break;
  }
  
  ctx.drawImage(
    image,
    offsetX,
    offsetY,
    image.width * scale,
    image.height * scale
  );
  
  ctx.restore();
}

/**
 * Apply vignette effect
 */
function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 1.5
  );
  
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw text overlay with scene title
 */
function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  scene: VideoSceneScript,
  width: number,
  height: number,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Semi-transparent background bar
  const barHeight = 200;
  const barY = height - barHeight - 100;
  
  const gradient = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, barY, width, barHeight);
  
  // Draw title text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 20;
  
  // Word wrap for long titles
  const words = (scene.visualDescription || 'Scene').split(' ');
  const maxWidth = width - 200;
  let line = '';
  let y = barY + barHeight / 2;
  
  for (let i = 0; i < words.length && i < 8; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, width / 2, y);
      line = words[i] + ' ';
      y += 70;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, width / 2, y);
  
  ctx.restore();
}

/**
 * Draw animated text for text-only scenes
 */
function drawAnimatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  progress: number
): void {
  ctx.save();
  
  // Calculate visible text length based on progress
  const visibleLength = Math.floor(text.length * Math.min(progress * 2, 1));
  const visibleText = text.substring(0, visibleLength);
  
  // Setup text style
  ctx.fillStyle = '#ffffff';
  ctx.font = '48px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  
  // Word wrap
  const words = visibleText.split(' ');
  const maxWidth = width - 200;
  const lineHeight = 70;
  let line = '';
  const lines: string[] = [];
  
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line.length > 0) {
      lines.push(line);
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  // Draw lines centered
  const startY = height / 2 - (lines.length * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });
  
  ctx.restore();
}

/**
 * Load image from blob or URL
 */
function loadImage(imageSource: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Draw image to canvas (centered and scaled)
 */
async function drawImageToCanvas(
  ctx: CanvasRenderingContext2D,
  imageSource: Blob | string,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Calculate scaling to cover canvas while maintaining aspect ratio
      const scale = Math.max(
        canvasWidth / img.width,
        canvasHeight / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      const x = (canvasWidth - scaledWidth) / 2;
      const y = (canvasHeight - scaledHeight) / 2;
      
      // Clear and draw
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      resolve();
    };
    
    img.onerror = reject;
    
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Play audio blob in Web Audio API context
 */
function playAudioInContext(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  audioBlob: Blob
): void {
  // Play async without blocking
  (async () => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);
      source.start(audioContext.currentTime);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  })();
}

/**
 * Apply transition effect between scenes
 */
async function applyTransition(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  transition: string
): Promise<void> {
  const fps = 30;
  const transitionDuration = 1000; // 1 second
  const totalFrames = Math.floor((transitionDuration / 1000) * fps);
  const frameDuration = 1000 / fps;
  
  // Store the current canvas content
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    
    // Restore original image
    ctx.putImageData(imageData, 0, 0);
    
    switch (transition) {
      case 'fade':
        // Fade to black
        ctx.fillStyle = `rgba(0, 0, 0, ${progress})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
        
      case 'slide':
        // Slide out to left
        ctx.globalAlpha = 1 - progress;
        const slideOffset = progress * canvas.width;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvas, -slideOffset, 0);
        ctx.globalAlpha = 1;
        break;
        
      case 'zoom':
        // Zoom out
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = 1 - progress * 0.5;
        const x = (canvas.width * (1 - scale)) / 2;
        const y = (canvas.height * (1 - scale)) / 2;
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(
          canvas,
          x,
          y,
          canvas.width * scale,
          canvas.height * scale
        );
        ctx.globalAlpha = 1;
        break;
    }
    
    await sleep(frameDuration);
  }
  
  // Clear for next scene
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export video file with proper naming
 */
export const downloadVideo = (videoBlob: Blob, title: string) => {
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

