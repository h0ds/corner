import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import { FileAttachment, Thread } from '@/types';
import { FileText } from 'lucide-react';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';

interface FileLinkMenuProps {
  query: string;
  files: FileAttachment[];
  notes?: Thread[];
  onSelect: (name: string, type: 'file' | 'note') => void;
  onClose: () => void;
  open: boolean;
}

export const FileLinkMenu: React.FC<FileLinkMenuProps> = ({
  query: initialQuery,
  files,
  notes = [],
  onSelect,
  onClose,
  open
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = [
    ...files
      .filter(file => file.name.toLowerCase().includes(query.toLowerCase()))
      .map(file => ({ ...file, type: 'file' as const })),
    ...notes
      .filter(note => note.name.toLowerCase().includes(query.toLowerCase()))
      .map(note => ({ ...note, type: 'note' as const }))
  ];

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open, initialQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        onSelect(filteredItems[selectedIndex].name, filteredItems[selectedIndex].type);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
        } else {
          setSelectedIndex(i => (i + 1) % filteredItems.length);
        }
        break;
    }
  };
 
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0">
        <div className="p-2 border-b border-border">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files and notes..."
            className="h-8"
          />
        </div>
        <Command className="border-none bg-transparent">
          <Command.List 
            ref={listRef}
            className="max-h-[300px] overflow-y-auto p-1 scroll-smooth"
          >
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No items found
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <Command.Item
                  key={`${item.type}-${item.name}`}
                  ref={index === selectedIndex ? selectedItemRef : undefined}
                  onSelect={() => onSelect(item.name, item.type)}
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default
                           ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
                           hover:bg-accent hover:text-accent-foreground`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.type === 'file' ? 'File' : 'Note'}
                  </span>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}; 