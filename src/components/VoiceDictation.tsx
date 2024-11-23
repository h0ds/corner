import React, { useState, useEffect } from 'react';
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
  const animationFrameRef = React.useRef<number>();
  const transcriptRef = React.useRef('');

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
        description: "Start speaking...",
      });
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      setIsReceivingAudio(false);
      if (audioAnalyzerRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }
    };

    recognitionInstance.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the input with both final and interim results
      const currentTranscript = finalTranscript || interimTranscript;
      if (currentTranscript && currentTranscript !== transcriptRef.current) {
        transcriptRef.current = currentTranscript;
        onTranscript(currentTranscript + ' ');
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsReceivingAudio(false);

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

    return () => {
      if (isListening) {
        recognitionInstance.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTranscript]);

  const analyzeAudio = (audioContext: AudioContext, stream: MediaStream) => {
    const analyzer = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);
    analyzer.fftSize = 256;
    audioAnalyzerRef.current = analyzer;

    const checkAudioLevel = () => {
      if (!analyzer) return;
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume level
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setIsReceivingAudio(average > 20); // Adjust threshold as needed
      
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
        recognition.stop();
        setIsReceivingAudio(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
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
    <Button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      size="icon"
      className={`rounded-lg shrink-0 h-[35px] w-[35px] relative transition-all duration-200
        ${isListening ? 'bg-destructive hover:bg-destructive/90' : ''}
        ${isReceivingAudio ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      variant={isListening ? "destructive" : "default"}
    >
      {isListening ? (
        <MicOff className={`h-4 w-4 ${isReceivingAudio ? 'animate-pulse' : ''}`} />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {isListening && isReceivingAudio && (
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-ping" />
      )}
    </Button>
  );
};
