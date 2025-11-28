import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { Button } from './components/Button';
import { Dashboard } from './views/Dashboard';
import { SpaceView } from './views/SpaceView';
import { SettingsView } from './views/SettingsView';
import { MemoriesView } from './views/MemoriesView';
import { ViewState } from './src/types';
import { useAppState } from './src/hooks/useAppState';
import { X } from 'lucide-react';

const App: React.FC = () => {
  const {
    state,
    navigate,
    openCreateModal,
    closeCreateModal,
    createSpace,
    selectSpace,
    updateSpace,
    backToDashboard,
    activeSpace
  } = useAppState();

  // Local state for the creation modal fields
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleOpenCreateModal = () => {
    openCreateModal();
    setNewTitle('');
    setNewDescription('');
  };

  const handleCreateSpace = () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    createSpace(newTitle, newDescription);
  };

  const handleNavigate = (view: ViewState) => {
    navigate(view);
  };

  // Render content based on current view
  const renderContent = () => {
    switch (state.view) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            spaces={state.spaces} 
            onRequestCreate={handleOpenCreateModal}
            onSelectSpace={selectSpace}
          />
        );
      case 'SPACE_DETAIL':
        if (!activeSpace) return null;
        return (
          <SpaceView 
            space={activeSpace} 
            onBack={backToDashboard}
            onUpdateSpace={updateSpace}
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
            onCreateClick={() => handleNavigate('DASHBOARD')} 
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
