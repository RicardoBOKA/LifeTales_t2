import React from 'react';
import { BookOpen, Plus, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onCreateClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, onCreateClick }) => {
  return (
    <div className="bg-white/90 backdrop-blur-lg border-t border-stone-100 p-2 pb-6 px-6 flex justify-between items-center shadow-lg rounded-t-3xl">
      {/* Memories (Left) */}
      <button 
        onClick={() => onNavigate('MEMORIES')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${currentView === 'MEMORIES' ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}
      >
        <BookOpen className="h-6 w-6" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Memories</span>
      </button>

      {/* New Story (Center - Primary) */}
      <button 
        onClick={onCreateClick}
        className="flex flex-col items-center justify-center -mt-8"
      >
        <div className="h-16 w-16 bg-ink text-white rounded-full flex items-center justify-center shadow-xl shadow-ink/20 transform transition-transform active:scale-95 border-4 border-paper">
          <Plus className="h-8 w-8" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide mt-1 text-ink">New Story</span>
      </button>

      {/* Settings (Right) */}
      <button 
        onClick={() => onNavigate('SETTINGS')}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${currentView === 'SETTINGS' ? 'text-primary' : 'text-stone-400 hover:text-stone-600'}`}
      >
        <Settings className="h-6 w-6" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Settings</span>
      </button>
    </div>
  );
};

