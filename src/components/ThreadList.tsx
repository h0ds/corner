import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Thread } from '@/types';
import { Input } from './ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newName: string) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread,
  onRenameThread,
}) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setEditingName(thread.name);
  };

  const handleFinishRename = () => {
    if (editingThreadId && editingName.trim()) {
      onRenameThread(editingThreadId, editingName.trim());
    }
    setEditingThreadId(null);
    setEditingName('');
  };

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-[250px] border-r border-border bg-card flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <button
          onClick={onNewThread}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm
                   bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Thread
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {sortedThreads.map((thread) => (
            <ContextMenu key={thread.id}>
              <ContextMenuTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    activeThreadId === thread.id && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => onThreadSelect(thread.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {editingThreadId === thread.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleFinishRename();
                        }
                        if (e.key === 'Escape') {
                          setEditingThreadId(null);
                          setEditingName('');
                        }
                      }}
                      className="h-6 text-sm py-0"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate flex-1">
                      {thread.name || 'New Thread'}
                    </span>
                  )}
                  {activeThreadId === thread.id && !editingThreadId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => handleStartRename(thread)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Rename</span>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onDeleteThread(thread.id)}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}; 