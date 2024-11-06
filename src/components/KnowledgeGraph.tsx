import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Thread } from '@/types';
import ForceGraph2D from 'react-force-graph-2d';
import { useTheme } from 'next-themes';
import marked from 'marked';

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
  type: 'reference';
  strength?: number;
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

  // Create a dependency string that changes when any note content changes
  const noteContentDependency = useMemo(() => {
    return threads
      .filter((t): t is NoteThread => 'content' in t)
      .map(note => `${note.id}:${note.content}`)
      .join('|');
  }, [threads]);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkSet = new Set<string>();
    const connections = new Map<string, number>();
    const referencedThreadIds = new Set<string>();

    // First add all threads as nodes (both notes and chat threads)
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
      const linkId = `${sourceId}-${targetId}`;
      if (!linkSet.has(linkId)) {
        linkSet.add(linkId);
        connections.set(sourceId, (connections.get(sourceId) || 0) + 1);
        connections.set(targetId, (connections.get(targetId) || 0) + 1);
        referencedThreadIds.add(targetId);
      }
    }

    // Find connections between notes using wiki-style links
    threads.forEach(sourceThread => {
      if (!('content' in sourceThread)) return;
      
      const content = sourceThread.content || '';
      
      // Find all wiki-style links [[note name]]
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        const linkedNoteName = match[1].trim();
        console.log(`Found link in ${sourceThread.name}: [[${linkedNoteName}]]`);
        
        // Find target thread, case-insensitive comparison
        const targetThread = threads.find(t => 
          t.name.toLowerCase() === linkedNoteName.toLowerCase()
        );
        
        if (targetThread && targetThread.id !== sourceThread.id) {
          console.log(`Found matching thread: ${targetThread.name}`);
          addLink(sourceThread.id, targetThread.id);
        } else {
          console.log(`No matching thread found for: ${linkedNoteName}`);
        }
      }
    });

    // Remove nodes that aren't referenced and aren't notes
    nodeMap.forEach((node, id) => {
      if (node.type !== 'note' && !referencedThreadIds.has(id)) {
        nodeMap.delete(id);
      }
    });

    // Update node sizes based on connection count
    nodeMap.forEach((node, id) => {
      const connectionCount = connections.get(id) || 0;
      node.val = 3 + Math.log2(connectionCount + 1) * 2;
    });

    const graphLinks = Array.from(linkSet)
      .map(linkId => {
        const [source, target] = linkId.split('-');
        if (nodeMap.has(source) && nodeMap.has(target)) {
          return { 
            source, 
            target, 
            type: 'reference' as const,
            strength: 1
          };
        }
        return null;
      })
      .filter((link): link is NonNullable<typeof link> => link !== null);

    console.log('Graph data:', {
      nodes: Array.from(nodeMap.values()),
      links: graphLinks,
      connections: Object.fromEntries(connections)
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: graphLinks
    };
  }, [threads, noteContentDependency]);

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
              const start = link.source as any;
              const end = link.target as any;
              
              // Draw curved connection line
              ctx.beginPath();
              ctx.strokeStyle = isDark ? 'rgba(150,150,150,0.2)' : 'rgba(100,100,100,0.2)';
              ctx.lineWidth = 1.5;
              
              // Calculate control point for curve
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const curveOffset = Math.sqrt(dx * dx + dy * dy) * 0.2;
              
              // Calculate perpendicular offset for curve
              const angle = Math.atan2(dy, dx);
              const perpX = -Math.sin(angle) * curveOffset;
              const perpY = Math.cos(angle) * curveOffset;
              
              // Draw quadratic curve
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.quadraticCurveTo(
                (start.x + end.x) / 2 + perpX,
                (start.y + end.y) / 2 + perpY,
                end.x,
                end.y
              );
              ctx.stroke();

              // Draw arrow
              const arrowLength = 8;
              const arrowWidth = 4;
              const arrowPos = 0.8;
              
              const t = arrowPos;
              const pointX = (1-t)*(1-t)*start.x + 2*(1-t)*t*((start.x + end.x)/2 + perpX) + t*t*end.x;
              const pointY = (1-t)*(1-t)*start.y + 2*(1-t)*t*((start.y + end.y)/2 + perpY) + t*t*end.y;
              
              const dx2 = end.x - pointX;
              const dy2 = end.y - pointY;
              const angle2 = Math.atan2(dy2, dx2);
              
              ctx.beginPath();
              ctx.moveTo(pointX, pointY);
              ctx.lineTo(
                pointX - arrowLength * Math.cos(angle2) + arrowWidth * Math.sin(angle2),
                pointY - arrowLength * Math.sin(angle2) - arrowWidth * Math.cos(angle2)
              );
              ctx.lineTo(
                pointX - arrowLength * Math.cos(angle2) - arrowWidth * Math.sin(angle2),
                pointY - arrowLength * Math.sin(angle2) + arrowWidth * Math.cos(angle2)
              );
              ctx.closePath();
              ctx.fillStyle = isDark ? 'rgba(150,150,150,0.2)' : 'rgba(100,100,100,0.2)';
              ctx.fill();
            }}
          />
        )}
      </div>
    </div>
  );
}; 