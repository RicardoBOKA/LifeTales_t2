import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { Folder } from '../types';

interface CreateSpaceViewProps {
  folders: Folder[];
  initialFolderId: string | null;
  onBack: () => void;
  onCreate: (title: string, description: string, folderId: string) => void;
}

export const CreateSpaceView: React.FC<CreateSpaceViewProps> = ({ 
  folders, 
  initialFolderId, 
  onBack, 
  onCreate 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId || '');

  // If there's only one folder, select it by default
  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      if (initialFolderId) {
          setSelectedFolderId(initialFolderId);
      } else {
         // Force user to choose, or could default to first: setSelectedFolderId(folders[0].id);
      }
    }
  }, [folders, initialFolderId]);

  const handleSubmit = () => {
    if (title.trim() && description.trim() && selectedFolderId) {
      onCreate(title, description, selectedFolderId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-paper animate-fade-in">
      <div className="p-4 flex items-center gap-4 border-b border-stone-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft className="h-6 w-6 text-ink" />
        </button>
        <h2 className="text-lg font-serif font-bold text-ink">New Story</h2>
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink mb-2">Let's start a story.</h1>
          <p className="text-stone-500 text-sm">Give your new memory collection a home.</p>
        </div>

        <div className="space-y-6">
          {/* Folder Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
              Assign to Folder <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FolderIcon className="absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink appearance-none transition-all"
              >
                <option value="" disabled>Select a folder...</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-4 h-4 w-4 text-stone-400 pointer-events-none" />
            </div>
            {folders.length === 0 && (
                <p className="text-xs text-rose-500 mt-1">You need to create a folder on the dashboard first.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
              Story Name <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Japan Trip 2025"
              className="w-full p-4 bg-white border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink placeholder:text-stone-300 transition-all font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this story about?"
              rows={4}
              className="w-full p-4 bg-white border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink placeholder:text-stone-300 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-stone-100">
        <Button 
          onClick={handleSubmit} 
          disabled={!title.trim() || !description.trim() || !selectedFolderId}
          className="w-full shadow-xl shadow-primary/20"
          size="lg"
        >
          Create Story Space
        </Button>
      </div>
    </div>
  );
};