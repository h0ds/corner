import React, { useCallback } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MessageSquare, Volume2, Copy, Scissors } from 'lucide-react';
import { showToast } from '@/lib/toast';

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
    if (!selectedText) {
      // Only prevent default if there's no selected text
      event.preventDefault();
      event.stopPropagation();
    }
  }, [getSelectedText]);

  const handleMenuItemClick = useCallback((action: 'copy' | 'ask' | 'speech' | 'split') => {
    const selectedText = getSelectedText();
    if (!selectedText) return;

    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(selectedText);
        showToast.success('Copied to clipboard');
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
        style={{
          display: 'block',
          position: 'relative',
          minHeight: '100%'
        }}
      >
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent
        style={{
          zIndex: 1000,
          position: 'fixed',
          minWidth: '300px'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        hidden={!getSelectedText()}
      >
        <ContextMenuItem
          onClick={() => handleMenuItemClick('copy')}
          className="flex items-center gap-2 cursor-pointer truncate"
        >
          <Copy className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Copy</span>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => handleMenuItemClick('ask')}
          className="flex items-center gap-2 cursor-pointer truncate"
        >
          <MessageSquare className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Ask AI about this</span>
        </ContextMenuItem>

        {showTTS && onConvertToSpeech && (
          <ContextMenuItem
            onClick={() => handleMenuItemClick('speech')}
            className="flex items-center gap-2 cursor-pointer truncate"
          >
            <Volume2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Convert to Speech</span>
          </ContextMenuItem>
        )}

        {onSplitToNote && (
          <ContextMenuItem
            onClick={() => handleMenuItemClick('split')}
            className="flex items-center gap-2 cursor-pointer truncate"
          >
            <Scissors className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Split to New Note</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};