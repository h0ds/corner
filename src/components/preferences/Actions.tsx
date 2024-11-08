import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
}

interface ActionsProps {
  actions: Action[];
  onActionChange?: (actions: Action[]) => void;
}

export const Actions: React.FC<ActionsProps> = ({
  actions,
  onActionChange
}) => {
  // Create array of 9 placeholder slots
  const slots = Array(9).fill(null).map((_, i) => {
    return actions[i] || {
      id: `empty-${i}`,
      label: 'Empty Slot',
      icon: <Plus className="h-4 w-4 text-muted-foreground" />,
      onClick: () => {}
    };
  });

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Quick shortcuts to enable you to perform common actions.
      </p>
      
      <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-4">
        {slots.map((slot) => (
          <div 
            key={slot.id}
            className={cn(
              "flex flex-col items-center justify-center p-4",
              "border border-border rounded-lg",
              "hover:bg-accent hover:text-accent-foreground", 
              "transition-colors cursor-pointer",
              "aspect-square",
              !actions.find(a => a.id === slot.id) && "opacity-50"
            )}
            onClick={slot.onClick}
          >
            <div className="h-8 w-8 flex items-center justify-center">
              {slot.icon}
            </div>
            <span className="text-sm mt-2">{slot.label}</span>
            {slot.shortcut && (
              <span className="text-xs text-muted-foreground mt-1">
                {slot.shortcut}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 