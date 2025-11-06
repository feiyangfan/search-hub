'use client';

import React, { useState, useEffect } from 'react';

interface Node {
    id: string;
    label: string;
    type: 'tag' | 'document';
    color: string;
    size: number;
    x?: number;
    y?: number;
}

interface Edge {
    source: string;
    target: string;
}

interface TagNetworkGraphProps {
    nodes: Node[];
    edges: Edge[];
}

export function TagNetworkGraph({ nodes, edges }: TagNetworkGraphProps) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate positions in a circular layout with tag-based clustering
    const width = 500;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position nodes
    const positionedNodes = nodes.map((node, index) => {
        if (node.type === 'tag') {
            // Tags in inner circle
            const angle =
                (index / nodes.filter((n) => n.type === 'tag').length) *
                2 *
                Math.PI;
            const radius = 100;
            return {
                ...node,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        } else {
            // Documents in outer circle
            const angle = (index / nodes.length) * 2 * Math.PI;
            const radius = 150;
            return {
                ...node,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        }
    });

    const getNodeColor = (node: Node) => {
        if (selectedNode === node.id) return node.color;
        if (hoveredNode === node.id) return node.color;
        if (
            hoveredNode &&
            edges.some((e) => e.source === hoveredNode && e.target === node.id)
        ) {
            return node.color;
        }
        if (
            hoveredNode &&
            edges.some((e) => e.target === hoveredNode && e.source === node.id)
        ) {
            return node.color;
        }
        return hoveredNode ? '#e5e7eb' : node.color;
    };

    const getEdgeOpacity = (edge: Edge) => {
        if (!hoveredNode && !selectedNode) return 0.15;
        if (
            hoveredNode &&
            (edge.source === hoveredNode || edge.target === hoveredNode)
        )
            return 0.6;
        if (
            selectedNode &&
            (edge.source === selectedNode || edge.target === selectedNode)
        )
            return 0.6;
        return 0.05;
    };

    if (!isMounted) {
        return (
            <div className="relative w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading graph...
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Edges */}
                <g>
                    {edges.map((edge, index) => {
                        const sourceNode = positionedNodes.find(
                            (n) => n.id === edge.source
                        );
                        const targetNode = positionedNodes.find(
                            (n) => n.id === edge.target
                        );
                        if (!sourceNode || !targetNode) return null;

                        return (
                            <line
                                key={index}
                                x1={sourceNode.x}
                                y1={sourceNode.y}
                                x2={targetNode.x}
                                y2={targetNode.y}
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                opacity={getEdgeOpacity(edge)}
                                className="transition-opacity duration-200"
                            />
                        );
                    })}
                </g>

                {/* Nodes */}
                <g>
                    {positionedNodes.map((node) => {
                        const isHighlighted =
                            hoveredNode === node.id ||
                            selectedNode === node.id ||
                            (!hoveredNode && !selectedNode);
                        const isConnected =
                            hoveredNode &&
                            edges.some(
                                (e) =>
                                    (e.source === hoveredNode &&
                                        e.target === node.id) ||
                                    (e.target === hoveredNode &&
                                        e.source === node.id)
                            );

                        return (
                            <g
                                key={node.id}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                onClick={() =>
                                    setSelectedNode(
                                        selectedNode === node.id
                                            ? null
                                            : node.id
                                    )
                                }
                                className="cursor-pointer"
                            >
                                {/* Node circle */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.size}
                                    fill={getNodeColor(node)}
                                    stroke={
                                        node.type === 'tag' ? '#fff' : 'none'
                                    }
                                    strokeWidth="2"
                                    opacity={
                                        isHighlighted || isConnected ? 1 : 0.3
                                    }
                                    className="transition-all duration-200"
                                    style={{
                                        filter:
                                            hoveredNode === node.id
                                                ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                                                : 'none',
                                    }}
                                />

                                {/* Node label */}
                                {(node.type === 'tag' ||
                                    isHighlighted ||
                                    isConnected) && (
                                    <text
                                        x={node.x}
                                        y={node.y! + node.size + 12}
                                        textAnchor="middle"
                                        fontSize={
                                            node.type === 'tag' ? '11' : '9'
                                        }
                                        fontWeight={
                                            node.type === 'tag' ? '600' : '400'
                                        }
                                        fill="currentColor"
                                        className="transition-opacity duration-200 pointer-events-none select-none"
                                        opacity={
                                            isHighlighted || isConnected
                                                ? 1
                                                : 0.5
                                        }
                                    >
                                        {node.label.length > 15
                                            ? node.label.substring(0, 15) +
                                              '...'
                                            : node.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-2 right-2 flex items-center gap-3 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-border/50">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Tags</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Docs</span>
                </div>
            </div>

            {/* Info tooltip */}
            {hoveredNode && (
                <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/50 text-xs shadow-lg">
                    <p className="font-semibold">
                        {
                            positionedNodes.find((n) => n.id === hoveredNode)
                                ?.label
                        }
                    </p>
                    <p className="text-muted-foreground text-[0.65rem] mt-0.5">
                        {
                            edges.filter(
                                (e) =>
                                    e.source === hoveredNode ||
                                    e.target === hoveredNode
                            ).length
                        }{' '}
                        connections
                    </p>
                </div>
            )}
        </div>
    );
}
