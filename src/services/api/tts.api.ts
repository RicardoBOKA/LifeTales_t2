/**
 * Text-to-Speech API Client
 * Communicates with backend TTS service
 */

const TTS_API_URL = import.meta.env.VITE_TTS_API_URL || 'http://localhost:3001/api';

export interface TTSVoice {
  name: string;
  languageCodes: string[];
  gender: string;
  naturalSampleRateHertz: number;
}

export interface TTSOptions {
  voice?: string;
  languageCode?: string;
  speakingRate?: number;  // 0.25 to 4.0
  pitch?: number;          // -20.0 to 20.0
}

/**
 * Convert text to speech audio
 * @returns Base64-encoded MP3 audio
 */
export const textToSpeech = async (
  text: string,
  options: TTSOptions = {}
): Promise<string> => {
  const response = await fetch(`${TTS_API_URL}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice: options.voice || 'en-US-Journey-F',
      languageCode: options.languageCode || 'en-US',
      speakingRate: options.speakingRate || 1.0,
      pitch: options.pitch || 0.0
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Text-to-speech failed');
  }

  const data = await response.json();
  return data.audioContent; // Base64-encoded MP3
};

/**
 * Get list of available TTS voices
 */
export const listVoices = async (): Promise<TTSVoice[]> => {
  const response = await fetch(`${TTS_API_URL}/tts/voices`);

  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }

  const data = await response.json();
  return data.voices;
};

/**
 * Convert base64 audio to blob
 */
export const base64ToAudioBlob = (base64: string): Blob => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
};

