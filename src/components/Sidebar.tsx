import React, { useState, useEffect, useCallback } from 'react';
import { ThreadList } from './ThreadList';
import { NoteList } from './NoteList';
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

  // Add more detailed logging for thread filtering
  console.log('Raw threads:', threads.map(t => ({
    id: t.id,
    name: t.name,
    isNote: t.isNote,
    type: t.isNote ? 'note' : 'chat'
  })));

  // Update type filtering to be more explicit
  const notes = threads.filter((thread): thread is NoteThread => {
    const isNote = thread.isNote === true;
    console.log(`Thread ${thread.id} (${thread.name}) isNote:`, isNote);
    return isNote;
  });
  
  const chatThreads = threads.filter((thread): thread is ChatThread => {
    const isChat = thread.isNote !== true;
    console.log(`Thread ${thread.id} (${thread.name}) isChat:`, isChat);
    return isChat;
  });

  // Add debug logging
  console.log('Filtered threads:', {
    total: threads.length,
    notes: notes.length,
    chats: chatThreads.length,
    noteIds: notes.map(n => n.id),
    chatIds: chatThreads.map(c => c.id),
    activeTab,
    activeThreadId
  });

  // Auto-select top thread/note when switching tabs
  useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    
    if (activeTab === 'threads' && chatThreads.length > 0) {
      // Only select if no thread is selected or current selection is a note
      if (!activeThread || activeThread.isNote) {
        onThreadSelect(chatThreads[0].id);
      }
    } else if (activeTab === 'notes' && notes.length > 0) {
      // Only select if no note is selected or current selection is a thread
      if (!activeThread || !activeThread.isNote) {
        onThreadSelect(notes[0].id);
      }
    }
  }, [activeTab, chatThreads, notes, activeThreadId, threads, onThreadSelect]);

  // Add effect to update active tab when initialTab changes
  useEffect(() => {
    setActiveTab(props.initialTab || 'threads');
  }, [props.initialTab]);

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
          threadCount={chatThreads.length}
          noteCount={notes.length}
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

      {activeTab === 'threads' ? (
        <ThreadList
          threads={chatThreads}
          activeThreadId={activeThreadId}
          onThreadSelect={onThreadSelect}
          {...props}
        />
      ) : (
        <NoteList
          notes={notes}
          activeNoteId={activeThreadId}
          onNoteSelect={onThreadSelect}
          onDeleteNote={props.onDeleteThread}
          onRenameNote={props.onRenameThread}
          onColorChange={props.onColorChange}
          onIconChange={props.onIconChange}
          onTextColorChange={props.onTextColorChange}
          onReorderNotes={props.onReorderThreads}
        />
      )}
    </div>
  );
}; 