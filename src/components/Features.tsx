import React, { useState } from 'react';
import { PanelLeft, PanelLeftClose, Settings, FileText, Network, Upload, Search } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileMenu } from './FileMenu';
import { FileUploader } from './FileUploader';
import { FileAttachment, Thread } from '@/types';

interface FeaturesProps {
  sidebarVisible: boolean;
  onSidebarToggle: () => void;
  onOpenShortcuts: () => void;
  files: FileAttachment[];
  threads: Thread[];
  onFileSelect: (file: File) => void;
  onFileDelete?: (fileId: string) => void;
  onShowKnowledgeGraph: () => void;
  onShowSearch: () => void;
}

export const Features: React.FC<FeaturesProps> = ({
  sidebarVisible,
  onSidebarToggle,
  onOpenShortcuts,
  files,
  onFileSelect,
  onFileDelete,
  onShowKnowledgeGraph,
  onShowSearch,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);

  return (
    <>
      <div className="absolute left-2 top-2 z-50 flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSidebarToggle}
                className="p-2 bg-background hover:bg-accent 
                          rounded-sm transition-colors border border-border"
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

        {/* Only show additional buttons when sidebar is visible */}
        {sidebarVisible && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowSearch}
                    className="p-2 bg-background hover:bg-accent rounded-sm transition-colors border border-border"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Search
                  <span className="ml-2 text-muted-foreground">⌘F</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>


            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowFileUploader(true)}
                    className="p-2 bg-background hover:bg-accent 
                              rounded-sm transition-colors border border-border"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Upload File
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowFileMenu(true)}
                    className="p-2 bg-background hover:bg-accent 
                              rounded-sm transition-colors border border-border"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Browse Files
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onShowKnowledgeGraph}
                    className="p-2 bg-background hover:bg-accent rounded-sm transition-colors border border-border"
                  >
                    <Network className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Knowledge Graph
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onOpenShortcuts}
                    className="p-2 bg-background hover:bg-accent 
                              rounded-sm transition-colors border border-border"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </>
        )}
      </div>

      <FileUploader
        isOpen={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onFileSelect={onFileSelect}
      />

      <FileMenu
        isOpen={showFileMenu}
        onClose={() => setShowFileMenu(false)}
        files={files}
        onFileDelete={onFileDelete}
      />
    </>
  );
};