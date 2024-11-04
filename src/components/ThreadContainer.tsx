import React, { useState, useEffect } from 'react';
import { ThreadList } from './ThreadList';
import { NoteList } from './NoteList';
import { ThreadTabs } from './ThreadTabs';
import { Thread } from '@/types';
import { Plus, StickyNote } from 'lucide-react';

interface ThreadContainerProps {
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
}

export const ThreadContainer: React.FC<ThreadContainerProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState<'threads' | 'notes'>('threads');

  // Type-safe filtering
  const notes = threads.filter((t): t is NoteThread => t.isNote === true);
  const chatThreads = threads.filter((t): t is ChatThread => t.isNote !== true);

  // Auto-select top thread when switching to threads tab
  useEffect(() => {
    if (activeTab === 'threads' && chatThreads.length > 0) {
      const activeThread = threads.find(t => t.id === activeThreadId);
      // Only select if no thread is selected or current thread is a note
      if (!activeThread || activeThread.isNote) {
        // Select the first non-note thread
        onThreadSelect(chatThreads[0].id);
      }
    }
  }, [activeTab, chatThreads, activeThreadId, threads, onThreadSelect]);

  return (
    <div className="absolute inset-0 border-r border-border bg-card flex flex-col">
      <div className="mt-12">
        <ThreadTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          threadCount={chatThreads.length}
          noteCount={notes.length}
        />
        
        <div className="p-2 border-b border-border">
          <button
            onClick={activeTab === 'threads' ? props.onNewThread : props.onNewNote}
            className="w-full flex items-center gap-2 p-2 text-sm rounded-md 
                     bg-primary text-primary-foreground hover:bg-primary/90 transition-colors
                     justify-start pl-3"
          >
            {activeTab === 'threads' ? (
              <>
                <Plus className="h-4 w-4 shrink-0" />
                <span className="flex items-center -mb-1">New thread</span>
              </>
            ) : (
              <>
                <StickyNote className="h-4 w-4 shrink-0" />
                <span className="flex items-center -mb-1">New note</span>
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