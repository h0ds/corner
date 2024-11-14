import React, { useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MessageSquare, Volume2, Copy, Scissors } from 'lucide-react';

interface NoteContextMenuProps {
  children: React.ReactNode;
  selectedModel: string;
  onInsertResponse: (response: string) => void;
  onConvertToSpeech?: (text: string) => Promise<void>;
  onSplitToNote?: (text: string) => void;
  showTTS?: boolean;
}

export const NoteContextMenu: React.FC<NoteContextMenuProps> = ({
  children,
  selectedModel,
  onInsertResponse,
  onConvertToSpeech,
  onSplitToNote,
  showTTS
}) => {
  const getSelectedText = useCallback(() => {
    const selection = window.getSelection();
    return selection?.toString() || '';
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    const selectedText = getSelectedText();
    if (selectedText) {
      // Prevent default only if there's selected text
      event.preventDefault();
    }
  }, [getSelectedText]);

  const handleMenuItemClick = useCallback((action: 'copy' | 'ask' | 'speech' | 'split') => {
    const selectedText = getSelectedText();
    if (!selectedText) return;

    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(selectedText);
        break;
      case 'ask':
        onInsertResponse(`Help me understand this text: "${selectedText}"`);
        break;
      case 'speech':
        onConvertToSpeech?.(selectedText);
        break;
      case 'split':
        onSplitToNote?.(selectedText);
        break;
    }
  }, [getSelectedText, onInsertResponse, onConvertToSpeech, onSplitToNote]);

  return (
    <ContextMenu>
      <ContextMenuTrigger 
        onContextMenu={handleContextMenu} 
        className="w-full h-full"
        // Prevent default selection clearing
        onMouseDown={(e) => e.preventDefault()}
      >
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        {(getSelectedText() !== '') && (
          <>
            <ContextMenuItem
              onClick={() => handleMenuItemClick('copy')}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() => handleMenuItemClick('ask')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Ask AI</span>
            </ContextMenuItem>

            {showTTS && onConvertToSpeech && (
              <ContextMenuItem
                onClick={() => handleMenuItemClick('speech')}
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                <span>Convert to Speech</span>
              </ContextMenuItem>
            )}

            {onSplitToNote && (
              <ContextMenuItem
                onClick={() => handleMenuItemClick('split')}
                className="flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                <span>Split to New Note</span>
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};