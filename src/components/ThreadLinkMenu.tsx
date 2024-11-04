import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import { Thread } from '@/types';
import { MessageSquare, StickyNote } from 'lucide-react';
import { Input } from './ui/input';

interface ThreadLinkMenuProps {
  query: string;
  threads: Thread[];
  onSelect: (threadName: string) => void;
  onClose: () => void;
  currentThreadId: string;
}

export const ThreadLinkMenu: React.FC<ThreadLinkMenuProps> = ({
  query: initialQuery,
  threads,
  onSelect,
  onClose,
  currentThreadId,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredThreads = threads
    .filter(thread => 
      thread.id !== currentThreadId && 
      thread.name.toLowerCase().includes(query.toLowerCase())
    );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      const list = listRef.current;
      const item = selectedItemRef.current;
      
      if (selectedIndex === filteredThreads.length - 1) {
        list.scrollTop = list.scrollHeight;
        return;
      }

      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      const itemTop = itemRect.top - listRect.top;
      const itemBottom = itemRect.bottom - listRect.top;
      
      if (itemBottom > listRect.height) {
        list.scrollTop += itemBottom - listRect.height;
      } else if (itemTop < 0) {
        list.scrollTop += itemTop;
      }
    }
  }, [selectedIndex, filteredThreads.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredThreads.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredThreads.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredThreads.length) % filteredThreads.length);
        break;
      case 'Enter':
        e.preventDefault();
        onSelect(filteredThreads[selectedIndex].name);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(i => (i - 1 + filteredThreads.length) % filteredThreads.length);
        } else {
          setSelectedIndex(i => (i + 1) % filteredThreads.length);
        }
        break;
    }
  };

  return (
    <div className="absolute bottom-full mb-2 bg-popover border border-border 
                    rounded-sm shadow-md overflow-hidden z-50 min-w-[300px]">
      <div className="p-2 border-b border-border">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search notes and threads..."
          className="h-8"
        />
      </div>
      <Command className="border-none bg-transparent p-0">
        <Command.List 
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-1 scroll-smooth"
        >
          {filteredThreads.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notes or threads found
            </div>
          ) : (
            filteredThreads.map((thread, index) => (
              <Command.Item
                key={thread.id}
                ref={index === selectedIndex ? selectedItemRef : undefined}
                onSelect={() => onSelect(thread.name)}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default
                         ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
                         hover:bg-accent hover:text-accent-foreground`}
              >
                {thread.isNote ? (
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{thread.name}</span>
              </Command.Item>
            ))
          )}
        </Command.List>
      </Command>
    </div>
  );
}; 