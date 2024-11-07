import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { GraphCanvas, GraphNode, GraphEdge } from 'reagraph';
import { KnowledgeGraphProps } from '@/types';

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  threads,
  onNodeClick
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, { source: string; target: string }>();
    const connectionCounts = new Map<string, number>();

    // Initialize nodes
    threads.forEach(thread => {
      if (thread.isNote) {
        nodeMap.set(thread.id, {
          id: thread.id,
          label: thread.name,
          data: { color: thread.color },
        });
        connectionCounts.set(thread.id, 0);
      }
    });

    // Find all wiki-links in all notes
    const noteThreads = threads.filter(t => t.isNote);
    noteThreads.forEach(sourceThread => {
      if (!sourceThread.content) return;

      // Find all wiki-style links [[note name]]
      const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
      const matches = Array.from(sourceThread.content.matchAll(wikiLinkRegex));

      matches.forEach(match => {
        const linkedNoteName = match[1].trim();
        
        // Find all target threads that match this name (case insensitive)
        const targetThreads = noteThreads.filter(t => 
          t.name.toLowerCase() === linkedNoteName.toLowerCase()
        );

        targetThreads.forEach(targetThread => {
          if (targetThread.id === sourceThread.id) return; // Skip self-links
          
          // Create edges in both directions to show bi-directional connection
          const edgeId1 = `${sourceThread.id}-${targetThread.id}`;
          const edgeId2 = `${targetThread.id}-${sourceThread.id}`;
          
          if (!edgeMap.has(edgeId1) && !edgeMap.has(edgeId2)) {
            edgeMap.set(edgeId1, { source: sourceThread.id, target: targetThread.id });
            
            // Increment connection count for both nodes
            connectionCounts.set(
              sourceThread.id, 
              (connectionCounts.get(sourceThread.id) || 0) + 1
            );
            connectionCounts.set(
              targetThread.id, 
              (connectionCounts.get(targetThread.id) || 0) + 1
            );
          }
        });
      });
    });

    // Calculate PageRank
    const damping = 0.85;
    const epsilon = 0.00001;
    const maxIterations = 100;
    let pageRanks = new Map<string, number>();
    let prevPageRanks = new Map<string, number>();

    // Initialize PageRank values
    nodeMap.forEach((_, id) => {
      pageRanks.set(id, 1 / nodeMap.size);
    });

    // Iterate until convergence
    for (let i = 0; i < maxIterations; i++) {
      prevPageRanks = new Map(pageRanks);
      
      nodeMap.forEach((_, id) => {
        const connections = connectionCounts.get(id) || 0;
        let sum = 0;
        
        // Get all edges that point to this node
        Array.from(edgeMap.values())
          .filter(edge => edge.target === id)
          .forEach(edge => {
            const sourceConnections = connectionCounts.get(edge.source) || 0;
            if (sourceConnections > 0) {
              sum += (prevPageRanks.get(edge.source) || 0) / sourceConnections;
            }
          });

        pageRanks.set(id, (1 - damping) / nodeMap.size + damping * sum);
      });

      // Check for convergence
      let diff = 0;
      pageRanks.forEach((value, id) => {
        diff += Math.abs(value - (prevPageRanks.get(id) || 0));
      });

      if (diff < epsilon) break;
    }

    // Update node sizes based on PageRank
    nodeMap.forEach((node, id) => {
      const rank = pageRanks.get(id) || 0;
      const minSize = 3;
      const maxSize = 12;
      node.data.size = minSize + (maxSize - minSize) * (rank * nodeMap.size * 2);
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
  }, [threads]);

  // Custom theme based on system theme
  const graphTheme = {
    canvas: {
      background: isDark ? '#000' : '#fff',
    },
    node: {
      fill: isDark ? '#666' : '#ccc',
      activeFill: isDark ? '#444' : '#999',
      opacity: 1,
      selectedOpacity: 1,
      inactiveOpacity: 0.2,
      label: {
        color: isDark ? '#fff' : '#000',
        activeColor: isDark ? '#fff' : '#000',
        stroke: isDark ? '#000' : '#fff',
        strokeWidth: 0,
        fontSize: 12,
        fontFamily: 'Server Mono, monospace',
      },
    },
    edge: {
      fill: isDark ? 'rgba(102,102,102,0.3)' : 'rgba(153,153,153,0.3)', 
      activeFill: isDark ? 'rgba(68,68,68,0.7)' : 'rgba(153,153,153,0.7)',
      opacity: 1,
      selectedOpacity: 1,
      inactiveOpacity: 0.1,
      label: {
        fontSize: 12,
        fontFamily: 'Server Mono, monospace',
        color: isDark ? '#fff' : '#000',
        activeColor: isDark ? '#fff' : '#000',
        strokeWidth: 0,
      },
    },
    ring: {
      fill: isDark ? '#666' : '#ccc',
      activeFill: isDark ? '#444' : '#999',
    },
    arrow: {
      fill: isDark ? 'rgba(102,102,102,0.3)' : 'rgba(153,153,153,0.3)',
      activeFill: isDark ? 'rgba(68,68,68,0.7)' : 'rgba(153,153,153,0.7)',
    },
    lasso: {
      border: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    }
  } as const;

  return (
    <div className="flex-1 flex flex-col h-full bg-background" ref={containerRef}>
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">Knowledge Graph</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}, {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
        </p>
      </div>
      <div className="flex-1 relative">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            theme={graphTheme}
            labelType="all"
            draggable
            enableZoom
            enablePan
            height={dimensions.height}
            width={dimensions.width}
            onNodeClick={(node) => onNodeClick?.(node.id)}
            forceConfig={{
              charge: -200,
              linkDistance: 100,
              collisionRadius: 10,
            }}
          />
        )}
      </div>
    </div>
  );
}; 