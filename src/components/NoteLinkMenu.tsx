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
    )
    .slice(0, 5); // Limit to 5 results

  if (filteredNotes.length === 0 && !query) return null;

  return (
    <div className="absolute z-50 w-[300px] rounded-md border border-border bg-popover shadow-md">
      <Command className="border-none bg-transparent p-0">
        <Command.List className="max-h-[300px] overflow-y-auto p-1">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No matching notes found
            </div>
          ) : (
            filteredNotes.map((note) => (
              <Command.Item
                key={note.id}
                onSelect={() => onSelect(note.name)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                         hover:bg-accent hover:text-accent-foreground"
              >
                <StickyNote className="h-4 w-4" />
                <span className="font-medium">{note.name}</span>
              </Command.Item>
            ))
          )}
          {query && (
            <Command.Item
              onSelect={() => onSelect(query)}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                       hover:bg-accent hover:text-accent-foreground border-t border-border mt-1"
            >
              <StickyNote className="h-4 w-4" />
              <span className="font-medium">Create "{query}"</span>
            </Command.Item>
          )}
        </Command.List>
      </Command>
    </div>
  );
}; 