import React from 'react';
import { Thread } from '@/types';

interface KnowledgeGraphProps {
  threads: Thread[];
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">Knowledge Graph</h2>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {/* Graph visualization will go here */}
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Knowledge Graph visualization coming soon...
        </div>
      </div>
    </div>
  );
}; 