import React, { useState, useEffect } from 'react';
import { StorySpace, NoteType } from '../types';
import { ArrowLeft, Mic, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '../components/Button';
import { AudioRecorder } from '../components/AudioRecorder';
import { DayGroup } from '../components/DayGroup';
import { transcribeAudio } from '../services/gemini';
import { useGroupedNotes } from '../hooks/useGroupedNotes';
import { useNotes } from '../hooks/useNotes';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { formatDateKey } from '../utils/dateHelpers';

interface SpaceViewProps {
  space: StorySpace;
  onBack: () => void;
  onUpdateSpace: (updatedSpace: StorySpace) => void;
}

type Tab = 'TIMELINE' | 'STORY';

export const SpaceView: React.FC<SpaceViewProps> = ({ space, onBack, onUpdateSpace }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMELINE');
  const [isProcessingNote, setIsProcessingNote] = useState(false);

  // Use custom hooks
  const { notes, addNote, updateNote, syncNotes } = useNotes(
    space.notes,
    (updatedNotes) => onUpdateSpace({ ...space, notes: updatedNotes })
  );

  const { chapters, isGenerating, generateStory, syncChapters } = useStoryGeneration(
    space.generatedStory,
    (updatedChapters) => onUpdateSpace({ ...space, generatedStory: updatedChapters })
  );

  const {
    groupedNoteEntries,
    collapsedDays,
    toggleDayCollapse,
    expandDay,
    initializeCollapseState
  } = useGroupedNotes(notes, space.startDate);

  // Sync with external changes
  useEffect(() => {
    syncNotes(space.notes);
    syncChapters(space.generatedStory);
  }, [space]);

  // Initialize collapse state
  useEffect(() => {
    initializeCollapseState();
  }, [initializeCollapseState]);

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsProcessingNote(true);
    
    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      const mimeType = audioBlob.type;
      
      const transcription = await transcribeAudio(base64Audio, mimeType);
      
      const newNote = addNote(NoteType.AUDIO, "Voice Note", transcription);

      // Expand the group for today
      const dateKey = formatDateKey(newNote.timestamp);
      expandDay(dateKey);
      
      setIsProcessingNote(false);
    };
  };

  const handleGenerateStory = async () => {
    setActiveTab('STORY');
    try {
      await generateStory(notes, space.title);
    } catch (e) {
      console.error(e);
      alert("Failed to generate story. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-paper">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-stone-100">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft className="h-6 w-6 text-ink" />
        </button>
        <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-lg text-ink truncate">{space.title}</h2>
            <p className="text-xs text-stone-500">{notes.length} fragments collected</p>
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-full shrink-0">
          <button 
            onClick={() => setActiveTab('TIMELINE')}
            className={`p-2 rounded-full transition-all ${activeTab === 'TIMELINE' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveTab('STORY')}
            className={`p-2 rounded-full transition-all ${activeTab === 'STORY' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        
        {/* TAB: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <div className="p-6 space-y-8 pb-32">
             <div className="bg-gradient-to-b from-primary/5 to-transparent p-6 rounded-3xl mb-8 text-center border border-primary/10">
                <p className="text-sm text-ink/70 font-serif italic mb-2 leading-relaxed">
                  "{space.description}"
                </p>
                <div className="w-8 h-0.5 bg-primary/20 mx-auto my-3"></div>
                <p className="text-xs text-stone-400">Record moments as they happen.</p>
             </div>

             <AudioRecorder onRecordingComplete={handleAudioRecorded} isProcessing={isProcessingNote} />

             <div className="mt-8">
                {notes.length === 0 ? (
                  <div className="text-center py-8 opacity-50">
                    <p className="text-sm">No notes yet.</p>
                  </div>
                ) : (
                  groupedNoteEntries.map(([dateKey, groupNotes]) => (
                    <DayGroup
                      key={dateKey}
                      dateKey={dateKey}
                      notes={groupNotes}
                      startDate={space.startDate}
                      isCollapsed={collapsedDays[dateKey] || false}
                      onToggleCollapse={toggleDayCollapse}
                      onUpdateNote={updateNote}
                    />
                  ))
                )}
             </div>
          </div>
        )}

        {/* TAB: STORY */}
        {activeTab === 'STORY' && (
          <div className="min-h-full bg-white">
            {isGenerating && chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full animate-pulse-slow"></div>
                  <Wand2 className="h-12 w-12 text-primary relative z-10 animate-pulse" />
                </div>
                <div>
                   <h3 className="text-xl font-serif font-bold">Weaving your story...</h3>
                   <p className="text-stone-500 mt-2 text-sm">Our AI agents are organizing your memories, writing chapters, and painting illustrations.</p>
                </div>
              </div>
            ) : chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                 <div className="bg-soft p-6 rounded-full mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                 </div>
                 <h3 className="text-2xl font-serif font-bold text-ink mb-2">Ready to write?</h3>
                 <p className="text-stone-500 mb-8 leading-relaxed">
                   You have collected {notes.length} moments. 
                   <br/>Let's turn them into a beautiful chapter of your life.
                 </p>
                 <Button onClick={handleGenerateStory} size="lg" className="w-full shadow-xl shadow-primary/20">
                    Generate Story
                 </Button>
              </div>
            ) : (
              <div className="animate-fade-in">
                 {/* Story Header */}
                 <div className="h-64 relative overflow-hidden">
                    <div className="absolute inset-0 bg-ink/20 z-10"></div>
                    <img src={space.coverImage} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                      <h1 className="text-3xl font-serif font-bold text-white leading-tight">{space.title}</h1>
                      <p className="text-white/80 text-sm mt-2 font-medium tracking-wide">{space.description}</p>
                    </div>
                 </div>

                 <div className="p-8 space-y-12 pb-32">
                    {chapters.map((chapter, idx) => (
                      <article key={idx} className="space-y-6">
                         <div className="flex items-center gap-4">
                           <span className="text-4xl font-serif text-primary/20 font-bold">{idx + 1}</span>
                           <h2 className="text-xl font-serif font-bold text-ink">{chapter.title}</h2>
                         </div>
                         
                         {chapter.illustrationUrl ? (
                           <div className="rounded-2xl overflow-hidden shadow-lg transform rotate-1 border-4 border-white">
                              <img src={chapter.illustrationUrl} className="w-full h-auto object-cover" alt="AI illustration" />
                           </div>
                         ) : isGenerating ? (
                           <div className="aspect-[4/3] bg-stone-100 rounded-2xl animate-pulse flex items-center justify-center">
                              <Sparkles className="h-6 w-6 text-stone-300" />
                           </div>
                         ) : null}

                         <div className="prose prose-stone prose-p:font-serif prose-p:text-lg prose-p:leading-relaxed text-ink/90">
                            {chapter.content.split('\n').map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                         </div>
                         
                         {idx < chapters.length - 1 && (
                           <div className="flex justify-center py-4">
                             <div className="h-1 w-16 bg-stone-200 rounded-full"></div>
                           </div>
                         )}
                      </article>
                    ))}
                 </div>
                 
                 {/* Floating Action Button to Regenerate */}
                 <div className="fixed bottom-6 right-6 z-30">
                    <Button onClick={handleGenerateStory} variant="primary" className="shadow-2xl flex gap-2">
                       <Sparkles className="h-4 w-4" /> Rewrite
                    </Button>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

