import React, { useState, useEffect } from 'react';
import { FileText, Upload, Eye, Trash2, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useDropzone } from 'react-dropzone';
import { FileAttachment } from '@/types';
import { FilePreview } from './FilePreview';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import { FileUploader } from './FileUploader';

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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {previewFile ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Back
                    </button>
                    <span className="text-sm font-medium">{previewFile.name}</span>
                  </div>
                ) : (
                  <span className="font-mono text-md tracking-tighter">Browse Files</span>
                )}
              </DialogTitle>
              <Button
                onClick={() => setShowUploader(true)}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {previewFile ? (
            <FilePreview
              fileName={previewFile.name}
              content={previewFile.content}
              showToggle={false}
              defaultExpanded={true}
            />
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-sm font-medium mb-1">No files yet</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Files you upload will appear here for easy access
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md bg-muted group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[300px]">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      title="Preview file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file);
                      }}
                      disabled={deletingFile === file.cacheId}
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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