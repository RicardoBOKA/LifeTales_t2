/**
 * Video Generation Hook
 * Orchestrates the entire video generation process
 */

import { useState, useCallback, useEffect } from 'react';
import { Chapter, StorySettings } from '../types';
import { generateVideoScript, VideoScript } from '../services/gemini/videoScript.service';
import { 
  generateNarrationAudio, 
  loadSceneImages, 
  composeVideo,
  downloadVideo,
  VideoOptions 
} from '../services/video/videoComposition.service';
import { selectMusicForScript } from '../services/video/backgroundMusic.service';

/**
 * Save video blob to IndexedDB
 */
async function saveVideoToStorage(spaceId: string, videoBlob: Blob, script?: VideoScript): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LifeTalesVideos', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      store.put({
        id: spaceId,
        video: videoBlob,
        script: script,
        timestamp: Date.now()
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Load video blob from IndexedDB
 */
async function loadVideoFromStorage(spaceId: string): Promise<{ videoBlob: Blob; script?: VideoScript } | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LifeTalesVideos', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const getRequest = store.get(spaceId);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (result) {
          resolve({
            videoBlob: result.video,
            script: result.script
          });
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Combine video and audio using browser APIs
 */
async function combineVideoAndAudio(videoBlob: Blob, audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    video.src = URL.createObjectURL(videoBlob);
    audio.src = URL.createObjectURL(audioBlob);
    
    video.muted = true;
    
    Promise.all([
      new Promise(r => { video.onloadedmetadata = r; }),
      new Promise(r => { audio.onloadedmetadata = r; })
    ]).then(() => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      
      const stream = canvas.captureStream(30);
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaElementSource(audio);
      const dest = audioContext.createMediaStreamDestination();
      audioSource.connect(dest);
      
      stream.addTrack(dest.stream.getAudioTracks()[0]);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: 'video/webm' });
        URL.revokeObjectURL(video.src);
        URL.revokeObjectURL(audio.src);
        audioContext.close();
        resolve(finalBlob);
      };
      
      recorder.onerror = reject;
      
      // Start recording
      recorder.start();
      video.play();
      audio.play();
      
      // Draw video frames
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };
      
      drawFrame();
    }).catch(reject);
  });
}

export type VideoGenerationStep = 
  | 'idle' 
  | 'script' 
  | 'narration' 
  | 'images' 
  | 'composing' 
  | 'done' 
  | 'error';

export interface VideoGenerationState {
  isGenerating: boolean;
  step: VideoGenerationStep;
  progress: number; // 0-100
  message: string;
  error?: string;
  videoBlob?: Blob;
  script?: VideoScript;
}

export function useVideoGeneration(spaceId?: string) {
  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false,
    step: 'idle',
    progress: 0,
    message: ''
  });

  // Load saved video on mount
  useEffect(() => {
    if (spaceId) {
      loadVideoFromStorage(spaceId)
        .then((saved) => {
          if (saved) {
            console.log('📦 Loading saved video for space:', spaceId);
            setState(prev => ({
              ...prev,
              videoBlob: saved.videoBlob,
              script: saved.script,
              step: 'done',
              message: 'Video loaded'
            }));
          }
        })
        .catch((error) => {
          console.error('Failed to load saved video:', error);
        });
    }
  }, [spaceId]);

  const updateState = useCallback((updates: Partial<VideoGenerationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const generateVideo = useCallback(async (
    chapters: Chapter[],
    spaceTitle: string,
    settings: StorySettings,
    videoOptions?: VideoOptions
  ) => {
    try {
      updateState({
        isGenerating: true,
        step: 'script',
        progress: 0,
        message: 'Generating video script...',
        error: undefined,
        videoBlob: undefined
      });

      // STEP 1: Generate video script
      console.log('📝 Generating video script...');
      const script = await generateVideoScript(chapters, spaceTitle, settings);
      updateState({
        script,
        progress: 10,
        message: `Created script with ${script.scenes.length} scenes`
      });

      // STEP 2: Generate narrator video with Vertex AI Veo
      
      if (!videoOptions?.narratorPhotoBlob) {
        throw new Error('Please upload a narrator photo');
      }

      updateState({
        step: 'narration',
        progress: 20,
        message: 'Generating AI animated narrator video...'
      });

      console.log('🎬 Generating Veo video...');
      const { generateNarratorVideo, waitForNarratorVideo } = await import('../services/api/veo.api');
      
      // Full script for the narrator
      const fullScript = script.scenes.map(s => s.narrationText).join(' ');
      
      const operationId = await generateNarratorVideo(
        videoOptions.narratorPhotoBlob,
        fullScript,
        8  // 8 seconds
      );

      console.log('✅ Veo operation started:', operationId);

      updateState({
        progress: 40,
        message: 'Waiting for AI to create your video (1-2 minutes)...'
      });

      const videoBlob = await waitForNarratorVideo(operationId, (status) => {
        console.log('📊 Veo status:', status);
        updateState({
          progress: 70,
          message: `AI is ${status}... (please wait)`
        });
      });

      console.log('✅ Your video is ready!', videoBlob.size, 'bytes');
      
      // Save video to storage
      if (spaceId) {
        try {
          await saveVideoToStorage(spaceId, videoBlob, script);
          console.log('💾 Video saved to storage');
        } catch (error) {
          console.error('Failed to save video:', error);
        }
      }
      
      // DONE
      updateState({
        step: 'done',
        progress: 100,
        message: 'Video ready!',
        videoBlob,
        script,
        isGenerating: false
      });

      console.log('✅ Video generation complete!');
      return videoBlob;

    } catch (error) {
      console.error('❌ Video generation error:', error);
      updateState({
        step: 'error',
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate video'
      });
      throw error;
    }
  }, [updateState]);

  const downloadGeneratedVideo = useCallback((title: string) => {
    if (state.videoBlob) {
      downloadVideo(state.videoBlob, title);
    }
  }, [state.videoBlob]);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      step: 'idle',
      progress: 0,
      message: ''
    });
  }, []);

  return {
    ...state,
    generateVideo,
    downloadGeneratedVideo,
    reset
  };
}

