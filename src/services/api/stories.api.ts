import { 
  Chapter, 
  GenerateStoryRequest, 
  GenerateStoryResponse,
  ApiResponse 
} from '../../types';
import { apiClient } from './client';

/**
 * Stories API
 * Currently mocked, ready for backend integration
 */

export const storiesApi = {
  /**
   * Generate a story from notes
   */
  async generate(request: GenerateStoryRequest): Promise<GenerateStoryResponse> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.post<GenerateStoryResponse>('/stories/generate', request);
    
    // This will be replaced by the gemini service call
    // For now, return a mock response
    return {
      success: true,
      chapters: [],
      error: 'Not implemented - use gemini service directly for now'
    };
  },

  /**
   * Get story for a space
   */
  async get(spaceId: string): Promise<ApiResponse<Chapter[]>> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.get<ApiResponse<Chapter[]>>(`/spaces/${spaceId}/story`);
    
    return {
      success: true,
      data: []
    };
  }
};

