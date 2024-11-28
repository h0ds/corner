import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThreadNoteList } from './ThreadNoteList';
import { SidebarTabs } from './SidebarTabs';
import { Thread, NoteThread, ChatThread } from '@/types';
import { Plus, StickyNote } from 'lucide-react';
import { loadThreadOrder, saveThreadOrder } from '../lib/storage';

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
  onNewNote,
  onNewThread,
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
  // Memoize thread and note counts
  const { filteredThreads, threadCount, noteCount } = useMemo(() => {
    // Ensure threads is an array and all items are valid
    const validThreads = Array.isArray(threads) ? threads.filter(thread => 
      thread && 
      typeof thread.id === 'string' && 
      typeof thread.isNote === 'boolean'
    ) : [];
    
    // Calculate total counts and sort items
    const notes = validThreads.filter(thread => thread.isNote === true)
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

    const chats = validThreads.filter(thread => thread.isNote === false)
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
    
    // Filter based on active tab
    const filtered = activeTab === 'notes' ? notes : chats;

    console.log('Thread filtering:', {
      total: validThreads.length,
      validThreads: validThreads.map(t => ({ id: t.id, isNote: t.isNote })),
      filtered: filtered.length,
      notes: notes.length,
      chats: chats.length,
      pinnedItems: filtered.filter(t => t.isPinned).length,
      activeTab
    });

    return {
      filteredThreads: filtered,
      threadCount: chats.length,
      noteCount: notes.length
    };
  }, [threads, activeTab]);

  // Add debug logging for active thread
  useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    console.log('Active thread:', {
      id: activeThreadId,
      type: activeThread?.isNote ? 'note' : 'thread',
      name: activeThread?.name,
      isValid: activeThread && typeof activeThread.isNote === 'boolean'
    });
  }, [activeThreadId, threads]);

  // Auto-select top thread/note when switching tabs
  useEffect(() => {
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
      <div className="mt-1">
        <SidebarTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          threadCount={threadCount}
          noteCount={noteCount}
        />
        
        <div className="px-2 py-1">
          <button
            onClick={() => {
              if (activeTab === 'threads') {
                onNewThread();
              } else {
                onNewNote();
              }
            }}
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