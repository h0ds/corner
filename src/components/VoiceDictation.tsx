import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Size = 'sm' | 'md' | 'lg';

interface TranscriptionPayload {
  text: string;
  is_final: boolean;
}

interface VoiceDictationProps {
  onTranscriptionResult: (text: string) => void;
  className?: string;
  buttonSize?: Size;
  iconSize?: Size;
}

export const VoiceDictation: React.FC<VoiceDictationProps> = ({
  onTranscriptionResult,
  className,
  buttonSize = 'md',
  iconSize = 'md'
}) => {
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

  // Get sizes based on props
  const buttonSizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }[buttonSize];

  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[iconSize];

  if (!isInitialized) {
    return (
      <Button
        disabled
        size="icon"
        variant="ghost"
        className={cn(buttonSizeClass, className)}
      >
        <Mic className={iconSizeClass} />
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
          buttonSizeClass,
          "shrink-0 rounded-md",
          isRecording && "relative after:absolute after:inset-0 after:z-[1] after:rounded-xl after:animate-ping-slow after:bg-destructive/50",
          className
        )}
      >
        {isRecording ? <MicOff className={iconSizeClass} /> : <Mic className={iconSizeClass} />}
      </Button>
    </div>
  );
};
