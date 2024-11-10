import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Citation {
  url: string;
  title?: string;
}

interface CitationsProps {
  citations: Citation[];
  className?: string;
}

export const Citations: React.FC<CitationsProps> = ({ citations, className }) => {
  if (!citations?.length) return null;

  return (
    <div className={cn("mt-2 space-y-1", className)}>
      <div className="text-xs font-medium text-muted-foreground">Citations:</div>
      <div className="space-y-1">
        {citations.map((citation, index) => (
          <a
            key={index}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
                     transition-colors hover:bg-accent/50 px-1.5 py-1 rounded-sm -mx-1.5
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            <span className="truncate underline underline-offset-2 decoration-blue-500/50 dark:decoration-blue-400/50">
              {citation.title || citation.url}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}; 