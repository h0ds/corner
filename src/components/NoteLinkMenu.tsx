import React, { useState } from 'react';
import { NoteThread } from '@/types';
import { Command } from 'cmdk';
import { StickyNote, Search, Plus, Link as LinkIcon, FileText, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NoteLinkMenuProps {
  query: string;
  notes: NoteThread[];
  onLinkNote: (targetNoteId: string) => void;
  onClose: () => void;
  currentNoteId: string;
}

export const NoteLinkMenu: React.FC<NoteLinkMenuProps> = ({
  query,
  notes,
  onLinkNote,
  onClose,
  currentNoteId,
}) => {
  const [searchValue, setSearchValue] = useState(query);

  const filteredNotes = notes
    .filter(note => 
      note.id !== currentNoteId &&
      note.name.toLowerCase().includes(searchValue.toLowerCase())
    )
    .slice(0, 10);

  return (
    <div className="w-[300px] rounded-md border border-border bg-popover shadow-md overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <h3 className="text-sm font-medium">Link to Note</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-2 border-b border-border">
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search notes..."
          className="h-8"
          autoFocus
        />
      </div>
      <Command className="border-none bg-transparent p-0">
        <Command.List className="max-h-[300px] overflow-y-auto p-1">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Command.Item
                key={note.id}
                onSelect={() => {
                  onLinkNote(note.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                         hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium flex-1">{note.name}</span>
              </Command.Item>
            ))
          ) : (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No notes found
            </div>
          )}
        </Command.List>
      </Command>
    </div>
  );
};