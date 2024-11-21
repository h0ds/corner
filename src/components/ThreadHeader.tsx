import React, { useState } from 'react';
import { Thread } from '@/types';
import { ModelIcon } from './ModelIcon';
import { AVAILABLE_MODELS } from './ModelSelector';
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
  onOpenModelSelect?: () => void;
  selectedModel?: string;
}

export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  thread,
  onRename,
  onIconChange,
  onOpenModelSelect,
  selectedModel
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
        "absolute top-0 left-0 right-0 flex items-center justify-between m-3 text-lg font-geist tracking-tighter leading-tighter z-10" 
      }
    >
      <div className="flex-1 flex items-center gap-2">
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
              "bg-transparent border-none outline-none flex-1"
            }
            autoFocus
          />
        ) : (
          <>
            <h1 
              onDoubleClick={handleDoubleClick}
              title="Double click to edit name"
              className="flex-1"
            >
              {thread.name || 'New Thread'}
            </h1>

            {!thread.isNote && selectedModel && onOpenModelSelect && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onOpenModelSelect} 
                      className="-mt-1 p-1.5 bg-accent-light border border-border text-muted-foreground hover:text-foreground 
                              hover:bg-accent rounded-md transition-colors cursor-pointer"
                    >
                      <ModelIcon modelId={selectedModel} className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {(() => {
                      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
                      return model ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-muted-foreground capitalize">
                            {model.provider}
                          </span>
                        </div>
                      ) : selectedModel;
                    })()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>
    </div>
  );
};