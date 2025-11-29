import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteType } from '../types';
import { Mic, Image as ImageIcon, Video as VideoIcon, Trash2, X, Plus } from 'lucide-react';
import { formatTime } from '../utils/dateHelpers';
import { fileStorage } from '../services/fileStorage';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { transcribeAudio } from '../services/gemini';

interface NoteCardProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, onDelete }) => {
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [focusMedia, setFocusMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const { isRecording, duration, formatTime: formatRecordingTime, startRecording, stopRecording } = useAudioRecording();

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showDeleteModal || focusMedia) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDeleteModal, focusMedia]);

  // Load media files
  useEffect(() => {
    const loadMedia = async () => {
      if (note.audioFileIds && note.audioFileIds.length > 0) {
        const urls = await Promise.all(
          note.audioFileIds.map(id => fileStorage.getFileUrl(id))
        );
        setAudioUrls(urls.filter(url => url !== undefined) as string[]);
      } else {
        setAudioUrls([]);
      }
      
      if (note.imageFileIds && note.imageFileIds.length > 0) {
        const urls = await Promise.all(
          note.imageFileIds.map(id => fileStorage.getFileUrl(id))
        );
        setImageUrls(urls.filter(url => url !== undefined) as string[]);
      } else {
        setImageUrls([]);
      }
      
      if (note.videoFileIds && note.videoFileIds.length > 0) {
        const urls = await Promise.all(
          note.videoFileIds.map(id => fileStorage.getFileUrl(id))
        );
        setVideoUrls(urls.filter(url => url !== undefined) as string[]);
      } else {
        setVideoUrls([]);
      }
    };

    loadMedia();

    return () => {
      audioUrls.forEach(url => URL.revokeObjectURL(url));
      imageUrls.forEach(url => URL.revokeObjectURL(url));
      videoUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [note.audioFileIds, note.imageFileIds, note.videoFileIds]);

  useEffect(() => {
    if (isEditingText && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [isEditingText, editText]);

  const startEditingTitle = () => {
    setEditTitle(note.title || 'Moment');
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const saveTitle = () => {
    if (editTitle.trim() !== note.title) {
      onUpdate({ ...note, title: editTitle.trim() || 'Moment' });
    }
    setIsEditingTitle(false);
  };

  const startEditingText = () => {
    setEditText(note.textContent || '');
    setIsEditingText(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const saveText = () => {
    if (editText.trim() !== note.textContent) {
      onUpdate({ ...note, textContent: editText.trim() || undefined });
    }
    setIsEditingText(false);
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    try {
      const newImageIds = await Promise.all(
        files.map(file => fileStorage.saveFile(file, file.name))
      );
      const updatedIds = [...(note.imageFileIds || []), ...newImageIds];
      onUpdate({ ...note, imageFileIds: updatedIds });
    } catch (error) {
      console.error('Failed to add images:', error);
      alert('Failed to add images. Please try again.');
    }
    if (e.target) e.target.value = '';
  };

  const handleAddVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    try {
      const newVideoIds = await Promise.all(
        files.map(file => fileStorage.saveFile(file, file.name))
      );
      const updatedIds = [...(note.videoFileIds || []), ...newVideoIds];
      onUpdate({ ...note, videoFileIds: updatedIds });
    } catch (error) {
      console.error('Failed to add videos:', error);
      alert('Failed to add videos. Please try again.');
    }
    if (e.target) e.target.value = '';
  };

  const handleRecordAudio = async () => {
    if (isRecording) {
      try {
        setIsProcessingAudio(true);
        const result = await stopRecording();
        const audioFileId = await fileStorage.saveFile(result.blob, `audio_${Date.now()}.webm`);
        
        // Transcribe
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(result.blob);
        });
        
        const base64Audio = await base64Promise;
        const transcription = await transcribeAudio(base64Audio, result.blob.type);
        
        const updatedAudioIds = [...(note.audioFileIds || []), audioFileId];
        const updatedTranscriptions = [...(note.transcriptions || []), transcription];
        
        onUpdate({
          ...note,
          audioFileIds: updatedAudioIds,
          transcriptions: updatedTranscriptions
        });
      } catch (error) {
        console.error('Recording failed:', error);
        alert('Recording failed. Please try again.');
      } finally {
        setIsProcessingAudio(false);
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedIds = note.imageFileIds?.filter((_, i) => i !== index);
    onUpdate({ ...note, imageFileIds: updatedIds?.length ? updatedIds : undefined });
  };

  const handleRemoveVideo = (index: number) => {
    const updatedIds = note.videoFileIds?.filter((_, i) => i !== index);
    onUpdate({ ...note, videoFileIds: updatedIds?.length ? updatedIds : undefined });
  };

  const handleRemoveAudio = (index: number) => {
    const updatedAudioIds = note.audioFileIds?.filter((_, i) => i !== index);
    const updatedTranscriptions = note.transcriptions?.filter((_, i) => i !== index);
    onUpdate({
      ...note,
      audioFileIds: updatedAudioIds?.length ? updatedAudioIds : undefined,
      transcriptions: updatedTranscriptions?.length ? updatedTranscriptions : undefined
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  const confirmDelete = () => {
    onDelete(note.id);
    setShowDeleteModal(false);
  };

  const hasMedia = (note.imageFileIds && note.imageFileIds.length > 0) || 
                    (note.videoFileIds && note.videoFileIds.length > 0) || 
                    (note.audioFileIds && note.audioFileIds.length > 0);

  return (
    <>
    <div className="flex gap-4 group/card">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-stone-300 rounded-full mt-2"></div>
        <div className="w-px bg-stone-200 flex-1 my-1"></div>
      </div>
      <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-stone-100 relative">
          {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-stone-400">
                  {formatTime(note.timestamp)}
               </span>
            </div>
            {isEditingTitle ? (
              <input 
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="w-full font-bold text-ink text-sm border-b border-primary focus:outline-none bg-transparent p-0"
              />
            ) : (
              <h4 
                  onClick={startEditingTitle}
                  className="font-bold text-ink text-sm cursor-text hover:opacity-60 transition-opacity"
              >
                  {note.title || 'Moment'}
              </h4>
            )}
            </div>

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover/card:opacity-100"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
            </button>
          </div>

          {/* Text Content */}
          {isEditingText ? (
               <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveText}
              className="w-full text-sm text-ink whitespace-pre-wrap leading-relaxed mb-3 border-b border-primary focus:outline-none bg-transparent resize-none p-0 overflow-hidden"
              placeholder="Add a caption..."
              rows={1}
            />
          ) : note.textContent ? (
            <p
              onClick={startEditingText}
              className="text-sm text-ink whitespace-pre-wrap leading-relaxed mb-3 cursor-text hover:opacity-60 transition-opacity"
            >
              {note.textContent}
            </p>
          ) : (
            <p
              onClick={startEditingText}
              className="text-sm text-stone-400 italic mb-3 cursor-text hover:opacity-60 transition-opacity"
            >
              Click to add a caption...
            </p>
          )}

          {/* Audio */}
          {audioUrls.length > 0 && (
            <div className="mb-3 space-y-2">
              {audioUrls.map((url, index) => (
                <div 
                  key={index} 
                  className="relative group/audio"
                >
                  <audio src={url} controls className="w-full h-10" />
                  {note.transcriptions && note.transcriptions[index] && (
                    <p className="text-xs text-stone-500 italic mt-1 pl-2 border-l-2 border-stone-200">
                      {note.transcriptions[index]}
                    </p>
                  )}
                  <button
                    onClick={() => handleRemoveAudio(index)}
                    className="absolute -top-2 -right-2 p-1 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 opacity-0 group-hover/audio:opacity-100 transition-opacity duration-200"
                  >
                    <X className="h-3 w-3 text-stone-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Images */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {imageUrls.map((url, index) => (
                <div 
                  key={index} 
                  className="relative group/img rounded overflow-hidden border border-stone-200"
                >
                  <div
                    className="cursor-pointer hover:opacity-90"
                    onClick={() => setFocusMedia({ type: 'image', url })}
                  >
                    <img src={url} alt={`Photo ${index + 1}`} className="w-full aspect-square object-cover" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-white border border-stone-300 rounded-full shadow-sm hover:bg-stone-50 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
                  >
                    <X className="h-2.5 w-2.5 text-stone-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {videoUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {videoUrls.map((url, index) => (
                <div 
                  key={index} 
                  className="relative group/video rounded overflow-hidden border border-stone-200 bg-black"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => setFocusMedia({ type: 'video', url })}
                  >
                    <video src={url} className="w-full aspect-video object-cover" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveVideo(index);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-white border border-stone-300 rounded-full shadow-sm hover:bg-stone-50 z-10 opacity-0 group-hover/video:opacity-100 transition-opacity duration-200"
                  >
                    <X className="h-2.5 w-2.5 text-stone-600" />
                  </button>
                </div>
              ))}
              </div>
            )}

          {/* Processing Audio Indicator */}
          {isProcessingAudio && (
            <div className="mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-primary font-medium">
                Processing audio transcription...
              </span>
            </div>
          )}

          {/* Add Media Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-stone-200 rounded hover:bg-stone-50 text-stone-600"
            >
              <ImageIcon className="h-3 w-3" />
              Photo
            </button>
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleAddImages}
              className="hidden"
            />
            
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-stone-200 rounded hover:bg-stone-50 text-stone-600"
            >
              <VideoIcon className="h-3 w-3" />
              Video
            </button>
            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleAddVideos}
              className="hidden"
            />
            
            <button
              onClick={handleRecordAudio}
              disabled={isProcessingAudio}
              className={`flex items-center gap-1 px-2 py-1 text-xs border rounded ${
                isRecording
                  ? 'border-rose-500 bg-rose-50 text-rose-600'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isRecording ? (
                <>
                  <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                  {formatRecordingTime(duration)}
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3" />
                  Voice
                </>
              )}
            </button>
          </div>
          </div>
        </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">Delete Moment?</h3>
                <p className="text-sm text-stone-600">
                  This moment will be permanently deleted. This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors text-sm font-medium text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Focus/Preview Modal */}
      {focusMedia && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFocusMedia(null)}
        >
          <button
            onClick={() => setFocusMedia(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          
          <div className="max-w-5xl max-h-full w-full" onClick={(e) => e.stopPropagation()}>
            {focusMedia.type === 'image' ? (
              <img 
                src={focusMedia.url} 
                alt="Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg mx-auto"
              />
            ) : (
              <video 
                src={focusMedia.url} 
                controls 
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg mx-auto"
              />
            )}
      </div>
    </div>
      )}
    </>
  );
};
