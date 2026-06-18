import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Square, Save, Download, RotateCcw, RotateCw, 
  Search, Cpu, Check, AlertCircle, Info, ChevronRight, Activity
} from 'lucide-react';
import { NodeInstance, Connection, GroupLabel, ToastItem, HistoryItem } from './types';
import { NODE_TEMPLATES, INITIAL_NODES, INITIAL_CONNECTIONS, INITIAL_GROUP_LABELS } from './data';
import { NodeLibrary } from './components/NodeLibrary';
import { NodeCanvas } from './components/NodeCanvas';
import { Inspector } from './components/Inspector';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  // Main State Graph
  const [nodes, setNodes] = useState<NodeInstance[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groupLabels] = useState<GroupLabel[]>(INITIAL_GROUP_LABELS);

  // Viewport and Panels
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // History Undo/Redo Stacks
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);

  // Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Refs for tracking focus
  const isInputFocusedRef = useRef(false);

  // Helper: push state onto undo stack
  const saveToHistory = (currentNodes: NodeInstance[], currentConnections: Connection[]) => {
    setHistory((prev) => [...prev, { nodes: currentNodes, connections: currentConnections }]);
    setRedoStack([]); // Clear redo stack on new action
  };

  // Initial load with localStorage check
  useEffect(() => {
    const cached = localStorage.getItem('cosmos_node_studio_save_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.nodes && parsed.connections) {
          setNodes(parsed.nodes);
          setConnections(parsed.connections);
          addToast('Restored last draft session from cache', 'success');
          return;
        }
      } catch (err) {
        console.error('Failed to parse cached workspace', err);
      }
    }

    // Default Starting Graph Fallback
    setNodes(INITIAL_NODES);
    setConnections(INITIAL_CONNECTIONS);
    addToast('Initialized default generative story grid', 'info');
  }, []);

  // Track if text input blocks are focused to avoid triggering shortcuts
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        isInputFocusedRef.current = true;
      }
    };
    const handleFocusOut = () => {
      isInputFocusedRef.current = false;
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Global Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Toggle command palette (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Allow native keys if user is typing in form inputs
      if (isInputFocusedRef.current) return;

      // 2. Undo (Cmd+Z or Ctrl+Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // 3. Redo (Cmd+Y / Ctrl+Y / Cmd+Shift+Z)
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }

      // 4. Delete selected nodes with Backspace / Delete keys
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          saveToHistory(nodes, connections);
          
          // Filter selected nodes and associations
          const updatedNodes = nodes.filter((n) => !selectedNodeIds.includes(n.id));
          const updatedConnections = connections.filter(
            (c) => !selectedNodeIds.includes(c.fromNodeId) && !selectedNodeIds.includes(c.toNodeId)
          );

          setNodes(updatedNodes);
          setConnections(updatedConnections);
          setSelectedNodeIds([]);
          addToast(`Pruned ${selectedNodeIds.length} element(s) from network`, 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, connections, selectedNodeIds]);

  // Notifications push handler
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Undo / Redo engine implementations
  const handleUndo = () => {
    if (history.length === 0) {
      addToast('End of undo stack history', 'info');
      return;
    }
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, { nodes, connections }]);
    setNodes(previous.nodes);
    setConnections(previous.connections);
    setSelectedNodeIds([]);
    addToast('Undo action applied', 'info');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) {
      addToast('End of redo stack space', 'info');
      return;
    }
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, { nodes, connections }]);
    setNodes(next.nodes);
    setConnections(next.connections);
    setSelectedNodeIds([]);
    addToast('Redo action restored', 'info');
  };

  // Drag-drop canvas spawn instantiators
  const handleQuickAddNodeAtCenter = (type: string) => {
    saveToHistory(nodes, connections);

    const baseTmpl = NODE_TEMPLATES.find((t) => t.type === type);
    if (!baseTmpl) return;

    // Place at slightly random centered coordinates
    const offset = Math.floor(Math.random() * 40) - 20;
    const canvas = document.getElementById('main-canvas');
    let posX = 450 + offset;
    let posY = 240 + offset;

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      // Translate center
      posX = Math.round((rect.width / 2 - 100) / 15) * 15;
      posY = Math.round((rect.height / 2 - 80) / 15) * 15;
    }

    const newNode: NodeInstance = {
      id: `node_add_${Date.now()}`,
      type: type,
      title: `${baseTmpl.name} ${nodes.filter(n => n.type === type).length + 1}`,
      position: { x: posX, y: posY },
      inputs: [...baseTmpl.inputs],
      outputs: [...baseTmpl.outputs],
      values: { ...baseTmpl.defaultValues },
      category: baseTmpl.category,
      status: 'running',
    };

    setNodes((prev) => [...prev, newNode]);
    addToast(`Instantiated ${baseTmpl.name}`, 'success');
  };

  // Commands palette mapper
  const handleTriggerAction = (actionId: string) => {
    if (actionId === 'run') {
      setIsPlaying(true);
      addToast('Cosmos Engine signal loop: RUNNING', 'success');
    } else if (actionId === 'stop') {
      setIsPlaying(false);
      addToast('Cosmos Engine signal loop: TERMINATED', 'info');
    } else if (actionId === 'save') {
      localStorage.setItem(
        'cosmos_node_studio_save_v1',
        JSON.stringify({ nodes, connections })
      );
      addToast('Pipeline states securely saved in localStorage', 'success');
    } else if (actionId === 'export') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, connections }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `cosmos_pipeline_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addToast('JSON pipeline schema file exported', 'success');
    } else if (actionId === 'clear') {
      saveToHistory(nodes, connections);
      setNodes([]);
      setConnections([]);
      setSelectedNodeIds([]);
      addToast('Workspace slate cleared', 'info');
    } else if (actionId === 'reset') {
      saveToHistory(nodes, connections);
      setNodes(INITIAL_NODES);
      setConnections(INITIAL_CONNECTIONS);
      setSelectedNodeIds([]);
      addToast('Reloaded storytelling starting template', 'info');
    }
  };

  // Updaters for single parameter value inside Inspector or node body
  const handleUpdateNodeValue = (nodeId: string, paramName: string, value: any) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            values: {
              ...n.values,
              [paramName]: value,
            },
          };
        }
        return n;
      })
    );
  };

  // Multi-presets schema builder loader
  const handleLoadPreset = (presetName: string) => {
    saveToHistory(nodes, connections);

    if (presetName === 'Reactive Cosmic Wave') {
      // Setup microphone -> analyzer -> particle fields -> preview
      const micId = 'node_mic_p';
      const anaId = 'node_ana_p';
      const partId = 'node_part_p';
      const prevId = 'node_prev_p';

      const micNode: NodeInstance = {
        id: micId,
        type: 'microphone-capture',
        title: 'Microphone Input Source',
        position: { x: 120, y: 220 },
        inputs: [],
        outputs: [{ id: 'audio', name: 'Analog Out', type: 'audio' }],
        values: { gain: 1.5, device: 'Supercardioid Mic', mute: false },
        category: 'input',
        status: 'running',
      };

      const anaNode: NodeInstance = {
        id: anaId,
        type: 'waveform-analyzer',
        title: 'Fourier FFT Analyzer',
        position: { x: 400, y: 220 },
        inputs: [{ id: 'audio', name: 'Signal In', type: 'audio' }],
        outputs: [
          { id: 'spectrum', name: 'DFT Bands', type: 'audio' },
          { id: 'intensity', name: 'Intensity Out', type: 'params' },
        ],
        values: { bands: '128 Mid-bands', smoothing: 0.82 },
        category: 'audio',
        status: 'running',
      };

      const partNode: NodeInstance = {
        id: partId,
        type: 'particle-field',
        title: 'Reactive GPU Particles',
        position: { x: 740, y: 220 },
        inputs: [
          { id: 'input', name: 'VFS Feed', type: 'media' },
          { id: 'stimulus', name: 'Freq Input', type: 'params' },
        ],
        outputs: [{ id: 'output', name: 'Particles', type: 'media' }],
        values: { count: 2400, size: 3.2, velocity: 2.2, glow: true },
        category: 'effects',
        status: 'running',
      };

      const prevNode: NodeInstance = {
        id: prevId,
        type: 'preview',
        title: 'Spectral Preview Monitor',
        position: { x: 1080, y: 220 },
        inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
        outputs: [],
        values: { quality: 'WebGPU Unlocked' },
        category: 'output',
        status: 'running',
      };

      const conns: Connection[] = [
        { id: 'pc_1', fromNodeId: micId, fromPortId: 'audio', toNodeId: anaId, toPortId: 'audio' },
        { id: 'pc_2', fromNodeId: anaId, fromPortId: 'intensity', toNodeId: partId, toPortId: 'stimulus' },
        { id: 'pc_3', fromNodeId: partId, fromPortId: 'output', toNodeId: prevId, toPortId: 'input' },
      ];

      setNodes([micNode, anaNode, partNode, prevNode]);
      setConnections(conns);
      setSelectedNodeIds([partId]);
      addToast('Loaded Audio-Reactive Scene template', 'success');

    } else if (presetName === 'AI Style Weaver Suite') {
      // Source -> Style -> Upscaler -> Preview
      const srcId = 'nw_src';
      const styId = 'nw_sty';
      const upsId = 'nw_ups';
      const prvId = 'nw_prv';

      const srcNode: NodeInstance = {
        id: srcId,
        type: 'media-source',
        title: 'HD Deep Space Loop',
        position: { x: 120, y: 220 },
        inputs: [],
        outputs: [{ id: 'output', name: 'Feed', type: 'media' }],
        values: { source: 'Quantum Nebular', fps: 30, scale: '16:9 Cinema' },
        category: 'input',
        status: 'running',
      };

      const styNode: NodeInstance = {
        id: styId,
        type: 'style-engine',
        title: 'Chroma Noir Stylizer',
        position: { x: 420, y: 220 },
        inputs: [{ id: 'input', name: 'Feed', type: 'media' }],
        outputs: [{ id: 'output', name: 'Styled', type: 'media' }],
        values: { style: 'Chroma Noir', strength: 0.95, coherence: 85 },
        category: 'ai',
        status: 'running',
      };

      const upsNode: NodeInstance = {
        id: upsId,
        type: 'upscaler',
        title: 'Upscaler SR 4K Magnify',
        position: { x: 720, y: 220 },
        inputs: [{ id: 'input', name: 'LowRes', type: 'media' }],
        outputs: [{ id: 'output', name: 'HighRes', type: 'media' }],
        values: { scale: '4x Ultra-SR', denoise: 20 },
        category: 'ai',
        status: 'running',
      };

      const prvNode: NodeInstance = {
        id: prvId,
        type: 'preview',
        title: '4K Generative Display',
        position: { x: 1020, y: 220 },
        inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
        outputs: [],
        values: { quality: 'WebGPU Unlocked' },
        category: 'output',
        status: 'running',
      };

      setNodes([srcNode, styNode, upsNode, prvNode]);
      setConnections([
        { id: 'wc_1', fromNodeId: srcId, fromPortId: 'output', toNodeId: styId, toPortId: 'input' },
        { id: 'wc_2', fromNodeId: styId, fromPortId: 'output', toNodeId: upsId, toPortId: 'input' },
        { id: 'wc_3', fromNodeId: upsId, fromPortId: 'output', toNodeId: prvId, toPortId: 'input' },
      ]);
      setSelectedNodeIds([styId]);
      addToast('Loaded AI Style Synthesizer preset', 'success');

    } else if (presetName === 'VFX Particle Orbit Playground') {
      // Radar Modulator -> GPU particles -> preview
      const radId = 'vfx_rad';
      const prtId = 'vfx_prt';
      const outId = 'vfx_out';

      const radNode: NodeInstance = {
        id: radId,
        type: 'radar-editor',
        title: 'Orbital Parameters Modulator',
        position: { x: 140, y: 200 },
        inputs: [],
        outputs: [{ id: 'params', name: 'Vector Field', type: 'params' }],
        values: {
          vectors: [
            { label: 'Style', val: 0.95 },
            { label: 'Fidelity', val: 0.75 },
            { label: 'Entropy', val: 0.8 },
            { label: 'Coherence', val: 0.4 },
            { label: 'Harmonics', val: 0.62 },
          ],
        },
        category: 'effects',
        status: 'running',
      };

      const prtNode: NodeInstance = {
        id: prtId,
        type: 'particle-field',
        title: 'Fluid Vector Particle Field',
        position: { x: 500, y: 200 },
        inputs: [
          { id: 'input', name: 'VFS Feed', type: 'media' },
          { id: 'stimulus', name: 'Freq Input', type: 'params' },
        ],
        outputs: [{ id: 'output', name: 'Particles', type: 'media' }],
        values: { count: 3200, size: 2.2, velocity: 1.4, glow: true },
        category: 'effects',
        status: 'running',
      };

      const outNode: NodeInstance = {
        id: outId,
        type: 'preview',
        title: 'Active Particles Screen',
        position: { x: 840, y: 200 },
        inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
        outputs: [],
        values: { quality: 'WebGPU Unlocked' },
        category: 'output',
        status: 'running',
      };

      setNodes([radNode, prtNode, outNode]);
      setConnections([
        { id: 'vc_1', fromNodeId: radId, fromPortId: 'params', toNodeId: prtId, toPortId: 'stimulus' },
        { id: 'vc_2', fromNodeId: prtId, fromPortId: 'output', toNodeId: outId, toPortId: 'input' },
      ]);
      setSelectedNodeIds([radId]);
      addToast('Loaded VFX Vector Playground preset', 'success');

    } else if (presetName === 'Minimalist Clean Seed') {
      const pId = 'sing_p';
      const singlePreview: NodeInstance = {
        id: pId,
        type: 'preview',
        title: 'Central Stream preview',
        position: { x: 300, y: 150 },
        inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
        outputs: [],
        values: { quality: 'WebGPU Unlocked' },
        category: 'output',
        status: 'running',
      };
      setNodes([singlePreview]);
      setConnections([]);
      setSelectedNodeIds([pId]);
      addToast('Loaded fresh minimalist preview placeholder', 'success');
    }
  };

  // Find exact selected node data matching selectedNodeIds
  const activeInspectedNode = useMemo(() => {
    if (selectedNodeIds.length === 0) return null;
    // Inspect the last clicked node
    const lastId = selectedNodeIds[selectedNodeIds.length - 1];
    return nodes.find((n) => n.id === lastId) || null;
  }, [selectedNodeIds, nodes]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-[#e7e2f5] bg-[#05030d] font-sans">
      
      {/* ==================== 1. TOP PREMIUM CHROMED CHROME BAR ==================== */}
      <header className="h-14 bg-[#0d0a1c]/80 backdrop-blur-xl border-b border-[#8b5cff]/30 flex items-center justify-between px-5 z-[999] select-none shadow-[0_4px_30px_rgba(0,0,0,0.45)]">
        {/* Core Cosmos brand with premium gradient design orb */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8b5cff] via-[#46b4ff] to-[#ff5cc2] flex items-center justify-center relative shadow-[0_0_15px_rgba(139,92,255,0.4)]">
            <div className="w-3 h-3 rounded-full bg-[#05030d] flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </div>
            <div className="absolute inset-0.5 top-0.5 bottom-0.5 rounded-full bg-transparent border border-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight leading-none uppercase text-white">
              COSMOS NODE STUDIO
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#8b82ad] uppercase leading-none mt-1">
              v4.2.0 • default_galaxy_manifest.vfx
            </span>
          </div>
        </div>

        {/* Dynamic breadcrumb identifier */}
        <div className="hidden md:flex items-center gap-2 text-[10.5px] font-mono text-[#8b82ad]">
          <span className="text-violet-400">PROJECT_ROOT</span>
          <ChevronRight size={10} />
          <span className="text-white font-semibold">default_galaxy_manifest.vfx</span>
          <ChevronRight size={10} />
          <span className="bg-[#1a1530]/60 px-1.5 py-0.5 border border-white/10 text-[9px] text-[#ff5cc2] rounded font-bold tracking-wider">
            VFX_PIPELINE
          </span>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {/* Main engine run power button */}
          <button
            onClick={() => {
              setIsPlaying((p) => !p);
              addToast(isPlaying ? 'Engine suspended' : 'Cosmos Thread initiated', 'info');
            }}
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-xs font-bold text-white transition-all cursor-pointer shadow-lg hover:scale-[1.02] ${
              isPlaying
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/10'
                : 'bg-gradient-to-r from-[#8b5cff] to-[#46b4ff] shadow-[#8b5cff]/20'
            }`}
          >
            {isPlaying ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                RUNNING
              </>
            ) : (
              <>
                <Play size={10} fill="currentColor" />
                RUN PIPELINE
              </>
            )}
          </button>

          {/* Separation line */}
          <div className="w-[1px] h-4 bg-white/10 ml-2 mr-2" />

          {/* Standard Save action */}
          <button
            onClick={() => handleTriggerAction('save')}
            className="p-2 text-[#8b82ad] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all border border-white/10 text-xs font-bold leading-none"
            title="Save Pipeline to cache (Commit state)"
          >
            <Save size={14} />
          </button>

          {/* Standard Export JSON action */}
          <button
            onClick={() => handleTriggerAction('export')}
            className="p-2 text-[#8b82ad] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all border border-white/10 text-xs font-bold leading-none"
            title="Download JSON diagram"
          >
            <Download size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 ml-1 mr-1" />

          {/* Undo action button */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`p-2 rounded-lg border border-white/10 transition-all leading-none ${
              history.length === 0 
                ? 'opacity-35 text-[#8b82ad]/40 cursor-not-allowed bg-transparent' 
                : 'text-[#8b82ad] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>

          {/* Redo action button */}
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={`p-2 rounded-lg border border-white/10 transition-all leading-none ${
              redoStack.length === 0 
                ? 'opacity-35 text-[#8b82ad]/40 cursor-not-allowed bg-transparent' 
                : 'text-[#8b82ad] hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 ml-1 mr-1" />

          {/* Quick Cmd-K Search trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-1.5 px-3 text-xs text-[#8b82ad] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer border border-white/10 font-mono flex items-center gap-1.5"
            title="Open Command Shell"
          >
            <Search size={12} />
            <span className="hidden sm:inline">⌘K</span>
          </button>

          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full border border-white/20 bg-[#1a1530] flex items-center justify-center font-bold text-xs text-white select-none hover:border-white/50 transition-colors cursor-pointer">
            JD
          </div>
        </div>
      </header>

      {/* ==================== 2. MIDDLE MAIN GRID (Node library + Canvas + Inspector) ==================== */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side catalog component */}
        <NodeLibrary
          onAddNode={handleQuickAddNodeAtCenter}
          collapsed={isLibraryCollapsed}
          onToggleCollapse={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
        />

        {/* Center node graph builder canvas */}
        <NodeCanvas
          nodes={nodes}
          connections={connections}
          groupLabels={groupLabels}
          selectedNodeId={activeInspectedNode?.id || null}
          selectedNodeIds={selectedNodeIds}
          setSelectedNodeIds={setSelectedNodeIds}
          onSelectNode={(nodeId) => {
            if (nodeId) {
              setSelectedNodeIds([nodeId]);
            } else {
              setSelectedNodeIds([]);
            }
          }}
          onUpdateNodes={setNodes}
          onUpdateConnections={setConnections}
          onAddToast={addToast}
          isPlaying={isPlaying}
          onUpdateNodeValue={handleUpdateNodeValue}
        />

        {/* Right side tabbed Inspector component */}
        <Inspector
          selectedNode={activeInspectedNode}
          onUpdateNodeValue={handleUpdateNodeValue}
          collapsed={isInspectorCollapsed}
          onToggleCollapse={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
          nodeCount={nodes.length}
          connCount={connections.length}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onLoadPreset={handleLoadPreset}
        />

      </div>

      {/* ==================== 3. CHROME SYSTEM STATUS BAR ==================== */}
      <footer className="h-7 bg-[#0d0a1c]/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 z-[999] select-none text-[10px] font-mono tracking-wide text-[#8b82ad]">
        
        {/* Status indicator info */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isPlaying ? (
              <strong className="text-emerald-400 uppercase font-semibold">SIGNAL ACTIVE_GALAXY</strong>
            ) : (
              <strong className="text-amber-400 uppercase font-semibold">ENGINE SUSPENDED</strong>
            )}
          </span>
          <div className="hidden sm:inline text-violet-500/50">|</div>
          <span className="hidden sm:inline">MATRIX NODES: <strong className="text-white">{nodes.length}</strong></span>
          <div className="hidden sm:inline text-violet-500/50">|</div>
          <span className="hidden sm:inline">THREADS LOADED: <strong className="text-white">{connections.length}</strong></span>
        </div>

        {/* Mini progress thread bar running representation */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <Activity size={10} className={isPlaying ? 'text-[#ff5cc2] animate-pulse' : 'text-[#8b82ad]/40'} />
            <span>VRAM ALLOCATED: <strong>238.4 MB / 16 GB</strong></span>
          </div>
          <div className="w-16 sm:w-28 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 via-[#ff5cc2] to-cyan-400 rounded-full transition-all duration-300" 
              style={{ width: isPlaying ? '74%' : '2%' }}
            />
          </div>
        </div>
      </footer>

      {/* ==================== 4. COMMAND PALETTE SEARCH modal popup ==================== */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAddNode={handleQuickAddNodeAtCenter}
        onTriggerAction={handleTriggerAction}
      />

      {/* ==================== 5. TOAST NOTIFICATIONS BOTTOM OVERLAY LAYER ==================== */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[99999] pointer-events-none w-full max-w-sm px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`shadow-[0_15px_35px_rgba(0,0,0,0.65)] py-2.5 px-4 rounded-xl border flex items-center gap-3 text-xs pointer-events-auto backdrop-blur-md animate-slide-up bg-[#0d0a1c]/85 border-white/10`}
            style={{
              borderColor: 
                t.type === 'success' ? '#36d39a50' : 
                t.type === 'error' ? '#f8717150' : 
                '#8b5cff50',
              boxShadow: 
                t.type === 'success' ? '0 10px 20px -5px rgba(54,211,154,0.15)' : 
                t.type === 'error' ? '0 10px 20px -5px rgba(248,113,113,0.1)' : 
                '0 10px 20px -5px rgba(139,92,255,0.15)'
            }}
          >
            {/* Status Icon */}
            {t.type === 'success' && <Check size={14} className="text-emerald-400" />}
            {t.type === 'error' && <AlertCircle size={14} className="text-red-400" />}
            {t.type === 'info' && <Info size={14} className="text-[#8b5cff]" />}
            
            <p className="flex-1 text-[#e7e2f5] font-sans pr-2 leading-tight">
              {t.message}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
