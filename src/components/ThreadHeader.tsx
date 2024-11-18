import React, { useState } from 'react';
import { Thread } from '@/types';

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
      className={
        "absolute top-0 left-0 right-0 flex items-center justify-between m-3 mt-2 rounded-xl font-geist tracking-tighter leading-tighter bg-accent border border-border z-10 h-[40px]" 
      }
    >
      {/* Empty div for left side */}
      <div className="w-8" />
      
      {/* Centered name */}
      <div>
        {isEditing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className={
              "h-8 text-center bg-transparent border-none outline-none"
            }
            autoFocus
          />
        ) : (
          <h1 
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