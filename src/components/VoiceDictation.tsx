import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { showToast } from '@/lib/toast';

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceDictation: React.FC<VoiceDictationProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const audioAnalyzerRef = React.useRef<AnalyserNode | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const animationFrameRef = React.useRef<number>();
  const transcriptRef = React.useRef('');

  const stopDictation = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
    
    // Clean up audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Clean up audio context and stream
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.disconnect();
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsListening(false);
    setIsReceivingAudio(false);
    transcriptRef.current = '';
  }, [recognition]);

  useEffect(() => {
    // Check if the browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      transcriptRef.current = '';
      showToast({
        title: "Voice Recognition Active",
        description: "Start speaking... (Press ESC or click the mic to stop)",
      });
    };

    recognitionInstance.onend = () => {
      stopDictation();
    };

    recognitionInstance.onresult = (event: any) => {
      if (!event.results) return;

      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          transcript = finalTranscript;
          onTranscript(finalTranscript + ' ');
        } else {
          const interimTranscript = event.results[i][0].transcript;
          transcript = interimTranscript;
          onTranscript(interimTranscript + ' ');
        }
      }
      transcriptRef.current = transcript;
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      stopDictation();

      if (event.error === 'not-allowed') {
        showToast({
          title: "Microphone Access Required",
          description: "Please allow microphone access in your system settings.",
          variant: "destructive"
        });
      } else {
        showToast({
          title: "Voice Recognition Error",
          description: "An error occurred. Please try again.",
          variant: "destructive"
        });
      }
    };

    setRecognition(recognitionInstance);

    // Add keyboard listener for ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isListening) {
        stopDictation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      stopDictation();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onTranscript, stopDictation, isListening]);

  const analyzeAudio = (audioContext: AudioContext, stream: MediaStream) => {
    const analyzer = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.5;
    audioAnalyzerRef.current = analyzer;
    audioContextRef.current = audioContext;
    mediaStreamRef.current = stream;

    const checkAudioLevel = () => {
      if (!analyzer) return;
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume level with more sensitivity
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setIsReceivingAudio(average > 10); // Lower threshold for better sensitivity
      
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  };

  const toggleListening = async () => {
    if (!recognition) {
      showToast({
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isListening) {
        stopDictation();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        analyzeAudio(audioContext, stream);
        recognition.start();
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({
        title: "Microphone Access Error",
        description: "Please allow microphone access to use voice dictation.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        size="icon"
        className={`rounded-lg shrink-0 h-[35px] w-[35px] relative transition-all duration-200
          ${isListening ? 'bg-destructive hover:bg-destructive/90' : ''}
          ${isReceivingAudio ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}
        variant={isListening ? "destructive" : "default"}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Audio Level Indicator */}
      {isListening && (
        <div className="absolute -right-4 top-0 h-full flex items-center">
          <div className="space-y-1">
            <div className={`h-1 w-1 rounded-full ${isReceivingAudio ? 'bg-primary' : 'bg-muted'} 
              ${isReceivingAudio ? 'animate-bounce' : ''}`} />
            <div className={`h-1 w-1 rounded-full ${isReceivingAudio ? 'bg-primary' : 'bg-muted'} 
              ${isReceivingAudio ? 'animate-bounce delay-75' : ''}`} />
            <div className={`h-1 w-1 rounded-full ${isReceivingAudio ? 'bg-primary' : 'bg-muted'} 
              ${isReceivingAudio ? 'animate-bounce delay-150' : ''}`} />
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {isListening && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 
            ${isReceivingAudio ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
            <span className={`h-1.5 w-1.5 rounded-full 
              ${isReceivingAudio ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            {isReceivingAudio ? 'Listening...' : 'Waiting for audio...'}
          </span>
        </div>
      )}

      {/* Hotkey Reminder */}
      {isListening && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[10px] text-muted-foreground">
          Press ESC to stop
        </div>
      )}
    </div>
  );
};
