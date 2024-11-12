import React from 'react';
import { Message } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { TypingIndicator } from './TypingIndicator';
import { AnimatePresence, motion } from 'framer-motion';
import { ModelIcon } from './ModelIcon';
import { ChatInput } from './ChatInput';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from './ModelSelector';
import { useEffect, useRef, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from "@/hooks/use-toast";
import { AudioControls } from './AudioControls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ChatViewProps {
  messages: Message[];
  loading: boolean;
  clearHistoryShortcut: string;
  isDiscussing: boolean;
  selectedModel: string;
  isDiscussionPaused: boolean;
  apiKeys: ApiKeys;
  activeThreadId: string;
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
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
  activeThreadId,
  setThreads,
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
  const [messageToDelete, setMessageToDelete] = useState<{ timestamp: number; content: string } | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (isDiscussing && isDiscussionPaused) {
      setIsDiscussionPaused(false);
      handleStartDiscussion(message, overrideModel || selectedModel, selectedModel);
      return;
    }

    setLoading(true);
    
    if (message && activeThreadId) {
      const modelToUse = overrideModel || selectedModel;
      
      // Add timestamp to user message
      const userMessage: Message = { 
        role: 'user', 
        content: message,
        timestamp: Date.now()  // Add timestamp
      };

      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, userMessage],
            lastUsedModel: modelToUse,
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));

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
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, { 
                  role: 'error', 
                  content: response.error!,
                  timestamp: Date.now()  // Add timestamp
                }],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        } else if (response.content) {
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
                  isAudioResponse,
                  timestamp: Date.now()  // Add timestamp
                }],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          variant: "destructive",
          description: "Failed to send message",
          duration: 2000,
        });
      }
    }

    setLoading(false);
  };

  // Update the sortedMessages useMemo to sort in chronological order (oldest first)
  const sortedMessages = useMemo(() => {
    // Sort by timestamp in ascending order (oldest first)
    return [...messages].sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampA - timestampB;  // Oldest first
    });
  }, [messages, activeThreadId]);

  const handleDeleteMessage = (timestamp: number, content: string) => {
    setMessageToDelete({ timestamp, content });
  };

  const handleConfirmDelete = () => {
    if (!messageToDelete) return;

    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId && !thread.isNote) {
        return {
          ...thread,
          messages: thread.messages.filter(msg => msg.timestamp !== messageToDelete.timestamp),
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));

    setMessageToDelete(null);
  };

  // Add effect to handle thread switching
  useEffect(() => {
    setIsLoadingThread(true);
    
    // Brief timeout to allow for visual feedback
    const timeout = setTimeout(() => {
      setIsLoadingThread(false);
      // After loading, scroll to bottom
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [activeThreadId]);

  // Add a new useEffect to handle scrolling when messages change
  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (containerRef.current && !isLoadingThread) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoadingThread]);

  // Add a new useEffect to handle initial scroll
  useEffect(() => {
    // Initial scroll to bottom when component mounts
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []); // Empty dependency array for mount only

  return (
    <>
      <div 
        ref={containerRef}
        className="flex-1 p-6 overflow-y-auto pb-[100px] min-h-0"
      >
        <div className="flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            {isLoadingThread ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start h-[50px] items-center"
              >
                <TypingIndicator />
              </motion.div>
            ) : messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground/40 mt-1 text-sm tracking-tighter h-[50px] flex items-center justify-center"
              >
                Start a conversation ({clearHistoryShortcut} to clear history)
              </motion.div>
            ) : (
              sortedMessages.map((message, index) => (
                <motion.div
                  key={message.timestamp || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <ChatMessage
                    {...message}
                    onErrorClick={onShowPreferences}
                    onSendMessage={onSendMessage}
                    showTTS={!!apiKeys.elevenlabs}
                    onTextToSpeech={handleTextToSpeech}
                    onDelete={() => message.timestamp ? handleDeleteMessage(message.timestamp, message.content) : undefined}
                  />
                  {message.file && (
                    <FilePreview
                      fileName={message.file.name}
                      content={message.file.content}
                    />
                  )}
                </motion.div>
              ))
            )}
            {loading && !isLoadingThread && (
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
        className="flex-shrink-0 p-2 absolute left-4 right-4 bottom-0 mb-4 bg-gray-50 rounded-md"
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

      <Dialog 
        open={messageToDelete !== null} 
        onOpenChange={(open) => {
          if (!open) setMessageToDelete(null);
        }}
      >
        <DialogContent onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmDelete();
          }
        }}>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete this message? This action cannot be undone.
          </div>
          <div className="mt-2 text-sm bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
            {messageToDelete?.content}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              autoFocus
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 