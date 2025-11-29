import React, { useState, useEffect } from 'react';
import { StorySpace, NoteType, Note, Chapter } from '../types';
import { ArrowLeft, Clock, Sparkles, Wand2, Image as ImageIcon, Calendar, ChevronLeft, ChevronRight, Loader2, Check, PenTool, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { InputComposer, NoteInput } from '../components/InputComposer';
import { DayGroup } from '../components/DayGroup';
import { transcribeAudio } from '../services/gemini';
import { fileStorage } from '../services/fileStorage';
import { useGroupedNotes } from '../hooks/useGroupedNotes';
import { useNotes } from '../hooks/useNotes';
import { useStoryGeneration, GenerationStep } from '../hooks/useStoryGeneration';
import { useSettings } from '../hooks/useSettings';
import { formatDateKey } from '../utils/dateHelpers';

interface SpaceViewProps {
  space: StorySpace;
  onBack: () => void;
  onUpdateSpace: (updatedSpace: StorySpace) => void;
}

type Tab = 'TIMELINE' | 'STORY';

/**
 * Progress Step indicator component
 */
const ProgressStep: React.FC<{
  step: GenerationStep;
  currentStep: GenerationStep;
  label: string;
  icon: React.ReactNode;
}> = ({ step, currentStep, label, icon }) => {
  const steps: GenerationStep[] = ['analyzing', 'writing', 'images', 'done'];
  const currentIndex = steps.indexOf(currentStep);
  const stepIndex = steps.indexOf(step);
  
  const isActive = step === currentStep;
  const isComplete = stepIndex < currentIndex || currentStep === 'done';
  const isPending = stepIndex > currentIndex;

  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${
      isActive ? 'scale-110' : ''
    }`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-primary text-white animate-pulse' :
        'bg-stone-200 text-stone-400'
      }`}>
        {isComplete ? <Check className="h-6 w-6" /> : icon}
      </div>
      <span className={`text-xs font-medium transition-colors ${
        isActive ? 'text-primary' : isComplete ? 'text-green-600' : 'text-stone-400'
      }`}>
        {label}
      </span>
    </div>
  );
};

/**
 * Generation Workflow Display
 */
const GenerationWorkflow: React.FC<{
  currentStep: GenerationStep;
  message: string;
  currentChapter?: number;
  totalChapters?: number;
}> = ({ currentStep, message, currentChapter, totalChapters }) => {
  if (currentStep === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <ProgressStep 
          step="analyzing" 
          currentStep={currentStep} 
          label="Analyze" 
          icon={<Search className="h-5 w-5" />}
        />
        <div className={`w-12 h-0.5 transition-colors ${
          ['writing', 'images', 'done'].includes(currentStep) ? 'bg-green-500' : 'bg-stone-200'
        }`} />
        <ProgressStep 
          step="writing" 
          currentStep={currentStep} 
          label="Write" 
          icon={<PenTool className="h-5 w-5" />}
        />
        <div className={`w-12 h-0.5 transition-colors ${
          ['images', 'done'].includes(currentStep) ? 'bg-green-500' : 'bg-stone-200'
        }`} />
        <ProgressStep 
          step="images" 
          currentStep={currentStep} 
          label="Images" 
          icon={<ImageIcon className="h-5 w-5" />}
        />
        <div className={`w-12 h-0.5 transition-colors ${
          currentStep === 'done' ? 'bg-green-500' : 'bg-stone-200'
        }`} />
        <ProgressStep 
          step="done" 
          currentStep={currentStep} 
          label="Done" 
          icon={<Check className="h-5 w-5" />}
        />
      </div>

      {/* Current action message */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          {currentStep !== 'done' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
          <p className="text-lg font-medium text-ink">{message}</p>
        </div>
        {currentChapter && totalChapters && (
          <p className="text-sm text-stone-500">
            Chapter {currentChapter} of {totalChapters}
          </p>
        )}
      </div>

      {/* Animated dots */}
      {currentStep !== 'done' && (
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Image Gallery Component for chapters with multiple images
 */
const ImageGallery: React.FC<{
  images: string[];
  isUserImages: boolean;
}> = ({ images, isUserImages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white">
        <img 
          src={images[0]} 
          className="w-full h-auto object-cover" 
          alt={isUserImages ? 'Your photo' : 'AI illustration'}
        />
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
          isUserImages ? 'bg-blue-500/90 text-white' : 'bg-purple-500/90 text-white'
        }`}>
          {isUserImages ? (
            <><ImageIcon className="h-3 w-3" /> Your photo</>
          ) : (
            <><Sparkles className="h-3 w-3" /> AI generated</>
          )}
        </div>
      </div>
    );
  }

  // Multiple images - show gallery with navigation
  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white">
        <img 
          src={images[currentIndex]} 
          className="w-full h-auto object-cover transition-opacity duration-300" 
          alt={`Photo ${currentIndex + 1} of ${images.length}`}
        />
        
        {/* Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-blue-500/90 text-white">
          <ImageIcon className="h-3 w-3" /> {currentIndex + 1}/{images.length}
        </div>

        {/* Navigation arrows */}
        <button 
          onClick={() => setCurrentIndex(i => (i - 1 + images.length) % images.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button 
          onClick={() => setCurrentIndex(i => (i + 1) % images.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnail dots */}
      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-primary w-4' : 'bg-stone-300 hover:bg-stone-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Chapter Article Component
 */
const ChapterArticle: React.FC<{
  chapter: Chapter;
  index: number;
  isLast: boolean;
  isGenerating: boolean;
}> = ({ chapter, index, isLast, isGenerating }) => {
  // Determine which images to show
  const hasUserImages = chapter.userImageUrls && chapter.userImageUrls.length > 0;
  const hasGeneratedImage = !!chapter.generatedImageUrl;
  const imagesToShow = hasUserImages ? chapter.userImageUrls! : (hasGeneratedImage ? [chapter.generatedImageUrl!] : []);

  return (
    <article className="space-y-6">
      {/* Chapter Header */}
      <div className="flex items-start gap-4">
        <span className="text-4xl font-serif text-primary/20 font-bold shrink-0">{index + 1}</span>
        <div className="flex-1">
          <h2 className="text-xl font-serif font-bold text-ink">{chapter.title}</h2>
          {chapter.sourceNoteTimestamp && (
            <div className="flex items-center gap-1 mt-1 text-xs text-stone-400">
              <Calendar className="h-3 w-3" />
              <span>{new Date(chapter.sourceNoteTimestamp).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Images */}
      {imagesToShow.length > 0 ? (
        <ImageGallery images={imagesToShow} isUserImages={hasUserImages} />
      ) : isGenerating ? (
        <div className="aspect-[4/3] bg-stone-100 rounded-2xl animate-pulse flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-stone-300" />
        </div>
      ) : null}

      {/* Content */}
      <div className="prose prose-stone prose-p:font-serif prose-p:text-lg prose-p:leading-relaxed text-ink/90">
        {chapter.content.split('\n').filter(p => p.trim()).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      
      {/* Separator */}
      {!isLast && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-stone-200"></div>
            <div className="h-2 w-2 bg-stone-200 rounded-full"></div>
            <div className="h-px w-12 bg-stone-200"></div>
          </div>
        </div>
      )}
    </article>
  );
};

export const SpaceView: React.FC<SpaceViewProps> = ({ space, onBack, onUpdateSpace }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMELINE');
  const [isProcessingNote, setIsProcessingNote] = useState(false);
  
  // Get current story generation settings
  const { settings } = useSettings();

  const { notes, addNote, updateNote, deleteNote, syncNotes } = useNotes(
    space.notes,
    (updatedNotes) => onUpdateSpace({ ...space, notes: updatedNotes })
  );

  const { chapters, isGenerating, progress, generateStory, syncChapters } = useStoryGeneration(
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

  // Check if we're actively generating (not idle and not done)
  const showWorkflow = isGenerating && progress.step !== 'idle' && progress.step !== 'done';

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
            {/* Generation Workflow Display */}
            {showWorkflow ? (
              <GenerationWorkflow 
                currentStep={progress.step}
                message={progress.message}
                currentChapter={progress.currentChapter}
                totalChapters={progress.totalChapters}
              />
            ) : chapters.length === 0 ? (
              // Empty state - prompt to generate
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                 <div className="bg-soft p-6 rounded-full mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                 </div>
                 <h3 className="text-2xl font-serif font-bold text-ink mb-2">Ready to write?</h3>
                 <p className="text-stone-500 mb-8 leading-relaxed">
                   You have collected {notes.length} moment{notes.length !== 1 ? 's' : ''}. 
                   <br/>Let's turn them into a beautiful chapter of your life.
                 </p>
                 <Button onClick={handleGenerateStory} size="lg" className="w-full shadow-xl shadow-primary/20" disabled={notes.length === 0}>
                    Generate Story
                 </Button>
              </div>
            ) : (
              // Story Display
              <div className="animate-fade-in">
                 {/* Cover */}
                 <div className="h-64 relative overflow-hidden">
                    <div className="absolute inset-0 bg-ink/20 z-10"></div>
                    <img src={space.coverImage} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                      <h1 className="text-3xl font-serif font-bold text-white leading-tight">{space.title}</h1>
                      <p className="text-white/80 text-sm mt-2 font-medium tracking-wide">{space.description}</p>
                      <p className="text-white/60 text-xs mt-2">
                        {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} • Mode: {settings.storyMode}
                      </p>
                    </div>
                 </div>

                 {/* Chapters */}
                 <div className="p-8 space-y-8 pb-32">
                    {chapters.map((chapter, idx) => (
                      <ChapterArticle 
                        key={chapter.sourceNoteId || idx}
                        chapter={chapter}
                        index={idx}
                        isLast={idx === chapters.length - 1}
                        isGenerating={isGenerating}
                      />
                    ))}
                 </div>
                 
                 {/* Regenerate Button */}
                 <div className="fixed bottom-6 right-6 z-30">
                    <Button 
                      onClick={handleGenerateStory} 
                      variant="primary" 
                      className="shadow-2xl flex gap-2"
                      disabled={isGenerating}
                    >
                       {isGenerating ? (
                         <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                       ) : (
                         <><Sparkles className="h-4 w-4" /> Regenerate</>
                       )}
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
