import React from 'react';
import { Search, Sparkles, Quote, Image as ImageIcon, Heart, Smile } from 'lucide-react';

export const MemoriesView: React.FC = () => {
  return (
    <div className="p-6 pb-32 space-y-8 animate-fade-in overflow-y-auto h-full">
      <header>
        <h1 className="text-2xl font-serif font-bold text-ink">Memories</h1>
        <p className="text-stone-500 text-sm mt-1">Explore your moments across all stories.</p>
      </header>

      {/* AI Search Bar */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search memories... ('Kyoto', 'funny', 'sunset')"
          className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink placeholder:text-stone-300 transition-all"
        />
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
      </div>

      {/* Grid Layout */}
      <div className="space-y-6">
        
        {/* Highlights */}
        <section>
           <h3 className="flex items-center gap-2 text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">
             <Sparkles className="h-4 w-4 text-accent" /> Highlights
           </h3>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 h-32 flex flex-col justify-between">
                 <div className="text-xs text-stone-400">Mar 15 • Japan</div>
                 <p className="text-sm font-serif font-medium text-ink line-clamp-3">"We found that hidden temple behind the bamboo grove..."</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 h-32 flex flex-col justify-between">
                 <div className="text-xs text-stone-400">Feb 10 • Work</div>
                 <p className="text-sm font-serif font-medium text-ink line-clamp-3">"First day at the new office was actually amazing."</p>
              </div>
           </div>
        </section>

        {/* Generated Illustrations */}
        <section>
           <h3 className="flex items-center gap-2 text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">
             <ImageIcon className="h-4 w-4 text-secondary" /> Gallery
           </h3>
           <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
             {[1, 2, 3, 4].map(i => (
               <div key={i} className="h-24 w-24 shrink-0 rounded-lg bg-stone-200 overflow-hidden relative">
                 <img src={`https://picsum.photos/200?random=${i}`} className="w-full h-full object-cover" />
               </div>
             ))}
           </div>
        </section>

        {/* Emotional Peaks */}
        <section>
           <h3 className="flex items-center gap-2 text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">
             <Heart className="h-4 w-4 text-rose-400" /> Emotional Peaks
           </h3>
           <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">🥹</div>
              <div>
                <h4 className="font-bold text-ink text-sm">Touching Moments</h4>
                <p className="text-xs text-stone-500">3 moments identified as 'Gratitude'</p>
              </div>
           </div>
        </section>
        
        {/* Funniest Moments */}
        <section>
           <h3 className="flex items-center gap-2 text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">
             <Smile className="h-4 w-4 text-orange-400" /> Funniest Moments
           </h3>
           <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">😂</div>
              <div>
                <h4 className="font-bold text-ink text-sm">Laugh Tracks</h4>
                <p className="text-xs text-stone-500">2 moments identified as 'Hilarious'</p>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};

