import React, { useState } from "react";
import { Thread } from "@/types";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Pencil,
  Trash2, SmilePlus,
  Palette,
  Type, Pin
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
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
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

interface ThreadNoteListProps {
  items: Thread[];
  activeItemId: string | null;
  onItemSelect: (itemId: string) => void;
  onNewItem?: () => void;
  onDeleteItem: (itemId: string) => void;
  onRenameItem: (itemId: string, newName: string) => void;
  onReorderItems: (items: Thread[]) => void;
  onTogglePin?: (itemId: string) => void;
  onColorChange: (itemId: string, color: string) => void;
  onIconChange: (itemId: string, icon: string) => void;
  onTextColorChange: (itemId: string, color: string) => void;
  isNoteList?: boolean;
}

interface SortableItemProps {
  item: Thread;
  activeItemId: string | null;
  editingItemId: string | null;
  editingName: string;
  onStartRename: (item: Thread) => void;
  onFinishRename: () => void;
  onEditingNameChange: (value: string) => void;
  onItemSelect: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onTogglePin?: (itemId: string) => void;
  onColorChange: (itemId: string, color: string) => void;
  onIconChange: (itemId: string, icon: string) => void;
  onTextColorChange: (itemId: string, color: string) => void;
  dropTarget?: { id: string; position: "before" | "after" } | null;
  isDragging?: boolean;
  isNoteList?: boolean;
}

const SortableItem = ({
  item,
  activeItemId,
  editingItemId,
  editingName,
  onStartRename,
  onFinishRename,
  onEditingNameChange,
  onItemSelect,
  onDeleteItem,
  onTogglePin,
  onColorChange,
  onIconChange,
  onTextColorChange,
  dropTarget,
  isDragging,
  isNoteList,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    disabled: item.isPinned || editingItemId === item.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
  };

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  const isEditing = editingItemId === item.id;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={setNodeRef}
          style={style}
          className={cn(
            "relative",
            isDragging && "z-50"
          )}
        >
          <div
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 select-none cursor-pointer",
              activeItemId === item.id && "bg-accent",
              item.color && `hover:${item.color}/10`,
              isEditing && "ring-1 ring-accent",
              item.isPinned && "border border-border/50"
            )}
            onClick={() => !isEditing && onItemSelect(item.id)}
          >
            {!item.isPinned && (
              <div
                {...(!isEditing && item.isPinned ? {} : { ...attributes, ...listeners })}
                className="cursor-grab opacity-0 group-hover:opacity-100 hover:text-accent-foreground"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            {item.icon && (
              <span className="text-sm">{item.icon}</span>
            )}
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onBlur={onFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onFinishRename();
                  }
                }}
                className="flex-1 bg-transparent outline-none"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "flex-1 truncate",
                  item.textColor && `text-${item.textColor}`,
                  activeItemId === item.id && "text-accent-foreground"
                )}
              >
                {item.name}
              </span>
            )}
            {item.isPinned && (
              <Pin className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onTogglePin && (
          <ContextMenuItem onClick={() => onTogglePin(item.id)}>
            <Pin className="h-4 w-4 mr-2" />
            {item.isPinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onStartRename(item)}>
          <Pencil className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setShowColorPicker(true)}>
          <Palette className="h-4 w-4 mr-2" />
          Change Color
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setShowIconPicker(true)}>
          <SmilePlus className="h-4 w-4 mr-2" />
          Change Icon
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setShowTextColorPicker(true)}>
          <Type className="h-4 w-4 mr-2" />
          Text Color
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDeleteItem(item.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const ThreadNoteList: React.FC<ThreadNoteListProps> = ({
  items,
  activeItemId,
  onItemSelect,
  onNewItem,
  onDeleteItem,
  onRenameItem,
  onReorderItems,
  onTogglePin,
  onColorChange,
  onIconChange,
  onTextColorChange,
  isNoteList = false,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleStartRename = (item: Thread) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
  };

  const handleFinishRename = () => {
    if (editingItemId && editingName.trim()) {
      onRenameItem(editingItemId, editingName.trim());
    }
    setEditingItemId(null);
    setEditingName("");
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

    const overItem = items.find(t => t.id === over.id);
    // Don't show drop target if the target item is pinned
    if (overItem?.isPinned) {
      setDropTarget(null);
      return;
    }

    // Find the last pinned item's index
    const lastPinnedIndex = items.findIndex(item => !item.isPinned) - 1;
    const overIndex = items.findIndex(t => t.id === over.id);

    // Don't show drop target if trying to drop before pinned items
    if (lastPinnedIndex >= 0 && overIndex <= lastPinnedIndex) {
      setDropTarget(null);
      return;
    }

    const activeRect = (active.rect.current as any).translated;
    const overRect = over.rect;
    const threshold = overRect.top + overRect.height / 2;
    const position = activeRect.top < threshold ? "before" : "after";

    setDropTarget({ id: over.id as string, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeItem = items.find(t => t.id === active.id);
      const overItem = items.find(t => t.id === over.id);
      
      // Don't allow reordering if either item is pinned
      if (activeItem?.isPinned || overItem?.isPinned) {
        setActiveId(null);
        setIsDragging(false);
        setDropTarget(null);
        return;
      }

      // Find the last pinned item's index
      const lastPinnedIndex = items.findIndex(item => !item.isPinned) - 1;
      const oldIndex = items.findIndex(t => t.id === active.id);
      let newIndex = items.findIndex(t => t.id === over.id);

      // Ensure new position is after pinned items
      if (lastPinnedIndex >= 0) {
        newIndex = Math.max(newIndex, lastPinnedIndex + 1);
      }

      const reorderedItems = [...items];
      const [movedItem] = reorderedItems.splice(oldIndex, 1);
      reorderedItems.splice(newIndex, 0, movedItem);
      
      onReorderItems(reorderedItems);
    }

    setActiveId(null);
    setIsDragging(false);
    setDropTarget(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
    setDropTarget(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1 p-2 pb-20">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {dropTarget?.id === item.id && dropTarget.position === "before" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "2px" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-500 rounded-full mx-2"
                  layoutId="dropIndicator"
                />
              )}
              <SortableItem
                item={item}
                activeItemId={activeItemId}
                editingItemId={editingItemId}
                editingName={editingName}
                onStartRename={handleStartRename}
                onFinishRename={handleFinishRename}
                onEditingNameChange={setEditingName}
                onItemSelect={onItemSelect}
                onDeleteItem={onDeleteItem}
                onTogglePin={onTogglePin}
                onColorChange={onColorChange}
                onIconChange={onIconChange}
                onTextColorChange={onTextColorChange}
                dropTarget={dropTarget}
                isDragging={isDragging && activeId === item.id}
                isNoteList={isNoteList}
              />
              {dropTarget?.id === item.id && dropTarget.position === "after" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "2px" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-500 rounded-full mx-2"
                  layoutId="dropIndicator"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            className="pointer-events-none"
          >
            <SortableItem
              item={items.find(t => t.id === activeId)!}
              activeItemId={activeItemId}
              editingItemId={editingItemId}
              editingName={editingName}
              onStartRename={handleStartRename}
              onFinishRename={handleFinishRename}
              onEditingNameChange={setEditingName}
              onItemSelect={onItemSelect}
              onDeleteItem={onDeleteItem}
              onTogglePin={onTogglePin}
              onColorChange={onColorChange}
              onIconChange={onIconChange}
              onTextColorChange={onTextColorChange}
              isNoteList={isNoteList}
            />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
