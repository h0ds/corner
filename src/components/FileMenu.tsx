import React, { useState, useEffect } from 'react';
import { FileText, Upload, Eye, Trash2, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { FileAttachment } from '@/types';
import { FilePreview } from './FilePreview';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './FileUploader';
import { cn } from '@/lib/utils';

interface FileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileAttachment[];
  onFileDelete?: (fileId: string) => void;
  onFileSelect: (file: File) => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({
  isOpen,
  onClose,
  files,
  onFileDelete,
  onFileSelect,
}) => {
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
      setPreviewFile(null);
    }
  }, [isOpen]);

  const isPreviewable = (content: string) => {
    return content.startsWith('data:image/') || 
           content.startsWith('data:application/pdf') ||
           !content.startsWith('data:'); // Text content
  };

  const getFilePreview = (file: FileAttachment) => {
    if (file.content.startsWith('data:image/')) {
      return (
        <div className="w-full h-[120px] bg-background rounded-lg overflow-hidden">
          <img 
            src={file.content} 
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    if (file.content.startsWith('data:application/pdf')) {
      return (
        <div className="w-full h-[120px] bg-background rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center">
            <FileText className="h-8 w-8 text-primary mb-2" />
            <span className="text-xs text-muted-foreground">PDF Document</span>
          </div>
        </div>
      );
    }

    // Text preview
    return (
      <div className="w-full h-[120px] bg-background rounded-lg p-3 overflow-hidden">
        <p className="text-xs text-muted-foreground line-clamp-6">
          {file.content.slice(0, 300)}
        </p>
      </div>
    );
  };
  
  const handleDeleteFile = async (file: FileAttachment) => {
    if (!file.cacheId) return;
    
    try {
      setDeletingFile(file.cacheId);
      await invoke('delete_cached_file', { fileId: file.cacheId });
      onFileDelete?.(file.cacheId);
      toast({
        description: "File deleted successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast({
        variant: "destructive",
        description: "Failed to delete file",
        duration: 2000,
      });
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] p-6" hideCloseButton>
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex w-full">
                {previewFile ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <span>←</span>
                      <span>Back</span>
                    </button>
                    <span className="text-sm font-semibold">{previewFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-row w-full justify-between">
                    <span className="font-geist text-lg tracking-tight">Files</span>
                    <div className="ml-auto">
                      <Button
                        onClick={() => setShowUploader(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                      </Button>
                    </div>
                  </div>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {previewFile ? (
              <FilePreview
                fileName={previewFile.name}
                content={previewFile.content}
                showToggle={false}
                defaultExpanded={true}
              />
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/40 rounded-xl">
                <FolderOpen className="h-12 w-12 text-muted-foreground/60 mb-4" />
                <h3 className="text-base font-medium mb-2">No files yet</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
                  Files you upload will appear here for easy access
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col rounded-xl overflow-hidden",
                      "bg-muted/50 hover:bg-muted/80 transition-colors group",
                      "border border-transparent hover:border-border"
                    )}
                  >
                    {isPreviewable(file.content) && getFilePreview(file)}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 bg-background rounded-md">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium truncate">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {isPreviewable(file.content) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFile(file);
                              }}
                              title="Preview file"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                              "hover:bg-destructive/10 hover:text-destructive"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file);
                            }}
                            disabled={deletingFile === file.cacheId}
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FileUploader
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        onFileSelect={onFileSelect}
      />
    </>
  );
}; 