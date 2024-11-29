import React, { useState } from 'react';
import { Card } from './ui/card';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  fileName: string;
  content: string;
  onClear?: () => void;
  showToggle?: boolean;
  defaultExpanded?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ 
  fileName, 
  content, 
  onClear,
  showToggle = true,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  return (
    <Card className="rounded-xl relative border-none p-2 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {fileName}
          </span>
          {showToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {onClear && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isExpanded && (
        <div className={cn(
          "mt-2 rounded-lg overflow-hidden",
          isImage ? "bg-transparent" : "bg-muted p-4"
        )}>
          {isImage ? (
            <img 
              src={content} 
              alt={fileName} 
              className="max-h-96 w-auto mx-auto rounded-lg"
              onError={(e) => {
                console.error('Image load error:', e);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : isPdf ? (
            <iframe
              src={content}
              className="w-full h-96 rounded-lg"
              title={fileName}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {content}
            </pre>
          )}
          <div className="hidden mt-2 text-sm text-red-500">
            Failed to load image. The file might be corrupted or in an unsupported format.
          </div>
        </div>
      )}
    </Card>
  );
}; 