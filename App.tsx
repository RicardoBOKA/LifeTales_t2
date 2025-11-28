import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { SpaceView } from './views/SpaceView';
import { AppState, StorySpace, ViewState } from './types';

// Mock Data / Local Storage Helper
const STORAGE_KEY = 'lifetales_data';

const INITIAL_STATE: AppState = {
  view: 'DASHBOARD',
  activeSpaceId: null,
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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleCreateSpace = () => {
    const newSpace: StorySpace = {
      id: Date.now().toString(),
      title: 'New Journey',
      description: 'Waiting for your memories...',
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
      view: 'SPACE_DETAIL'
    }));
  };

  const handleSelectSpace = (id: string) => {
    setState(prev => ({
      ...prev,
      activeSpaceId: id,
      view: 'SPACE_DETAIL'
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      activeSpaceId: null,
      view: 'DASHBOARD'
    }));
  };

  const handleUpdateSpace = (updatedSpace: StorySpace) => {
    setState(prev => ({
      ...prev,
      spaces: prev.spaces.map(s => s.id === updatedSpace.id ? updatedSpace : s)
    }));
  };

  const activeSpace = state.spaces.find(s => s.id === state.activeSpaceId);

  return (
    <Layout>
      {state.view === 'DASHBOARD' && (
        <Dashboard 
          spaces={state.spaces} 
          onCreateSpace={handleCreateSpace}
          onSelectSpace={handleSelectSpace}
        />
      )}
      
      {state.view === 'SPACE_DETAIL' && activeSpace && (
        <SpaceView 
          space={activeSpace} 
          onBack={handleBackToDashboard}
          onUpdateSpace={handleUpdateSpace}
        />
      )}
    </Layout>
  );
};

export default App;