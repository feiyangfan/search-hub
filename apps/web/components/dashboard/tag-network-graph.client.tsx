'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3-force';
import Link from 'next/link';
import { Search } from 'lucide-react';

export interface TagNetworkNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: 'tag' | 'document';
    color: string;
    size: number;
    x?: number;
    y?: number;
}

export interface TagNetworkEdge extends d3.SimulationLinkDatum<TagNetworkNode> {
    source: string | TagNetworkNode;
    target: string | TagNetworkNode;
}

interface TagNetworkGraphClientProps {
    nodes: TagNetworkNode[];
    edges: TagNetworkEdge[];
}

const SQUARE_SCALE = 1.8;
const DOCUMENT_COLOR = '#22c55e';
const SIMULATION_STEPS = 200;
const MIN_NODE_SIZE = 10;
const MAX_NODE_SIZE = 26;
const LINK_DISTANCE = 120;
const TAG_STRENGTH = -220;
const DOC_STRENGTH = -120;
const VIEWPORT_PADDING = 32;

export function TagNetworkGraphClient({
    nodes,
    edges,
}: TagNetworkGraphClientProps) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [tooltipNode, setTooltipNode] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [positions, setPositions] = useState<
        Record<string, { x: number; y: number }>
    >({});

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const width = 500;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    useEffect(() => {
        if (!isMounted || nodes.length === 0) {
            return;
        }

        const clampSize = (value: number) =>
            Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, value));

        const simulationNodes = nodes.map((node) => ({
            ...node,
            size: clampSize(node.size),
            x: centerX + (Math.random() - 0.5) * 120,
            y: centerY + (Math.random() - 0.5) * 120,
        }));

        const simulationLinks: TagNetworkEdge[] = edges.map((edge) => ({
            ...edge,
        }));

        const simulation = d3
            .forceSimulation(simulationNodes)
            .force(
                'link',
                d3
                    .forceLink<TagNetworkNode, TagNetworkEdge>(simulationLinks)
                    .id((node) => node.id)
                    .distance(LINK_DISTANCE)
            )
            .force(
                'charge',
                d3
                    .forceManyBody<TagNetworkNode>()
                    .strength((node) =>
                        node.type === 'tag' ? TAG_STRENGTH : DOC_STRENGTH
                    )
            )
            .force('center', d3.forceCenter(centerX, centerY))
            .force(
                'forceX',
                d3
                    .forceX<TagNetworkNode>()
                    .strength(0.05)
                    .x((node) =>
                        node.type === 'tag' ? centerX - 60 : centerX + 60
                    )
            )
            .force(
                'forceY',
                d3.forceY<TagNetworkNode>().strength(0.03).y(centerY)
            )
            .force(
                'collision',
                d3.forceCollide<TagNetworkNode>((node) => node.size + 12)
            )
            .stop();

        for (let i = 0; i < SIMULATION_STEPS; i += 1) {
            simulation.tick();
        }

        const nextPositions: Record<string, { x: number; y: number }> = {};
        const minX = Math.min(...simulationNodes.map((node) => node.x ?? 0));
        const maxX = Math.max(...simulationNodes.map((node) => node.x ?? 0));
        const minY = Math.min(...simulationNodes.map((node) => node.y ?? 0));
        const maxY = Math.max(...simulationNodes.map((node) => node.y ?? 0));

        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const scaleX = (width - VIEWPORT_PADDING * 2) / spanX;
        const scaleY = (height - VIEWPORT_PADDING * 2) / spanY;

        simulationNodes.forEach((node) => {
            const rawX = node.x ?? centerX;
            const rawY = node.y ?? centerY;
            nextPositions[node.id] = {
                x: VIEWPORT_PADDING + (rawX - minX) * scaleX,
                y: VIEWPORT_PADDING + (rawY - minY) * scaleY,
            };
        });
        setPositions(nextPositions);
    }, [nodes, edges, isMounted, centerX, centerY]);

    const positionedNodes = useMemo(() => {
        if (!nodes.length) return [] as TagNetworkNode[];
        return nodes.map((node) => ({
            ...node,
            x: positions[node.id]?.x ?? centerX,
            y: positions[node.id]?.y ?? centerY,
        }));
    }, [nodes, positions, centerX, centerY]);

    const nodeLookup = useMemo(() => {
        const map = new Map<string, TagNetworkNode>();
        positionedNodes.forEach((node) => {
            map.set(node.id, node);
        });
        return map;
    }, [positionedNodes]);

    const getNodeColor = (node: TagNetworkNode) => {
        const baseColor =
            node.type === 'document' ? DOCUMENT_COLOR : node.color;
        if (selectedNode === node.id) return baseColor;
        if (hoveredNode === node.id) return baseColor;
        if (
            hoveredNode &&
            edges.some((e) => e.source === hoveredNode && e.target === node.id)
        ) {
            return baseColor;
        }
        if (
            hoveredNode &&
            edges.some((e) => e.target === hoveredNode && e.source === node.id)
        ) {
            return baseColor;
        }
        return hoveredNode ? '#e5e7eb' : baseColor;
    };

    const resolveRefId = (value: string | TagNetworkNode): string =>
        typeof value === 'string' ? value : value.id;

    const getEdgeOpacity = (edge: TagNetworkEdge) => {
        const sourceId = resolveRefId(edge.source);
        const targetId = resolveRefId(edge.target);
        if (!hoveredNode && !selectedNode) return 0.15;
        if (
            hoveredNode &&
            (sourceId === hoveredNode || targetId === hoveredNode)
        )
            return 0.6;
        if (
            selectedNode &&
            (sourceId === selectedNode || targetId === selectedNode)
        )
            return 0.6;
        return 0.05;
    };

    const isNodeRelated = (nodeId: string) => {
        if (!hoveredNode && !selectedNode) return false;
        const focusId = hoveredNode ?? selectedNode;
        if (!focusId) return false;
        if (nodeId === focusId) return true;
        return edges.some((edge) => {
            const sourceId = resolveRefId(edge.source);
            const targetId = resolveRefId(edge.target);
            return (
                (sourceId === focusId && targetId === nodeId) ||
                (targetId === focusId && sourceId === nodeId)
            );
        });
    };

    if (!isMounted) {
        return (
            <div className="relative w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading graph...
            </div>
        );
    }

    const handleBackgroundClick = (
        event: React.MouseEvent<SVGSVGElement>
    ) => {
        if (event.target === event.currentTarget) {
            setSelectedNode(null);
            setTooltipNode(null);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
                preserveAspectRatio="xMidYMid meet"
                onClick={handleBackgroundClick}
            >
                {/* Edges */}
                <g>
                    {edges.map((edge, index) => {
                        const resolveNode = (
                            ref: string | TagNetworkNode
                        ): TagNetworkNode | undefined => {
                            const nodeId =
                                typeof ref === 'string' ? ref : ref.id;
                            return nodeLookup.get(nodeId);
                        };

                        const sourceNode = resolveNode(edge.source);
                        const targetNode = resolveNode(edge.target);
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
                        const isConnected = isNodeRelated(node.id);

                        const squareSize = node.size * SQUARE_SCALE;
                        const labelOffset =
                            node.type === 'tag'
                                ? node.size + 12
                                : squareSize / 2 + 12;

                        return (
                            <g
                                key={node.id}
                                onMouseEnter={() => {
                                    setHoveredNode(node.id);
                                    setTooltipNode(node.id);
                                }}
                                onMouseLeave={() => {
                                    setHoveredNode(null);
                                    setTooltipNode((prev) =>
                                        selectedNode === node.id
                                            ? prev
                                            : prev === node.id
                                            ? null
                                            : prev
                                    );
                                }}
                                onClick={() =>
                                    setSelectedNode((current) => {
                                        const next =
                                            current === node.id
                                                ? null
                                                : node.id;
                                        setTooltipNode(next ?? null);
                                        return next;
                                    })
                                }
                                className="cursor-pointer"
                            >
                                {/* Node glyph */}
                                {node.type === 'tag' ? (
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={node.size}
                                        fill={getNodeColor(node)}
                                        stroke="#fff"
                                        strokeWidth="2"
                                        opacity={
                                            isHighlighted || isConnected
                                                ? 1
                                                : 0.25
                                        }
                                        className="transition-all duration-200"
                                        style={{
                                            filter:
                                                hoveredNode === node.id
                                                    ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                                                    : 'none',
                                        }}
                                    />
                                ) : (
                                    <rect
                                        x={(node.x ?? 0) - squareSize / 2}
                                        y={(node.y ?? 0) - squareSize / 2}
                                        width={squareSize}
                                        height={squareSize}
                                        rx={4}
                                        ry={4}
                                        fill={getNodeColor(node)}
                                        stroke="#fff"
                                        strokeWidth="2"
                                        opacity={
                                            isHighlighted || isConnected
                                                ? 1
                                                : 0.25
                                        }
                                        className="transition-all duration-200"
                                        style={{
                                            filter:
                                                hoveredNode === node.id
                                                    ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                                                    : 'none',
                                        }}
                                    />
                                )}

                                {/* Node label */}
                                {(node.type === 'tag' ||
                                    isHighlighted ||
                                    isConnected) && (
                                    <text
                                        x={node.x}
                                        y={(node.y ?? 0) + labelOffset}
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
                                            ? `${node.label.substring(
                                                  0,
                                                  15
                                              )}...`
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
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span>Docs</span>
                </div>
            </div>

            {/* Info tooltip */}
            {tooltipNode &&
                (() => {
                    const hoveredData = nodeLookup.get(tooltipNode);
                    if (!hoveredData) return null;

                    const connectionCount = edges.filter(
                        (edge) =>
                            (typeof edge.source === 'string'
                                ? edge.source
                                : edge.source.id) === tooltipNode ||
                            (typeof edge.target === 'string'
                                ? edge.target
                                : edge.target.id) === tooltipNode
                    ).length;

                    const getNodeHref = (node: TagNetworkNode) => {
                        if (node.type === 'document') {
                            const docId = node.id.replace(/^doc-/, '');
                            return `/doc/${docId}`;
                        }
                        if (node.type === 'tag') {
                            const tagId = node.id.replace(/^tag-/, '');
                            return `/dashboard?tag=${tagId}`;
                        }
                        return null;
                    };

                    const href = getNodeHref(hoveredData);

                    return (
                        <div
                            className="absolute top-2 left-2 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/50 text-xs shadow-lg space-y-1"
                            onMouseEnter={() => setTooltipNode(hoveredData.id)}
                            onMouseLeave={() => setTooltipNode(null)}
                        >
                            <p className="font-semibold">{hoveredData.label}</p>
                            <p className="text-muted-foreground text-[0.65rem]">
                                {connectionCount} connections
                            </p>
                            {href ? (
                                <Link
                                    href={href}
                                    className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[0.65rem] font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                </Link>
                            ) : null}
                        </div>
                    );
                })()}
        </div>
    );
}
