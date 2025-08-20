'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Network, RefreshCw, Settings, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentNode {
  id: string;
  name: string;
  wordCount?: number;
  status: string;
  x?: number;
  y?: number;
}

interface RelationshipEdge {
  source: string;
  target: string;
  strength: number;
  type: 'similar' | 'references' | 'contradicts' | 'supplements';
  evidence: string[];
}

interface Props {
  documents: DocumentNode[];
  relationships: Array<{
    sourceDocId: string;
    targetDocId: string;
    relationshipType: 'similar' | 'references' | 'contradicts' | 'supplements';
    strength: number;
    evidence: string[];
  }>;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function DocumentRelationshipGraph({ 
  documents, 
  relationships, 
  onRefresh, 
  loading = false 
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [minStrength, setMinStrength] = useState([0.4]);
  const [showSettings, setShowSettings] = useState(false);

  const processedDocs = documents.filter(doc => doc.status === 'completed');
  const filteredRelationships = relationships.filter(rel => rel.strength >= minStrength[0]);

  // Create a graph layout using a simple force-directed algorithm
  const calculateLayout = () => {
    const nodes = new Map();
    const edges: RelationshipEdge[] = [];

    if (processedDocs.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Initialize nodes
    processedDocs.forEach((doc, index) => {
      const angle = (index / processedDocs.length) * 2 * Math.PI;
      const radius = Math.min(200, 50 + processedDocs.length * 20);
      nodes.set(doc.id, {
        ...doc,
        x: 300 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      });
    });

    // Create edges
    filteredRelationships.forEach(rel => {
      if (nodes.has(rel.sourceDocId) && nodes.has(rel.targetDocId)) {
        edges.push({
          source: rel.sourceDocId,
          target: rel.targetDocId,
          strength: rel.strength,
          type: rel.relationshipType,
          evidence: rel.evidence
        });
      }
    });

    // Simple force simulation
    for (let i = 0; i < 100; i++) {
      // Repulsion between nodes
      for (const [id1, node1] of nodes) {
        for (const [id2, node2] of nodes) {
          if (id1 !== id2) {
            const dx = node1.x - node2.x;
            const dy = node1.y - node2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.min(1000 / (distance * distance), 10);
            
            node1.vx += (dx / distance) * force;
            node1.vy += (dy / distance) * force;
          }
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const source = nodes.get(edge.source);
        const target = nodes.get(edge.target);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const force = (distance - 100) * 0.01 * edge.strength;
          
          source.vx += (dx / distance) * force;
          source.vy += (dy / distance) * force;
          target.vx -= (dx / distance) * force;
          target.vy -= (dy / distance) * force;
        }
      });

      // Update positions
      for (const [id, node] of nodes) {
        node.x += node.vx * 0.1;
        node.y += node.vy * 0.1;
        node.vx *= 0.9;
        node.vy *= 0.9;

        // Keep nodes within bounds
        node.x = Math.max(50, Math.min(550, node.x));
        node.y = Math.max(50, Math.min(550, node.y));
      }
    }

    return { nodes: Array.from(nodes.values()), edges };
  };

  const { nodes, edges } = calculateLayout();

  const getEdgeColor = (type: string, strength: number) => {
    const alpha = Math.min(strength * 2, 1);
    const colors = {
      similar: `rgba(96, 165, 250, ${alpha})`, // blue-400
      references: `rgba(74, 222, 128, ${alpha})`, // green-400  
      contradicts: `rgba(248, 113, 113, ${alpha})`, // red-400
      supplements: `rgba(168, 85, 247, ${alpha})` // purple-400
    };
    return colors[type as keyof typeof colors] || `rgba(156, 163, 175, ${alpha})`;
  };

  const getNodeSize = (doc: DocumentNode) => {
    if (!doc.wordCount) return 25;
    const normalized = Math.log(doc.wordCount + 1) / Math.log(10000 + 1);
    return 15 + normalized * 25;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const getConnectedNodes = (nodeId: string) => {
    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  };

  const connectedNodes = selectedNode ? getConnectedNodes(selectedNode) : new Set();

  if (loading) {
    return (
      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="h-5 w-5" />
            Document Relationship Graph
          </CardTitle>
          <CardDescription className="text-gray-400">
            Visual representation of relationships between your documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <span className="ml-3 text-gray-300">Analyzing relationships...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main Graph */}
      <div className="xl:col-span-2">
        <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Network className="h-5 w-5 text-purple-400" />
                  Document Relationship Graph
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Visual representation of relationships between your documents
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {showSettings && (
              <Card className="p-4 bg-gray-800/40 border-gray-600">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-300">
                      Minimum Relationship Strength: {(minStrength[0] * 100).toFixed(0)}%
                    </label>
                    <Slider
                      value={minStrength}
                      onValueChange={setMinStrength}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Showing {filteredRelationships.length} of {relationships.length} relationships</span>
                    <span>{processedDocs.length} documents</span>
                  </div>
                </div>
              </Card>
            )}

            <div className="relative">
              {/* Controls */}
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleZoomIn}
                  className="bg-gray-900/90 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleZoomOut}
                  className="bg-gray-900/90 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Legend */}
              <div className="absolute top-2 left-2 z-10 bg-gray-900/95 border border-gray-600 rounded-lg p-3 shadow-lg backdrop-blur-sm">
                <div className="text-sm font-medium mb-2 text-white">Relationship Types</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-blue-400"></div>
                    <span className="text-gray-200">Similar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-400"></div>
                    <span className="text-gray-200">References</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-400"></div>
                    <span className="text-gray-200">Contradicts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-purple-400"></div>
                    <span className="text-gray-200">Supplements</span>
                  </div>
                </div>
              </div>

              {/* SVG Graph */}
              <div ref={containerRef} className="border border-gray-700 rounded-lg overflow-hidden">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="500"
                  viewBox="0 0 600 500"
                  style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                  className="bg-gray-900/50"
                >
                  {/* Edges */}
                  {edges.map((edge, index) => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const targetNode = nodes.find(n => n.id === edge.target);
                    
                    if (!sourceNode || !targetNode) return null;

                    const isHighlighted = selectedNode && 
                      (edge.source === selectedNode || edge.target === selectedNode);
                    const opacity = selectedNode && !isHighlighted ? 0.2 : 1;

                    return (
                      <line
                        key={index}
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={getEdgeColor(edge.type, edge.strength)}
                        strokeWidth={2 + edge.strength * 3}
                        opacity={opacity}
                        className="transition-opacity duration-200"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const size = getNodeSize(node);
                    const isSelected = selectedNode === node.id;
                    const isConnected = connectedNodes.has(node.id);
                    const opacity = selectedNode && !isSelected && !isConnected ? 0.3 : 1;

                    return (
                      <g key={node.id} className="transition-opacity duration-200" opacity={opacity}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={size}
                          fill={isSelected ? '#8B5CF6' : '#374151'}
                          stroke={isSelected ? '#A855F7' : '#6B7280'}
                          strokeWidth={isSelected ? 3 : 2}
                          className="cursor-pointer hover:fill-purple-400 transition-colors"
                          onClick={() => handleNodeClick(node.id)}
                        />
                        <text
                          x={node.x}
                          y={node.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs fill-gray-200 pointer-events-none select-none font-medium"
                          style={{ fontSize: Math.max(10, size / 3) }}
                        >
                          {node.name.length > 12 ? node.name.substring(0, 9) + '...' : node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-white">{processedDocs.length}</div>
                <div className="text-sm text-gray-400">Documents</div>
              </div>
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-white">{filteredRelationships.length}</div>
                <div className="text-sm text-gray-400">Relationships</div>
              </div>
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-white">
                  {filteredRelationships.length > 0 
                    ? (filteredRelationships.reduce((sum, rel) => sum + rel.strength, 0) / filteredRelationships.length * 100).toFixed(0) + '%'
                    : '0%'
                  }
                </div>
                <div className="text-sm text-gray-400">Avg Strength</div>
              </div>
            </div>

            {processedDocs.length < 2 && (
              <Alert className="bg-yellow-900/20 border-yellow-500/50">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  Upload and process at least 2 documents to see relationship analysis
                </AlertDescription>
              </Alert>
            )}

            {processedDocs.length >= 2 && filteredRelationships.length === 0 && (
              <Alert className="bg-blue-900/20 border-blue-500/50">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  No relationships found with the current strength threshold. Try lowering the minimum strength in settings.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="xl:col-span-1">
        {selectedNode ? (
          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardHeader>
              <CardTitle className="text-white">Selected Document</CardTitle>
              <CardDescription className="text-gray-400">
                Document details and relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const node = nodes.find(n => n.id === selectedNode);
                const nodeRelationships = edges.filter(e => 
                  e.source === selectedNode || e.target === selectedNode
                );

                return (
                  <>
                    <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700">
                      <h4 className="font-semibold text-white mb-2">{node?.name}</h4>
                      <div className="space-y-1 text-sm text-gray-400">
                        {node?.wordCount && <div>{node.wordCount.toLocaleString()} words</div>}
                        <div>{nodeRelationships.length} relationship{nodeRelationships.length !== 1 ? 's' : ''}</div>
                        <Badge className="bg-green-600 text-white">
                          {node?.status}
                        </Badge>
                      </div>
                    </div>

                    {nodeRelationships.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-3 text-gray-300">Related Documents:</div>
                        <div className="space-y-2">
                          {nodeRelationships.map((rel, index) => {
                            const relatedNodeId = rel.source === selectedNode ? rel.target : rel.source;
                            const relatedNode = nodes.find(n => n.id === relatedNodeId);
                            
                            return (
                              <div key={index} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-white truncate">{relatedNode?.name}</span>
                                  <Badge 
                                    className="text-xs"
                                    style={{ 
                                      backgroundColor: getEdgeColor(rel.type, 1),
                                      color: 'white',
                                      border: 'none'
                                    }}
                                  >
                                    {rel.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>Strength: {(rel.strength * 100).toFixed(0)}%</span>
                                  <button
                                    onClick={() => setSelectedNode(relatedNodeId)}
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                  >
                                    View details →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => setSelectedNode(null)}
                      variant="outline"
                      className="w-full bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                    >
                      Clear Selection
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-8 text-center">
              <Network className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Select a Document</h3>
              <p className="text-gray-400 mb-6">Click on any document node in the graph to view its relationships and details</p>
              
              {processedDocs.length >= 2 && (
                <div className="text-sm text-gray-400 space-y-2">
                  <p><strong>{processedDocs.length}</strong> documents analyzed</p>
                  <p><strong>{relationships.length}</strong> relationships discovered</p>
                  <p><strong>{filteredRelationships.length}</strong> above threshold</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}