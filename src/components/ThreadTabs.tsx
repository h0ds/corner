import React from 'react';
import { Thread } from '@/types';
import { MessageSquare, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreadTabsProps {
  activeTab: 'threads' | 'notes';
  onTabChange: (tab: 'threads' | 'notes') => void;
  threadCount: number;
  noteCount: number;
}

export const ThreadTabs: React.FC<ThreadTabsProps> = ({
  activeTab,
  onTabChange,
  threadCount,
  noteCount,
}) => {
  return (
    <div className="flex w-full border-b border-border">
      <button
        onClick={() => onTabChange('threads')}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors",
          activeTab === 'threads'
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Threads</span>
        <span className="text-xs text-muted-foreground">
          {threadCount}
        </span>
      </button>
      <button
        onClick={() => onTabChange('notes')}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors",
          activeTab === 'notes'
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <StickyNote className="h-4 w-4" />
        <span>Notes</span>
        <span className="text-xs text-muted-foreground">
          {noteCount}
        </span>
      </button>
    </div>
  );
}; 