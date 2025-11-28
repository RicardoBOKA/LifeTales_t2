import React from 'react';
import { Settings, Music, Mic, Image as ImageIcon, Sliders } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="p-6 pb-32 space-y-8 animate-fade-in overflow-y-auto h-full">
      <header>
        <h1 className="text-2xl font-serif font-bold text-ink">AI Story Settings</h1>
        <p className="text-stone-500 text-sm mt-1">Customize your AI storyteller.</p>
      </header>

      {/* Narrative Tone */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-wider">
          <Settings className="h-4 w-4" /> Narrative Tone
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-3">
          <p className="text-sm text-stone-500 mb-2">How should the story feel?</p>
          <div className="grid grid-cols-2 gap-2">
            {['Cinematic', 'Funny', 'Neutral', 'Emotional', 'Journalistic', 'Poetic'].map(tone => (
              <button key={tone} className={`p-2 rounded-lg text-xs font-medium border transition-all ${tone === 'Cinematic' ? 'bg-ink text-white border-ink' : 'bg-stone-50 text-stone-600 border-stone-100 hover:bg-stone-100'}`}>
                {tone}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Story Mode & Creativity */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-wider">
          <Sliders className="h-4 w-4" /> Story Processing
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-6">
          <div>
            <label className="text-sm font-bold text-ink block mb-2">Mode</label>
            <div className="flex bg-stone-100 p-1 rounded-xl">
               {['Clean', 'Creative', 'Chapter'].map(mode => (
                 <button key={mode} className={`flex-1 py-2 text-xs font-medium rounded-lg ${mode === 'Chapter' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}>
                   {mode}
                 </button>
               ))}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-ink">Creativity Temperature</label>
              <span className="text-xs text-primary font-bold">Balanced</span>
            </div>
            <input type="range" min="0" max="2" step="1" className="w-full accent-primary h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer" />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1 uppercase font-bold">
              <span>Factual</span>
              <span>Balanced</span>
              <span>Expressive</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-wider">
          <ImageIcon className="h-4 w-4" /> Visual Style
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
           <div className="grid grid-cols-2 gap-3">
              <div className="aspect-video bg-stone-100 rounded-lg flex items-center justify-center border-2 border-primary/50 relative overflow-hidden">
                <span className="relative z-10 text-xs font-bold text-ink">Illustration</span>
                <div className="absolute inset-0 bg-primary/10"></div>
              </div>
              <div className="aspect-video bg-stone-50 rounded-lg flex items-center justify-center border border-stone-100">
                <span className="text-xs font-medium text-stone-400">Cinematic</span>
              </div>
              <div className="aspect-video bg-stone-50 rounded-lg flex items-center justify-center border border-stone-100">
                <span className="text-xs font-medium text-stone-400">Pastel</span>
              </div>
              <div className="aspect-video bg-stone-50 rounded-lg flex items-center justify-center border border-stone-100">
                <span className="text-xs font-medium text-stone-400">Realistic</span>
              </div>
           </div>
        </div>
      </section>
      
      {/* Audio Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-wider">
          <Mic className="h-4 w-4" /> Audio & Narration
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-4">
           <div className="flex justify-between items-center">
             <span className="text-sm font-bold text-ink">Voice Style</span>
             <span className="text-xs text-stone-500">Storyteller</span>
           </div>
           
           <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <div className="flex items-center gap-2">
                 <Music className="h-4 w-4 text-primary" />
                 <span className="text-sm font-medium text-ink">Background Music</span>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                 <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};