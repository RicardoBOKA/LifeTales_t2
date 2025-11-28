import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-stone-100 mt-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-serif font-medium text-ink">
          {isRecording ? 'Listening...' : 'Add a voice note'}
        </h3>
        <p className="text-sm text-stone-500">
          {isRecording ? formatTime(duration) : 'Share a moment, feeling, or observation.'}
        </p>
      </div>

      <div className="relative">
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></span>
        )}
        
        {isProcessing ? (
           <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center">
             <Loader2 className="h-8 w-8 text-stone-400 animate-spin" />
           </div>
        ) : !isRecording ? (
          <button
            onClick={startRecording}
            className="h-16 w-16 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition active:scale-95"
          >
            <Mic className="h-8 w-8" />
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="h-16 w-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-10 relative transform transition active:scale-95"
          >
            <Square className="h-6 w-6 fill-current" />
          </button>
        )}
      </div>
      
      {isRecording && (
        <p className="mt-4 text-xs font-medium text-rose-500 uppercase tracking-widest animate-pulse">
          Recording
        </p>
      )}
    </div>
  );
};