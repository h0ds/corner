import React from 'react';
import { MessageSquare, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarTabsProps {
  activeTab: 'threads' | 'notes';
  onTabChange: (tab: 'threads' | 'notes') => void;
  threadCount: number;
  noteCount: number;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  activeTab,
  onTabChange,
  threadCount,
  noteCount,
}) => {
  return (
    <div className="flex w-full py-1 px-2 gap-1">
      <button
        onClick={() => onTabChange('threads')}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm transition-colors bg-accent-light rounded-xl",
          activeTab === 'threads'
            ? "bg-accent text-foreground border border-border"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Threads</span>
        <span className="text-xs font-mono text-muted-foreground">
          {threadCount}
        </span>
      </button>
      <button
        onClick={() => onTabChange('notes')}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm transition-colors bg-accent-light rounded-xl",
          activeTab === 'notes'
            ? "bg-accent text-foreground border border-border"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <StickyNote className="h-4 w-4" />
        <span>Notes</span>
        <span className="text-xs font-mono text-muted-foreground">
          {noteCount}
        </span>
      </button>
    </div>
  );
}; 