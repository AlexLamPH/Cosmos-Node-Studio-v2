import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Radio, Sparkles, Zap, Activity, Maximize2, Database, Tv, 
  Trash2, Play, Square, Maximize, Minimize, RefreshCw, 
  Plus, X, ChevronDown, Check, FolderOpen, Info, Layers
} from 'lucide-react';
import { NodeInstance, Connection, GroupLabel, PORT_COLORS, PortType, CATEGORIES } from '../types';
import { NODE_TEMPLATES } from '../data';
import { WaveformAnalyzer, VisualPreview, LossCurve } from './CustomControls';

interface NodeCanvasProps {
  nodes: NodeInstance[];
  connections: Connection[];
  groupLabels: GroupLabel[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodes: (nodes: NodeInstance[]) => void;
  onUpdateConnections: (connections: Connection[]) => void;
  onAddToast: (message: string, type: 'info' | 'success' | 'error') => void;
  isPlaying: boolean;
  onUpdateNodeValue: (nodeId: string, paramName: string, value: any) => void;
}

export const NodeCanvas: React.FC<NodeCanvasProps> = ({
  nodes,
  connections,
  groupLabels,
  selectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  onSelectNode,
  onUpdateNodes,
  onUpdateConnections,
  onAddToast,
  isPlaying,
  onUpdateNodeValue,
}) => {
  // Canvas Transform State: infinite pan & zoom
  const [pan, setPan] = useState({ x: -150, y: -80 });
  const [zoom, setZoom] = useState(0.8);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Wire drawing state
  const [drawingWire, setDrawingWire] = useState<{
    nodeId: string;
    portId: string;
    type: PortType;
    isInput: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const [interactiveMouse, setInteractiveMouse] = useState({ x: 0, y: 0 });

  // Right-click menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    nodeId?: string;
  } | null>(null);

  // Direct rename state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeDragOffsets = useRef<Record<string, { x: number; y: number }>>({});
  const startPanCoord = useRef({ x: 0, y: 0 });

  // Flow animation offset for wires
  const [flowOffset, setFlowOffset] = useState(0);

  // Constants
  const NODE_WIDTH = 214;
  const PORT_RADIUS = 5;

  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    const tick = () => {
      setFlowOffset((prev) => (prev + 1) % 100);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Assist: translate client coordinates to Canvas Grid Coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // SVG Helper: Spacing calculations to align wires with CSS ports precisely
  const getInputPortCoords = (node: NodeInstance, portIndex: number) => {
    const startY = 56;
    const stepY = 32;
    return {
      x: node.position.x,
      y: node.position.y + startY + portIndex * stepY
    };
  };

  const getOutputPortCoords = (node: NodeInstance, portIndex: number) => {
    const startY = 56;
    const stepY = 32;
    return {
      x: node.position.x + NODE_WIDTH,
      y: node.position.y + startY + portIndex * stepY
    };
  };

  // Find exact port coord in active nodes list
  const getPortCoordinatesMath = (nodeId: string, portId: string, isInput: boolean) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    if (isInput) {
      const idx = node.inputs.findIndex((p) => p.id === portId);
      return getInputPortCoords(node, idx >= 0 ? idx : 0);
    } else {
      const idx = node.outputs.findIndex((p) => p.id === portId);
      return getOutputPortCoords(node, idx >= 0 ? idx : 0);
    }
  };

  // Mouse wheel Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = 1.05;
    let nextZoom = zoom;

    if (e.deltaY < 0) {
      nextZoom = Math.min(2.0, zoom * zoomFactor);
    } else {
      nextZoom = Math.max(0.2, zoom / zoomFactor);
    }

    // Zoom around cursor calculations
    const canvasMouseX = (mouseX - pan.x) / zoom;
    const canvasMouseY = (mouseY - pan.y) / zoom;

    setPan({
      x: mouseX - canvasMouseX * nextZoom,
      y: mouseY - canvasMouseY * nextZoom,
    });
    setZoom(nextZoom);
  };

  // Pointer Down triggers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (contextMenu) setContextMenu(null);
    if (e.button === 2) {
      // Right click triggering coordinates
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const clickedNode = (e.target as HTMLElement).closest('[data-node-id]');
      const nodeId = clickedNode ? clickedNode.getAttribute('data-node-id') || undefined : undefined;
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        canvasX: coords.x,
        canvasY: coords.y,
        nodeId
      });
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return; // Only process left clicks

    const targetEl = e.target as HTMLElement;
    
    // Check if clicking port
    if (targetEl.closest('[data-port-id]')) return;

    // Check if clicking node body or header
    const nodeEl = targetEl.closest('[data-node-id]');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id')!;
      onSelectNode(nodeId);

      // Handle multi-selection with Shift or Ctrl
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedNodeIds(prev => 
          prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
        );
      } else if (!selectedNodeIds.includes(nodeId)) {
        setSelectedNodeIds([nodeId]);
      }

      // Initialize offsets for dragging
      const currentSelected = selectedNodeIds.includes(nodeId) ? selectedNodeIds : [nodeId];
      if (!selectedNodeIds.includes(nodeId) && !e.shiftKey) {
        setSelectedNodeIds([nodeId]);
      }

      setDraggedNodeId(nodeId);
      nodeDragOffsets.current = {};
      const coords = getCanvasCoords(e.clientX, e.clientY);
      
      // Calculate delta offsets for all dragged nodes
      nodes.forEach(n => {
        if (currentSelected.includes(n.id) || n.id === nodeId) {
          nodeDragOffsets.current[n.id] = {
            x: coords.x - n.position.x,
            y: coords.y - n.position.y
          };
        }
      });

      e.stopPropagation();
      return;
    }

    // Spacebar + click drag OR empty background click drags canvas
    const isOverlayAction = targetEl.closest('button') || targetEl.closest('input') || targetEl.closest('select');
    if (isOverlayAction) return;

    if (e.shiftKey) {
      // Trigger marquee selection box
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMarqueeStart(coords);
      setMarqueeEnd(coords);
    } else {
      // Normal panning on grid canvas empty spacer
      setIsPanning(true);
      startPanCoord.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
      onSelectNode(null);
      setSelectedNodeIds([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1) Canvas Pan dragging
    if (isPanning) {
      setPan({
        x: e.clientX - startPanCoord.current.x,
        y: e.clientY - startPanCoord.current.y
      });
      return;
    }

    // 2) Node dragging with snapping properties
    if (draggedNodeId) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const isSnapOn = true;
      const snapGrid = 15;

      const updatedNodes = nodes.map((n) => {
        const offset = nodeDragOffsets.current[n.id];
        if (offset) {
          let targetX = coords.x - offset.x;
          let targetY = coords.y - offset.y;

          if (isSnapOn) {
            targetX = Math.round(targetX / snapGrid) * snapGrid;
            targetY = Math.round(targetY / snapGrid) * snapGrid;
          }

          return {
            ...n,
            position: { x: targetX, y: targetY }
          };
        }
        return n;
      });

      onUpdateNodes(updatedNodes);
      return;
    }

    // 3) Marquee Select
    if (marqueeStart) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setMarqueeEnd(coords);

      // Select nodes colliding with rect boundaries
      const x1 = Math.min(marqueeStart.x, coords.x);
      const y1 = Math.min(marqueeStart.y, coords.y);
      const x2 = Math.max(marqueeStart.x, coords.x);
      const y2 = Math.max(marqueeStart.y, coords.y);

      const hitIds = nodes.filter((n) => {
        const nx = n.position.x;
        const ny = n.position.y;
        return (
          nx >= x1 - NODE_WIDTH &&
          nx <= x2 &&
          ny >= y1 - 100 &&
          ny <= y2
        );
      }).map(n => n.id);

      setSelectedNodeIds(hitIds);
      return;
    }

    // 4) Update dynamic port wire feedback coords
    if (drawingWire) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setInteractiveMouse(coords);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    setDraggedNodeId(null);
    setMarqueeStart(null);
    setMarqueeEnd(null);

    // Cancel drawing live wires if released outside
    if (drawingWire) {
      setDrawingWire(null);
      onAddToast('Connection cancelled', 'info');
    }
  };

  // Wire drawing connection initialization trigger
  const handlePortPointerDown = (
    e: React.PointerEvent,
    nodeId: string,
    portId: string,
    type: PortType,
    isInput: boolean
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Calculate start port coordinates math basis
    let portC = getPortCoordinatesMath(nodeId, portId, isInput);

    setDrawingWire({
      nodeId,
      portId,
      type,
      isInput,
      startX: portC.x,
      startY: portC.y,
    });

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setInteractiveMouse(coords);
  };

  // Drop port wire triggers connection evaluation
  const handlePortPointerUp = (
    e: React.PointerEvent,
    targetNodeId: string,
    targetPortId: string,
    targetType: PortType,
    isTargetInput: boolean
  ) => {
    e.stopPropagation();
    if (!drawingWire) return;

    // Validation conditions:
    // 1. Cannot connect same node to itself
    // 2. Input to Input / Output to Output is invalid
    // 3. Types must align exactly (or use params modifiers)
    if (drawingWire.nodeId === targetNodeId) {
      onAddToast('Cannot couple node feedback loops directly', 'error');
      setDrawingWire(null);
      return;
    }

    if (drawingWire.isInput === isTargetInput) {
      onAddToast('Must dock Input pin to Output pin', 'error');
      setDrawingWire(null);
      return;
    }

    if (drawingWire.type !== targetType) {
      onAddToast(`Incompatible signal channels: ${drawingWire.type} and ${targetType}`, 'error');
      setDrawingWire(null);
      return;
    }

    // Create correct structural reference
    const sourceNode = drawingWire.isInput ? targetNodeId : drawingWire.nodeId;
    const sourcePort = drawingWire.isInput ? targetPortId : drawingWire.portId;
    const destNode = drawingWire.isInput ? drawingWire.nodeId : targetNodeId;
    const destPort = drawingWire.isInput ? drawingWire.portId : targetPortId;

    // Avoid duplicate wires
    const duplicate = connections.find(
      (c) =>
        c.fromNodeId === sourceNode &&
        c.fromPortId === sourcePort &&
        c.toNodeId === destNode &&
        c.toPortId === destPort
    );

    if (duplicate) {
      onAddToast('These signals are already coupled', 'info');
      setDrawingWire(null);
      return;
    }

    // Insert new wired block
    const newConn: Connection = {
      id: `conn_${Date.now()}`,
      fromNodeId: sourceNode,
      fromPortId: sourcePort,
      toNodeId: destNode,
      toPortId: destPort,
    };

    onUpdateConnections([...connections, newConn]);
    onAddToast('Signal channel coupled successfully', 'success');
    setDrawingWire(null);
  };

  // Wire wire helper curve formula calculations
  const calculateBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1);
    const offset = Math.max(30, Math.min(100, dx * 0.5));
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + offset).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - offset).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };

  // Delete connections
  const handleDeleteConnection = (id: string) => {
    onUpdateConnections(connections.filter((c) => c.id !== id));
    onAddToast('Coupled link removed securely', 'info');
  };

  // Grid background translations
  const gridStyle = useMemo(() => {
    const size = 30 * zoom;
    const offsetX = pan.x % size;
    const offsetY = pan.y % size;

    return {
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      backgroundImage: `radial-gradient(ellipse at center, #25223c 1px, transparent 1px)`,
      backgroundColor: '#05030d'
    };
  }, [pan, zoom]);

  // Context Actions mapping
  const spawnNodeContext = (type: string) => {
    if (!contextMenu) return;

    const baseTmpl = NODE_TEMPLATES.find((t) => t.type === type);
    if (!baseTmpl) return;

    const newNode: NodeInstance = {
      id: `node_${Date.now()}`,
      type: type,
      title: `${baseTmpl.name} ${nodes.filter(n => n.type === type).length + 1}`,
      position: { x: contextMenu.canvasX, y: contextMenu.canvasY },
      inputs: [...baseTmpl.inputs],
      outputs: [...baseTmpl.outputs],
      values: { ...baseTmpl.defaultValues },
      category: baseTmpl.category,
      status: 'running',
    };

    onUpdateNodes([...nodes, newNode]);
    onAddToast(`Spawned ${baseTmpl.name}`, 'success');
    setContextMenu(null);
  };

  const deleteNodeContext = (id: string) => {
    onUpdateNodes(nodes.filter((n) => n.id !== id));
    // Prune invalid wires associated with deleted blocks
    onUpdateConnections(connections.filter((c) => c.fromNodeId !== id && c.toNodeId !== id));
    onAddToast('Node and associated connections deleted', 'info');
    if (selectedNodeId === id) onSelectNode(null);
    setContextMenu(null);
  };

  const duplicateNodeContext = (id: string) => {
    const source = nodes.find((n) => n.id === id);
    if (!source) return;

    const newNode: NodeInstance = {
      ...source,
      id: `node_dup_${Date.now()}`,
      title: `${source.title} (Duplicate)`,
      position: { x: source.position.x + 30, y: source.position.y + 30 },
      values: { ...source.values },
    };

    onUpdateNodes([...nodes, newNode]);
    onAddToast(`Duplicated ${source.title}`, 'success');
    setContextMenu(null);
  };

  // Keyboard accessibility rename trigger
  const triggerRenameNode = (id: string, currentTitle: string) => {
    setEditingTitleId(id);
    setRenameText(currentTitle);
    setContextMenu(null);
  };

  const saveRenameNode = (id: string) => {
    if (renameText.trim()) {
      onUpdateNodes(
        nodes.map((n) => (n.id === id ? { ...n, title: renameText.trim() } : n))
      );
      onAddToast('Title customized successfully', 'success');
    }
    setEditingTitleId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-full relative overflow-hidden select-none touch-none bg-[#05030d]"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      id="main-canvas"
    >
      {/* Background Dots Grid */}
      <div className="absolute inset-0 pointer-events-none" style={gridStyle} />

      {/* ==================== CENTER CANVAS VIEW WRAPPER ==================== */}
      <div 
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG overlay containing connection lines */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto">
          <defs>
            <linearGradient id="violetToCosmic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cff" />
              <stop offset="100%" stopColor="#46b4ff" />
            </linearGradient>
            {/* Glow filters for active connections wires */}
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render floating structural group label partitions */}
          {groupLabels.map((g) => (
            <g key={g.id} className="opacity-35 select-none pointer-events-none">
              {/* Box frame boundary */}
              <rect
                x={g.position.x}
                y={g.position.y}
                width={g.width}
                height={g.height}
                rx="14"
                fill="none"
                stroke="rgba(139, 92, 255, 0.12)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              {/* Header Floating Section label Caption */}
              <text
                x={g.position.x + 12}
                y={g.position.y - 12}
                fill="#8b82ad"
                fontSize="12.5"
                fontWeight="700"
                letterSpacing="1"
                className="uppercase tracking-widest font-sans"
              >
                ● {g.title}
              </text>
            </g>
          ))}

          {/* Rendering the active user-crafted connections */}
          {connections.map((c) => {
            const startP = getPortCoordinatesMath(c.fromNodeId, c.fromPortId, false);
            const endP = getPortCoordinatesMath(c.toNodeId, c.toPortId, true);
            const path = calculateBezier(startP.x, startP.y, endP.x, endP.y);

            // Fetch color mapped by source port
            const fromNode = nodes.find((n) => n.id === c.fromNodeId);
            const portDef = fromNode?.outputs.find((p) => p.id === c.fromPortId);
            const portColor = portDef ? PORT_COLORS[portDef.type] : '#8b5cff';

            // Wire Midpoint calculations for deleting hovering wires satisfaction
            const midX = (startP.x + endP.x) / 2;
            const midY = (startP.y + endP.y) / 2;

            return (
              <g key={c.id} className="group cursor-pointer">
                {/* Thick background interactable sensor ray line */}
                <path
                  d={path}
                  stroke="transparent"
                  strokeWidth="15"
                  fill="none"
                  className="pointer-events-auto"
                />

                {/* Visible detailed core wire line */}
                <path
                  d={path}
                  stroke={portColor}
                  className="group-hover:stroke-white transition-all pointer-events-none"
                  strokeWidth={selectedNodeId === c.id ? 2.5 : 1.5}
                  fill="none"
                  opacity={selectedNodeId === c.id ? 1.0 : 0.65}
                />

                {/* Simulated Energy flowing flow dots along active lines */}
                {isPlaying && (
                  <path
                    d={path}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    fill="none"
                    strokeDasharray="8 35"
                    strokeDashoffset={-flowOffset * 1.5}
                    opacity="0.9"
                    className="pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 3px #ffffff)' }}
                  />
                )}

                {/* Floating midway Hover Trigger Button to delete Link instantly */}
                <g 
                  transform={`translate(${midX}, ${midY})`}
                  className="translate-all opacity-0 group-hover:opacity-100 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConnection(c.id);
                  }}
                >
                  <circle cx="0" cy="0" r="7" fill="#ff5c5c" style={{ filter: 'drop-shadow(0px 1px 4px rgba(0,0,0,0.5))' }} />
                  <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              </g>
            );
          })}

          {/* Live temporary user link feedback currently dragging */}
          {drawingWire && (
            <path
              d={calculateBezier(
                drawingWire.startX,
                drawingWire.startY,
                interactiveMouse.x,
                interactiveMouse.y
              )}
              stroke={PORT_COLORS[drawingWire.type]}
              strokeWidth="1.8"
              strokeDasharray="4 4"
              fill="none"
              opacity="0.8"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* ==================== RENDERING ACTIVE NODES LISTS ==================== */}
        <div className="absolute inset-0 pointer-events-none">
          {nodes.map((n) => {
            const isSelected = selectedNodeIds.includes(n.id);
            const isHeroRun = n.status === 'running' && isPlaying;
            // Fetch configuration matching this node's parameters
            const tmpl = NODE_TEMPLATES.find((t) => t.type === n.type);

            return (
              <div
                key={n.id}
                data-node-id={n.id}
                style={{
                  left: `${n.position.x}px`,
                  top: `${n.position.y}px`,
                  width: `${NODE_WIDTH}px`,
                }}
                className={`absolute bg-[#0d0a1c]/80 backdrop-blur-md rounded-2xl flex flex-col pointer-events-auto select-none overflow-hidden transition-all duration-150 border ${
                  isSelected 
                    ? 'shadow-[0_0_25px_-5px_rgba(139,92,255,0.4)] border-[#8b5cff]/80 ring-1 ring-[#8b5cff]/30' 
                    : 'shadow-[0_18px_50px_rgba(0,0,0,0.55)] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Category colored thin top header rail stripe */}
                <div 
                  className="h-1 w-full"
                  style={{ backgroundColor: CATEGORIES[n.category]?.color || '#8b5cff' }}
                />

                {/* Node main header controller bar */}
                <div 
                  className="px-3 py-2.5 flex items-center justify-between border-b border-white/5 cursor-grab active:cursor-grabbing select-none"
                  onDoubleClick={() => triggerRenameNode(n.id, n.title)}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Render node title or interactive rename box */}
                    {editingTitleId === n.id ? (
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => saveRenameNode(n.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameNode(n.id);
                          if (e.key === 'Escape') setEditingTitleId(null);
                        }}
                        className="bg-black/50 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white max-w-full focus:outline-none focus:ring-1 focus:ring-[#8b5cff]"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[11.5px] font-extrabold text-[#e7e2f5] truncate tracking-wide">
                        {n.title}
                      </span>
                    )}
                  </div>

                  {/* Actions Right trigger */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateNodeContext(n.id);
                      }}
                      className="text-[#8b82ad] hover:text-white text-[10px] bg-white/5 hover:bg-white/10 p-1 rounded cursor-pointer leading-none border border-white/5 transition-colors"
                      title="Duplicate"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNodeContext(n.id);
                      }}
                      className="text-[#8b82ad] hover:text-red-400 text-[10px] bg-white/5 hover:bg-red-500/10 p-1 rounded cursor-pointer leading-none border border-white/5 transition-colors animate-fade"
                      title="Prune Node"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Dynamic Inline Previews representation */}
                {tmpl?.type === 'waveform-analyzer' && (
                  <div className="px-3 pt-2">
                    <WaveformAnalyzer isPlaying={isPlaying} />
                  </div>
                )}

                {tmpl?.type === 'trainer' && (
                  <div className="px-3 pt-2">
                    <LossCurve isTraining={isPlaying} />
                  </div>
                )}

                {tmpl?.type === 'preview' && (
                  <div className="px-3 pt-2">
                    <VisualPreview 
                      isPlaying={isPlaying} 
                      styleMode={nodes.find(v => v.type === 'style-engine')?.values['style'] as string || 'Neural Impressionism'}
                      intensityFactor={isPlaying ? 1.4 : 0.05}
                    />
                  </div>
                )}

                {/* Render input/output docks on left and right borders of the card */}
                <div className="relative py-3 px-3 flex flex-col gap-2 bg-[#0a0816]/30">
                  
                  {/* Left (Input) Ports */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center gap-4.5 -translate-x-1.5 z-40">
                    {n.inputs.map((p, pIdx) => (
                      <div 
                        key={p.id}
                        data-port-id={p.id}
                        onPointerDown={(e) => handlePortPointerDown(e, n.id, p.id, p.type, true)}
                        onPointerUp={(e) => handlePortPointerUp(e, n.id, p.id, p.type, true)}
                        className="w-3.5 h-3.5 rounded-full bg-[#05030d] border-2 cursor-crosshair flex items-center justify-center transition-all group/port"
                        style={{ borderColor: PORT_COLORS[p.type] }}
                      >
                        {/* Hover port tag label popups */}
                        <div className="absolute right-5 bg-[#05030d] border border-violet-500/30 text-[9.5px] px-1.5 py-0.5 rounded shadow-xl font-mono text-white pointer-events-none whitespace-nowrap opacity-0 group-hover/port:opacity-100 transition-opacity z-50">
                          {p.name} ({p.type})
                        </div>
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PORT_COLORS[p.type] }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right (Output) Ports */}
                  <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-4.5 translate-x-1.5 z-40">
                    {n.outputs.map((p, pIdx) => (
                      <div 
                        key={p.id}
                        data-port-id={p.id}
                        onPointerDown={(e) => handlePortPointerDown(e, n.id, p.id, p.type, false)}
                        onPointerUp={(e) => handlePortPointerUp(e, n.id, p.id, p.type, false)}
                        className="w-3.5 h-3.5 rounded-full bg-[#05030d] border-2 cursor-crosshair flex items-center justify-center transition-all group/port"
                        style={{ borderColor: PORT_COLORS[p.type] }}
                      >
                        {/* Hover labels */}
                        <div className="absolute left-5 bg-[#05030d] border border-violet-500/30 text-[9.5px] px-1.5 py-0.5 rounded shadow-xl font-mono text-white pointer-events-none whitespace-nowrap opacity-0 group-hover/port:opacity-100 transition-opacity z-50">
                          {p.name} ({p.type})
                        </div>
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: PORT_COLORS[p.type] }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Simple text info detailing pins */}
                  <div className="flex justify-between items-center text-[9px] text-[#8b82ad] leading-none mb-1 font-mono">
                    <span className="flex flex-col gap-0.5">
                      {n.inputs.map(i => <span key={i.id}>→ {i.name}</span>)}
                    </span>
                    <span className="flex flex-col gap-0.5 text-right items-end">
                      {n.outputs.map(o => <span key={o.id}>{o.name} →</span>)}
                    </span>
                  </div>

                </div>

                {/* Animated shimmer on header during run cycle */}
                {isHeroRun && (
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#8b5cff] to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== SCREEN MARQUEE DOTTED SELECT BOX ==================== */}
      {marqueeStart && marqueeEnd && (
        <div
          className="absolute border border-dashed border-[#8b5cff] bg-[#8b5cff]/5 pointer-events-none z-[1000]"
          style={{
            left: `${Math.min(marqueeStart.x * zoom + pan.x, marqueeEnd.x * zoom + pan.x)}px`,
            top: `${Math.min(marqueeStart.y * zoom + pan.y, marqueeEnd.y * zoom + pan.y)}px`,
            width: `${Math.abs(marqueeStart.x - marqueeEnd.x) * zoom}px`,
            height: `${Math.abs(marqueeStart.y - marqueeEnd.y) * zoom}px`,
          }}
        />
      )}

      {/* ==================== PERSISTENT HUD: FLOATING CONTROLS BOTTOM-LEFT ==================== */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[#0d0a1c]/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-xl select-none z-50">
        <button
          onClick={() => {
            // Recenter coordinates
            setPan({ x: 30, y: 50 });
            setZoom(0.75);
            onAddToast('Viewport centered', 'info');
          }}
          className="p-1.5 text-[#8b82ad] hover:text-[#e7e2f5] bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-all border border-white/5 text-xs font-bold leading-none font-sans flex items-center gap-1.5"
          title="Reset to 100% and view center"
        >
          <FolderOpen size={13} /> CENTER VIEW
        </button>
        <div className="w-[1px] h-4 bg-white/10" />
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
          className="w-7 h-7 bg-white/5 hover:bg-white/10 rounded-full text-violet-400 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer border border-white/5 transition-all"
        >
          -
        </button>
        <span className="text-[11.5px] font-mono font-bold tracking-widest text-[#e7e2f5] min-w-[44px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
          className="w-7 h-7 bg-white/5 hover:bg-white/10 rounded-full text-violet-400 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer border border-white/5 transition-all"
        >
          +
        </button>
      </div>

      {/* ==================== PERSISTENT HUD: MINI-MAP BLOCK BOTTOM-RIGHT ==================== */}
      <div className="absolute bottom-4 right-4 w-32 h-24 bg-[#0d0a1c]/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-1.5 overflow-hidden flex flex-col justify-between hidden sm:flex z-50 pointer-events-none select-none">
        {/* Stat detail */}
        <span className="text-[7.5px] font-mono text-[#8b82ad] uppercase tracking-widest leading-none font-bold">
          Viewport Minimap
        </span>
        {/* Dynamic bounding representation boxes inside map */}
        <div className="flex-1 w-full relative mt-1 bg-[#05030d] rounded-lg border border-violet-500/5 overflow-hidden">
          {nodes.map((n) => (
            <div
              key={n.id}
              className={`absolute rounded-[1px] border ${
                selectedNodeIds.includes(n.id) ? 'bg-[#8b5cff] border-white' : 'bg-violet-500/20 border-violet-500/30'
              }`}
              style={{
                left: `${Math.max(2, Math.min(110, (n.position.x / 1600) * 110))}px`,
                top: `${Math.max(2, Math.min(65, (n.position.y / 800) * 65))}px`,
                width: '16px',
                height: '10px',
              }}
            />
          ))}
          {/* Active scanning bounds viewport */}
          <div 
            className="absolute border border-dashed border-white/20 rounded"
            style={{
              left: `${Math.max(0, (-pan.x / 1600) * 110)}px`,
              top: `${Math.max(0, (-pan.y / 900) * 65)}px`,
              width: `${(1 / zoom) * 35}px`,
              height: `${(1 / zoom) * 25}px`,
            }}
          />
        </div>
      </div>

      {/* ==================== GLASSY RIGHT-CLICK CONTEXT MENU MODAL ==================== */}
      {contextMenu && (
        <div 
          className="fixed bg-[#0d0a1c]/90 backdrop-blur-lg border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] rounded-xl py-2 w-52 z-[99991] font-sans"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.nodeId ? (
            <>
              {/* Contextual actions for selected target node */}
              <div className="px-3.5 py-1 text-[9px] text-[#8b82ad] uppercase font-mono font-bold tracking-widest leading-none border-b border-violet-500/5 pb-2">
                Node Operations
              </div>
              <button
                onClick={() => {
                  if (contextMenu.nodeId) duplicateNodeContext(contextMenu.nodeId);
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-[#e7e2f5] hover:bg-violet-950/40 cursor-pointer flex items-center gap-2 font-medium"
              >
                ⧉ Duplicate Element
              </button>
              <button
                onClick={() => {
                  if (contextMenu.nodeId) triggerRenameNode(contextMenu.nodeId, nodes.find(n => n.id === contextMenu.nodeId)?.title || '');
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-[#e7e2f5] hover:bg-violet-950/40 cursor-pointer flex items-center gap-2 font-medium"
              >
                ✎ Rename Title
              </button>
              <button
                onClick={() => {
                  if (contextMenu.nodeId) deleteNodeContext(contextMenu.nodeId);
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-2 font-semibold"
              >
                ✕ Delete Element
              </button>
            </>
          ) : (
            <>
              {/* Backdrop menu to quick spawn nodes */}
              <div className="px-3.5 py-1 text-[9px] text-[#8b82ad] uppercase font-mono font-bold tracking-widest leading-none border-b border-violet-500/5 pb-2">
                Spawn Processes
              </div>
              <div className="max-h-56 overflow-y-auto">
                {NODE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.type}
                    onClick={() => spawnNodeContext(tmpl.type)}
                    className="w-full text-left px-3.5 py-1.5 text-[11px] text-[#e7e2f5] hover:bg-violet-9i50 hover:bg-[#8b5cff]/20 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span>+ {tmpl.name}</span>
                    <span className="text-[8px] font-mono text-[#8b82ad]">({tmpl.category})</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-violet-500/5 mt-1.5 pt-1">
                <button
                  onClick={() => {
                    onUpdateNodes([]);
                    onUpdateConnections([]);
                    onAddToast('Canvas cleared', 'info');
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                >
                  ⚠ Wipe Matrix Grid
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
