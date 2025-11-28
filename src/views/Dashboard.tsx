import React from 'react';
import { StorySpace } from '../types';
import { Plus, BookOpen, Clock, ChevronRight } from 'lucide-react';

interface DashboardProps {
  spaces: StorySpace[];
  onRequestCreate: () => void;
  onSelectSpace: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ spaces, onRequestCreate, onSelectSpace }) => {
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
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
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
                  <span>{space.notes.length} moments</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-stone-300" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

