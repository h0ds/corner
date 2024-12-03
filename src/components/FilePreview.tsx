import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);
  const isEpub = /\.epub$/i.test(fileName);

  useEffect(() => {
    setError(null);
  }, [content]);

  const renderContent = () => {
    try {
      if (isImage) {
        return (
          <>
            <img 
              src={content} 
              alt={fileName} 
              className="max-h-96 w-auto mx-auto rounded-lg"
              onError={(e) => {
                console.error('Image load error:', e);
                setError('Failed to load image. The file might be corrupted or in an unsupported format.');
              }}
            />
          </>
        );
      }
      
      if (isPdf) {
        return (
          <iframe
            src={content}
            className="w-full h-96 rounded-lg"
            title={fileName}
            onError={() => setError('Failed to load PDF. The file might be corrupted or in an unsupported format.')}
          />
        );
      }

      if (isEpub) {
        return (
          <div className="text-center p-4">
            <FileType className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">
              EPUB file detected. You can download and open this file with your preferred EPUB reader.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                const link = document.createElement('a');
                link.href = content;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download EPUB
            </Button>
          </div>
        );
      }

      return (
        <pre className="text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
          {content}
        </pre>
      );
    } catch (e) {
      console.error('Error rendering content:', e);
      setError('Failed to render content. The file might be corrupted or in an unsupported format.');
      return null;
    }
  };

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
          {error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      )}
    </Card>
  );
};