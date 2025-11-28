import { 
  TranscribeAudioRequest, 
  TranscribeAudioResponse 
} from '../../types';
import { apiClient } from './client';

/**
 * Transcription API
 * Currently mocked, ready for backend integration
 */

export const transcriptionApi = {
  /**
   * Transcribe audio to text
   */
  async transcribe(request: TranscribeAudioRequest): Promise<TranscribeAudioResponse> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.post<TranscribeAudioResponse>('/transcribe', request);
    
    // This will be replaced by the gemini service call
    // For now, return a mock response
    return {
      success: true,
      transcription: '',
      error: 'Not implemented - use gemini service directly for now'
    };
  }
};

