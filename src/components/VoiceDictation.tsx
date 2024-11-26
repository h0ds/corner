import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionPayload {
  text: string;
  is_final: boolean;
}

interface VoiceDictationProps {
  onTranscriptionResult: (text: string) => void;
  className?: string;
}

export const VoiceDictation: React.FC<VoiceDictationProps> = ({ onTranscriptionResult, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const { toast } = useToast();

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
      console.log('VoiceDictation received transcription event:', event);
      const text = event.payload.text.trim();
      if (text) {
        console.log('VoiceDictation sending transcription:', text, 'is_final:', event.payload.is_final);
        onTranscriptionResult(text);
      }
    });

    return () => {
      console.log('VoiceDictation cleaning up transcription listener');
      unlisten.then(fn => fn());
    };
  }, [onTranscriptionResult]);

  const handleClick = async () => {
    try {
      if (!isRecording) {
        if (!isModelDownloaded) {
          console.log('Downloading Whisper model...');
          await invoke('download_whisper_model');
          setIsModelDownloaded(true);
          console.log('Model downloaded successfully');
        }
        
        console.log('VoiceDictation starting recording');
        setCurrentTranscript('');
        await invoke('start_recording');
        setIsRecording(true);
        toast({
          title: "Recording started",
          description: "Speak now...",
        });
      } else {
        console.log('VoiceDictation stopping recording');
        await invoke('stop_recording');
        setIsRecording(false);
        toast({
          title: "Recording stopped",
          description: "Processing...",
        });
      }
    } catch (error) {
      console.error('VoiceDictation error:', error);
      toast({
        title: "Error",
        description: "Failed to toggle recording",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };

  if (!isInitialized) {
    return (
      <Button
        disabled
        size="icon"
        variant="ghost"
        className={className}
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={(e) => {
          e.preventDefault(); // Prevent form submission
          handleClick();
        }}
        type="button" // Explicitly set button type to prevent form submission
        disabled={!isInitialized}
        variant={isRecording ? "destructive" : "default"}
        size="icon"
        className={cn(
          "h-10 w-10 shrink-0 rounded-lg",
          isRecording && "relative after:absolute after:inset-0 after:z-[1] after:rounded-lg after:animate-ping-slow after:bg-destructive/50"
        )}
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  );
};
