import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThreadNoteList } from './ThreadNoteList';
import { SidebarTabs } from './SidebarTabs';
import { Thread, NoteThread, ChatThread } from '@/types';
import { Plus, StickyNote } from 'lucide-react';

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onNewNote: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newName: string) => void;
  onReorderThreads: (threads: Thread[]) => void;
  onTogglePin: (threadId: string) => void;
  onColorChange: (threadId: string, color: string) => void;
  onIconChange: (threadId: string, icon: string) => void;
  onTextColorChange: (threadId: string, color: string) => void;
  initialTab?: 'threads' | 'notes';
}

function generateUniqueName(baseName: string, existingThreads: Thread[]): string {
  // First check if "New note" exists
  if (!existingThreads.some(t => t.name === "New note")) {
    return "New note";
  }

  // Find all notes that start with "New note" and have a number suffix
  const newNoteRegex = /^New note( \d+)?$/;
  const existingNewNotes = existingThreads
    .filter(t => newNoteRegex.test(t.name))
    .map(t => {
      const match = t.name.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    });

  // Find the highest number used
  const maxNumber = Math.max(0, ...existingNewNotes);

  // Use the next number in sequence
  return `New note ${maxNumber + 1}`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  onNewNote,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(props.initialTab || 'threads');

  // Listen for tab change events from Knowledge Graph clicks
  useEffect(() => {
    const handleTabChange = (event: CustomEvent<{ tab: 'threads' | 'notes' }>) => {
      setActiveTab(event.detail.tab);
    };

    const handleNoteSelect = (event: CustomEvent<{ noteId: string; switchTab: boolean }>) => {
      if (event.detail.switchTab) {
        setActiveTab('notes');
      }
      onThreadSelect(event.detail.noteId);
    };

    window.addEventListener('switch-tab', handleTabChange as any);
    window.addEventListener('select-note', handleNoteSelect as any);

    return () => {
      window.removeEventListener('switch-tab', handleTabChange as any);
      window.removeEventListener('select-note', handleNoteSelect as any);
    };
  }, [onThreadSelect]);

  // Memoize thread filtering to prevent unnecessary recalculations
  const filteredThreads = useMemo(() => {
    // Ensure threads is an array
    const validThreads = Array.isArray(threads) ? threads : [];
    
    // Filter based on active tab
    const filtered = validThreads.filter(thread => {
      const isNote = thread && typeof thread.isNote === 'boolean' && thread.isNote === true;
      return activeTab === 'notes' ? isNote : !isNote;
    });

    console.log('Thread filtering:', {
      total: validThreads.length,
      filtered: filtered.length,
      activeTab,
      activeThreadId
    });

    return filtered;
  }, [threads, activeTab, activeThreadId]);

  // Add debug logging for active thread
  useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    console.log('Active thread:', {
      id: activeThreadId,
      type: activeThread?.isNote ? 'note' : 'thread',
      name: activeThread?.name
    });
  }, [activeThreadId, threads]);

  // Auto-select top thread/note when switching tabs
  useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    
    if (filteredThreads.length > 0) {
      // Only select if no item is selected or current selection is of wrong type
      const isCurrentNote = activeThread?.isNote === true;
      const wantNote = activeTab === 'notes';
      
      if (!activeThread || isCurrentNote !== wantNote) {
        onThreadSelect(filteredThreads[0].id);
      }
    }
  }, [activeTab, filteredThreads, activeThreadId, threads, onThreadSelect]);

  const handleCreateNote = useCallback(() => {
    const newNoteName = generateUniqueName('New note', threads);
    
    // Create event to pass the generated name
    const event = new CustomEvent('create-note', {
      detail: { name: newNoteName }
    });
    window.dispatchEvent(event);
    
    onNewNote(); // Call the original handler
  }, [threads, onNewNote]);

  return (
    <div className="absolute inset-0 border-r border-border      s flex flex-col">
      <div className="mt-1">
        <SidebarTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          threadCount={filteredThreads.length}
          noteCount={filteredThreads.length}
        />
        
        <div className="px-2 py-1">
          <button
            onClick={activeTab === 'threads' ? props.onNewThread : handleCreateNote}
            className="w-full flex items-center gap-2 p-3 text-sm rounded-xl 
                     bg-accent text-foreground hover:bg-accent-light transition-colors
                     justify-start pl-3"
          >
            {activeTab === 'threads' ? (
              <>
                <Plus className="h-4 w-4 shrink-0" />
                <span className="flex items-center">Start a new chat</span>
              </>
            ) : (
              <>
                <StickyNote className="h-4 w-4 shrink-0" />
                <span className="flex items-center">Create a new note</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ThreadNoteList
          items={filteredThreads}
          activeItemId={activeThreadId}
          onItemSelect={onThreadSelect}
          onNewItem={activeTab === 'threads' ? props.onNewThread : handleCreateNote}
          onDeleteItem={props.onDeleteThread}
          onRenameItem={props.onRenameThread}
          onReorderItems={props.onReorderThreads}
          onTogglePin={props.onTogglePin}
          onColorChange={props.onColorChange}
          onIconChange={props.onIconChange}
          onTextColorChange={props.onTextColorChange}
          isNoteList={activeTab === 'notes'}
        />
      </div>
    </div>
  );
}; 