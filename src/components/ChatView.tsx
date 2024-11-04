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

interface ChatViewProps {
  messages: Message[];
  loading: boolean;
  clearHistoryShortcut: string;
  isDiscussing: boolean;
  selectedModel: string;
  isDiscussionPaused: boolean;
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
  onStopDiscussion,
  onOpenModelSelect,
  onSendMessage,
  onCompareModels,
  onStartDiscussion,
  onClearThread,
  onShowPreferences,
}) => {
  return (
    <>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground/40 mt-1 text-sm tracking-tighter">
              Start a conversation ({clearHistoryShortcut} to clear history)
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="space-y-2 min-w-0">
                <ChatMessage
                  role={message.role}
                  content={message.content}
                  onErrorClick={onShowPreferences}
                  modelId={message.modelId}
                  comparison={message.comparison}
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

      <footer 
        className="flex-shrink-0 p-4 bg-card border-t border-border"
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
                            hover:bg-destructive/90 rounded-sm transition-colors"
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
                <div 
                  onClick={onOpenModelSelect}
                  className="p-2 bg-background text-muted-foreground hover:text-foreground border border-border/50
                          hover:bg-accent rounded-sm transition-colors cursor-pointer"
                >
                  <ModelIcon modelId={selectedModel} className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {(() => {
                  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
                  return model ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground">
                        {model.provider === 'anthropic' ? 'Anthropic' : 
                         model.provider === 'openai' ? 'OpenAI' : 'Perplexity'}
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
      </footer>
    </>
  );
}; 