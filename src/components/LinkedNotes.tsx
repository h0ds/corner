import React from 'react';
import { NoteThread } from '@/types';
import { FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedNotesProps {
  currentNote: NoteThread;
  allNotes: NoteThread[];
  onNavigateToNote: (noteId: string) => void;
}

export const LinkedNotes: React.FC<LinkedNotesProps> = ({
  currentNote,
  allNotes,
  onNavigateToNote,
}) => {
  // Ensure linkedNotes exists with a fallback to empty array
  const linkedNotes = (currentNote.linkedNotes || [])
    .map(id => allNotes.find(note => note.id === id))
    .filter((note): note is NoteThread => note !== undefined);

  console.log('LinkedNotes component:', {
    currentNoteId: currentNote.id,
    linkedNoteIds: currentNote.linkedNotes,
    resolvedNotes: linkedNotes
  });

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
              <button
                key={note.id}
                onClick={() => onNavigateToNote(note.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  "text-left group"
                )}
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{note.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
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