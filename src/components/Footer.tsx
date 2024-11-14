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

interface FooterProps {
  files: FileAttachment[];
  threads: Thread[];
  onFileSelect: (file: File) => void;
  onFileDelete?: (fileId: string) => void;
  onShowKnowledgeGraph: () => void;
  onShowSearch: () => void;
  onShowPreferences: () => void;
  onShowPreferencesTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  files,
  onFileSelect,
  onFileDelete,
  onShowKnowledgeGraph,
  onShowSearch,
  onShowPreferences,
  onShowPreferencesTab,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-50">
        <div className="bg-accent-light m-4 rounded-xl h-[50px] flex items-center">
          <div className="flex items-center justify-center gap-2 p-2 px-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowFileMenu(true)}
                    className="p-2 bg-background hover:bg-accent rounded-md transition-colors border border-border"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Browse Files
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowKnowledgeGraph}
                    className="p-2 bg-background hover:bg-accent rounded-md transition-colors border border-border"
                  >
                    <Network className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Knowledge Graph
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowSearch}
                    className="p-2 bg-background hover:bg-accent rounded-md transition-colors border border-border"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Search
                  <span className="ml-2 text-muted-foreground">⌘F</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
{/* 
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onShowPreferencesTab?.('actions')}
                    className="p-2 bg-background hover:bg-accent rounded-md transition-colors border border-border"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Quick Actions
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowPreferences}
                    className="p-2 bg-background hover:bg-accent rounded-md transition-colors border border-border"
                  >
                    <Settings className="h-4 w-4" />
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