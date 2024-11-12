import React from 'react';
import { Command } from 'cmdk';
import { Thread } from '@/types';
import { FileText, MessageSquare, Search } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ReferenceMenuProps {
  query: string;
  threads: Thread[] | undefined;
  currentThreadId: string;
  onSelect: (thread: Thread) => void;
  onClose: () => void;
  open: boolean;
  onQueryChange: (query: string) => void;
}

export const ReferenceMenu: React.FC<ReferenceMenuProps> = ({
  query,
  threads = [],
  currentThreadId,
  onSelect,
  onClose,
  open,
  onQueryChange
}) => {
  const cleanQuery = query.startsWith(':') ? query.slice(1) : query;

  const filteredThreads = (threads || [])
    .filter(thread => 
      thread.id !== currentThreadId &&
      thread.name.toLowerCase().includes(cleanQuery.toLowerCase())
    )
    .slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[500px] gap-0 p-0">
        <Command className="rounded-md border shadow-md">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search threads and notes..."
              value={cleanQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <Command.Item
                  key={thread.id}
                  onSelect={() => {
                    onSelect(thread);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                           hover:bg-accent hover:text-accent-foreground"
                >
                  {thread.isNote ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium flex-1">{thread.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {thread.isNote ? 'Note' : 'Thread'}
                  </span>
                </Command.Item>
              ))
            ) : (
              <div className="p-4 text-sm text-center text-muted-foreground">
                No matches found
              </div>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}; 