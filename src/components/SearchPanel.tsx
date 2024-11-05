import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { X, FileText, MessageSquare } from 'lucide-react';
import { Thread, Message, NoteThread } from '@/types';
import { cn } from '@/lib/utils';

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
        if (thread.content.toLowerCase().includes(searchTerm)) {
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
          if (message.content.toLowerCase().includes(searchTerm)) {
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
  }, [query, threads]);

  const handleResultClick = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      // First dispatch event to switch to correct tab
      window.dispatchEvent(new CustomEvent('switch-tab', {
        detail: { tab: thread.isNote ? 'notes' : 'threads' }
      }));
      
      // Then select the thread
      onThreadSelect(threadId);
    }
    onClose();
  };

  return (
    <div className="w-80 h-full border-l border-border bg-background flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium">Search</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="p-4 border-b border-border">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes and messages..."
          className="h-8"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {results.length === 0 && query && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            No results found
          </div>
        )}

        {results.map((result, index) => (
          <button
            key={`${result.threadId}-${result.messageIndex || index}`}
            onClick={() => handleResultClick(result.threadId)}
            className={cn(
              "w-full text-left p-3 rounded-sm hover:bg-accent",
              "transition-colors mb-2"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {result.type === 'note' ? (
                <FileText className="h-4 w-4 text-muted-foreground" />
              ) : (
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{result.threadName}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {result.content}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}; 