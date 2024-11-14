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
          {/* <span className="text-sm font-medium">
            {fileName}
          </span> */}
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
            className="h-6 w-6"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className={cn(
        "relative transition-all duration-200",
        !isExpanded && "h-0 overflow-hidden opacity-0",
        isExpanded && "opacity-100"
      )}>
        {isImage ? (
          <div className="max-w-2xl">
            <img 
              src={content} 
              alt={fileName}
              className="rounded-xl max-h-[300px] object-contain"
            />
          </div>
        ) : isPdf ? (
          <div className="max-w-2xl h-[500px]">
            <iframe
              src={content}
              title={fileName}
              className="w-full h-full rounded-xl"
            />
          </div>
        ) : (
          <div className="relative">
            <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-[300px] bg-background p-4 rounded-xl">
              {content}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        )}
      </div>
    </Card>
  );
}; 