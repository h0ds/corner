import React, { useState } from 'react';
import { Plus, Trash2, Pencil, GripVertical, FileText, Pin } from 'lucide-react';
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
import { FileViewer } from './FileViewer';

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newName: string) => void;
  onReorderThreads: (threads: Thread[]) => void;
  onTogglePin: (threadId: string) => void;
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
  onTogglePin: (threadId: string) => void;
  dropTarget?: { id: string; position: 'before' | 'after' } | null;
  threads: Thread[];
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
  onTogglePin,
  isDragging = false,
  isOverlay = false,
  dragHandleProps = {},
}: SortableThreadItemProps & {
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandleProps?: any;
}) => {
  const [showFiles, setShowFiles] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        activeThreadId === thread.id && "bg-accent text-accent-foreground",
        isDragging && "opacity-50",
        isOverlay && "bg-background border border-border shadow-lg scale-105 rotate-2"
      )}
      onClick={() => !isOverlay && onThreadSelect(thread.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isOverlay) {
          onStartRename(thread);
        }
      }}
    >
      {!thread.isPinned && (
        <div 
          {...dragHandleProps}
          className="touch-none cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      )}
      {thread.isPinned && (
        <Pin className="h-4 w-4 shrink-0 text-primary" />
      )}
      {/* <MessageSquare className="h-4 w-4 shrink-0" /> */}
      {editingThreadId === thread.id ? (
        <div 
          className="flex-1" 
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onFinishRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishRename();
              if (e.key === 'Escape') onFinishRename();
              e.stopPropagation();
            }}
            className="h-6 text-sm py-0"
            autoFocus
          />
        </div>
      ) : (
        <span className="text-sm truncate flex-1 mt-1">
          {thread.name || 'New Thread'}
        </span>
      )}
      {activeThreadId === thread.id && !editingThreadId && !isOverlay && (
        <>
          {thread.files && thread.files.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFiles(true);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-accent-foreground transition-opacity"
              title={`${thread.files.length} file${thread.files.length === 1 ? '' : 's'}`}
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteThread(thread.id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {thread.files && (
            <FileViewer
              isOpen={showFiles}
              onClose={() => setShowFiles(false)}
              files={thread.files}
              threadName={thread.name}
            />
          )}
        </>
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
  onTogglePin,
  dropTarget,
  isDragging,
  threads
}: SortableThreadItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ 
    id: thread.id,
    disabled: editingThreadId === thread.id || thread.isPinned
  });

  const shouldShowSeparator = (targetId: string) => {
    const targetThread = threads.find(t => t.id === targetId);
    return !thread.isPinned && !targetThread?.isPinned;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isThisItemDragging ? 999 : undefined,
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
          className={cn(
            "relative",
            isThisItemDragging && "z-50"
          )}
        >
          {isDragging && dropTarget?.id === thread.id && 
           dropTarget.position === 'before' && 
           shouldShowSeparator(dropTarget.id) && (
            <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
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
            onTogglePin={onTogglePin}
            isDragging={isThisItemDragging}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
          {isDragging && dropTarget?.id === thread.id && 
           dropTarget.position === 'after' && 
           shouldShowSeparator(dropTarget.id) && (
            <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
          {isThisItemDragging && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-sm pointer-events-none" />
          )}
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onTogglePin(thread.id)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Pin className="h-4 w-4" />
          <span>{thread.isPinned ? 'Unpin' : 'Pin'}</span>
        </ContextMenuItem>
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
  onTogglePin,
}) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    setIsDragging(true);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropTarget(null);
      return;
    }

    // Get the bounding rectangles of the dragged and target items
    const activeRect = (active.rect.current as any).translated;
    const overRect = over.rect;

    // Determine if we're in the upper or lower half of the target
    const threshold = overRect.top + (overRect.height / 2);
    const position = activeRect.top < threshold ? 'before' : 'after';

    setDropTarget({ id: over.id as string, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeThread = threads.find(t => t.id === active.id);
      const overThread = threads.find(t => t.id === over.id);
      
      if (activeThread?.isPinned || overThread?.isPinned) {
        return;
      }

      const oldIndex = threads.findIndex((t) => t.id === active.id);
      const newIndex = threads.findIndex((t) => t.id === over.id);
      const newThreads = arrayMove(threads, oldIndex, newIndex);
      onReorderThreads(newThreads);
    }

    setIsDragging(false);
    setActiveId(null);
    setDropTarget(null);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
    setDropTarget(null);
  };

  const activeThread = activeId ? threads.find(t => t.id === activeId) : null;

  // Sort threads to show pinned ones at the top
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="absolute inset-0 border-r border-border bg-card flex flex-col">
      <div className="p-2 border-b border-border mt-12">
        <button
          onClick={onNewThread}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="flex items-center -mb-1">New Thread</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          modifiers={[]}
        >
          <SortableContext
            items={sortedThreads.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {sortedThreads.map((thread) => (
                <SortableThreadItem
                  key={thread.id}
                  thread={thread}
                  threads={threads}
                  activeThreadId={activeThreadId}
                  editingThreadId={editingThreadId}
                  editingName={editingName}
                  onStartRename={handleStartRename}
                  onFinishRename={handleFinishRename}
                  onEditingNameChange={setEditingName}
                  onThreadSelect={onThreadSelect}
                  onDeleteThread={onDeleteThread}
                  onTogglePin={onTogglePin}
                  dropTarget={dropTarget}
                  isDragging={isDragging}
                />
              ))}
            </AnimatePresence>
          </SortableContext>

          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
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
                onTogglePin={onTogglePin}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}; 