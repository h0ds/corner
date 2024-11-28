import React, { useMemo, useState, useRef } from 'react';
import { Thread } from '@/types';
import { Network } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GraphCanvas,
  GraphNode,
  GraphEdge,
  useSelection
} from 'reagraph';

/*
Example usage in parent component:

function ParentComponent() {
  const handleSelectNode = (threadId: string, isNote: boolean) => {
    // Switch to appropriate tab
    setActiveTab(isNote ? 'notes' : 'threads');
    
    // Open the selected thread/note
    setSelectedThreadId(threadId);
  };

  return (
    <KnowledgeGraph 
      threads={threads} 
      onSelectNode={handleSelectNode}
    />
  );
}
*/

interface KnowledgeGraphProps {
  threads: Thread[];
  trigger?: React.ReactNode;
  onSelectNode?: (threadId: string, isNote: boolean) => void;
  onTabChange?: (tab: 'threads' | 'notes') => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  trigger,
  onSelectNode,
  onTabChange
}) => {
  const [open, setOpen] = useState(false);
  const graphRef = useRef(null);

  const handleNodeClick = (node: GraphNode) => {
    console.log('Node clicked:', node);
    if (node) {
      const isNote = Boolean(node.data?.isNote);
      
      // Switch to appropriate tab first
      if (onTabChange) {
        onTabChange(isNote ? 'notes' : 'threads');
      }

      // Then select the node
      if (onSelectNode) {
        onSelectNode(node.id, isNote);
      }

      // Close the modal
      setOpen(false);
    }
  };

  const { nodes, edges } = useMemo(() => {
    console.log('Threads:', threads);
    
    // Create nodes from threads
    const nodes: GraphNode[] = threads.map(thread => {
      const node = {
        id: thread.id,
        label: thread.name || '',
        data: {
          isNote: Boolean(thread.isNote),
          name: thread.name || '',
          id: thread.id,
          linkedNotes: thread.linkedNotes || [],
        }
      };
      console.log('Created node:', node);
      return node;
    });

    // Create edges from thread links
    const edges: GraphEdge[] = threads.flatMap(thread => {
      const connections = thread.linkedNotes || [];
      return connections
        .filter(linkedId => threads.some(t => t.id === linkedId))
        .map(linkedId => ({
          id: `${thread.id}-${linkedId}`,
          source: thread.id,
          target: linkedId,
          label: '',
          data: {
            weight: 1
          }
        }));
    });

    console.log('Final nodes:', nodes);
    console.log('Final edges:', edges);

    return { nodes, edges };
  }, [threads]);

  const { selections } = useSelection({
    ref: graphRef,
    nodes,
    edges,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Network className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] w-full h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>Knowledge Graph</DialogTitle>
        </DialogHeader>
        <div className="h-[calc(100%)] w-full bg-white">
          <GraphCanvas
            ref={graphRef}
            nodes={nodes}
            edges={edges}
            selections={selections}
            onNodeClick={handleNodeClick}
            layoutType="forceDirected2d"
            labelType="all"
            draggable
            animate
            contextMenu={false}
            edgeInterpolation="straight"
            edgeArrowPosition="none"
            nodeSize={30}
            edgeWidth={1.5}
            onClick={(e) => console.log('Canvas clicked:', e)}
            onCanvasClick={(e) => console.log('Canvas background clicked:', e)}
            labelRenderer={({ label }) => (
              <text
                className="font-mono text-[11px]"
                style={{ fontFamily: 'var(--font-mono)' }}
                y={4}
                textAnchor="middle"
                fill="#000000"
              >
                {label}
              </text>
            )}
            renderTooltip={({ node }) => (
              <div className="bg-popover border border-border text-popover-foreground px-3 py-2 text-sm rounded-lg shadow-lg">
                <div className="font-medium">{node.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {node.data.isNote ? 'Note' : 'Thread'}
                </div>
              </div>
            )}
            theme={{
              canvas: {
                backgroundColor: '#fefefe',
              },
              node: {
                fill: '#94a3b8',
                activeFill: '#64748b',
                stroke: '#475569',
                strokeWidth: 2,
                radius: 8,
                opacity: 1,
                selectedOpacity: 1,
                inactiveOpacity: 0.7,
                label: {
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 11,
                  color: '#000000',
                  stroke: 'transparent',
                  strokeWidth: 0,
                  distance: 12,
                },
              },
              edge: {
                fill: '#000000',
                activeFill: '#000000',
                opacity: 0.15,
                selectedOpacity: 0.3,
                inactiveOpacity: 0.1,
                label: {
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 11,
                  color: '#000000',
                  stroke: 'transparent',
                  strokeWidth: 0,
                },
              },
              lasso: {
                border: 'rgba(0, 0, 0, 0.2)',
                fill: 'rgba(0, 0, 0, 0.05)',
              },
              ring: {
                fill: 'rgba(0, 0, 0, 0.2)',
                activeFill: 'rgba(0, 0, 0, 0.4)',
              },
              arrow: {
                fill: 'rgba(0, 0, 0, 0.2)',
                activeFill: 'rgba(0, 0, 0, 0.4)',
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '0.5rem',
            }}
            nodeStyle={(node) => ({
              fill: node?.data?.isNote === true ? '#94a3b8' : '#6366f1',
              stroke: '#475569',
              strokeWidth: 2,
              radius: 8,
            })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};