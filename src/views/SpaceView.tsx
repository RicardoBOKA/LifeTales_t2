import React, { useState, useEffect } from 'react';
import { StorySpace, NoteType, Note, Chapter, GenerationStep } from '../types';
import { ArrowLeft, Clock, Sparkles, Wand2, Image as ImageIcon, Search, PenTool, Palette, CheckCircle2, ChevronLeft, ChevronRight, Video, Download } from 'lucide-react';
import { Button } from '../components/Button';
import { InputComposer, NoteInput } from '../components/InputComposer';
import { DayGroup } from '../components/DayGroup';
import { transcribeAudio } from '../services/gemini';
import { fileStorage } from '../services/fileStorage';
import { useGroupedNotes } from '../hooks/useGroupedNotes';
import { useNotes } from '../hooks/useNotes';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useSettings } from '../hooks/useSettings';
import { formatDateKey } from '../utils/dateHelpers';

/**
 * Generation Workflow Steps Component
 */
const GenerationWorkflow: React.FC<{
  step: GenerationStep;
  progress: { current: number; total: number };
}> = ({ step, progress }) => {
  const steps = [
    { id: 'analyzing', label: 'Analyzing notes', icon: Search },
    { id: 'writing', label: 'Writing story', icon: PenTool },
    { id: 'images', label: 'Generating images', icon: Palette },
    { id: 'done', label: 'Complete!', icon: CheckCircle2 },
  ];

  const currentIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full animate-pulse"></div>
        <Wand2 className="h-16 w-16 text-primary relative z-10 animate-bounce" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-2xl font-serif font-bold text-ink">Crafting your story...</h3>
        <p className="text-stone-500 text-sm max-w-xs mx-auto">
          Our AI agents are transforming your moments into a beautiful narrative
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 bg-stone-50 p-4 rounded-2xl">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isComplete = idx < currentIndex;
          
          return (
            <React.Fragment key={s.id}>
              <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? 'scale-110' : ''
              }`}>
                <div className={`p-3 rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-green-500 text-white' :
                  isActive ? 'bg-primary text-white animate-pulse' :
                  'bg-stone-200 text-stone-400'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : isComplete ? 'text-green-600' : 'text-stone-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-8 transition-colors duration-500 ${
                  isComplete ? 'bg-green-500' : 'bg-stone-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress indicator for images step */}
      {step === 'images' && progress.total > 0 && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-stone-500">
            Generating illustration {progress.current} of {progress.total}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Image Gallery Component for chapters with multiple images
 */
const ImageGallery: React.FC<{
  userImageIds: string[];
  generatedImageUrl?: string;
}> = ({ userImageIds, generatedImageUrl }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      const urls: string[] = [];
      
      // Load user images
      for (const id of userImageIds) {
        const url = await fileStorage.getFileUrl(id);
        if (url) urls.push(url);
      }
      
      // Add generated image if no user images
      if (urls.length === 0 && generatedImageUrl) {
        urls.push(generatedImageUrl);
      }
      
      setImageUrls(urls);
      setLoading(false);
    };
    
    loadImages();
  }, [userImageIds, generatedImageUrl]);

  if (loading) {
    return (
      <div className="aspect-[4/3] bg-stone-100 rounded-2xl animate-pulse flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-stone-300" />
      </div>
    );
  }

  if (imageUrls.length === 0) {
    return null;
  }

  const hasMultiple = imageUrls.length > 1;
  const isUserImage = userImageIds.length > 0;

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white">
      {/* Main image */}
      <img 
        src={imageUrls[currentIndex]} 
        className="w-full h-auto object-cover aspect-[4/3]" 
        alt={isUserImage ? 'Your photo' : 'AI illustration'} 
      />
      
      {/* Navigation arrows for multiple images */}
      {hasMultiple && (
        <>
          <button 
            onClick={() => setCurrentIndex(i => (i - 1 + imageUrls.length) % imageUrls.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setCurrentIndex(i => (i + 1) % imageUrls.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          {/* Dots indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imageUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Badge showing image source */}
      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
        isUserImage ? 'bg-blue-500/90 text-white' : 'bg-purple-500/90 text-white'
      }`}>
        {isUserImage ? (
          <><ImageIcon className="h-3 w-3" /> {imageUrls.length} photo{imageUrls.length > 1 ? 's' : ''}</>
        ) : (
          <><Sparkles className="h-3 w-3" /> AI generated</>
        )}
      </div>
    </div>
  );
};

/**
 * Chapter Card Component
 */
const ChapterCard: React.FC<{
  chapter: Chapter;
  index: number;
  sourceNote?: Note;
  isLast: boolean;
  isGenerating: boolean;
}> = ({ chapter, index, sourceNote, isLast, isGenerating }) => {
  const timestamp = sourceNote ? new Date(sourceNote.timestamp).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <article className="space-y-5">
      {/* Chapter header */}
      <div className="flex items-start gap-4">
        <span className="text-5xl font-serif text-primary/15 font-bold leading-none">{index + 1}</span>
        <div className="flex-1 pt-2">
          <h2 className="text-xl font-serif font-bold text-ink leading-tight">{chapter.title}</h2>
          {timestamp && (
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timestamp}
            </p>
          )}
        </div>
      </div>
      
      {/* Images */}
      <ImageGallery 
        userImageIds={chapter.userImageIds || []} 
        generatedImageUrl={chapter.generatedImageUrl}
      />

      {/* Content */}
      <div className="prose prose-stone prose-p:font-serif prose-p:text-lg prose-p:leading-relaxed text-ink/90 prose-p:mb-4">
        {chapter.content.split('\n').filter(p => p.trim()).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      
      {/* Separator */}
      {!isLast && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-stone-200"></div>
            <div className="h-2 w-2 bg-primary/30 rounded-full"></div>
            <div className="h-px w-12 bg-stone-200"></div>
          </div>
        </div>
      )}
    </article>
  );
};

interface SpaceViewProps {
  space: StorySpace;
  onBack: () => void;
  onUpdateSpace: (updatedSpace: StorySpace) => void;
}

type Tab = 'TIMELINE' | 'STORY' | 'VIDEO';

export const SpaceView: React.FC<SpaceViewProps> = ({ space, onBack, onUpdateSpace }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMELINE');
  const [isProcessingNote, setIsProcessingNote] = useState(false);
  const [narratorPhoto, setNarratorPhoto] = useState<Blob | null>(null);
  
  // Get current story generation settings
  const { settings } = useSettings();

  const { notes, addNote, updateNote, deleteNote, syncNotes } = useNotes(
    space.notes,
    (updatedNotes) => onUpdateSpace({ ...space, notes: updatedNotes })
  );

  const { 
    chapters, 
    isGenerating, 
    generationStep,
    generationProgress,
    generateStory, 
    syncChapters 
  } = useStoryGeneration(
    space.generatedStory,
    (updatedChapters) => onUpdateSpace({ ...space, generatedStory: updatedChapters })
  );

  const {
    isGenerating: isGeneratingVideo,
    step: videoStep,
    progress: videoProgress,
    message: videoMessage,
    error: videoError,
    videoBlob,
    script: videoScript,
    generateVideo,
    downloadGeneratedVideo,
    reset: resetVideo
  } = useVideoGeneration(space.id);

  const {
    groupedNoteEntries,
    collapsedDays,
    toggleDayCollapse,
    expandDay,
    initializeCollapseState
  } = useGroupedNotes(notes, space.startDate);

  useEffect(() => {
    syncNotes(space.notes);
    syncChapters(space.generatedStory);
  }, [space]);

  useEffect(() => {
    initializeCollapseState();
  }, [initializeCollapseState]);

  const handleSendNote = async (input: NoteInput) => {
    setIsProcessingNote(true);

    try {
      const noteData: Partial<Note> = {};
      
      // Handle text content (caption)
      if (input.textContent) {
        noteData.textContent = input.textContent;
      }
      
      // Handle audio blobs (multiple)
      if (input.audioBlobs && input.audioBlobs.length > 0) {
        const audioFileIds: string[] = [];
        const transcriptions: string[] = [];
        
        for (const audioBlob of input.audioBlobs) {
          const audioFileId = await fileStorage.saveFile(audioBlob, `audio_${Date.now()}.webm`);
          audioFileIds.push(audioFileId);
          
          // Transcribe audio
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(audioBlob);
          });
          
          const base64Audio = await base64Promise;
          const transcription = await transcribeAudio(base64Audio, audioBlob.type);
          transcriptions.push(transcription);
        }
        
        noteData.audioFileIds = audioFileIds;
        noteData.transcriptions = transcriptions;
      }
      
      // Handle image files
      if (input.imageFiles && input.imageFiles.length > 0) {
        const imageFileIds = await Promise.all(
          input.imageFiles.map(file => fileStorage.saveFile(file, file.name))
        );
        noteData.imageFileIds = imageFileIds;
      }
      
      // Handle video files
      if (input.videoFiles && input.videoFiles.length > 0) {
        const videoFileIds = await Promise.all(
          input.videoFiles.map(file => fileStorage.saveFile(file, file.name))
        );
        noteData.videoFileIds = videoFileIds;
      }
      
      // Determine title based on user input or use numbered moment
      const title = input.title?.trim() || `Moment n°${notes.length + 1}`;
      
      // Create the note (all notes are type MOMENT now)
      const newNote = addNote({
        type: NoteType.MOMENT,
        title,
        ...noteData
      });
      
      const dateKey = formatDateKey(newNote.timestamp);
      expandDay(dateKey);
      
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsProcessingNote(false);
    }
  };

  const handleGenerateStory = async () => {
    setActiveTab('STORY');
    try {
      // Pass settings to the story generation pipeline
      await generateStory(notes, space.title, settings);
    } catch (e) {
      console.error(e);
      alert("Failed to generate story. Please try again.");
    }
  };

  const handleGenerateVideo = async () => {
    if (chapters.length === 0) {
      alert("Please generate a story first before creating a video.");
      return;
    }
    
    // Switch to VIDEO tab
    setActiveTab('VIDEO');
    
    try {
      await generateVideo(chapters, space.title, settings, {
        narratorPhotoBlob: narratorPhoto || undefined
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate video. Please try again.");
    }
  };

  const handleDownloadVideo = () => {
    downloadGeneratedVideo(space.title);
  };

  const handleNarratorPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setNarratorPhoto(file);
    } else if (file) {
      alert('Please select an image file');
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
            <p className="text-xs text-stone-500">{notes.length} moment{notes.length !== 1 ? 's' : ''} captured</p>
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-full shrink-0">
          <button 
            onClick={() => setActiveTab('TIMELINE')}
            className={`p-2 rounded-full transition-all ${activeTab === 'TIMELINE' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
          >
            <Clock className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveTab('STORY')}
            className={`p-2 rounded-full transition-all ${activeTab === 'STORY' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveTab('VIDEO')}
            className={`p-2 rounded-full transition-all ${activeTab === 'VIDEO' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        
        {/* TAB: TIMELINE (Conversation View) */}
        {activeTab === 'TIMELINE' && (
          <div className="p-6 space-y-6 pb-32">
             <div className="bg-gradient-to-b from-primary/5 to-transparent p-6 rounded-3xl text-center border border-primary/10">
                <p className="text-sm text-ink/70 font-serif italic mb-2 leading-relaxed">
                  "{space.description}"
                </p>
                <div className="w-8 h-0.5 bg-primary/20 mx-auto my-3"></div>
                <p className="text-xs text-stone-400">Capture your moments as they happen</p>
             </div>

             {/* Input Composer */}
             <InputComposer onSend={handleSendNote} isProcessing={isProcessingNote} />

             {/* Notes Timeline */}
             <div className="mt-8">
                {notes.length === 0 ? (
                  <div className="text-center py-12 opacity-50">
                    <p className="text-sm text-stone-500">No moments yet. Start by typing, recording, or uploading something!</p>
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
                      onDeleteNote={deleteNote}
                    />
                  ))
                )}
             </div>
          </div>
        )}

        {/* TAB: STORY */}
        {activeTab === 'STORY' && (
          <div className="min-h-full bg-white">
            {/* Show workflow when generating */}
            {isGenerating && generationStep !== 'idle' && generationStep !== 'done' ? (
              <GenerationWorkflow step={generationStep} progress={generationProgress} />
            ) : chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center">
                 <div className="bg-soft p-6 rounded-full mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                 </div>
                 <h3 className="text-2xl font-serif font-bold text-ink mb-2">Ready to write?</h3>
                 <p className="text-stone-500 mb-8 leading-relaxed">
                   You have collected {notes.length} moment{notes.length !== 1 ? 's' : ''}. 
                   <br/>Let's turn them into a beautiful chapter of your life.
                 </p>
                 <Button onClick={handleGenerateStory} size="lg" className="w-full shadow-xl shadow-primary/20">
                    Generate Story
                 </Button>
              </div>
            ) : (
              <div className="animate-fade-in">
                 {/* Story header */}
                 <div className="h-64 relative overflow-hidden">
                    <div className="absolute inset-0 bg-ink/20 z-10"></div>
                    <img src={space.coverImage} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                      <h1 className="text-3xl font-serif font-bold text-white leading-tight">{space.title}</h1>
                      <p className="text-white/80 text-sm mt-2 font-medium tracking-wide">{space.description}</p>
                      <p className="text-white/60 text-xs mt-2">
                        {chapters.length} section{chapters.length !== 1 ? 's' : ''} • {notes.length} moment{notes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                 </div>

                 {/* Chapters */}
                 <div className="p-8 space-y-4 pb-32">
                    {chapters.map((chapter, idx) => {
                      const sourceNote = notes.find(n => n.id === chapter.sourceNoteId);
                      return (
                        <ChapterCard
                          key={chapter.sourceNoteId || idx}
                          chapter={chapter}
                          index={idx}
                          sourceNote={sourceNote}
                          isLast={idx === chapters.length - 1}
                          isGenerating={isGenerating}
                        />
                      );
                    })}
                 </div>
                 
                 {/* Action buttons */}
                 <div className="fixed bottom-6 right-6 z-30 flex gap-3">
                      {/* Generate video button */}
                      <Button 
                        onClick={handleGenerateVideo} 
                        variant="secondary" 
                        className="shadow-2xl flex gap-2"
                        disabled={isGenerating || isGeneratingVideo}
                      >
                         <Video className={`h-4 w-4 ${isGeneratingVideo ? 'animate-pulse' : ''}`} /> 
                         {isGeneratingVideo ? 'Creating...' : '🎬 Create Video'}
                      </Button>
                      
                      {/* Regenerate story button */}
                      <Button 
                        onClick={handleGenerateStory} 
                        variant="primary" 
                        className="shadow-2xl flex gap-2"
                        disabled={isGenerating || isGeneratingVideo}
                      >
                         <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} /> 
                         {isGenerating ? 'Rewriting...' : 'Rewrite'}
                      </Button>
                 </div>
                 
                 {/* Video generation progress overlay */}
                 {isGeneratingVideo && videoStep !== 'idle' && (
                   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-6">
                     <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
                       <div className="flex flex-col items-center gap-3">
                         <div className="relative">
                           <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full animate-pulse"></div>
                           <Video className="h-12 w-12 text-primary relative z-10" />
                         </div>
                         <h3 className="text-xl font-serif font-bold text-ink">Creating Your Video</h3>
                       </div>
                       
                       <div className="space-y-3">
                         <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                             style={{ width: `${videoProgress}%` }}
                           />
                         </div>
                         <p className="text-sm text-stone-600 text-center">{videoMessage}</p>
                         <p className="text-xs text-stone-400 text-center">{Math.round(videoProgress)}% complete</p>
                       </div>
                       
                       {videoError && (
                         <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                           <p className="text-sm text-red-600">{videoError}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

        {/* TAB: VIDEO */}
        {activeTab === 'VIDEO' && (
          <div className="p-6 space-y-6 pb-32">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-ink mb-2">Video Story</h2>
                <p className="text-sm text-stone-500">Your moments turned into a narrative video</p>
              </div>

              {/* Narrator photo upload */}
              {!videoBlob && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <label className="flex flex-col gap-3 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {narratorPhoto ? (
                        <>
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
                            <img 
                              src={URL.createObjectURL(narratorPhoto)} 
                              alt="Narrator" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-green-600 mb-1">
                              ✅ Narrator photo ready!
                            </span>
                            <span className="text-xs text-stone-400">
                              This photo will be animated to tell your story
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-3xl">
                            📸
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-stone-700 mb-1">
                              Upload your photo
                            </span>
                            <span className="text-xs text-stone-400">
                              Required to generate your video story
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleNarratorPhotoChange}
                      className="text-xs text-stone-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
                    />
                  </label>
                </div>
              )}

              {/* Generate Video Button */}
              {!videoBlob && !isGeneratingVideo && (
                <Button 
                  onClick={handleGenerateVideo} 
                  variant="primary" 
                  className="w-full py-4 text-lg shadow-xl flex gap-3 items-center justify-center"
                  disabled={!narratorPhoto}
                >
                  <Video className="h-6 w-6" /> 
                  Generate Video Story
                </Button>
              )}

              {/* Video generation progress */}
              {isGeneratingVideo && (
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full animate-pulse"></div>
                      <Video className="h-16 w-16 text-primary relative z-10 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-ink">{videoMessage}</h3>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${videoProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-stone-500">{Math.round(videoProgress)}% complete</p>
                  </div>
                </div>
              )}

              {/* Video Player + Script */}
              {videoBlob && videoScript && (
                <div className="space-y-6">
                  {/* Video Player */}
                  <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
                    <video 
                      src={URL.createObjectURL(videoBlob)} 
                      controls 
                      className="w-full"
                      style={{ maxHeight: '600px' }}
                    />
                  </div>

                  {/* Download Button */}
                  <Button 
                    onClick={handleDownloadVideo} 
                    variant="secondary" 
                    className="w-full py-3 flex gap-2 bg-green-500 hover:bg-green-600 text-white shadow-lg"
                  >
                    <Download className="h-5 w-5" /> 
                    Download Video
                  </Button>

                  {/* Script */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-serif font-bold text-ink mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Video Script
                    </h3>
                    <div className="space-y-4">
                      {videoScript.scenes.map((scene, idx) => (
                        <div key={idx} className="border-l-2 border-primary/30 pl-4">
                          <div className="text-xs text-stone-400 mb-1">Scene {idx + 1}</div>
                          <p className="text-sm text-ink/80 leading-relaxed">{scene.narrationText}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regenerate Button */}
                  <Button 
                    onClick={() => {
                      // Reset and allow regeneration
                      setActiveTab('VIDEO');
                    }} 
                    variant="secondary" 
                    className="w-full py-3 flex gap-2"
                  >
                    <Video className="h-5 w-5" /> 
                    Generate New Video
                  </Button>
                </div>
              )}

              {videoError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Generation Failed</h3>
                  <p className="text-sm text-red-600">{videoError}</p>
                  <Button 
                    onClick={handleGenerateVideo} 
                    variant="secondary" 
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
