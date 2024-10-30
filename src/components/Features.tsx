import React from 'react';
import { Keyboard, PanelLeft, PanelLeftClose, Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeaturesProps {
  sidebarVisible: boolean;
  onSidebarToggle: () => void;
  onOpenShortcuts: () => void;
}

export const Features: React.FC<FeaturesProps> = ({
  sidebarVisible,
  onSidebarToggle,
  onOpenShortcuts,
}) => {
  return (
    <div className="absolute left-2 top-2 z-50 flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSidebarToggle}
              className="p-2 bg-background hover:bg-accent 
                        rounded-sm transition-colors border border-border shadow-sm"
            >
              {sidebarVisible ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Toggle Sidebar
            <span className="ml-2 text-muted-foreground">⌘S</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Only show keyboard shortcuts button when sidebar is visible */}
      {sidebarVisible && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenShortcuts}
                className="p-2 bg-background hover:bg-accent 
                          rounded-sm transition-colors border border-border shadow-sm"
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Settings
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}; 