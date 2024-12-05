import React, { useState } from 'react';
import { FileText, Network, Search, Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileMenu } from './FileMenu';
import { FileAttachment, Thread } from '@/types';
import { KnowledgeGraph } from './KnowledgeGraph';

interface FooterProps {
  files: FileAttachment[];
  threads: Thread[];
  onFileSelect: (file: File) => void;
  onFileDelete?: (fileId: string) => void;
  onShowSearch: () => void;
  onShowPreferences: () => void;
  onShowPreferencesTab?: (tab: string) => void;
  onTabChange?: (tab: 'threads' | 'notes') => void;
  onSelectNode?: (threadId: string, isNote: boolean) => void;
}

export const Footer: React.FC<FooterProps> = ({
  files,
  threads,
  onFileSelect,
  onFileDelete,
  onShowSearch,
  onShowPreferences,
  onShowPreferencesTab,
  onTabChange,
  onSelectNode,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  return (
    <>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center z-30">
        <div className="bg-accent-light rounded-xl flex items-center border border-border">
          <div className="flex items-center justify-center gap-1 p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowFileMenu(true)}
                    className="p-3 bg-background hover:bg-accent rounded-lg transition-colors border border-border"
                  >
                    <FileText className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Browse Files
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <KnowledgeGraph
              threads={threads}
              onSelectNode={onSelectNode}
              onTabChange={onTabChange}
              trigger={
                <button
                  className="p-3 bg-background hover:bg-accent rounded-lg transition-colors border border-border"
                >
                  <Network className="h-3 w-3" />
                </button>
              }
            />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowSearch}
                    className="p-3 bg-background hover:bg-accent rounded-lg transition-colors border border-border"
                  >
                    <Search className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Search
                  <span className="ml-2 text-muted-foreground">⌘F</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowPreferences}
                    className="p-3 bg-background hover:bg-accent rounded-lg transition-colors border border-border"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <FileMenu
        isOpen={showFileMenu}
        onClose={() => setShowFileMenu(false)}
        files={files}
        onFileDelete={onFileDelete}
        onFileSelect={onFileSelect}
      />
    </>
  );
};