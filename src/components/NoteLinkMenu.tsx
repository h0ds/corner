import React, { useState, useEffect } from 'react';
import { NoteThread } from '@/types';
import { Command } from 'cmdk';
import { StickyNote, Search, Plus, Link as LinkIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface NoteLinkMenuProps {
  query: string;
  notes: NoteThread[];
  onSelect: (noteName: string) => void;
  onClose: () => void;
  currentNoteId: string;
  onLinkNotes?: (targetNoteId: string) => void;
  mode?: 'link' | 'insert';
}

export const NoteLinkMenu: React.FC<NoteLinkMenuProps> = ({
  query,
  notes,
  onSelect,
  onClose,
  currentNoteId,
  onLinkNotes,
  mode = 'insert'
}) => {
  const [searchValue, setSearchValue] = useState(query);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  const filteredNotes = notes
    .filter(note => 
      note.id !== currentNoteId &&
      note.name.toLowerCase().includes(searchValue.toLowerCase())
    )
    .slice(0, 10);

  const handleSelect = (note: NoteThread) => {
    if (mode === 'link' && onLinkNotes) {
      onLinkNotes(note.id);
    } else {
      onSelect(note.name);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="w-[300px] rounded-md border border-border bg-popover shadow-md overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 px-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={mode === 'link' ? "Link to note..." : "Search notes..."}
            className="h-8 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
      </div>
      
      <Command className="border-none bg-transparent p-0">
        <Command.List className="max-h-[300px] overflow-y-auto p-1">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Command.Item
                key={note.id}
                onSelect={() => handleSelect(note)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                         hover:bg-accent hover:text-accent-foreground"
              >
                {mode === 'link' ? (
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium flex-1">{note.name}</span>
                <span className="text-xs text-muted-foreground">
                  {mode === 'link' ? 'Link' : 'Insert'}
                </span>
              </Command.Item>
            ))
          ) : (
            searchValue ? (
              <Command.Item
                onSelect={() => onSelect(searchValue)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                         hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium flex-1">Create "{searchValue}"</span>
              </Command.Item>
            ) : (
              <div className="p-4 text-sm text-center text-muted-foreground">
                Type to search or create a note
              </div>
            )
          )}
        </Command.List>
      </Command>
    </div>
  );
};