import React, { useState, useEffect } from 'react';
import { StorySpace } from '../types';
import { Plus, BookOpen, Clock, ChevronRight, Trash2, X } from 'lucide-react';

interface DashboardProps {
  spaces: StorySpace[];
  onRequestCreate: () => void;
  onSelectSpace: (id: string) => void;
  onDeleteSpace: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ spaces, onRequestCreate, onSelectSpace, onDeleteSpace }) => {
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (deleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deleteModal]);

  const handleDelete = (e: React.MouseEvent, space: StorySpace) => {
    e.stopPropagation();
    setDeleteModal({ id: space.id, title: space.title });
  };

  const confirmDelete = () => {
    if (deleteModal) {
      onDeleteSpace(deleteModal.id);
      setDeleteModal(null);
    }
  };
  return (
    <div className="p-6 pb-24 space-y-8 animate-fade-in relative h-full overflow-y-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">LifeTales</h1>
          <p className="text-stone-500 text-sm mt-1">Your memories, written for you.</p>
        </div>
      </header>

      {/* Hero / Create New */}
      <div 
        onClick={onRequestCreate}
        className="bg-ink text-soft p-6 rounded-3xl shadow-xl relative overflow-hidden cursor-pointer group transition-transform active:scale-[0.98]"
      >
        <div className="relative z-10">
          <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Start a New Story</h2>
          <p className="text-white/60 text-sm">Trip, weekend, or life chapter.</p>
        </div>
        <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-gradient-to-br from-primary to-accent opacity-20 rounded-full blur-2xl"></div>
      </div>

      {/* List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Your Spaces</h3>
        
        {spaces.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No stories yet. Create one above!</p>
          </div>
        ) : (
          spaces.map(space => (
            <div 
              key={space.id}
              onClick={() => onSelectSpace(space.id)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group relative"
            >
              <img 
                src={space.coverImage} 
                alt={space.title}
                className="h-16 w-16 rounded-xl object-cover bg-stone-200"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-ink truncate">{space.title}</h4>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(space.startDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{space.notes.length} moment{space.notes.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <button
                onClick={(e) => handleDelete(e, space)}
                className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete space"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-5 w-5 text-stone-300" />
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteModal(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">Delete Story?</h3>
                <p className="text-sm text-stone-600">
                  Are you sure you want to delete <strong>"{deleteModal.title}"</strong>? 
                  This will permanently delete all moments and the generated story.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg hover:bg-stone-50 text-sm font-medium text-stone-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-sm font-medium text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

