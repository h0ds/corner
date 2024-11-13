import React from 'react';
import { Thread, NoteThread, ChatThread } from '@/types';
import { X, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LinkedThreadsProps {
  currentNote: NoteThread;
  allThreads: Thread[];
  onNavigateToThread?: (threadId: string) => void;
  onUnlinkThread: (threadId: string) => void;
}

export const LinkedThreads: React.FC<LinkedThreadsProps> = ({
  currentNote,
  allThreads,
  onNavigateToThread,
  onUnlinkThread,
}) => {
  const linkedThreads = allThreads
    .filter((thread): thread is ChatThread => {
      return !thread.isNote && currentNote.linkedNotes?.includes(thread.id);
    });

  return (
    <div className="h-full border-l border-border bg-card">
      <div className="p-3 border-b border-border bg-card">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Linked Threads
        </h2>
      </div>

      <div className="p-2">
        {linkedThreads.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-4">
            No threads linked to this note
          </div>
        ) : (
          <div className="space-y-1">
            {linkedThreads.map(thread => (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "cursor-pointer text-sm"
                )}
                onClick={() => onNavigateToThread?.(thread.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{thread.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlinkThread(thread.id);
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