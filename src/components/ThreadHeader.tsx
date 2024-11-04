import React, { useState } from 'react';
import { Input } from './ui/input';
import { Thread } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThreadHeaderProps {
  thread: Thread;
  onRename: (newName: string) => void;
  onIconChange: (newIcon: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  thread,
  onRename,
  onIconChange,
  isCollapsed = false,
  onToggleCollapse
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
    <>
      {/* Main header */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-between p-3",
          "bg-background/50 backdrop-blur-sm border-b border-border z-10",
          "transition-all duration-200",
          isCollapsed && "-translate-y-full"
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

        {/* Right side with icon and collapse button */}
        <div className="w-8 flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Show button when header is collapsed */}
      {isCollapsed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="absolute top-2 right-4 p-2 bg-background text-muted-foreground 
                         hover:text-foreground border border-border/50 hover:bg-accent 
                         rounded-sm transition-colors z-20"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Show thread header
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
};