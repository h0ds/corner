import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileAttachment } from '@/types';
import { FileText, Download, ExternalLink, Image, FileType, Eye } from 'lucide-react';
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

  const getFileIcon = (fileName: string) => {
    if (isImage(fileName)) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    if (isPdf(fileName)) {
      return <FileType className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const openFile = (file: FileAttachment) => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        throw new Error('Failed to open new window');
      }

      const content = file.content;
      const fileName = file.name;

      if (isImage(fileName)) {
        win.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
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
              <img src="${content}" alt="${fileName}" />
            </body>
          </html>
        `);
        win.document.close();
      } else if (isPdf(fileName)) {
        win.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                body {
                  margin: 0;
                  overflow: hidden;
                }
                iframe {
                  width: 100vw;
                  height: 100vh;
                  border: none;
                }
              </style>
            </head>
            <body>
              <iframe src="${content}" type="application/pdf"></iframe>
            </body>
          </html>
        `);
        win.document.close();
      } else {
        win.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                body {
                  font-family: monospace;
                  padding: 20px;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  margin: 0;
                  background: #f5f5f5;
                }
                pre {
                  margin: 0;
                  padding: 20px;
                  background: white;
                  border-radius: 4px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
              </style>
            </head>
            <body>
              <pre>${content}</pre>
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const downloadFile = async (file: FileAttachment) => {
    try {
      let blob: Blob;
      const content = file.content;

      if (isImage(file.name) || isPdf(file.name)) {
        if (content.startsWith('data:')) {
          const response = await fetch(content);
          blob = await response.blob();
        } else {
          const base64Data = content.replace(/^data:.*?;base64,/, '');
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          blob = new Blob(byteArrays, { 
            type: isPdf(file.name) ? 'application/pdf' : `image/${file.name.split('.').pop()}`
          });
        }
      } else {
        blob = new Blob([content], { type: 'text/plain' });
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
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
                  ←
                </button>
                <span>{previewFile.name}</span>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1 hover:bg-background rounded-sm"
                          title="Preview file"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFile(file);
                          }}
                          className="p-1 hover:bg-background rounded-sm"
                          title="Open in new window"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 