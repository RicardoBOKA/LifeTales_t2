import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { AppState, ViewState, StorySpace } from '../types';
import { STORAGE_KEYS } from '../utils/storage';

const INITIAL_STATE: AppState = {
  view: 'DASHBOARD',
  activeSpaceId: null,
  showCreateModal: false,
  spaces: [
    {
      id: 'demo-1',
      title: 'Weekend in Kyoto',
      description: 'A short trip to see the autumn leaves.',
      coverImage: 'https://picsum.photos/800/600?random=1',
      startDate: Date.now() - 86400000 * 2,
      notes: [],
      generatedStory: [],
      isGenerating: false
    }
  ]
};

export function useAppState() {
  const [state, setState] = useLocalStorage<AppState>(STORAGE_KEYS.APP_DATA, INITIAL_STATE);
  
  // Navigation
  const navigate = useCallback((view: ViewState) => {
    setState(prev => ({ ...prev, view, activeSpaceId: null }));
  }, [setState]);

  // Modal Management
  const openCreateModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateModal: true }));
  }, [setState]);

  const closeCreateModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateModal: false }));
  }, [setState]);

  // Space Management
  const createSpace = useCallback((title: string, description: string) => {
    const newSpace: StorySpace = {
      id: Date.now().toString(),
      title,
      description,
      coverImage: `https://picsum.photos/800/600?random=${Date.now()}`,
      startDate: Date.now(),
      notes: [],
      generatedStory: [],
      isGenerating: false
    };
    
    setState(prev => ({
      ...prev,
      spaces: [newSpace, ...prev.spaces],
      activeSpaceId: newSpace.id,
      view: 'SPACE_DETAIL',
      showCreateModal: false
    }));
  }, [setState]);

  const selectSpace = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      activeSpaceId: id,
      view: 'SPACE_DETAIL'
    }));
  }, [setState]);

  const updateSpace = useCallback((updatedSpace: StorySpace) => {
    setState(prev => ({
      ...prev,
      spaces: prev.spaces.map(s => s.id === updatedSpace.id ? updatedSpace : s)
    }));
  }, [setState]);

  const backToDashboard = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeSpaceId: null,
      view: 'DASHBOARD'
    }));
  }, [setState]);

  // Get active space
  const activeSpace = state.spaces.find(s => s.id === state.activeSpaceId);

  return {
    state,
    navigate,
    openCreateModal,
    closeCreateModal,
    createSpace,
    selectSpace,
    updateSpace,
    backToDashboard,
    activeSpace
  };
}

