import React from 'react';
import { Message } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { TypingIndicator } from './TypingIndicator';
import { AnimatePresence } from 'framer-motion';
import { ModelIcon } from './ModelIcon';
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
import { AudioControls } from './AudioControls';

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
  const [audioLoading, setAudioLoading] = useState(false);
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
      setAudioLoading(true);
      const audioData = await invoke<string>('text_to_speech', { text });
      
      if (audioRef.current) {
        audioRef.current.src = audioData;
        audioRef.current.onended = () => {
          setAudioPlaying(false);
          // Clear the audio source to ensure complete cleanup
          audioRef.current!.src = '';
        };
        await audioRef.current.play();
        setAudioPlaying(true);
      } else {
        const audio = new Audio(audioData);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          // Clear the audio source to ensure complete cleanup
          audio.src = '';
        };
        await audio.play();
        setAudioPlaying(true);
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        variant: "destructive",
        description: "Failed to convert text to speech",
        duration: 2000,
      });
    } finally {
      setAudioLoading(false);
    }
  };

  const handlePauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = ''; // Clear the source
      setAudioPlaying(false);
    }
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleSendMessage = async (message: string, overrideModel?: string) => {
    // ... existing code

    try {
      const model = AVAILABLE_MODELS.find(m => m.id === modelToUse);
      if (!model) throw new Error('Invalid model selected');

      const response = await invoke<ApiResponse>('send_message', {
        request: {
          message,
          model: modelToUse,
          provider: model.provider,
          file_content: undefined,
          file_name: undefined
        }
      });

      if (response.error) {
        // ... existing error handling
      } else if (response.content) {
        // Check if this is an audio response by looking at the content
        const isAudioResponse = response.content.startsWith('data:audio/');
        
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId && !thread.isNote) {
            return {
              ...thread,
              messages: [...thread.messages, { 
                role: 'assistant', 
                content: response.content!,
                modelId: modelToUse,
                citations: response.citations,
                isAudioResponse
              }],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));
      }
    } catch (error) {
      // ... existing error handling
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
          {(audioPlaying || audioLoading) && audioRef.current?.src && (
            <AudioControls
              isPlaying={audioPlaying}
              isLoading={audioLoading}
              onPlay={handlePlayAudio}
              onStop={handleStopAudio}
              onRestart={handleRestartAudio}
            />
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