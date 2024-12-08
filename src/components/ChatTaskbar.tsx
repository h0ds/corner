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
}

export const ChatTaskbar: React.FC<ChatTaskbarProps> = ({
  onTranscriptionResult,
  isListening,
  onClearThread,
  onCompareModels,
  onStartDiscussion,
  onStopDiscussion,
  isDiscussing,
  className
}) => {
  return (
    <div className="flex justify-end">
      <div className={cn(
        "inline-flex items-center gap-1 p-1 rounded-lg",
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-accent-light border border-border"
          onClick={onClearThread}
          title="Clear Thread"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-accent-light border border-border"
          onClick={onCompareModels}
          title="Compare Models"
        >
          <Split className="h-3 w-3" />
        </Button>
        {!isDiscussing ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-accent-light border border-border"
            onClick={onStartDiscussion}
            title="Start Model Discussion"
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-accent-light border border-border"
            onClick={onStopDiscussion}
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
