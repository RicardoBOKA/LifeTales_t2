import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { Button } from './components/Button';
import { Dashboard } from './views/Dashboard';
import { SpaceView } from './views/SpaceView';
import { SettingsView } from './views/SettingsView';
import { MemoriesView } from './views/MemoriesView';
import { AppState, StorySpace, ViewState } from './types';
import { X } from 'lucide-react';

// Mock Data / Local Storage Helper
const STORAGE_KEY = 'lifetales_data';

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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  // Local state for the creation modal fields
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleNavigate = (view: ViewState) => {
    setState(prev => ({ ...prev, view, activeSpaceId: null }));
  };

  const openCreateModal = () => {
    setState(prev => ({ ...prev, showCreateModal: true }));
    setNewTitle('');
    setNewDescription('');
  };

  const closeCreateModal = () => {
    setState(prev => ({ ...prev, showCreateModal: false }));
  };

  const handleCreateSpace = () => {
    if (!newTitle.trim() || !newDescription.trim()) return;

    const newSpace: StorySpace = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDescription,
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

  // Render content based on current view
  const renderContent = () => {
    switch (state.view) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            spaces={state.spaces} 
            onRequestCreate={openCreateModal}
            onSelectSpace={handleSelectSpace}
          />
        );
      case 'SPACE_DETAIL':
        if (!activeSpace) return null;
        return (
          <SpaceView 
            space={activeSpace} 
            onBack={handleBackToDashboard}
            onUpdateSpace={handleUpdateSpace}
          />
        );
      case 'SETTINGS':
        return <SettingsView />;
      case 'MEMORIES':
        return <MemoriesView />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      bottomNav={
        // Only show bottom nav if NOT in SpaceDetail view
        state.view !== 'SPACE_DETAIL' ? (
          <BottomNav 
            currentView={state.view} 
            onNavigate={handleNavigate} 
            onCreateClick={openCreateModal} 
          />
        ) : undefined
      }
    >
      {renderContent()}

      {/* Global Creation Modal */}
      {state.showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-serif font-bold text-ink">New Story</h3>
              <button 
                onClick={closeCreateModal}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Story Name
                </label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Japan Trip 2025"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink placeholder:text-stone-300 transition-all"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this story about?"
                  rows={3}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink placeholder:text-stone-300 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="ghost" 
                onClick={closeCreateModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateSpace}
                disabled={!newTitle.trim() || !newDescription.trim()}
                className="flex-1"
              >
                Create Space
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;