import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Message, Thread, ApiKeys } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { Thinking } from './Thinking';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatInput } from './ChatInput';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Keyboard } from 'lucide-react';
import { ChatTaskbar } from './ChatTaskbar';

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
  onShowPreferences: (tab?: string) => void;
  onForkToNote: (content: string) => void;
  allThreads: Thread[];
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
  onForkToNote,
  allThreads,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { toast } = useToast();

  const handleError = (error: Error) => {
    console.error('Chat error:', error);
    let errorMessage = 'An error occurred while processing your message.';
    
    if (error.message.includes('Unable to reach Gemini API')) {
      errorMessage = 'Unable to reach Gemini API. Please check your API key and try again.';
    } else if (error.message.includes('Rate limit exceeded')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (error.message.includes('Gemini API key is not configured')) {
      errorMessage = 'Gemini API key is not properly configured. Please check your environment variables.';
    } else if (error.message.includes('Invalid response format')) {
      errorMessage = 'Received an invalid response from Gemini API. Please try again.';
    }

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
      duration: 3000,
    });
  };

  useEffect(() => {
    if (activeThreadId) {
      setIsLoadingThread(true);
      const timeout = setTimeout(() => {
        setIsLoadingThread(false);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [activeThreadId]);

  const handleTextToSpeech = async (text: string) => {
    try {
      setIsAudioLoading(true);
      const audioData = await invoke<string>('text_to_speech', { text });
      if (audioRef.current) {
        audioRef.current.src = audioData;
        setAudioUrl(audioData);
        audioRef.current.play();
        setIsAudioPlaying(true);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsAudioPlaying(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
      setAudioUrl(null);
    }
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsAudioPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        setIsAudioPlaying(false);
        setAudioUrl(null);
      };
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleDurationChange = () => setDuration(audio.duration);
      const handleEnded = () => {
        setIsAudioPlaying(false);
        setAudioUrl(null);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleDurationChange);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  const handleSliderChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteMessage = (timestamp: number, content: string) => {
    // Store current scroll position
    const scrollPosition = containerRef.current?.scrollTop || 0;
    
    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId && !thread.isNote) {
        const chatThread = thread as ChatThread;
        return {
          ...chatThread,
          messages: chatThread.messages.filter((m: Message) => m.timestamp !== timestamp),
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));

    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollPosition;
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!messageToDelete) return;

    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId && !thread.isNote) {
        const chatThread = thread as ChatThread;
        return {
          ...chatThread,
          messages: chatThread.messages.filter((msg: Message) => msg.timestamp !== messageToDelete.timestamp),
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));

    setMessageToDelete(null);
  };

  const handleErrorClick = () => {
    onShowPreferences('api-keys');
  };

  const handleAskAgain = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.content) {
      onSendMessage(message.content);
      setSelectedMessageId(null);
    }
  }, [messages, onSendMessage]);

  // Get sorted messages
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a: Message, b: Message) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [messages]);

  // Show empty state if no messages and not loading
  const showEmptyState = !loading && !isLoadingThread && sortedMessages.length === 0;

  const handleShowLinkedItems = (noteId: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === noteId && thread.isNote) {
        return {
          ...thread,
          showLinkedItems: true,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      containerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll when loading state changes
  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [loading]);

  // Scroll when thread changes
  useEffect(() => {
    if (!isLoadingThread) {
      scrollToBottom('auto');
    }
  }, [isLoadingThread]);

  // Scroll when messages are added or updated
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          scrollToBottom();
        }
      });
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    return () => observer.disconnect();
  }, []);

  const handleStartVoiceDictation = () => {
    setIsListening(!isListening);
  };

  const handleTranscriptionResult = (result: string) => {
    setInputValue(result);
  };

  const handleCompareModels = () => {
    if (inputValue.trim()) {
      // Simulate the @model mention format that ChatInput expects
      const messageWithMention = `@gpt-4 ${inputValue.trim()}`;
      setInputValue(messageWithMention);
      onCompareModels(inputValue.trim(), "gpt-4", selectedModel);
    } else {
      toast({
        title: "No message to compare",
        description: "Please enter a message first",
        variant: "destructive",
      });
    }
  };

  const handleStartDiscussion = () => {
    if (inputValue.trim()) {
      // Simulate the @model mention format that ChatInput expects
      const messageWithMention = `@gpt-4 ${inputValue.trim()}`;
      setInputValue(messageWithMention);
      onStartDiscussion(inputValue.trim(), "gpt-4", selectedModel);
    } else {
      toast({
        title: "No message to discuss",
        description: "Please enter a message first",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 border border-border bg-accent-light rounded-xl"
      >
        {showEmptyState ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-6 max-w-lg mx-auto px-4">
              <div className="flex justify-center">
                <div>
                  <div className="flex-1 flex items-center justify-end h-full">
                    <img 
                      src="/icon.png" 
                      alt="Corner" 
                      className="h-[80px] w-[80px] cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">Welcome to Corner</h2>
                <p className="text-sm text-muted-foreground">
                  Start a conversation with any of our supported AI models. Ask questions, compare responses, or start an interactive discussion.
                </p>
              </div>
              
              <div className="grid gap-4 pt-4 text-left">
                <div className="bg-card rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium leading-none">Chat with AI</h3>
                      <p className="text-xs text-muted-foreground">
                        Send messages and get instant responses from your selected AI model
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium leading-none">Compare Models</h3>
                      <p className="text-xs text-muted-foreground">
                        Use @model to compare responses from different AI models
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <Keyboard className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium leading-none">Keyboard Shortcuts</h3>
                      <p className="text-xs text-muted-foreground">
                        Press {clearHistoryShortcut} to clear chat, ESC to stop generation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            <AnimatePresence mode="popLayout">
              {isLoadingThread ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start h-[50px] items-center"
                >
                  <Thinking />
                </motion.div>
              ) : sortedMessages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-muted-foreground/40 mt-1 text-sm tracking-tighter h-[50px] flex items-center justify-center"
                >
                  &nbsp;
                </motion.div>
              ) : (
                sortedMessages.map((message, index) => (
                  <motion.div
                    key={`${message.timestamp}-${index}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.2,
                      layout: { duration: 0.2 }
                    }}
                  >
                    {message.error && (
                      <div className="flex w-full items-start gap-x-8 py-4 pl-8">
                        <div className="flex-1 space-y-2 overflow-hidden break-words">
                          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">
                            {message.error}
                          </div>
                        </div>
                      </div>
                    )}
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                      modelId={message.modelId}
                      plugins={message.plugins}
                      comparison={message.comparison}
                      citations={message.citations}
                      images={message.images}
                      relatedQuestions={message.relatedQuestions}
                      onSendMessage={onSendMessage}
                      onTextToSpeech={handleTextToSpeech}
                      showTTS={!!apiKeys.elevenlabs}
                      isAudioResponse={message.isAudioResponse}
                      onDelete={() => handleDeleteMessage(message.timestamp, message.content)}
                      setThreads={setThreads}
                      onErrorClick={handleErrorClick}
                      onForkToNote={onForkToNote}
                      onAskAgain={handleAskAgain}
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
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <Thinking />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pb-4 pt-2 space-y-2">
        <ChatTaskbar
          onTranscriptionResult={handleTranscriptionResult}
          isListening={isListening}
          onClearThread={onClearThread}
          onCompareModels={handleCompareModels}
          onStartDiscussion={handleStartDiscussion}
          onStopDiscussion={onStopDiscussion}
          isDiscussing={isDiscussing}
        />
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
          allThreads={allThreads}
          currentThreadId={activeThreadId}
          onUpdateThreads={setThreads}
          onShowLinkedItems={handleShowLinkedItems}
          setInputValue={setInputValue}
          initialValue={inputValue}
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
          <div className="mt-2 text-sm bg-muted p-4 rounded-xl max-h-[200px] overflow-y-auto">
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
    </div>
  );
}; 