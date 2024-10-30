import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileAttachment } from '@/types';
import { FileText, Download, ExternalLink, Image } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  const isImage = (fileName: string) => {
    return fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i);
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
                    {isImage(file.name) ? (
                      <Image className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
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
                          if (isImage(file.name)) {
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
                        const blob = isImage(file.name)
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