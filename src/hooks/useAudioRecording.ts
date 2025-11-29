import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioRecording() {
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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      return new Promise<MediaRecorder>((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstart = () => {
          setIsRecording(true);
          
          // Start timer
          setDuration(0);
          timerRef.current = window.setInterval(() => {
            setDuration(d => d + 1);
          }, 1000);

          resolve(mediaRecorder);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        mediaRecorder.start();
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      throw new Error("Could not access microphone. Please ensure permissions are granted.");
    }
  }, []);

  const stopRecording = useCallback((): Promise<{ blob: Blob; id: string }> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        // Return empty blob if no recording
        resolve({ blob: new Blob(), id: '' });
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Return blob - the caller will save it to storage
        resolve({ blob, id: '' });
      };

      mediaRecorder.stop();
    });
  }, [isRecording]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    duration,
    formatTime,
    startRecording,
    stopRecording
  };
}
