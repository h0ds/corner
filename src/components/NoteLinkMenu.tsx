import React from 'react';
import { NoteThread } from '@/types';
import { Command } from 'cmdk';
import { StickyNote } from 'lucide-react';

interface NoteLinkMenuProps {
  query: string;
  notes: NoteThread[];
  onSelect: (noteName: string) => void;
  onClose: () => void;
  currentNoteId: string;
}

export const NoteLinkMenu: React.FC<NoteLinkMenuProps> = ({
  query,
  notes,
  onSelect,
  onClose,
  currentNoteId,
}) => {
  const filteredNotes = notes
    .filter(note => 
      note.id !== currentNoteId && // Exclude current note
      note.name.toLowerCase().includes(query.toLowerCase())
    );

  if (filteredNotes.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 bg-popover border border-border 
                   rounded-sm shadow-md overflow-hidden z-50 min-w-[200px]">
      <Command className="border-none bg-transparent p-0">
        <Command.List className="max-h-[300px] overflow-y-auto p-1">
          {filteredNotes.map((note) => (
            <Command.Item
              key={note.id}
              onSelect={() => onSelect(note.name)}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default
                       hover:bg-accent hover:text-accent-foreground"
            >
              <StickyNote className="h-4 w-4" />
              <span className="font-medium">{note.name}</span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}; 