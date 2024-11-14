import React, { useState } from 'react';
import { Copy, Check, Volume2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showToast } from '@/lib/toast';

interface ChatActionsProps {
  onConvertToSpeech?: (text: string) => Promise<void>;
  onDelete?: () => void;
  content: string;
  showTTS?: boolean;
  className?: string;
}

export const ChatActions: React.FC<ChatActionsProps> = ({
  onConvertToSpeech,
  onDelete,
  content,
  showTTS,
  className
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      showToast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className={className}>
      {showTTS && onConvertToSpeech && !content.startsWith('data:audio/') && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-accent-foreground/10"
                onClick={() => onConvertToSpeech(content)}
              >
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="sr-only">Text to speech</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Convert to speech
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {!content.startsWith('data:audio/') && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-accent-foreground/10"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="sr-only">Copy message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {copied ? 'Copied!' : 'Copy message'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {onDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-accent-foreground/10"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                <span className="sr-only">Delete message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Delete message
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}; 