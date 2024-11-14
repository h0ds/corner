import React from 'react';
import { Plus, StickyNote } from 'lucide-react';

interface ThreadActionsProps {
  onNewThread: () => void;
  onNewNote: () => void;
}

export const ThreadActions: React.FC<ThreadActionsProps> = ({
  onNewThread,
  onNewNote,
}) => {
  return (
    <div className="p-2 border-b border-border">
      <div className="flex gap-2">
        <button
          onClick={onNewThread}
          className="flex-1 flex items-center justify-center gap-2 p-2 text-sm rounded-xl 
                   bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="flex items-center -mb-1">New thread</span>
        </button>
        <button
          onClick={onNewNote}
          className="flex-1 flex items-center justify-center gap-2 p-2 text-sm rounded-xl 
                   bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
        >
          <StickyNote className="h-4 w-4 shrink-0" />
          <span className="flex items-center -mb-1">New note</span>
        </button>
      </div>
    </div>
  );
}; 