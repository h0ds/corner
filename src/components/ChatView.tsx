import React from 'react';
import { Message } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { TypingIndicator } from './TypingIndicator';
import { AnimatePresence } from 'framer-motion';
import { ModelIcon } from './ModelIcon';
import { Square } from 'lucide-react';
import { ChatInput } from './ChatInput';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from './ModelSelector';
import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from "@/hooks/use-toast";

interface ChatViewProps {
  messages: Message[];
  loading: boolean;
  clearHistoryShortcut: string;
  isDiscussing: boolean;
  selectedModel: string;
  isDiscussionPaused: boolean;
  apiKeys: ApiKeys;
  onStopDiscussion: () => void;
  onOpenModelSelect: () => void;
  onSendMessage: (message: string, overrideModel?: string) => void;
  onCompareModels: (message: string, model1: string, model2: string) => void;
  onStartDiscussion: (message: string, model1: string, model2: string) => void;
  onClearThread: () => void;
  onShowPreferences: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  loading,
  clearHistoryShortcut,
  isDiscussing,
  selectedModel,
  isDiscussionPaused,
  apiKeys,
  onStopDiscussion,
  onOpenModelSelect,
  onSendMessage,
  onCompareModels,
  onStartDiscussion,
  onClearThread,
  onShowPreferences,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleTextToSpeech = async (text: string) => {
    try {
      const audioData = await invoke<string>('text_to_speech', { text });
      
      if (audioRef.current) {
        audioRef.current.src = audioData;
        await audioRef.current.play();
        setAudioPlaying(true);
      } else {
        const audio = new Audio(audioData);
        audioRef.current = audio;
        await audio.play();
        setAudioPlaying(true);
        
        audio.onended = () => {
          setAudioPlaying(false);
        };
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        variant: "destructive",
        description: "Failed to convert text to speech",
        duration: 2000,
      });
    }
  };

  return (
    <>
      <div className="flex-1 p-6 overflow-y-auto pb-[100px]">
        <div className="flex flex-col space-y-6">
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground/40 mt-1 text-sm tracking-tighter">
                Start a conversation ({clearHistoryShortcut} to clear history)
              </div>
            ) : (
              // Render messages in chronological order
              messages.map((message, index) => (
                <div key={index} className="w-full">
                  <ChatMessage
                    role={message.role}
                    content={message.content}
                    onErrorClick={onShowPreferences}
                    modelId={message.modelId}
                    comparison={message.comparison}
                    citations={message.citations}
                    images={message.images}
                    relatedQuestions={message.relatedQuestions}
                    onSendMessage={onSendMessage}
                    showTTS={!!apiKeys.elevenlabs}
                    onTextToSpeech={handleTextToSpeech}
                  />
                  {message.file && (
                    <FilePreview
                      fileName={message.file.name}
                      content={message.file.content}
                    />
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
      </div>

      <audio ref={audioRef} className="hidden" />

      <div 
        className="flex-shrink-0 p-2 absolute left-4 right-4 bottom-0 mb-4 bg-gray-50 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 -top-12 flex items-center gap-2">
          {isDiscussing && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onStopDiscussion}
                    className="p-2 bg-destructive text-destructive-foreground 
                            hover:bg-destructive/90 rounded-md transition-colors"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Stop Discussion
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenModelSelect}
                  className="p-2 -mr-4 bg-gray-100 text-muted-foreground hover:text-foreground 
                          hover:bg-accent rounded-md transition-colors 
                           cursor-pointer"
                >
                  <ModelIcon modelId={selectedModel} className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {(() => {
                  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
                  return model ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground capitalize">
                        {model.provider}
                      </span>
                    </div>
                  ) : selectedModel;
                })()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ChatInput
          onSendMessage={onSendMessage}
          onCompareModels={onCompareModels}
          onStartDiscussion={onStartDiscussion}
          onStopDiscussion={onStopDiscussion}
          onClearThread={onClearThread}
          disabled={loading}
          selectedModel={selectedModel}
          isDiscussing={isDiscussing}
          isPaused={isDiscussionPaused}
        />
      </div>
    </>
  );
}; 