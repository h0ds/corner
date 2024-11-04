import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Thread, NoteThread } from '@/types';
import ForceGraph2D from 'react-force-graph-2d';
import { useTheme } from 'next-themes';

interface KnowledgeGraphProps {
  threads: Thread[];
  onNodeClick?: (threadId: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  color?: string;
  val: number;
  type: 'note' | 'chat';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'reference' | 'backlink' | 'file-mention';
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  onNodeClick
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkSet = new Set<string>();
    const connections = new Map<string, number>();
    const connectedThreads = new Set<string>();

    // First add all threads as nodes
    threads.forEach(thread => {
      nodeMap.set(thread.id, {
        id: thread.id,
        name: thread.name,
        color: thread.color,
        val: 1,
        type: thread.isNote ? 'note' : 'chat'
      });
    });

    function addLink(sourceId: string, targetId: string, type: GraphLink['type'] = 'reference') {
      // Create bidirectional connection
      const linkId1 = `${sourceId}-${targetId}`;
      const linkId2 = `${targetId}-${sourceId}`;
      if (!linkSet.has(linkId1) && !linkSet.has(linkId2)) {
        linkSet.add(linkId1);
        connections.set(sourceId, (connections.get(sourceId) || 0) + 1);
        connections.set(targetId, (connections.get(targetId) || 0) + 1);
        connectedThreads.add(sourceId);
        connectedThreads.add(targetId);
      }
    }

    // Find connections between notes and threads
    threads.forEach(sourceThread => {
      if (!('content' in sourceThread)) return;
      const content = sourceThread.content || '';
      
      // Find wiki-style links [[Note Name]]
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        const linkedNoteName = match[1];
        // Find target note by name (case-insensitive)
        const targetThread = threads.find(t => 
          t.name.toLowerCase() === linkedNoteName.toLowerCase()
        );
        
        if (targetThread && targetThread.id !== sourceThread.id) {
          addLink(sourceThread.id, targetThread.id, 'reference');
        }
      }

      // Check for direct mentions of note names
      threads.forEach(targetThread => {
        if (targetThread.id !== sourceThread.id) {
          const namePattern = new RegExp(`\\b${targetThread.name}\\b`, 'i');
          if (namePattern.test(content)) {
            addLink(sourceThread.id, targetThread.id, 'reference');
          }
        }
      });
    });

    // Update node sizes based on connection count
    nodeMap.forEach((node, id) => {
      const connectionCount = connections.get(id) || 0;
      // Scale node size logarithmically based on connections
      // Base size is 3, max size is around 12 for highly connected nodes
      node.val = 3 + Math.log2(connectionCount + 1) * 2;
    });

    // Create links array from the set
    const graphLinks = Array.from(linkSet)
      .map(linkId => {
        const [source, target] = linkId.split('-');
        return { source, target };
      });

    return {
      nodes: Array.from(nodeMap.values()),
      links: graphLinks
    };
  }, [threads]);

  const handleNodeDragStart = useCallback((node: GraphNode) => {
    setDraggedNode(node);
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-150);
    }
  }, []);

  const handleNodeDrag = useCallback((node: GraphNode, translate: { x: number, y: number }) => {
    if (node) {
      node.fx = translate.x;
      node.fy = translate.y;
    }
  }, []);

  const handleNodeDragEnd = useCallback((node: GraphNode) => {
    setDraggedNode(null);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-150);
    }
  }, []);

  const noteCount = nodes.filter(n => n.type === 'note').length;
  const chatCount = nodes.filter(n => n.type === 'chat').length;

  const handleNodeClick = (node: GraphNode) => {
    const thread = threads.find(t => t.id === node.id);
    if (thread) {
      const event = new CustomEvent('switch-tab', {
        detail: { tab: thread.isNote ? 'notes' : 'threads' }
      });
      window.dispatchEvent(event);
      onNodeClick?.(node.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background" ref={containerRef}>
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">Knowledge Graph</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}, {chatCount} {chatCount === 1 ? 'related thread' : 'related threads'}, {links.length} {links.length === 1 ? 'connection' : 'connections'}
        </p>
      </div>
      <div className="flex-1 relative">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes, links }}
            nodeLabel={node => (node as GraphNode).name}
            nodeColor={node => {
              const n = node as GraphNode;
              if (n.color) return n.color;
              return n.type === 'note' 
                ? (isDark ? '#666' : '#999')
                : (isDark ? '#444' : '#ccc');
            }}
            nodeRelSize={3}
            linkColor={() => isDark ? '#444' : '#ddd'}
            linkWidth={1.5}
            linkDirectionalParticles={0}
            backgroundColor="transparent"
            cooldownTicks={100}
            cooldownTime={2000}
            onNodeClick={(node) => {
              handleNodeClick(node as GraphNode);
            }}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragEnd={handleNodeDragEnd}
            enableNodeDrag={true}
            width={dimensions.width}
            height={dimensions.height - 57}
            d3VelocityDecay={0.1}
            linkOpacity={0.5}
            linkCurvature={0}
          />
        )}
      </div>
    </div>
  );
}; 