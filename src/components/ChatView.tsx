import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Message, Thread, ApiKeys } from '@/types';
import { ChatMessage } from './ChatMessage';
import { FilePreview } from './FilePreview';
import { TypingIndicator } from './TypingIndicator';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const [messageToDelete, setMessageToDelete] = useState<{ timestamp: number; content: string } | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

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
      
      if (audioRef.current) {
        audioRef.current.src = audioData;
        audioRef.current.onended = () => {
          setAudioPlaying(false);
          audioRef.current!.src = '';
        };
        await audioRef.current.play();
        setAudioPlaying(true);
      } else {
        const audio = new Audio(audioData);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
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

  const sortedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return [...messages].sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return aTime - bTime;
    });
  }, [messages]);

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
    <>
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
                <TypingIndicator />
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
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
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
        className="flex-shrink-0 p-1 absolute left-3 right-3 bottom-4 bg-accent-light border border-border rounded-xl"
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
          allThreads={allThreads}
          currentThreadId={activeThreadId}
          onUpdateThreads={setThreads}
          onShowLinkedItems={handleShowLinkedItems}
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
    </>
  );
}; 