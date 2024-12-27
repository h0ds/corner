import React from 'react';
import { VoiceDictation } from './VoiceDictation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Trash2, Split, MessageCircle, Square } from 'lucide-react';
import { ModelIcon } from './ModelIcon';
import { AVAILABLE_MODELS } from './ModelSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatTaskbarProps {
  onTranscriptionResult: (text: string) => void;
  isListening: boolean;
  onClearThread: () => void;
  onCompareModels: () => void;
  onStartDiscussion: () => void;
  onStopDiscussion: () => void;
  isDiscussing: boolean;
  className?: string;
  onSelectCommand: (command: string | null) => void;
  selectedModel?: string;
  onOpenModelSelect?: () => void;
}

export const ChatTaskbar: React.FC<ChatTaskbarProps> = ({
  onTranscriptionResult,
  isListening,
  onClearThread,
  onCompareModels,
  onStartDiscussion,
  onStopDiscussion,
  isDiscussing,
  className,
  onSelectCommand,
  selectedModel,
  onOpenModelSelect
}) => {
  const handleCompareClick = () => {
    onSelectCommand('compare');
  };

  const handleDiscussClick = () => {
    onSelectCommand('discuss');
  };

  const handleStopDiscussClick = () => {
    onSelectCommand(null);
    onStopDiscussion();
  };

  const handleClearClick = () => {
    onSelectCommand(null);
    onClearThread();
  };

  return (
    <div className="flex justify-end">
      <div className={cn(
        "inline-flex items-center gap-1 p-1 rounded-lg",
        className
      )}>
        {selectedModel && onOpenModelSelect && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="md"
                  className={cn(
                    "bg-transparent hover:bg-accent hover:text-accent-foreground p-1",
                    "transition-colors duration-200"
                  )}
                  onClick={onOpenModelSelect}
                  title="Change Model"
                >
                  <ModelIcon modelId={selectedModel} className="h-4 w-4" />
                </Button>
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
        )}
        <Button
          variant="ghost"
          size="md"
          className={cn(
            "bg-transparent hover:bg-accent hover:text-accent-foreground p-1",
            "transition-colors duration-200"
          )}
          onClick={handleClearClick}
          title="Clear Thread"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
        
        <Button
          variant="ghost"
          size="md"
          className={cn(
            "bg-transparent hover:bg-accent hover:text-accent-foreground p-1",
            "transition-colors duration-200"
          )}
          onClick={handleCompareClick}
          title="Compare Models"
        >
          <Split className="h-4 w-4 text-muted-foreground" />
        </Button>
        {!isDiscussing ? (
          <Button
            variant="ghost"
            size="md"
            className={cn(
              "bg-transparent hover:bg-accent hover:text-accent-foreground p-1",
              "transition-colors duration-200"
            )}
            onClick={handleDiscussClick}
            title="Start Model Discussion"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="md"
            className={cn(
              "bg-transparent hover:bg-accent hover:text-accent-foreground p-1",
              "transition-colors duration-200"
            )}
            onClick={handleStopDiscussClick}
            title="Stop Model Discussion"
          >
            <Square className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        <VoiceDictation
          onTranscriptionResult={onTranscriptionResult}
          buttonSize="sm"
          iconSize="sm"
        />
      </div>
    </div>
  );
};
