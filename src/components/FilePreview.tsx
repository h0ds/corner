import React from 'react';
import { Card } from './ui/card';
import { isImageFile, isPdfFile } from '@/lib/fileHandlers';

interface FilePreviewProps {
  fileName: string;
  content: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ fileName, content }) => {
  const isImage = isImageFile({ name: fileName, type: fileName.split('.').pop() || '' } as File);
  const isPdf = isPdfFile({ name: fileName, type: fileName.split('.').pop() || '' } as File);

  return (
    <Card className="p-4 bg-muted/50 rounded-sm">
      <div className="text-sm font-medium mb-2">
        {fileName}
      </div>
      {isImage ? (
        <div className="max-w-2xl">
          <img 
            src={content} 
            alt={fileName}
            className="rounded-sm max-h-[300px] object-contain"
          />
        </div>
      ) : isPdf ? (
        <div className="max-w-2xl h-[500px]">
          <iframe
            src={content}
            title={fileName}
            className="w-full h-full rounded-sm"
          />
        </div>
      ) : (
        <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[300px]">
          {content}
        </pre>
      )}
    </Card>
  );
}; 