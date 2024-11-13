import React from 'react';
import { Command } from 'cmdk';
import { NoteThread } from '@/types';
import { FileText, Search } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface NoteLinkMenuProps {
  currentNoteId: string;
  notes: NoteThread[];
  onSelect: (noteId: string) => void;
  onClose: () => void;
  open: boolean;
  linkedNoteIds?: string[];
}

export const NoteLinkMenu: React.FC<NoteLinkMenuProps> = ({
  currentNoteId,
  notes,
  onSelect,
  onClose,
  open,
  linkedNoteIds = []
}) => {
  const filteredNotes = notes.filter(note => {
    // Don't show current note
    if (note.id === currentNoteId) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[500px] gap-0 p-0">
        <Command className="rounded-md border shadow-md">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search notes..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <Command.Item
                  key={note.id}
                  onSelect={() => {
                    onSelect(note.id);
                    onClose();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default",
                    "hover:bg-accent hover:text-accent-foreground",
                    linkedNoteIds.includes(note.id) && "opacity-50"
                  )}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium flex-1">{note.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {linkedNoteIds.includes(note.id) ? 'Already Linked' : 'Note'}
                  </span>
                </Command.Item>
              ))
            ) : (
              <div className="p-4 text-sm text-center text-muted-foreground">
                No notes found
              </div>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};