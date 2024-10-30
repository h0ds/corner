import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileAttachment } from '@/types';
import { FileText, Download, ExternalLink, Image, FileType } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { isImageFile, isPdfFile } from '@/lib/fileHandlers';

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
  const sortedFiles = [...files].sort((a, b) => b.timestamp - a.timestamp);

  const getFileIcon = (fileName: string) => {
    if (isImageFile({ name: fileName, type: fileName.split('.').pop() || '' } as File)) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    if (isPdfFile({ name: fileName, type: fileName.split('.').pop() || '' } as File)) {
      return <FileType className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-lg font-medium">
            Files in "{threadName}"
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          {sortedFiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No files in this thread
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-sm hover:bg-accent group"
                >
                  <div className="p-2 bg-primary/10 rounded-sm">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(file.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          if (isImageFile({ name: file.name, type: file.name.split('.').pop() || '' } as File)) {
                            win.document.write(`
                              <html>
                                <head>
                                  <title>${file.name}</title>
                                  <style>
                                    body {
                                      margin: 0;
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                      min-height: 100vh;
                                      background: #000;
                                    }
                                    img {
                                      max-width: 100%;
                                      max-height: 100vh;
                                      object-fit: contain;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <img src="${file.content}" alt="${file.name}" />
                                </body>
                              </html>
                            `);
                          } else if (isPdfFile({ name: file.name, type: file.name.split('.').pop() || '' } as File)) {
                            win.location.href = file.content;
                          } else {
                            win.document.write(`
                              <html>
                                <head>
                                  <title>${file.name}</title>
                                  <style>
                                    body { 
                                      font-family: monospace;
                                      padding: 20px;
                                      white-space: pre-wrap;
                                      word-wrap: break-word;
                                    }
                                  </style>
                                </head>
                                <body>${file.content}</body>
                              </html>
                            `);
                          }
                        }
                      }}
                      className="p-1 hover:bg-background rounded-sm"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const blob = isImageFile({ name: file.name, type: file.name.split('.').pop() || '' } as File) || 
                                   isPdfFile({ name: file.name, type: file.name.split('.').pop() || '' } as File)
                          ? fetch(file.content).then(r => r.blob())
                          : Promise.resolve(new Blob([file.content], { type: 'text/plain' }));
                        
                        blob.then(blob => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        });
                      }}
                      className="p-1 hover:bg-background rounded-sm"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 