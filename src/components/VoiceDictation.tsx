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
      showToast({
        title: "Voice Recognition Active",
        description: "Start speaking...",
      });
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionInstance.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      if (event.results[event.results.length - 1].isFinal) {
        onTranscript(transcript);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

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
    };
  }, [onTranscript]);

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
      } else {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognition.start();
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({
        title: "Microphone Access Required",
        description: "Please allow microphone access in your system settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleListening}
      disabled={disabled || !recognition}
      className="hover:bg-accent hover:text-accent-foreground"
      title={isListening ? "Stop dictation" : "Start dictation"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
