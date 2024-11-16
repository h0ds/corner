import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Thread, GraphNode, GraphEdge } from '@/types';
import ForceGraph2D from 'react-force-graph-2d';

interface KnowledgeGraphProps {
  threads: Thread[];
  onNodeClick?: (nodeId: string) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  onNodeClick,
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
      nodes.push({
        id: thread.id,
        label: thread.name,
        data: {
          color: thread.color,
          size: 10,
          content: thread.isNote ? thread.content.slice(0, 100) : thread.messages[0]?.content.slice(0, 100),
          linkedCount: thread.linkedNotes?.length || 0,
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
              target: targetId
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
        background-color: #fff;
        color: #000;
        padding: 4px;
        max-width: 200px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid #fff;
      ">
        <div style="font-weight: bold; margin-bottom: 4px; font-family: monospace;">${node.label}</div>
        <div style="color: #999; margin-bottom: 2px; font-family: monospace;">
          ${type} • ${node.data.linkedCount} connection${node.data.linkedCount !== 1 ? 's' : ''}
        </div>
      </div>
    `;
  }, []);

  // Handle node double click
  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      onNodeClick(node.id);
      // Dispatch event to switch to appropriate tab
      window.dispatchEvent(new CustomEvent('switch-tab', {
        detail: { tab: node.data.type === 'note' ? 'notes' : 'threads' }
      }));
    }
  }, [onNodeClick]);

  return (
    <div className="w-full h-full font-mono graph-container" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100, 100, 100, 0.1) 1px, transparent 0)`,
      backgroundSize: '12px 12px'
    }}>
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={{ nodes, links }}
        nodeLabel={getNodeTooltip}
        nodeColor={node => node.data.color || '#666'}
        nodeRelSize={10}
        linkColor={() => '#444'}
        backgroundColor="transparent"
        onNodeDblClick={handleNodeClick}
        linkWidth={1}
        linkDirectionalParticles={0}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1);

          // Draw background
          ctx.fillStyle = 'rgba(0,0,0,1)';
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          // Draw text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.font = `${fontSize / 1.25}px monospace`;
          ctx.fillText(label, node.x, node.y);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.font = `12px monospace`;
          ctx.fillStyle = color;
          const bckgDimensions = [
            ctx.measureText(node.label).width,
            16
          ];
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );
        }}
      />
    </div>
  );
};