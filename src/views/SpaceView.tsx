import React, { useState, useEffect } from 'react';
import { StorySpace, NoteType, Note } from '../types';
import { ArrowLeft, Clock, Sparkles, Wand2, Video, Download, Music, Mic } from 'lucide-react';
import { Button } from '../components/Button';
import { InputComposer, NoteInput } from '../components/InputComposer';
import { DayGroup } from '../components/DayGroup';
import { transcribeAudio, generateVlogScript } from '../services/gemini';
import { generateVideoAssets, downloadVlogPackage, downloadAudioAsset, assembleVideoFile, downloadVideoFile, VideoAsset } from '../services/videoGeneration';
import { fileStorage } from '../services/fileStorage';
import { useGroupedNotes } from '../hooks/useGroupedNotes';
import { useNotes } from '../hooks/useNotes';
import { useStoryGeneration } from '../hooks/useStoryGeneration';
import { useSettings } from '../hooks/useSettings';
import { formatDateKey } from '../utils/dateHelpers';

interface SpaceViewProps {
  space: StorySpace;
  onBack: () => void;
  onUpdateSpace: (updatedSpace: StorySpace) => void;
}

type Tab = 'TIMELINE' | 'STORY' | 'VLOG';

export const SpaceView: React.FC<SpaceViewProps> = ({ space, onBack, onUpdateSpace }) => {
  const [activeTab, setActiveTab] = useState<Tab>('TIMELINE');
  const [isProcessingNote, setIsProcessingNote] = useState(false);
  const [isGeneratingVlog, setIsGeneratingVlog] = useState(false);
  const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
  const [isAssemblingVideo, setIsAssemblingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState('');
  const [videoAssets, setVideoAssets] = useState<{
    narrations: VideoAsset[];
    music: VideoAsset | null;
  } | null>(null);
  const { settings } = useSettings();

  const { notes, addNote, updateNote, deleteNote, syncNotes } = useNotes(
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
      
      // Handle audio blobs (multiple) - just save, no transcription yet
      if (input.audioBlobs && input.audioBlobs.length > 0) {
        const audioFileIds: string[] = [];
        
        for (const audioBlob of input.audioBlobs) {
          const audioFileId = await fileStorage.saveFile(audioBlob, `audio_${Date.now()}.webm`);
          audioFileIds.push(audioFileId);
        }
        
        noteData.audioFileIds = audioFileIds;
        // No transcriptions yet - will be done when generating story
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
      await generateStory(notes, space.title);
    } catch (e) {
      console.error(e);
      alert("Failed to generate story. Please try again.");
    }
  };

  const handleGenerateVlog = async () => {
    setIsGeneratingVlog(true);
    try {
      const vlogScript = await generateVlogScript(notes, space.title, {
        narrativeTone: settings.narrativeTone,
        voiceStyle: settings.voiceStyle,
        duration: 'medium'
      });
      
      onUpdateSpace({ 
        ...space, 
        generatedVlog: {
          ...vlogScript,
          generatedAt: Date.now()
        }
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate vlog. Please try again.");
    } finally {
      setIsGeneratingVlog(false);
    }
  };

  const handleGenerateVideoAssets = async () => {
    if (!space.generatedVlog) return;

    setIsGeneratingAssets(true);
    setVideoProgress(0);
    setVideoStatus('Starting...');

    try {
      const assets = await generateVideoAssets(
        space.generatedVlog,
        (progress, status) => {
          setVideoProgress(progress);
          setVideoStatus(status);
        }
      );

      setVideoAssets(assets);
      setVideoStatus('All assets generated!');
    } catch (e) {
      console.error(e);
      alert("Failed to generate video assets. Please try again.");
    } finally {
      setIsGeneratingAssets(false);
    }
  };

  const handleDownloadPackage = () => {
    if (!space.generatedVlog || !videoAssets) return;
    
    downloadVlogPackage(
      space.generatedVlog,
      videoAssets.narrations,
      videoAssets.music,
      space.title
    );
  };

  const handleDownloadNarration = (index: number) => {
    if (!videoAssets?.narrations[index]) return;
    
    const narration = videoAssets.narrations[index];
    downloadAudioAsset(
      narration.audioData,
      `${space.title}_narration_${index + 1}.mp3`
    );
  };

  const handleDownloadMusic = () => {
    if (!videoAssets?.music) return;
    
    downloadAudioAsset(
      videoAssets.music.audioData,
      `${space.title}_background_music.mp3`
    );
  };

  const handleAssembleVideo = async () => {
    if (!space.generatedVlog || !videoAssets) return;

    setIsAssemblingVideo(true);
    setVideoProgress(0);
    setVideoStatus('Assembling video...');

    try {
      const videoBlob = await assembleVideoFile(
        space.generatedVlog,
        videoAssets.narrations,
        videoAssets.music,
        (progress, status) => {
          setVideoProgress(progress);
          setVideoStatus(status);
        }
      );

      // Download the video
      downloadVideoFile(videoBlob, space.title);
      setVideoStatus('Video downloaded!');
    } catch (e) {
      console.error(e);
      alert("Failed to assemble video. Please try again.");
    } finally {
      setIsAssemblingVideo(false);
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
            onClick={() => setActiveTab('VLOG')}
            className={`p-2 rounded-full transition-all ${activeTab === 'VLOG' ? 'bg-white shadow-sm text-ink' : 'text-stone-400'}`}
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
                   You have collected {notes.length} moment{notes.length !== 1 ? 's' : ''}. 
                   <br/>Let's turn them into a beautiful chapter of your life.
                 </p>
                 <Button onClick={handleGenerateStory} size="lg" className="w-full shadow-xl shadow-primary/20">
                    Generate Story
                 </Button>
              </div>
            ) : (
              <div className="animate-fade-in">
                 <div className="h-64 relative overflow-hidden">
                    <div className="absolute inset-0 bg-ink/20 z-10"></div>
                    <img src={space.coverImage} className="w-full h-full object-cover" alt="" />
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
                 
                 <div className="fixed bottom-6 right-6 z-30">
                    <Button onClick={handleGenerateStory} variant="primary" className="shadow-2xl flex gap-2">
                       <Sparkles className="h-4 w-4" /> Rewrite
                    </Button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: VLOG */}
        {activeTab === 'VLOG' && (
          <div className="min-h-full bg-white">
            {isGeneratingVlog ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary opacity-20 blur-xl rounded-full animate-pulse-slow"></div>
                  <Video className="h-12 w-12 text-primary relative z-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold">Creating your vlog...</h3>
                  <p className="text-stone-500 mt-2 text-sm">Analyzing moments, writing narration, and generating video script.</p>
                </div>
              </div>
            ) : !space.generatedVlog ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="bg-soft p-6 rounded-full mb-6">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-2">Ready to film?</h3>
                <p className="text-stone-500 mb-8 leading-relaxed">
                  You have collected {notes.length} moment{notes.length !== 1 ? 's' : ''}. 
                  <br/>Let's turn them into a cinematic vlog.
                </p>
                <Button onClick={handleGenerateVlog} size="lg" className="w-full shadow-xl shadow-primary/20">
                  Generate Vlog
                </Button>
              </div>
            ) : (
              <div className="animate-fade-in p-6 pb-32">
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Vlog Header */}
                  <div className="bg-gradient-to-br from-ink to-ink/80 text-white p-8 rounded-3xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Video className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-2">{space.generatedVlog.title}</h1>
                        <p className="text-white/80 text-sm">
                          {Math.floor(space.generatedVlog.totalDuration / 60)}:{(space.generatedVlog.totalDuration % 60).toString().padStart(2, '0')} • {space.generatedVlog.scenes.length} scenes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Music Info */}
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Background Music</h3>
                    <p className="text-sm text-ink/70">{space.generatedVlog.musicPrompt}</p>
                  </div>

                  {/* Scenes */}
                  <div className="space-y-6">
                    {space.generatedVlog.scenes.map((scene, idx) => (
                      <div key={idx} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-stone-100 px-3 py-1 rounded-full">
                            <span className="text-xs font-mono font-bold text-stone-600">
                              {Math.floor(scene.startTime / 60)}:{(scene.startTime % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-ink mb-1">Scene {idx + 1}</h4>
                            <p className="text-xs text-stone-500">{scene.duration}s • {scene.musicMood}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Narration</h5>
                            <p className="text-sm text-ink/90 leading-relaxed italic">"{scene.narration}"</p>
                          </div>

                          <div>
                            <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Visuals</h5>
                            <p className="text-sm text-stone-600 leading-relaxed">{scene.visualDescription}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Video Generation Section */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      Generate Media Assets
                    </h3>
                    
                    {isGeneratingAssets ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-ink">{videoStatus}</span>
                            <span className="text-sm font-mono font-bold text-primary">{Math.round(videoProgress)}%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-300 rounded-full"
                              style={{ width: `${videoProgress}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-stone-600">
                          Using Google Cloud Text-to-Speech API for high-quality voiceover...
                        </p>
                      </div>
                    ) : videoAssets ? (
                      <div className="space-y-4">
                        {/* Narrations */}
                        <div className="bg-white p-4 rounded-xl border border-stone-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Mic className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-bold text-ink">Voiceovers Generated</h4>
                          </div>
                          <div className="space-y-2">
                            {videoAssets.narrations.map((narration, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded">
                                <span className="text-xs text-stone-600">Scene {idx + 1} narration</span>
                                <button
                                  onClick={() => handleDownloadNarration(idx)}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Music */}
                        {videoAssets.music && (
                          <div className="bg-white p-4 rounded-xl border border-stone-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Music className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-bold text-ink">Background Music</h4>
                            </div>
                            <button
                              onClick={handleDownloadMusic}
                              className="w-full p-2 bg-stone-50 rounded hover:bg-stone-100 text-sm text-primary flex items-center justify-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download Music Track
                            </button>
                          </div>
                        )}

                        {/* Download Package */}
                        <div className="flex gap-3">
                          <Button 
                            onClick={handleDownloadPackage}
                            className="flex-1 flex items-center justify-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Audio Package
                          </Button>
                          <Button 
                            onClick={handleAssembleVideo}
                            variant="primary"
                            disabled={isAssemblingVideo}
                            className="flex-1"
                          >
                            <Video className="h-4 w-4" />
                            {isAssemblingVideo ? 'Creating Video...' : 'Create Video'}
                          </Button>
                        </div>

                        <p className="text-xs text-stone-500 leading-relaxed">
                          💡 Audio Package includes: script + voiceovers. Video assembles everything into one .webm file!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-stone-600 leading-relaxed">
                          Generate professional voiceover narration and background music using Google Cloud AI.
                        </p>
                        <Button 
                          onClick={handleGenerateVideoAssets}
                          size="lg"
                          className="w-full flex items-center justify-center gap-2"
                        >
                          <Video className="h-5 w-5" />
                          Generate Voiceover & Music
                        </Button>
                        <div className="space-y-2">
                          <p className="text-xs text-stone-500 leading-relaxed flex items-center gap-2">
                            <Mic className="h-3 w-3" />
                            Google Cloud Text-to-Speech for natural voiceover
                          </p>
                          <p className="text-xs text-stone-500 leading-relaxed flex items-center gap-2">
                            <Music className="h-3 w-3" />
                            MusicFX for background soundtrack
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="fixed bottom-6 right-6 z-30">
                  <Button onClick={handleGenerateVlog} variant="primary" className="shadow-2xl flex gap-2">
                    <Video className="h-4 w-4" /> Regenerate
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
