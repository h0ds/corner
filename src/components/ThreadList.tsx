import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
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
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newName: string) => void;
  onReorderThreads: (threads: Thread[]) => void;
}

interface SortableThreadItemProps {
  thread: Thread;
  activeThreadId: string | null;
  editingThreadId: string | null;
  editingName: string;
  onStartRename: (thread: Thread) => void;
  onFinishRename: () => void;
  onEditingNameChange: (value: string) => void;
  onThreadSelect: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

const ThreadItem = ({
  thread,
  activeThreadId,
  editingThreadId,
  editingName,
  onStartRename,
  onFinishRename,
  onEditingNameChange,
  onThreadSelect,
  onDeleteThread,
  isDragging = false,
  isOverlay = false,
}: SortableThreadItemProps & { isDragging?: boolean; isOverlay?: boolean }) => {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-sm cursor-pointer",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        activeThreadId === thread.id && "bg-accent text-accent-foreground",
        isDragging && "opacity-50",
        isOverlay && "bg-background border border-border shadow-lg"
      )}
      onClick={() => !isOverlay && onThreadSelect(thread.id)}
    >
      <div className="touch-none cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <MessageSquare className="h-4 w-4 shrink-0" />
      {editingThreadId === thread.id ? (
        <Input
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onBlur={onFinishRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFinishRename();
            if (e.key === 'Escape') onFinishRename();
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
      {activeThreadId === thread.id && !editingThreadId && !isOverlay && (
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
    </div>
  );
};

const SortableThreadItem = ({
  thread,
  activeThreadId,
  editingThreadId,
  editingName,
  onStartRename,
  onFinishRename,
  onEditingNameChange,
  onThreadSelect,
  onDeleteThread,
}: SortableThreadItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: thread.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={setNodeRef}
          style={style}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          {...attributes}
          {...listeners}
        >
          <ThreadItem
            thread={thread}
            activeThreadId={activeThreadId}
            editingThreadId={editingThreadId}
            editingName={editingName}
            onStartRename={onStartRename}
            onFinishRename={onFinishRename}
            onEditingNameChange={onEditingNameChange}
            onThreadSelect={onThreadSelect}
            onDeleteThread={onDeleteThread}
            isDragging={isDragging}
          />
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onStartRename(thread)}
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
  );
};

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  onReorderThreads,
}) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = threads.findIndex((t) => t.id === active.id);
      const newIndex = threads.findIndex((t) => t.id === over.id);
      const newThreads = arrayMove(threads, oldIndex, newIndex);
      onReorderThreads(newThreads);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeThread = activeId ? threads.find(t => t.id === activeId) : null;

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={threads.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence>
              {threads.map((thread) => (
                <SortableThreadItem
                  key={thread.id}
                  thread={thread}
                  activeThreadId={activeThreadId}
                  editingThreadId={editingThreadId}
                  editingName={editingName}
                  onStartRename={handleStartRename}
                  onFinishRename={handleFinishRename}
                  onEditingNameChange={setEditingName}
                  onThreadSelect={onThreadSelect}
                  onDeleteThread={onDeleteThread}
                />
              ))}
            </AnimatePresence>
          </SortableContext>

          <DragOverlay>
            {activeThread ? (
              <ThreadItem
                thread={activeThread}
                activeThreadId={activeThreadId}
                editingThreadId={editingThreadId}
                editingName={editingName}
                onStartRename={handleStartRename}
                onFinishRename={handleFinishRename}
                onEditingNameChange={setEditingName}
                onThreadSelect={onThreadSelect}
                onDeleteThread={onDeleteThread}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}; 