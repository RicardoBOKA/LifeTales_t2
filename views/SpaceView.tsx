import React, { useState, useRef, useEffect } from 'react';
import { StorySpace, Note, NoteType, Chapter } from '../types';
import { ArrowLeft, Mic, Image as ImageIcon, Sparkles, Wand2, Calendar, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import { AudioRecorder } from '../components/AudioRecorder';
import { transcribeAudio, generateStoryFromNotes, generateChapterIllustration } from '../services/geminiService';

interface SpaceViewProps {
  space: StorySpace;
  onBack: () => void;
  onUpdateSpace: (updatedSpace: StorySpace) => void;
}

type Tab = 'TIMELINE' | 'STORY';

export const SpaceView: React.FC<SpaceViewProps> = ({ space, onBack, onUpdateSpace }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMELINE');
  const [isProcessingNote, setIsProcessingNote] = useState(false);
  const [isBuildingStory, setIsBuildingStory] = useState(false);
  
  // Use local state to show optimistic updates before saving to parent
  const [notes, setNotes] = useState<Note[]>(space.notes);
  const [chapters, setChapters] = useState<Chapter[]>(space.generatedStory);

  useEffect(() => {
    setNotes(space.notes);
    setChapters(space.generatedStory);
  }, [space]);

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsProcessingNote(true);
    
    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      const mimeType = audioBlob.type; // e.g. 'audio/webm;codecs=opus'
      
      // 1. Transcribe
      const transcription = await transcribeAudio(base64Audio, mimeType);
      
      // 2. Create Note
      const newNote: Note = {
        id: Date.now().toString(),
        type: NoteType.AUDIO,
        content: "Voice Note",
        transcription: transcription,
        timestamp: Date.now()
      };

      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      onUpdateSpace({ ...space, notes: updatedNotes });
      setIsProcessingNote(false);
    };
  };

  const handleGenerateStory = async () => {
    setIsBuildingStory(true);
    setActiveTab('STORY');

    try {
      // 1. Generate Text Structure
      const generatedChapters = await generateStoryFromNotes(notes, space.title);
      
      // Update with text first
      setChapters(generatedChapters);
      onUpdateSpace({ ...space, generatedStory: generatedChapters });

      // 2. Generate Illustrations progressively
      const updatedChaptersWithImages = [...generatedChapters];
      
      for (let i = 0; i < updatedChaptersWithImages.length; i++) {
        const chapter = updatedChaptersWithImages[i];
        if (chapter.illustrationPrompt) {
          const imageUrl = await generateChapterIllustration(chapter.illustrationPrompt);
          if (imageUrl) {
            updatedChaptersWithImages[i] = { ...chapter, illustrationUrl: imageUrl };
            // Update state incrementally
            setChapters([...updatedChaptersWithImages]);
          }
        }
      }

      // Final save
      onUpdateSpace({ ...space, generatedStory: updatedChaptersWithImages });

    } catch (e) {
      console.error(e);
      alert("Failed to generate story. Please try again.");
    } finally {
      setIsBuildingStory(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-paper">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-stone-100">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft className="h-6 w-6 text-ink" />
        </button>
        <div className="flex-1">
            <h2 className="font-serif font-bold text-lg text-ink truncate">{space.title}</h2>
            <p className="text-xs text-stone-500">{notes.length} fragments collected</p>
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-full">
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
                <p className="text-sm text-ink/70 font-serif italic mb-2">
                  "The best stories are lived first, then written."
                </p>
                <p className="text-xs text-stone-400">Record moments as they happen.</p>
             </div>

             <AudioRecorder onRecordingComplete={handleAudioRecorded} isProcessing={isProcessingNote} />

             <div className="space-y-6 mt-8">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-stone-200 flex-1"></div>
                  <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">Timeline</span>
                  <div className="h-px bg-stone-200 flex-1"></div>
                </div>

                {notes.length === 0 ? (
                  <div className="text-center py-8 opacity-50">
                    <p className="text-sm">No notes yet.</p>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-stone-300 rounded-full mt-2"></div>
                        <div className="w-px bg-stone-200 flex-1 my-1"></div>
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-stone-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                            {note.type === NoteType.AUDIO ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        {note.type === NoteType.AUDIO && (
                           <div className="space-y-2">
                             {/* Mock Audio Player Visualization */}
                             <div className="h-8 bg-stone-100 rounded-full flex items-center px-3 gap-1 overflow-hidden">
                                {[...Array(20)].map((_, i) => (
                                  <div key={i} className="w-1 bg-stone-300 rounded-full" style={{ height: `${Math.random() * 100}%`}}></div>
                                ))}
                             </div>
                             <p className="text-sm text-ink/80 italic">"{note.transcription}"</p>
                           </div>
                        )}
                        {note.type === NoteType.TEXT && <p className="text-sm text-ink">{note.content}</p>}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* TAB: STORY */}
        {activeTab === 'STORY' && (
          <div className="min-h-full bg-white">
            {isBuildingStory && chapters.length === 0 ? (
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
                      <p className="text-white/80 text-sm mt-2 font-medium tracking-wide">A LifeTales Original</p>
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
                         ) : isBuildingStory ? (
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