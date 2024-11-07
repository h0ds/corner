import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_MODELS } from './ModelSelector';
import { ModelIcon } from './ModelIcon';
import { Command } from 'cmdk';

interface ModelMentionProps {
  query: string;
  onSelect: (model: string) => void;
  onClose: () => void;
}

export const ModelMention: React.FC<ModelMentionProps> = ({
  query,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  const filteredModels = AVAILABLE_MODELS.filter(model =>
    model.name.toLowerCase().includes(query.toLowerCase()) ||
    model.provider.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      const list = listRef.current;
      const item = selectedItemRef.current;
      
      // When moving up to the last item (wrapping around)
      if (selectedIndex === filteredModels.length - 1) {
        list.scrollTop = list.scrollHeight;
        return;
      }

      // Normal scrolling behavior
      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      const itemTop = itemRect.top - listRect.top;
      const itemBottom = itemRect.bottom - listRect.top;
      
      if (itemBottom > listRect.height) {
        // Scrolling down
        list.scrollTop += itemBottom - listRect.height;
      } else if (itemTop < 0) {
        // Scrolling up
        list.scrollTop += itemTop;
      }
    }
  }, [selectedIndex, filteredModels.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredModels.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredModels.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + filteredModels.length) % filteredModels.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(filteredModels[selectedIndex].id);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredModels, selectedIndex, onSelect, onClose]);

  if (filteredModels.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 bg-popover border border-border 
                   rounded-md shadow-none overflow-hidden z-50 min-w-[200px]">
      <Command className="border-none bg-transparent p-0">
        <Command.List 
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-1 scroll-smooth"
        >
          {filteredModels.map((model, index) => (
            <Command.Item
              key={model.id}
              ref={index === selectedIndex ? selectedItemRef : undefined}
              onSelect={() => onSelect(model.id)}
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-default
                       ${index === selectedIndex ? 'bg-accent text-accent-foreground' : ''}
                       hover:bg-accent hover:text-accent-foreground`}
            >
              <ModelIcon modelId={model.id} className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {model.provider}
                </span>
              </div>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}; 