import { Note, CreateNoteRequest, UpdateNoteRequest, ApiResponse } from '../../types';
import { apiClient } from './client';

/**
 * Notes API
 * Currently mocked, ready for backend integration
 */

export const notesApi = {
  /**
   * Create a new note
   */
  async create(request: CreateNoteRequest): Promise<ApiResponse<Note>> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.post<ApiResponse<Note>>('/notes', request);
    
    // Mock implementation
    return {
      success: true,
      data: {
        id: Date.now().toString(),
        ...request.note
      }
    };
  },

  /**
   * Update an existing note
   */
  async update(request: UpdateNoteRequest): Promise<ApiResponse<Note>> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.put<ApiResponse<Note>>(`/notes/${request.noteId}`, request);
    
    // Mock implementation
    return {
      success: true,
      data: {
        id: request.noteId,
        ...request.updates
      } as Note
    };
  },

  /**
   * Delete a note
   */
  async delete(spaceId: string, noteId: string): Promise<ApiResponse<void>> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.delete<ApiResponse<void>>(`/spaces/${spaceId}/notes/${noteId}`);
    
    // Mock implementation
    return {
      success: true
    };
  },

  /**
   * Get all notes for a space
   */
  async getAll(spaceId: string): Promise<ApiResponse<Note[]>> {
    // TODO: Replace with real API call when backend is ready
    // return apiClient.get<ApiResponse<Note[]>>(`/spaces/${spaceId}/notes`);
    
    // Mock implementation
    return {
      success: true,
      data: []
    };
  }
};

