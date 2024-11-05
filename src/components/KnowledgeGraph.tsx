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

    function addLink(sourceId: string, targetId: string) {
      const linkId1 = `${sourceId}-${targetId}`;
      const linkId2 = `${targetId}-${sourceId}`;
      if (!linkSet.has(linkId1) && !linkSet.has(linkId2)) {
        linkSet.add(linkId1);
        connections.set(sourceId, (connections.get(sourceId) || 0) + 1);
        connections.set(targetId, (connections.get(targetId) || 0) + 1);
      }
    }

    // Find connections between notes
    threads.forEach(sourceThread => {
      if (!('content' in sourceThread)) return;
      const content = sourceThread.content || '';
      
      // Parse HTML content to find links
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const links = doc.querySelectorAll('a[data-type="note"]');
      
      links.forEach(link => {
        const name = link.getAttribute('data-name');
        if (name) {
          const targetThread = threads.find(t => 
            t.name.toLowerCase() === name.toLowerCase()
          );
          
          if (targetThread && targetThread.id !== sourceThread.id) {
            addLink(sourceThread.id, targetThread.id);
          }
        }
      });
    });

    // Update node sizes based on connection count
    nodeMap.forEach((node, id) => {
      const connectionCount = connections.get(id) || 0;
      node.val = 3 + Math.log2(connectionCount + 1) * 2;
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkSet).map(linkId => {
        const [source, target] = linkId.split('-');
        return { source, target };
      })
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
            nodeCanvasObject={(node, ctx) => {
              const n = node as GraphNode;
              // Count connections for this node
              const connectionCount = links.filter(link => 
                link.source === node.id || link.target === node.id
              ).length;

              // Calculate node size based on connections
              const minSize = 3;
              const maxSize = 12;
              const sizePerConnection = 1;
              const size = Math.max(minSize, Math.min(minSize + connectionCount * sizePerConnection, maxSize));

              // Draw the node
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
              ctx.fillStyle = n.color || (n.type === 'note' 
                ? (isDark ? '#666' : '#999')
                : (isDark ? '#444' : '#ccc'));
              ctx.fill();

              // Draw label on hover
              if (node === graphRef.current?.centerAt) {
                const label = n.name;
                ctx.font = '12px monospace';
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth + 8, 20];
                
                ctx.fillStyle = '#000';
                ctx.fillRect(
                  node.x! - bckgDimensions[0] / 2,
                  node.y! - bckgDimensions[1] - 12,
                  bckgDimensions[0],
                  bckgDimensions[1]
                );

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(
                  label,
                  node.x!,
                  node.y! - bckgDimensions[1] / 2 - 12
                );
              }
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const connectionCount = links.filter(link => 
                link.source === node.id || link.target === node.id
              ).length;
              const minSize = 3;
              const maxSize = 12;
              const sizePerConnection = 1;
              const size = Math.max(minSize, Math.min(minSize + connectionCount * sizePerConnection, maxSize));
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, size + 2, 0, 2 * Math.PI); // Slightly larger hit area
              ctx.fill();
            }}
            nodeColor={node => {
              const n = node as GraphNode;
              if (n.color) return n.color;

              // Count connections for this node
              const connectionCount = links.filter(link => 
                link.source === node.id || link.target === node.id
              ).length;

              // Calculate darkness based on connections
              const maxConnections = 10; // Adjust this based on expected max connections
              const darkness = Math.min(connectionCount / maxConnections, 1);

              if (n.type === 'note') {
                return isDark 
                  ? `rgb(${102 - darkness * 40}, ${102 - darkness * 40}, ${102 - darkness * 40})`
                  : `rgb(${153 + darkness * 40}, ${153 + darkness * 40}, ${153 + darkness * 40})`;
              } else {
                return isDark
                  ? `rgb(${68 - darkness * 40}, ${68 - darkness * 40}, ${68 - darkness * 40})`
                  : `rgb(${204 + darkness * 40}, ${204 + darkness * 40}, ${204 + darkness * 40})`;
              }
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
            linkOpacity={1}
            linkCurvature={0}
            linkVisibility={true}
            linkCanvasObject={(link, ctx, scale) => {
              const start = link.source;
              const end = link.target;
              
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              ctx.strokeStyle = isDark ? '#444' : '#ddd';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }}
          />
        )}
      </div>
    </div>
  );
}; 