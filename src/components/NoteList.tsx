import React, { useState } from 'react';
import { NoteThread } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from './ui/input';
import { Trash2, Pencil, FileText, Pin, Palette, X, SmilePlus, Type, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FileViewer } from './FileViewer';
import { ColorPickerModal } from './ThreadList'; // Import the ColorPickerModal from ThreadList
import { IconPicker } from './ThreadList'; // Import the IconPicker from ThreadList
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

interface NoteListProps {
  notes: NoteThread[];
  activeNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newName: string) => void;
  onColorChange: (noteId: string, color: string) => void;
  onIconChange: (noteId: string, icon: string) => void;
  onTextColorChange: (noteId: string, color: string) => void;
  onReorderNotes: (notes: NoteThread[]) => void;
}

const NoteItem: React.FC<{
  note: NoteThread;
  activeNoteId: string | null;
  editingNoteId: string | null;
  editingName: string;
  onStartRename: (note: NoteThread) => void;
  onFinishRename: () => void;
  onEditingNameChange: (value: string) => void;
  onNoteSelect: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onColorChange: (noteId: string, color: string) => void;
  onIconChange: (noteId: string, icon: string) => void;
  onTextColorChange: (noteId: string, color: string) => void;
}> = ({
  note,
  activeNoteId,
  editingNoteId,
  editingName,
  onStartRename,
  onFinishRename,
  onEditingNameChange,
  onNoteSelect,
  onDeleteNote,
  onColorChange,
  onIconChange,
  onTextColorChange,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer relative",
            "hover:bg-accent hover:text-accent-foreground transition-colors"
          )}
          style={{
            backgroundColor: note.color ? `${note.color}4D` : undefined,
            color: note.textColor || undefined,
          } as React.CSSProperties}
          onClick={() => onNoteSelect(note.id)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename(note);
          }}
        >
          {activeNoteId === note.id && (
            <div 
              className="absolute inset-0 rounded-md pointer-events-none border border-1"
              style={note.color ? {
                borderColor: note.color
              } : {
                borderColor: 'rgb(209 213 219)'
              }}
            />
          )}

          <div className="relative z-10 flex items-center gap-2 w-full">
            {note.icon && (
              <div className="h-4 w-4 shrink-0 text-muted-foreground mr-2">
                {note.icon}
              </div>
            )}
            
            {editingNoteId === note.id ? (
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
                {note.name || 'New Note'}
              </span>
            )}

            {note.files && note.files.length > 0 && activeNoteId === note.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFiles(true);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-accent-foreground transition-opacity"
                title={`${note.files.length} file${note.files.length === 1 ? '' : 's'}`}
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {activeNoteId === note.id && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {note.files && (
              <FileViewer
                isOpen={showFiles}
                onClose={() => setShowFiles(false)}
                files={note.files}
                threadName={note.name}
              />
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onStartRename(note)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowIconPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <SmilePlus className="h-4 w-4" />
          <span>Icon</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowColorPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Palette className="h-4 w-4" />
          <span>Background Color</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowTextColorPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Type className="h-4 w-4" />
          <span>Text Color</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDeleteNote(note.id)}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>

      {showColorPicker && (
        <ColorPickerModal
          title="Note Background Color"
          currentColor={note.color}
          onColorSelect={(color) => {
            onColorChange(note.id, color);
            setShowColorPicker(false);
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showTextColorPicker && (
        <ColorPickerModal
          title="Note Text Color"
          currentColor={note.textColor}
          onColorSelect={(color) => {
            onTextColorChange(note.id, color);
            setShowTextColorPicker(false);
          }}
          onClose={() => setShowTextColorPicker(false)}
        />
      )}

      {showIconPicker && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setShowIconPicker(false)}
        >
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     bg-background border border-border rounded-sm shadow-lg p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Note Icon</span>
                <button 
                  onClick={() => setShowIconPicker(false)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <IconPicker
                currentIcon={note.icon}
                onIconSelect={(icon) => {
                  onIconChange(note.id, icon);
                  setShowIconPicker(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ContextMenu>
  );
};

const SortableNoteItem = ({
  note,
  activeNoteId,
  editingNoteId,
  editingName,
  onStartRename,
  onFinishRename,
  onEditingNameChange,
  onNoteSelect,
  onDeleteNote,
  onColorChange,
  onIconChange,
  onTextColorChange,
  dropTarget,
  isDragging,
  notes
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ 
    id: note.id,
    disabled: editingNoteId === note.id
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    zIndex: isThisItemDragging ? 999 : undefined,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          ref={setNodeRef}
          style={dragStyle}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={cn(
            "relative",
            isThisItemDragging && "z-50"
          )}
        >
          <div
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer relative",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              isThisItemDragging && "opacity-50"
            )}
            style={{
              backgroundColor: note.color ? `${note.color}4D` : undefined,
              color: note.textColor || undefined,
            } as React.CSSProperties}
            onClick={() => onNoteSelect(note.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartRename(note);
            }}
          >
            {activeNoteId === note.id && (
              <div 
                className="absolute inset-0 rounded-md pointer-events-none border border-1"
                style={note.color ? {
                  borderColor: note.color
                } : {
                  borderColor: 'rgb(209 213 219)'
                }}
              />
            )}

            <div className="relative z-10 flex items-center gap-2 w-full">
              {note.icon ? (
                <div 
                  {...attributes}
                  {...listeners}
                  className="touch-none cursor-grab transition-opacity"
                >
                  <div className="h-4 w-4 shrink-0 text-muted-foreground mr-2">{note.icon}</div>
                </div>
              ) : (
                <div 
                  {...attributes}
                  {...listeners}
                  className="touch-none cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
                </div>
              )}
              
              {editingNoteId === note.id ? (
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
                  {note.name || 'New Note'}
                </span>
              )}

              {note.files && note.files.length > 0 && activeNoteId === note.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFiles(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-accent-foreground transition-opacity"
                  title={`${note.files.length} file${note.files.length === 1 ? '' : 's'}`}
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {activeNoteId === note.id && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {note.files && (
                <FileViewer
                  isOpen={showFiles}
                  onClose={() => setShowFiles(false)}
                  files={note.files}
                  threadName={note.name}
                />
              )}
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onStartRename(note)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowIconPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <SmilePlus className="h-4 w-4" />
          <span>Icon</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowColorPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Palette className="h-4 w-4" />
          <span>Background Color</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => setShowTextColorPicker(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Type className="h-4 w-4" />
          <span>Text Color</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDeleteNote(note.id)}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>

      {showColorPicker && (
        <ColorPickerModal
          title="Note Background Color"
          currentColor={note.color}
          onColorSelect={(color) => {
            onColorChange(note.id, color);
            setShowColorPicker(false);
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showTextColorPicker && (
        <ColorPickerModal
          title="Note Text Color"
          currentColor={note.textColor}
          onColorSelect={(color) => {
            onTextColorChange(note.id, color);
            setShowTextColorPicker(false);
          }}
          onClose={() => setShowTextColorPicker(false)}
        />
      )}

      {showIconPicker && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setShowIconPicker(false)}
        >
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     bg-background border border-border rounded-sm shadow-lg p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Note Icon</span>
                <button 
                  onClick={() => setShowIconPicker(false)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <IconPicker
                currentIcon={note.icon}
                onIconSelect={(icon) => {
                  onIconChange(note.id, icon);
                  setShowIconPicker(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ContextMenu>
  );
};

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  activeNoteId,
  onNoteSelect,
  onDeleteNote,
  onRenameNote,
  onColorChange,
  onIconChange,
  onTextColorChange,
  onReorderNotes,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleStartRename = (note: NoteThread) => {
    setEditingNoteId(note.id);
    setEditingName(note.name);
  };

  const handleFinishRename = () => {
    if (editingNoteId && editingName.trim()) {
      onRenameNote(editingNoteId, editingName.trim());
    }
    setEditingNoteId(null);
    setEditingName('');
  };

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

    const activeRect = (active.rect.current as any).translated;
    const overRect = over.rect;
    const threshold = overRect.top + (overRect.height / 2);
    const position = activeRect.top < threshold ? 'before' : 'after';

    setDropTarget({ id: over.id as string, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex((n) => n.id === active.id);
      const newIndex = notes.findIndex((n) => n.id === over.id);
      const newNotes = arrayMove(notes, oldIndex, newIndex);
      onReorderNotes(newNotes);
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

  const activeNote = activeId ? notes.find(n => n.id === activeId) : null;

  return (
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
          items={notes.map(n => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <SortableNoteItem
                key={note.id}
                note={note}
                notes={notes}
                activeNoteId={activeNoteId}
                editingNoteId={editingNoteId}
                editingName={editingName}
                onStartRename={handleStartRename}
                onFinishRename={handleFinishRename}
                onEditingNameChange={setEditingName}
                onNoteSelect={onNoteSelect}
                onDeleteNote={onDeleteNote}
                onColorChange={onColorChange}
                onIconChange={onIconChange}
                onTextColorChange={onTextColorChange}
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
          {activeNote ? (
            <NoteItem
              note={activeNote}
              activeNoteId={activeNoteId}
              editingNoteId={editingNoteId}
              editingName={editingName}
              onStartRename={handleStartRename}
              onFinishRename={handleFinishRename}
              onEditingNameChange={setEditingName}
              onNoteSelect={onNoteSelect}
              onDeleteNote={onDeleteNote}
              onColorChange={onColorChange}
              onIconChange={onIconChange}
              onTextColorChange={onTextColorChange}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}; 