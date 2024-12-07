import React from 'react';
import { VoiceDictation } from './VoiceDictation';
import { cn } from '@/lib/utils';

interface ChatTaskbarProps {
  onTranscriptionResult: (text: string) => void;
  isListening: boolean;
  className?: string;
}

export const ChatTaskbar: React.FC<ChatTaskbarProps> = ({
  onTranscriptionResult,
  isListening,
  className
}) => {
  return (
    <div className={cn(
      "flex items-center justify-end bg-accent-light p-1 border border-border rounded-xl",
      className
    )}>
      <VoiceDictation
        onTranscriptionResult={onTranscriptionResult}
        buttonSize="sm"
        iconSize="sm"
      />
    </div>
  );
};
