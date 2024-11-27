import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Thread, GraphNode, GraphEdge } from '@/types';
import ForceGraph2D from 'react-force-graph-2d';
import { cn } from '@/lib/utils';

interface KnowledgeGraphProps {
  threads: Thread[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  onNodeClick,
  className
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.graph-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    // Initial dimensions
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);

    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Create nodes and links from threads
  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphEdge[] = [];
    const processedLinks = new Set<string>();

    // Create nodes for all threads and notes
    threads.forEach(thread => {
      // Calculate node size based on connections
      const linkedCount = thread.linkedNotes?.length || 0;
      const baseSize = 6;
      const sizeScale = Math.log(linkedCount + 1) + 1;
      const nodeSize = baseSize * sizeScale;

      nodes.push({
        id: thread.id,
        label: thread.name,
        data: {
          color: thread.color || (thread.isNote ? '#4CAF50' : '#2196F3'),
          size: nodeSize,
          content: thread.isNote ? thread.content.slice(0, 100) : thread.messages[0]?.content.slice(0, 100),
          linkedCount: linkedCount,
          type: thread.isNote ? 'note' : 'thread'
        }
      });

      // Add links for linked notes/threads
      if (thread.linkedNotes) {
        thread.linkedNotes.forEach(targetId => {
          const linkId = [thread.id, targetId].sort().join('-');
          if (!processedLinks.has(linkId)) {
            links.push({
              id: linkId,
              source: thread.id,
              target: targetId,
              data: {
                strength: 0.5 // Adjust this value to control link length
              }
            });
            processedLinks.add(linkId);
          }
        });
      }
    });

    return { nodes, links };
  }, [threads]);

  // Custom tooltip renderer
  const getNodeTooltip = useCallback((node: any) => {
    const type = node.data.type === 'note' ? 'Note' : 'Thread';
    return `
      <div style="
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 12px;
        max-width: 240px;
        font-family: ui-monospace, monospace;
        font-size: 12px;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">${node.label}</div>
        <div style="color: #999; margin-bottom: 4px; font-size: 11px;">
          ${type} • ${node.data.linkedCount} connection${node.data.linkedCount !== 1 ? 's' : ''}
        </div>
        ${node.data.content ? `
          <div style="
            color: #ccc;
            font-size: 11px;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          ">${node.data.content}</div>
        ` : ''}
      </div>
    `;
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      onNodeClick(node.id);
      window.dispatchEvent(new CustomEvent('switch-tab', {
        detail: { tab: node.data.type === 'note' ? 'notes' : 'threads' }
      }));
    }
  }, [onNodeClick]);

  return (
    <div className={cn("w-full h-full font-mono graph-container relative", className)} style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100, 100, 100, 0.05) 1px, transparent 0)`,
      backgroundSize: '24px 24px'
    }}>
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={{ nodes, links }}
        nodeLabel={getNodeTooltip}
        nodeColor={node => node.data.color}
        nodeRelSize={6}
        linkColor={() => 'rgba(100, 100, 100, 0.2)'}
        backgroundColor="transparent"
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        linkWidth={1.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3AlphaMin={0.001}
        d3Force="charge"
        d3ForceStrength={-300}
        linkDistance={150}
        warmupTicks={100}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const size = node.data.size;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = node.data.color;
          ctx.fill();
          
          // Add a white border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw label if zoomed in enough
          const label = node.label;
          if (globalScale >= 1) {
            ctx.font = '4px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y);
          }
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.data.size * 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />
    </div>
  );
};