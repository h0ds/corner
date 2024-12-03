import React, { useState } from 'react';
import { Copy, Check, Volume2, Trash2, GitForkIcon, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showToast } from '@/lib/toast';
import { AudioPlayer } from './AudioPlayer';
import { cn } from "@/lib/utils";
import { textToSpeech } from '@/lib/api';

interface ChatActionsProps {
  onConvertToSpeech?: (text: string) => Promise<void>;
  onDelete?: () => void;
  onForkToNote?: (content: string) => void;
  content: string;
  showTTS?: boolean;
  className?: string;
}

export const ChatActions: React.FC<ChatActionsProps> = ({
  onConvertToSpeech,
  onDelete,
  onForkToNote,
  content,
  showTTS,
  className
}) => {
  const [copied, setCopied] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      showToast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSpeech = async () => {
    if (!onConvertToSpeech) return;
    
    try {
      setIsConverting(true);
      await onConvertToSpeech(content);
      const response = await textToSpeech(content);
      if (response.success && response.data) {
        setAudioUrl(response.data);
      } else {
        throw new Error(response.error || 'Invalid audio data received');
      }
    } catch (err) {
      console.error('Failed to convert to speech:', err);
      showToast({
        title: "Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1">
        {showTTS && onConvertToSpeech && !audioUrl && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-accent-foreground/10"
                  onClick={handleConvertToSpeech}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Read aloud</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

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
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Copy message</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onForkToNote && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-accent-foreground/10"
                  onClick={() => onForkToNote(content)}
                >
                  <GitForkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Fork to note</p>
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
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Delete message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {audioUrl && (
        <AudioPlayer
          audioUrl={audioUrl}
          className="mt-2"
        />
      )}
    </div>
  );
};