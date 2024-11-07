import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { Trash2, Power, Split, MessageCircle, Square } from 'lucide-react';

interface CommandMenuProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const AVAILABLE_COMMANDS: CommandItem[] = [
  {
    id: 'clear',
    name: 'Clear Thread',
    description: 'Clear all messages in the current thread',
    icon: <Trash2 className="h-4 w-4" />
  },
  {
    id: 'quit',
    name: 'Quit App',
    description: 'Close the application',
    icon: <Power className="h-4 w-4" />
  },
  {
    id: 'compare',
    name: 'Compare Models',
    description: 'Send message to both mentioned and selected model',
    icon: <Split className="h-4 w-4" />
  },
  {
    id: 'discuss',
    name: 'Model Discussion',
    description: 'Start a back-and-forth discussion between models',
    icon: <MessageCircle className="h-4 w-4" />
  },
  {
    id: 'stop',
    name: 'Stop Discussion',
    description: 'Stop any ongoing model discussion',
    icon: <Square className="h-4 w-4" />
  }
];

export const CommandMenu: React.FC<CommandMenuProps> = ({
  query,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const filteredCommands = AVAILABLE_COMMANDS.filter(command =>
    command.name.toLowerCase().includes(query.toLowerCase()) ||
    command.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      const list = listRef.current;
      const item = selectedItemRef.current;
      
      if (selectedIndex === filteredCommands.length - 1) {
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
  }, [selectedIndex, filteredCommands.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(filteredCommands[selectedIndex].id);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 bg-popover border border-border 
                    rounded-md shadow-none overflow-hidden z-50 min-w-[200px]">
      <Command className="border-none bg-transparent p-0">
        <Command.List 
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-1 scroll-smooth"
        >
          {filteredCommands.map((command, index) => (
            <Command.Item
              key={command.id}
              ref={index === selectedIndex ? selectedItemRef : undefined}
              onSelect={() => onSelect(command.id)}
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                       ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
                       hover:bg-accent hover:text-accent-foreground`}
            >
              <div className="text-muted-foreground">
                {command.icon}
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-medium">{command.name}</span>
                <span className="text-xs text-muted-foreground">
                  {command.description}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                !{command.id}
              </div>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}; 