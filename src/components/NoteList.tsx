import React, { useState } from 'react';
import { NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import { 
  GripVertical, 
  Pin, 
  Pencil, 
  Trash2, 
  X, 
  SmilePlus,
  Palette,
  Type,
  ChevronRight,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { THREAD_COLORS, THREAD_ICONS } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

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

interface ColorPickerModalProps {
  title: string;
  currentColor: string | undefined;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  title,
  currentColor,
  onColorSelect,
  onClose,
}) => {
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                 bg-background border border-border rounded-md shadow-lg p-6 min-w-[280px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="text-xs text-muted-foreground">
                Choose a color or click reset to remove
              </p>
            </div>
            <button 
              onClick={onClose}
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-background 
                       border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(THREAD_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => onColorSelect(color)}
                  className={cn(
                    "w-10 h-10 rounded-md relative group",
                    "hover:scale-110 transition-transform",
                    !color && "bg-background",
                    name === 'white' && "border border-border",
                    currentColor === color && "ring-2 ring-primary ring-offset-2",
                  )}
                  style={color ? { backgroundColor: color } : undefined}
                >
                  <span className="sr-only">{name} color</span>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 
                                 group-hover:opacity-100 transition-opacity bg-background/80 
                                 text-xs font-medium rounded-md">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => onColorSelect('')}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground 
                       transition-colors border border-border rounded-md hover:bg-accent"
            >
              Reset Color
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IconPicker: React.FC<{
  currentIcon: string | undefined;
  onIconSelect: (icon: string) => void;
}> = ({ currentIcon, onIconSelect }) => {
  return (
    <div className="grid grid-cols-8 gap-1 p-1">
      {THREAD_ICONS.map((icon) => (
        <button
          key={icon}
          onClick={() => onIconSelect(icon)}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            currentIcon === icon && "bg-accent text-accent-foreground"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

const SortableNoteItem: React.FC<{
  note: NoteThread;
  activeNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newName: string) => void;
  onColorChange: (noteId: string, color: string) => void;
  onIconChange: (noteId: string, icon: string) => void;
  onTextColorChange: (noteId: string, color: string) => void;
}> = ({
  note,
  activeNoteId,
  onNoteSelect,
  onDeleteNote,
  onRenameNote,
  onColorChange,
  onIconChange,
  onTextColorChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  const handleFinishEdit = () => {
    if (editValue.trim() && editValue !== note.name) {
      onRenameNote(note.id, editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          ref={setNodeRef}
          style={style}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={cn(
            "relative",
            isDragging && "z-50"
          )}
        >
          <div
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer relative bg-gray-50",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              isDragging && "opacity-50"
            )}
            style={{
              backgroundColor: note.color ? `${note.color}4D` : undefined,
              color: note.textColor || undefined,
            } as React.CSSProperties}
            onClick={() => onNoteSelect(note.id)}
          >
            {activeNoteId === note.id && (
              <div 
                className="absolute inset-0 rounded-md pointer-events-none !bg-gray-200"
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
                  {...listeners}
                  {...attributes}
                  className="touch-none cursor-grab transition-opacity"
                >
                  <div className="h-4 w-4 shrink-0 text-muted-foreground mr-2">{note.icon}</div>
                </div>
              ) : (
                <div 
                  {...listeners}
                  {...attributes}
                  className="touch-none cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
                </div>
              )}

              <div className="flex-1 truncate">
                {isEditing ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishEdit();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className="w-full bg-transparent border-none focus:outline-none text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm truncate">{note.name}</span>
                )}
              </div>

              {activeNoteId === note.id && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => setIsEditing(true)}
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

      {showIconPicker && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setShowIconPicker(false)}
        >
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     bg-background border border-border rounded-md shadow-lg p-4"
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
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {notes.map((note) => (
        <div key={note.id}>
          <SortableNoteItem
            note={note}
            activeNoteId={activeNoteId}
            onNoteSelect={onNoteSelect}
            onDeleteNote={onDeleteNote}
            onRenameNote={onRenameNote}
            onColorChange={onColorChange}
            onIconChange={onIconChange}
            onTextColorChange={onTextColorChange}
          />
        </div>
      ))}
    </div>
  );
}; 