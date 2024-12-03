import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileAttachment } from '@/types';
import { FileText, Image, FileType, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FilePreview } from './FilePreview';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileAttachment[];
  threadName: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  isOpen,
  onClose,
  files,
  threadName,
}) => {
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const sortedFiles = [...files].sort((a, b) => b.timestamp - a.timestamp);

  const isImage = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
  };

  const isPdf = (fileName: string) => {
    return /\.pdf$/i.test(fileName);
  };

  const isEpub = (fileName: string) => {
    return /\.epub$/i.test(fileName);
  };

  const getFileIcon = (fileName: string) => {
    if (isImage(fileName)) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    if (isPdf(fileName) || isEpub(fileName)) {
      return <FileType className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-lg font-medium">
            {previewFile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium">{previewFile.name}</span>
              </div>
            ) : (
              `Files in "${threadName}"`
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          {previewFile ? (
              <FilePreview
                fileName={previewFile.name}
                content={previewFile.content}
                showToggle={false}
                defaultExpanded={true}
              />
          ) : (
            <>
              {sortedFiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No files in this thread
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent group"
                    >
                      <div className="p-2 bg-primary/10 rounded-xl">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {file.name}
                          </span>
                          
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(file.timestamp, { addSuffix: true })}
                          </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1 hover:bg-background rounded-xl"
                          title="Preview file"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 