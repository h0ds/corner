import React, { useState, useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { 
  GitForkIcon, 
  Trash2, 
  Volume2, 
  RotateCcw, 
  Check, 
  Copy, 
  MessageSquare, 
  FileText 
} from 'lucide-react';

interface ChatMessageContextMenuProps {
  children: React.ReactNode;
  content: string;
  onDelete?: () => void;
  onTextToSpeech?: () => void;
  onForkToNote?: () => void;
  onAskAgain?: () => void;
  showTTS?: boolean;
  isUserMessage?: boolean;
}

export function ChatMessageContextMenu({
  children,
  content,
  onDelete,
  onTextToSpeech,
  onForkToNote,
  onAskAgain,
  showTTS = false,
  isUserMessage = false,
}: ChatMessageContextMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={handleCopy}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy message"}
        </ContextMenuItem>
        {showTTS && onTextToSpeech && (
          <ContextMenuItem onClick={onTextToSpeech}>
            <Volume2 className="mr-2 h-4 w-4" />
            Convert to speech
          </ContextMenuItem>
        )}
        {onForkToNote && (
          <ContextMenuItem onClick={onForkToNote}>
            <GitForkIcon className="mr-2 h-4 w-4" />
            Fork to note
          </ContextMenuItem>
        )}
        {isUserMessage && onAskAgain && (
          <ContextMenuItem onClick={onAskAgain}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask again
          </ContextMenuItem>
        )}
        {onDelete && (
          <ContextMenuItem
            onClick={onDelete}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete message
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
