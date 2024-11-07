import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { FileText, MessageSquare, Command } from 'lucide-react';
import { Thread, Message, NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface SearchPanelProps {
  threads: Thread[];
  onClose: () => void;
  onThreadSelect: (threadId: string) => void;
}

interface SearchResult {
  threadId: string;
  threadName: string;
  type: 'note' | 'message';
  content: string;
  messageIndex?: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  threads,
  onClose,
  onThreadSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    threads.forEach(thread => {
      if (thread.isNote) {
        // Search in note content
        if (thread.content.toLowerCase().includes(searchTerm) || 
            thread.name.toLowerCase().includes(searchTerm)) {
          searchResults.push({
            threadId: thread.id,
            threadName: thread.name,
            type: 'note',
            content: thread.content,
          });
        }
      } else {
        // Search in chat messages
        thread.messages.forEach((message, index) => {
          if (message.content.toLowerCase().includes(searchTerm) ||
              thread.name.toLowerCase().includes(searchTerm)) {
            searchResults.push({
              threadId: thread.id,
              threadName: thread.name,
              type: 'message',
              content: message.content,
              messageIndex: index,
            });
          }
        });
      }
    });

    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, threads]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + results.length) % Math.max(results.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex].threadId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleResultClick = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      window.dispatchEvent(new CustomEvent('switch-tab', {
        detail: { tab: thread.isNote ? 'notes' : 'threads' }
      }));
      onThreadSelect(threadId);
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 bg-background backdrop-blur-xl shadow-2xl border border-border/50">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-2 px-2">
            <Command className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search notes and messages..."
              className="h-7 px-0 border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {results.length === 0 && query && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No results found
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.threadId}-${result.messageIndex || index}`}
              onClick={() => handleResultClick(result.threadId)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm",
                "transition-colors",
                selectedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2">
                {result.type === 'note' ? (
                  <FileText className="h-4 w-4 shrink-0" />
                ) : (
                  <MessageSquare className="h-4 w-4 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{result.threadName}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {result.content}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="p-2 border-t border-border/50 text-xs text-muted-foreground">
            <span className="px-2">
              Use <kbd className="px-1 rounded bg-muted">↑</kbd> <kbd className="px-1 rounded bg-muted">↓</kbd> to navigate
            </span>
            <span className="px-2">
              <kbd className="px-1 rounded bg-muted">Enter</kbd> to select
            </span>
            <span className="px-2">
              <kbd className="px-1 rounded bg-muted">Esc</kbd> to close
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 