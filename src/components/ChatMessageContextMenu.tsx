import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { GitForkIcon, Trash2, Volume2 } from 'lucide-react';

interface ChatMessageContextMenuProps {
  children: React.ReactNode;
  content: string;
  onDelete?: () => void;
  onTextToSpeech?: (text: string) => Promise<void>;
  onForkToNote?: (text: string) => void;
  showTTS?: boolean;
}

export const ChatMessageContextMenu: React.FC<ChatMessageContextMenuProps> = ({
  children,
  content,
  onDelete,
  onTextToSpeech,
  onForkToNote,
  showTTS = false,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="w-full flex">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {showTTS && onTextToSpeech && (
          <ContextMenuItem 
            onClick={() => onTextToSpeech(content)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Volume2 className="h-4 w-4" />
            <span>Read aloud</span>
          </ContextMenuItem>
        )}
        
        {onForkToNote && (
          <>
            {showTTS && <ContextMenuSeparator />}
            <ContextMenuItem 
              onClick={() => onForkToNote(content)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <GitForkIcon className="h-4 w-4" />
              <span>Fork into note</span>
            </ContextMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={onDelete}
              className="flex items-center gap-2 cursor-pointer text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete message</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
