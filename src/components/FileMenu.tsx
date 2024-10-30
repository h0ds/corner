import React, { useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { useDropzone } from 'react-dropzone';
import { FileAttachment } from '@/types';

interface FileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileAttachment[];
  onFileSelect: (file: File) => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({
  isOpen,
  onClose,
  files,
  onFileSelect
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    maxFiles: 1,
    accept: {
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'text/yaml': ['.yml', '.yaml'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
      'application/pdf': ['.pdf']
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-sm p-8 text-center cursor-pointer
            transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop a file here, or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports text, images, PDFs and more (max 10MB)
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Added Files</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-sm bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[300px]">
                      {file.name}
                    </span>
                  </div>
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      // Add file removal logic here
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button> */}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 