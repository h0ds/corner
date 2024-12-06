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
  threadCount,
  noteCount,
  activeTab,
  onTabChange,
}: SidebarTabsProps) => {
  return (
    <div className="flex w-full">
      <button
        onClick={() => onTabChange('threads')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-l-xl transition-colors border",
          activeTab === 'threads'
            ? "bg-accent text-accent-foreground border-border"
            : "hover:bg-accent/50 border-transparent"
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
          "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-r-xl transition-colors border",
          activeTab === 'notes'
            ? "bg-accent text-accent-foreground border-border"
            : "hover:bg-accent/50 border-transparent"
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