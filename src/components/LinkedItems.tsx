import React from 'react';
import { Thread, NoteThread, ChatThread } from '@/types';
import { X, MessageSquare, FileText, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LinkedItemsProps {
  currentNote: NoteThread;
  allThreads: Thread[];
  onNavigateToItem?: (threadId: string, isNote: boolean) => void;
  onUnlinkItem: (threadId: string) => void;
  onOpenLinkNote: () => void;
  onOpenLinkThread: () => void;
}

export const LinkedItems: React.FC<LinkedItemsProps> = ({
  currentNote,
  allThreads,
  onNavigateToItem,
  onUnlinkItem,
  onOpenLinkNote,
  onOpenLinkThread,
}) => {
  const linkedItems = allThreads
    .filter(thread => 
      thread.id !== currentNote.id && 
      currentNote.linkedNotes?.includes(thread.id)
    );

  const handleItemClick = (thread: Thread) => {
    if (onNavigateToItem) {
      onNavigateToItem(thread.id, thread.isNote);
    }
  };

  return (
    <div className="h-full border-l border-border bg-card flex flex-col">
      <div>
        <div className="p-3 border-b border-border bg-card">
          <h2 className="text-sm font-medium">
            Linked Items
          </h2>
        </div>
        <div className="p-2 border-b border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onOpenLinkNote}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onOpenLinkThread}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link Thread
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {linkedItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-4">
            No linked items
          </div>
        ) : (
          <div className="space-y-1">
            {linkedItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "cursor-pointer text-sm"
                )}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.isNote ? (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.isNote ? 'Note' : 'Thread'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlinkItem(item.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 