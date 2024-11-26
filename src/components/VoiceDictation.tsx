import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptionPayload {
  text: string;
  is_final: boolean;
}

interface VoiceDictationProps {
  onTranscriptionResult: (text: string) => void;
  className?: string;
}

export function VoiceDictation({ onTranscriptionResult, className }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Check model on component mount
  useEffect(() => {
    const checkModel = async () => {
      try {
        const hasModel = await invoke<boolean>('check_whisper_model');
        setIsModelDownloaded(hasModel);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to check model:', error);
        setIsInitialized(true);
      }
    };
    checkModel();
  }, []);

  useEffect(() => {
    // Listen for transcription events
    const unlisten = listen<TranscriptionPayload>('transcription', (event) => {
      console.log('Received transcription:', event.payload);
      const text = event.payload.text.trim();
      if (text) {
        if (event.payload.is_final) {
          // Append to current transcript with a space
          const newTranscript = currentTranscript 
            ? `${currentTranscript} ${text}`
            : text;
          setCurrentTranscript(newTranscript);
          onTranscriptionResult(newTranscript);
        }
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [onTranscriptionResult, currentTranscript]);

  const toggleRecording = useCallback(async () => {
    if (!isRecording) {
      try {
        if (!isModelDownloaded) {
          console.log('Downloading Whisper model...');
          await invoke('download_whisper_model');
          setIsModelDownloaded(true);
          console.log('Model downloaded successfully');
        }
        setCurrentTranscript(''); // Reset transcript when starting new recording
        console.log('Starting recording...');
        await invoke('start_recording');
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      try {
        await invoke('stop_recording');
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  }, [isRecording, isModelDownloaded]);

  if (!isInitialized) {
    return (
      <Button
        disabled
        variant="default"
        size="icon"
        className={cn("h-10 w-10 shrink-0 rounded-md opacity-50", className)}
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : "default"}
        size="icon"
        className={cn(
          "h-10 w-10 shrink-0 rounded-lg",
          isRecording && "relative after:absolute after:inset-0 after:z-[1] after:rounded-lg after:animate-ping-slow after:bg-destructive/50"
        )}
      >
        {isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
