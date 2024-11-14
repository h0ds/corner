import React, { useCallback, useMemo } from 'react';
import { Thread, GraphNode, GraphEdge } from '@/types';
import ForceGraph2D from 'react-force-graph-2d';
import { useTheme } from 'next-themes';

interface KnowledgeGraphProps {
  threads: Thread[];
  onNodeClick?: (nodeId: string) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  onNodeClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  }, [threads, isDark]);

  // Custom tooltip renderer
  const getNodeTooltip = useCallback((node: any) => {
    const type = node.data.type === 'note' ? 'Note' : 'Thread';
    return `
      <div style="
        color: ${isDark ? '#000' : '#fff'};
        padding: 4px;
        max-width: 200px;
        font-family: 'Geist', monospace;
        font-size: 12px;
      ">
        <div style="font-weight: bold; margin-bottom: 4px;">${node.label}</div>
        <div style="color: ${isDark ? '#999' : '#eee'}; margin-bottom: 4px;">
          ${type} • ${node.data.linkedCount} connection${node.data.linkedCount !== 1 ? 's' : ''}
        </div>
      </div>
    `;
  }, [isDark]);

  // Handle node click
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
    <div className="w-full h-full">
      <ForceGraph2D
        graphData={{ nodes, links }}
        nodeLabel={getNodeTooltip}
        nodeColor={node => node.data.color || (isDark ? '#666' : '#999')}
        nodeRelSize={8}
        linkColor={() => isDark ? '#444' : '#ddd'}
        backgroundColor="transparent"
        onNodeClick={handleNodeClick}
        linkWidth={2}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Geist`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8);

          // Draw background
          ctx.fillStyle = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          // Draw text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isDark ? '#fff' : '#000';
          ctx.fillText(label, node.x, node.y);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = [
            ctx.measureText(node.label).width + 12,
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