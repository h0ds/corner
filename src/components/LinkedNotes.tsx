import React from 'react';
import { NoteThread } from '@/types';
import { FileText, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LinkedNotesProps {
  currentNote: NoteThread;
  allNotes: NoteThread[];
  onNavigateToNote: (noteId: string) => void;
  onUnlinkNote?: (targetNoteId: string) => void;
}

export const LinkedNotes: React.FC<LinkedNotesProps> = ({
  currentNote,
  allNotes,
  onNavigateToNote,
  onUnlinkNote,
}) => {
  // Ensure linkedNotes exists with a fallback to empty array
  const linkedNotes = (currentNote.linkedNotes || [])
    .map(id => allNotes.find(note => note.id === id))
    .filter((note): note is NoteThread => note !== undefined);

  return (
    <div className="w-[250px] border border-border flex flex-col m-2 rounded-md">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium">Linked Notes</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {linkedNotes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-4">
            No linked notes
          </div>
        ) : (
          <div className="space-y-1">
            {linkedNotes.map(note => (
              <div
                key={note.id}
                className="group flex items-center gap-1"
              >
                <button
                  onClick={() => onNavigateToNote(note.id)}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "text-left"
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{note.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>

                {onUnlinkNote && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onUnlinkNote(note.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          <span className="sr-only">Remove link to {note.name}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        Remove link
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {linkedNotes.length} {linkedNotes.length === 1 ? 'link' : 'links'}
        </p>
      </div>
    </div>
  );
}; 