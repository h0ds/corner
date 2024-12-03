import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Message, Thread, ApiKeys } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { Thinking } from './Thinking';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatInput } from './ChatInput';
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
import { Sparkles, MessageSquare, Keyboard } from 'lucide-react';

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
  allThreads,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  const { toast } = useToast();

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
      setAudioLoading(true);
      const audioData = await invoke<string>('text_to_speech', { text });
      return audioData;
    } catch (err) {
      console.error('Failed to convert text to speech:', err);
      throw err;
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
      audioRef.current.src = '';
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

  const handleDeleteMessage = (timestamp: number, content: string) => {
    // Store current scroll position
    const scrollPosition = containerRef.current?.scrollTop || 0;
    
    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId) {
        return {
          ...thread,
          messages: thread.messages?.filter(m => m.timestamp !== timestamp),
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

  const handleErrorClick = () => {
    onShowPreferences('api-keys');
  };

  // Get sorted messages
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
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

  return (
    <div className="flex flex-col h-full">
      {showEmptyState ? (
        <div className="flex-1 flex items-center justify-center">
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
        <div 
          ref={containerRef}
          className="flex-1 p-2 bg-accent-light rounded-xl border border-border overflow-y-auto min-h-0"
        >
          <div className="flex flex-col space-y-2">
            <AnimatePresence mode="wait">
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
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
                  <Thinking />
                </div>
              )}
            </AnimatePresence>
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}

      <audio ref={audioRef} className="hidden" />

      <div className="relative mt-2">
        <div className="absolute right-4 flex items-center gap-2">
          {(audioPlaying || audioLoading) && audioRef.current?.src && (
            <AudioControls
              isPlaying={audioPlaying}
              isLoading={audioLoading}
              onPlay={handlePlayAudio}
              onStop={handleStopAudio}
              onRestart={handleRestartAudio}
            />
          )}
        </div>
        <div className="p-1 bg-accent-light border border-border rounded-xl">
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
          />
        </div>
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