import React from 'react';
import { VoiceDictation } from './VoiceDictation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Trash2, Split, MessageCircle, Square } from 'lucide-react';

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
  onSelectCommand
}) => {
  const handleCompareClick = () => {
    onSelectCommand('compare');
  };

  const handleDiscussClick = () => {
    onSelectCommand('discuss');
    onStartDiscussion();
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
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6",
            "bg-transparent hover:bg-accent hover:text-accent-foreground",
            "transition-colors duration-200"
          )}
          onClick={handleClearClick}
          title="Clear Thread"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6",
            "bg-transparent hover:bg-accent hover:text-accent-foreground",
            "transition-colors duration-200"
          )}
          onClick={handleCompareClick}
          title="Compare Models"
        >
          <Split className="h-3 w-3" />
        </Button>
        {!isDiscussing ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              "bg-transparent hover:bg-accent hover:text-accent-foreground",
              "transition-colors duration-200"
            )}
            onClick={handleDiscussClick}
            title="Start Model Discussion"
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6",
              "bg-transparent hover:bg-accent hover:text-accent-foreground",
              "transition-colors duration-200"
            )}
            onClick={handleStopDiscussClick}
            title="Stop Discussion"
          >
            <Square className="h-3 w-3" />
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
