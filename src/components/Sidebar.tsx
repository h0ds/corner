import React, { useState, useCallback, useMemo } from 'react';
import { ThreadNoteList } from './ThreadNoteList';
import { SidebarTabs } from './SidebarTabs';
import { Thread } from '@/types';
import { Plus, StickyNote, Search, X } from 'lucide-react';
import { loadThreadOrder, saveThreadOrder } from '../lib/storage';
import { Input } from './ui/input';

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
  activeTab: 'threads' | 'notes';
  onTabChange: (tab: 'threads' | 'notes') => void;
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
  onNewThread,
  onNewNote,
  onDeleteThread,
  onRenameThread,
  onReorderThreads,
  onTogglePin,
  onColorChange,
  onIconChange,
  onTextColorChange,
  activeTab,
  onTabChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize thread and note counts
  const { filteredThreads, threadCount, noteCount } = useMemo(() => {
    // Ensure threads is an array and all items are valid
    const validThreads = Array.isArray(threads) ? threads.filter(thread => 
      thread && 
      typeof thread.id === 'string' && 
      typeof thread.isNote === 'boolean'
    ) : [];
    
    // Calculate total counts
    const notes = validThreads.filter(thread => thread.isNote === true);
    const chats = validThreads.filter(thread => thread.isNote === false);
    
    // Filter based on search query
    const filterThreads = (items: Thread[]) => {
      if (!searchQuery) return items;
      return items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.content && typeof item.content === 'string' && item.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    };
    
    // Get the list to display based on active tab
    const filtered = filterThreads(activeTab === 'notes' ? notes : chats)
      .sort((a, b) => {
        // Sort by pinned status first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by saved order for unpinned items
        const savedOrder = loadThreadOrder();
        if (savedOrder && !a.isPinned && !b.isPinned) {
          const aIndex = savedOrder.indexOf(a.id);
          const bIndex = savedOrder.indexOf(b.id);
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
        }
        // Fall back to updated time if no saved order
        if (!a.isPinned && !b.isPinned) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        }
        return 0;
      });

    return {
      filteredThreads: filtered,
      threadCount: chats.length,
      noteCount: notes.length
    };
  }, [threads, activeTab, searchQuery]);

  // Add debug logging for active thread
  React.useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    console.log('Active thread:', {
      id: activeThreadId,
      type: activeThread?.isNote ? 'note' : 'thread',
      name: activeThread?.name,
      isValid: activeThread && typeof activeThread.isNote === 'boolean'
    });
  }, [activeThreadId, threads]);

  // Auto-select top thread/note when switching tabs
  React.useEffect(() => {
    // Skip if no items to select from
    if (filteredThreads.length === 0) return;

    const activeThread = threads.find(t => t.id === activeThreadId);
    const isCurrentNote = activeThread?.isNote === true;
    const wantNote = activeTab === 'notes';

    // Select first item if:
    // 1. No active thread, or
    // 2. Current thread type doesn't match active tab
    if (!activeThread || isCurrentNote !== wantNote) {
      console.log('Auto-selecting first item:', {
        reason: !activeThread ? 'no active thread' : 'type mismatch',
        selectedId: filteredThreads[0].id,
        isNote: filteredThreads[0].isNote,
        currentTab: activeTab
      });
      onThreadSelect(filteredThreads[0].id);
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
    <div className="absolute inset-0 border-r border-border flex flex-col">
      <div className="flex flex-col gap-2 p-2">
        <div className="relative">
          <Input
            placeholder={`Search ${activeTab === 'notes' ? 'notes' : 'threads'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rounded-xl"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <SidebarTabs
            threadCount={threadCount}
            noteCount={noteCount}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        </div>
        
        <div>
          <button
            onClick={() => {
              if (activeTab === 'threads') {
                onNewThread();
              } else {
                onNewNote();
              }
            }}
            className="w-full flex items-center gap-2 p-2 text-sm rounded-xl 
                     bg-foreground hover:bg-foreground/80 text-background transition-colors border border-foreground/80 hover:border-foreground/50"
          >
            {activeTab === 'threads' ? (
              <>
                <Plus className="h-4 w-4 shrink-0 ml-0.5" />
                <span>Start a new chat</span>
              </>
            ) : (
              <>
                <StickyNote className="h-4 w-4 shrink-0 ml-0.5" />
                <span>Create a new note</span>
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
          onNewItem={activeTab === 'threads' ? onNewThread : onNewNote}
          onDeleteItem={onDeleteThread}
          onRenameItem={onRenameThread}
          onReorderItems={onReorderThreads}
          onTogglePin={onTogglePin}
          onColorChange={onColorChange}
          onIconChange={onIconChange}
          onTextColorChange={onTextColorChange}
          isNoteList={activeTab === 'notes'}
          saveThreadOrder={saveThreadOrder}
        />
      </div>
    </div>
  );
}; 