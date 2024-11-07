import React, { useState } from 'react';
import { Input } from './ui/input';
import { Thread } from '@/types';
import { cn } from '@/lib/utils';

interface ThreadHeaderProps {
  thread: Thread;
  onRename: (newName: string) => void;
  onIconChange: (newIcon: string) => void;
}

export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  thread,
  onRename,
  onIconChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(thread.name);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(thread.name);
  };

  const handleFinishEdit = () => {
    if (editValue.trim()) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div 
      className={cn(
        "absolute top-0 left-0 right-0 flex items-center justify-between p-3",
        "border-b border-border z-10"
      )}
    >
      {/* Empty div for left side */}
      <div className="w-8" />
      
      {/* Centered name */}
      <div>
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className={cn(
              "h-8 text-sm text-center font-medium",
              "w-[200px]"
            )}
            autoFocus
          />
        ) : (
          <h1 
            className={cn(
              "text-sm cursor-pointer hover:text-foreground/80",
              "font-mono tracking-tighter leading-tighter",
              "transition-colors"
            )}
            onDoubleClick={handleDoubleClick}
            title="Double click to edit name"
          >
            {thread.name || 'New Thread'}
          </h1>
        )}
      </div>

      {/* Empty div for right side */}
      <div className="w-8" />
    </div>
  );
};