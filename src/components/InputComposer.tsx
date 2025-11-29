import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, X, Loader2, Video as VideoIcon, Play, Maximize2 } from 'lucide-react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { NoteType } from '../types';

export interface NoteInput {
  title?: string;
  textContent?: string;
  imageFiles?: File[];
  videoFiles?: File[];
  audioBlobs?: Blob[];
}

interface InputComposerProps {
  onSend: (input: NoteInput) => Promise<void>;
  isProcessing?: boolean;
}

export const InputComposer: React.FC<InputComposerProps> = ({ onSend, isProcessing }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [audioPreviews, setAudioPreviews] = useState<string[]>([]);
  const [focusMedia, setFocusMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { isRecording, duration, formatTime, startRecording, stopRecording } = useAudioRecording();

  // Prevent body scroll when focus modal is open
  useEffect(() => {
    if (focusMedia) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [focusMedia]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + 'px';
    }
  }, [text]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      videoPreviews.forEach(url => URL.revokeObjectURL(url));
      audioPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews, videoPreviews, audioPreviews]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const previews = files.map(file => URL.createObjectURL(file));
    setImageFiles([...imageFiles, ...files]);
    setImagePreviews([...imagePreviews, ...previews]);
    
    if (e.target) e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const previews = files.map(file => URL.createObjectURL(file));
    setVideoFiles([...videoFiles, ...files]);
    setVideoPreviews([...videoPreviews, ...previews]);
    
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    URL.revokeObjectURL(videoPreviews[index]);
    setVideoFiles(videoFiles.filter((_, i) => i !== index));
    setVideoPreviews(videoPreviews.filter((_, i) => i !== index));
  };

  const removeAudio = (index: number) => {
    URL.revokeObjectURL(audioPreviews[index]);
    setAudioBlobs(audioBlobs.filter((_, i) => i !== index));
    setAudioPreviews(audioPreviews.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    videoPreviews.forEach(url => URL.revokeObjectURL(url));
    audioPreviews.forEach(url => URL.revokeObjectURL(url));
    setTitle('');
    setImageFiles([]);
    setVideoFiles([]);
    setAudioBlobs([]);
    setImagePreviews([]);
    setVideoPreviews([]);
    setAudioPreviews([]);
    setText('');
  };

  const handleSend = async () => {
    if (isProcessing) return;

    const hasContent = text.trim() || imageFiles.length > 0 || videoFiles.length > 0 || audioBlobs.length > 0;
    if (!hasContent) return;

    try {
      await onSend({
        title: title.trim() || undefined,
        textContent: text.trim() || undefined,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
        videoFiles: videoFiles.length > 0 ? videoFiles : undefined,
        audioBlobs: audioBlobs.length > 0 ? audioBlobs : undefined
      });
      
      clearAll();
    } catch (error) {
      console.error('Failed to send:', error);
      alert('Failed to send. Please try again.');
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      try {
        const result = await stopRecording();
        const audioUrl = URL.createObjectURL(result.blob);
        setAudioBlobs([...audioBlobs, result.blob]);
        setAudioPreviews([...audioPreviews, audioUrl]);
      } catch (err) {
        console.error("Error with recording:", err);
        alert('Recording failed. Please try again.');
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasAnyContent = text.trim() || imageFiles.length > 0 || videoFiles.length > 0 || audioBlobs.length > 0;
  const totalMediaCount = imageFiles.length + videoFiles.length + audioBlobs.length;

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 p-2 relative">
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mx-2 mt-2 mb-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm text-primary font-medium">
              Processing audio transcription...
            </span>
          </div>
        )}

        {/* Title Input (optional) - shows when there's content */}
        {hasAnyContent && (
          <div className="mx-2 mt-2 mb-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              disabled={isRecording || isProcessing}
              className="w-full px-2 py-1 text-sm border-b border-stone-200 focus:border-primary focus:outline-none text-ink placeholder:text-stone-400 disabled:opacity-50"
            />
          </div>
        )}

        {/* Media Previews Area */}
        {totalMediaCount > 0 && (
          <div className="mb-2 mx-2 mt-2 space-y-2">
            {/* Audio Previews */}
            {audioBlobs.length > 0 && (
              <div className="space-y-1">
                {audioBlobs.map((blob, index) => (
                  <div key={index} className="bg-stone-50 rounded-lg p-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs text-stone-600 flex-1">Voice {index + 1}</span>
                      <button 
                        onClick={() => removeAudio(index)}
                        className="p-0.5 hover:bg-stone-200 rounded"
                      >
                        <X className="h-3 w-3 text-stone-500" />
                      </button>
                    </div>
                    <audio 
                      src={audioPreviews[index]} 
                      controls 
                      className="w-full h-8"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Images Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {imagePreviews.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-square rounded overflow-hidden bg-stone-100 group cursor-pointer"
                    onClick={() => setFocusMedia({ type: 'image', url })}
                  >
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center">
                      <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-black text-white rounded z-10"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded">
                      IMG
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Videos Grid */}
            {videoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {videoPreviews.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative rounded overflow-hidden bg-black group cursor-pointer"
                    onClick={() => setFocusMedia({ type: 'video', url })}
                  >
                    <video src={url} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-70 group-hover:opacity-100" />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVideo(index);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-black text-white rounded z-10"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <div className="absolute bottom-0.5 left-0.5 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded">
                      VIDEO
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-center gap-1 p-1">
          {/* Image Button */}
          <button 
            onClick={() => imageInputRef.current?.click()}
            disabled={isRecording || isProcessing}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded shrink-0 disabled:opacity-50"
            title="Add photos"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <input 
            ref={imageInputRef}
            type="file" 
            className="hidden"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={isRecording || isProcessing}
            multiple
          />

          {/* Video Button */}
          <button 
            onClick={() => videoInputRef.current?.click()}
            disabled={isRecording || isProcessing}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded shrink-0 disabled:opacity-50"
            title="Add videos"
          >
            <VideoIcon className="h-4 w-4" />
          </button>
          <input 
            ref={videoInputRef}
            type="file" 
            className="hidden"
            accept="video/*"
            onChange={handleVideoSelect}
            disabled={isRecording || isProcessing}
            multiple
          />

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            rows={1}
            disabled={isRecording || isProcessing}
            className="flex-1 bg-transparent py-2 px-2 max-h-20 resize-none focus:outline-none text-sm text-ink placeholder:text-stone-400 disabled:opacity-50"
            style={{ minHeight: '32px' }}
          />

          {/* Recording Duration Display */}
          {isRecording && (
            <div className="flex items-center gap-1 text-rose-500 shrink-0">
              <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
              <span className="font-mono text-xs">{formatTime(duration)}</span>
            </div>
          )}

          {/* Mic Button */}
          <button 
            onClick={handleRecordToggle}
            disabled={isProcessing}
            className={`p-2 rounded shrink-0 disabled:opacity-50 relative ${
              isRecording
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : audioBlobs.length > 0
                ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            }`}
            title={isRecording ? `Stop recording` : audioBlobs.length > 0 ? `${audioBlobs.length} voice note${audioBlobs.length > 1 ? 's' : ''}` : "Record audio"}
          >
            {isRecording ? (
              <div className="h-3 w-3 bg-white rounded-sm"></div>
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {audioBlobs.length > 0 && !isRecording && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {audioBlobs.length}
              </span>
            )}
          </button>

          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={isProcessing || !hasAnyContent || isRecording}
            className="p-2 bg-primary hover:bg-primary/90 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Send"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

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
