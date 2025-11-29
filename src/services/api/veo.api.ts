/**
 * Vertex AI Veo API Client
 * Generates animated narrator videos from photos
 */

const API_URL = import.meta.env.VITE_TTS_API_URL || 'http://localhost:3001/api';

export interface NarratorVideoRequest {
  photoBase64: string;
  script: string;
  durationSeconds?: number;
}

export interface NarratorVideoResponse {
  operationId: string;
  status: 'started' | 'processing' | 'complete' | 'error';
  videoBase64?: string;
}

/**
 * Generate animated narrator video from user photo using Vertex AI Veo Fast
 */
export const generateNarratorVideo = async (
  photoBlob: Blob,
  script: string,
  durationSeconds: number = 8
): Promise<string> => {
  console.log('🎬 Generating narrator video...');
  console.log('📝 Script length:', script.length, 'characters');
  console.log('⏱️ Duration:', durationSeconds, 'seconds');
  console.log('📸 Photo size:', photoBlob.size, 'bytes');

  // Convert blob to base64
  const photoBase64 = await blobToBase64(photoBlob);
  console.log('✅ Photo converted to base64');

  const response = await fetch(`${API_URL}/generate-narrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photoBase64,
      script,
      durationSeconds
    }),
  });

  console.log('📡 Backend response status:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Backend error:', error);
    throw new Error(error.error || 'Narrator video generation failed');
  }

  const data: NarratorVideoResponse = await response.json();
  console.log('✅ Operation started:', data.operationId);
  
  return data.operationId;
};

/**
 * Check status and get result of narrator video generation
 */
export const getNarratorVideoStatus = async (operationId: string): Promise<NarratorVideoResponse> => {
  // Encode the operation ID for URL
  const encodedOperationId = encodeURIComponent(operationId);
  
  const response = await fetch(`${API_URL}/narrator-status/${encodedOperationId}`);

  if (!response.ok) {
    throw new Error('Failed to check video status');
  }

  return await response.json();
};

/**
 * Poll for narrator video completion with timeout
 */
export const waitForNarratorVideo = async (
  operationId: string,
  onProgress?: (status: string) => void
): Promise<Blob> => {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
  const pollInterval = 5000; // 5 seconds

  console.log(`⏳ Starting to poll for video completion. Operation ID: ${operationId}`);

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`📡 Poll attempt ${attempts}/${maxAttempts}...`);

    try {
      const status = await getNarratorVideoStatus(operationId);
      console.log(`📊 Full Status Response:`, JSON.stringify(status, null, 2));

      if (onProgress) {
        onProgress(status.status);
      }

      if (status.status === 'complete') {
        if (status.videoBase64) {
          console.log('✅ Video generation complete! Converting to blob...');
          console.log('📦 Video data size:', status.videoBase64.length, 'characters');
          return base64ToBlob(status.videoBase64, 'video/mp4');
        } else {
          console.error('❌ Status is complete but no video data received!');
          console.log('Full response:', status);
          throw new Error('Video generation completed but no video data returned');
        }
      }

      if (status.status === 'error') {
        console.error('❌ Video generation failed with error status');
        throw new Error('Video generation failed');
      }

      console.log(`⏱️ Still ${status.status}, waiting ${pollInterval}ms before next check...`);
    } catch (error) {
      console.error(`⚠️ Error checking status (attempt ${attempts}):`, error);
      // Continue polling on errors (API might be temporarily unavailable)
    }

    await sleep(pollInterval);
  }

  console.error('⏰ Video generation timeout after', maxAttempts * pollInterval / 1000, 'seconds');
  throw new Error('Video generation timeout - took longer than 5 minutes');
};

/**
 * Helper: Blob to Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper: Base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Helper: Sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

