import React, { useState } from 'react';
import { Settings, Info, Layers, Layers2, Sparkles, Sliders, ChevronDown, Cpu, Activity, Play, Zap, RefreshCw } from 'lucide-react';
import { NodeInstance, PORT_COLORS, CATEGORIES } from '../types';
import { NODE_TEMPLATES } from '../data';
import { RadarChart, LossCurve } from './CustomControls';

interface InspectorProps {
  selectedNode: NodeInstance | null;
  onUpdateNodeValue: (nodeId: string, paramName: string, value: any) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  nodeCount: number;
  connCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onLoadPreset: (presetName: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedNode,
  onUpdateNodeValue,
  collapsed,
  onToggleCollapse,
  nodeCount,
  connCount,
  isPlaying,
  onTogglePlay,
  onLoadPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'node' | 'graph' | 'presets'>('node');

  // Find template for the selected node
  const nodeTemplate = React.useMemo(() => {
    if (!selectedNode) return null;
    return NODE_TEMPLATES.find((t) => t.type === selectedNode.type) || null;
  }, [selectedNode]);

  if (collapsed) {
    return (
      <div className="w-12 bg-[#0d0a1c]/40 backdrop-blur-md border-l border-white/10 flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <button 
          onClick={onToggleCollapse}
          className="p-1 px-1.5 rounded-md hover:bg-white/5 text-violet-400 hover:text-white transition-all text-xs font-bold font-mono tracking-wider animate-pulse"
          title="Open parameter Inspector"
        >
          &lt;&lt;
        </button>
        <div className="h-[1px] w-8 bg-white/10" />
        <div className="rotate-90 text-[10px] font-mono tracking-widest text-[#8b82ad] uppercase flex-1 whitespace-nowrap pt-8 select-none">
          INSPECTOR MODULE
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] bg-[#0d0a1c]/80 backdrop-blur-xl border-l border-white/10 flex flex-col h-full relative transition-all duration-300">
      {/* Tab bar header */}
      <div className="flex border-b border-white/5 bg-transparent select-none p-1">
        {(['node', 'graph', 'presets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10.5px] font-bold tracking-widest uppercase transition-all rounded-lg relative ${
              activeTab === tab
                ? 'text-white bg-white/5 border border-white/10'
                : 'text-[#8b82ad] hover:text-[#e7e2f5] hover:bg-white/5'
            }`}
          >
            {tab === 'node' && 'Node'}
            {tab === 'graph' && 'Global'}
            {tab === 'presets' && 'Presets'}
          </button>
        ))}
        <button 
          onClick={onToggleCollapse}
          className="px-2 text-[#8b82ad] hover:text-[#e7e2f5] transition-colors"
          title="Collapse Inspector"
        >
          &gt;
        </button>
      </div>

      {/* Tabs active panels */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* ==================== TAB 1: ACTIVE SELECTED NODE DETAILS ==================== */}
        {activeTab === 'node' && (
          <div className="flex flex-col gap-4">
            {!selectedNode ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <Sliders size={20} className="text-[#8b82ad]/45 mb-3.5 animate-pulse" />
                <span className="text-xs font-bold text-[#e7e2f5]">No Node Selected</span>
                <p className="text-[10px] text-[#8b82ad] mt-1.5 leading-relaxed">
                  Click on any node in the canvas grid to inspect and adjust parameters in real-time.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Node Metadata header */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span 
                      className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded leading-none text-white/95"
                      style={{ backgroundColor: `${CATEGORIES[selectedNode.category]?.color}25`, border: `1px solid ${CATEGORIES[selectedNode.category]?.color}30` }}
                    >
                      {CATEGORIES[selectedNode.category]?.name || 'GENERAL'}
                    </span>
                    <span className="text-[9px] font-mono text-[#8b82ad] mt-1">ID: {selectedNode.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide mt-1">{selectedNode.title}</h3>
                  <p className="text-[10px] text-[#8b82ad]/80 leading-relaxed">{nodeTemplate?.description}</p>
                </div>

                {/* Input Fields & Controllers mapping */}
                <div className="flex flex-col gap-3.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#8b82ad] uppercase">Properties</span>

                  {/* Render editable parameters list */}
                  {nodeTemplate?.controls.map((ctrl) => {
                    const currentVal = selectedNode.values[ctrl.name] !== undefined 
                      ? selectedNode.values[ctrl.name] 
                      : (nodeTemplate.defaultValues[ctrl.name] || 0);

                    return (
                      <div key={ctrl.name} className="flex flex-col gap-1.5">
                        {/* Control labels */}
                        {ctrl.type !== 'radar' && ctrl.type !== 'loss-curve' && ctrl.type !== 'wave-analyzer' && ctrl.type !== 'visual-preview' && (
                          <div className="flex justify-between items-center text-[11px] font-mono leading-none">
                            <span className="text-[#8b82ad]">{ctrl.label}</span>
                            <span className="text-white font-semibold">
                              {ctrl.type === 'slider' 
                                ? typeof currentVal === 'number' && currentVal % 1 !== 0 
                                  ? currentVal.toFixed(2) 
                                  : currentVal 
                                : String(currentVal)}
                            </span>
                          </div>
                        )}

                        {/* Slider control with custom glow handles */}
                        {ctrl.type === 'slider' && (
                          <div className="relative flex items-center">
                            <input
                              type="range"
                              min={ctrl.min ?? 0}
                              max={ctrl.max ?? 100}
                              step={ctrl.step ?? 1}
                              value={currentVal}
                              onChange={(e) => onUpdateNodeValue(selectedNode.id, ctrl.name, parseFloat(e.target.value))}
                              className="w-full h-1 bg-[#1a1530] rounded-lg appearance-none cursor-pointer accent-[#8b5cff]"
                              style={{ 
                                background: `linear-gradient(to right, #8b5cff 0%, #8b5cff ${((currentVal - (ctrl.min ?? 0)) / ((ctrl.max ?? 100) - (ctrl.min ?? 0))) * 100}%, #1a1530 ${((currentVal - (ctrl.min ?? 0)) / ((ctrl.max ?? 100) - (ctrl.min ?? 0))) * 100}%, #1a1530 100%)` 
                              }}
                            />
                          </div>
                        )}

                        {/* Dropdown combo control */}
                        {ctrl.type === 'dropdown' && (
                          <div className="relative">
                            <select
                              value={currentVal}
                              onChange={(e) => onUpdateNodeValue(selectedNode.id, ctrl.name, e.target.value)}
                              className="w-full bg-[#0d0a1c] border border-violet-500/15 text-xs text-[#e7e2f5] rounded-lg py-1.5 px-2.5 outline-none focus:border-[#8b5cff]/50 transition-colors cursor-pointer appearance-none"
                            >
                              {ctrl.options?.map((opt) => (
                                <option key={opt} value={opt} className="bg-[#0d0a1c] text-[#e7e2f5]">
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-2.5 pointer-events-none text-[#8b82ad]">
                              <ChevronDown size={12} />
                            </div>
                          </div>
                        )}

                        {/* Toggle switches */}
                        {ctrl.type === 'toggle' && (
                          <div className="flex items-center">
                            <button
                              onClick={() => onUpdateNodeValue(selectedNode.id, ctrl.name, !currentVal)}
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
                                currentVal ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-[#1a1530]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                                  currentVal ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        )}

                        {/* Increment Stepper */}
                        {ctrl.type === 'stepper' && (
                          <div className="flex items-center bg-[#0d0a1c] border border-violet-500/15 rounded-lg overflow-hidden">
                            <button
                              onClick={() => {
                                const min = ctrl.min ?? 0;
                                onUpdateNodeValue(selectedNode.id, ctrl.name, Math.max(min, currentVal - (ctrl.step ?? 1)));
                              }}
                              className="px-2.5 py-1 text-[#8b82ad] hover:text-[#e7e2f5] hover:bg-violet-950/20 font-bold transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center text-xs text-[#e7e2f5] font-mono">{currentVal}</span>
                            <button
                              onClick={() => {
                                const max = ctrl.max ?? 100;
                                onUpdateNodeValue(selectedNode.id, ctrl.name, Math.min(max, currentVal + (ctrl.step ?? 1)));
                              }}
                              className="px-2.5 py-1 text-[#8b82ad] hover:text-[#e7e2f5] hover:bg-violet-950/20 font-bold transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {/* Simple Text input fields */}
                        {ctrl.type === 'input' && (
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => onUpdateNodeValue(selectedNode.id, ctrl.name, e.target.value)}
                            className="bg-[#0d0a1c] border border-violet-500/15 focus:border-[#8b5cff]/50 text-xs text-[#e7e2f5] rounded-lg py-1.5 px-2.5 outline-none focus:ring-1 focus:ring-[#8b5cff]/20 transition-all font-sans"
                            placeholder="Enter latent text..."
                          />
                        )}

                        {/* Color swatch selectors */}
                        {ctrl.type === 'color' && (
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={currentVal}
                              onChange={(e) => onUpdateNodeValue(selectedNode.id, ctrl.name, e.target.value)}
                              className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border-0 bg-transparent ring-1 ring-violet-500/30"
                            />
                            <span className="text-xs font-mono text-white tracking-widest font-semibold">{currentVal.toUpperCase()}</span>
                          </div>
                        )}

                        {/* HERO COMPONENT: RADAR DRAGGABLE INSERTER */}
                        {ctrl.type === 'radar' && (
                          <RadarChart
                            values={currentVal}
                            onChange={(updated) => onUpdateNodeValue(selectedNode.id, ctrl.name, updated)}
                          />
                        )}

                        {/* HERO COMPONENT: LOSS CURVE DASHBOARD */}
                        {ctrl.type === 'loss-curve' && (
                          <LossCurve isTraining={isPlaying} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: GRAPH-WIDE SYSTEM OPTIONS ==================== */}
        {activeTab === 'graph' && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            {/* Graph Statistics list */}
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[10.5px] font-bold text-[#8b82ad] uppercase tracking-wider">
                <span>System Health</span>
                <Cpu size={14} className="text-[#8b5cff]" />
              </div>
              <div className="h-[1px] bg-white/5 my-0.5" />
              <div className="flex justify-between">
                <span className="text-[#8b82ad]">Grid Snap Grid</span>
                <span className="text-white font-mono">15px Steps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b82ad]">Nodes in Grid</span>
                <span className="text-emerald-400 font-mono tracking-wider">{nodeCount} active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b82ad]">Thread Wires</span>
                <span className="text-[#ff5cc2] font-mono tracking-wider">{connCount} links</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b82ad]">Execution Signal</span>
                <span className={`font-mono ${isPlaying ? 'text-[#36d39a]' : 'text-[#8b82ad]/60'}`}>
                  {isPlaying ? '60 FPS / RUN' : 'STOPPED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b82ad]">Calculated VRAM</span>
                <span className="text-white font-mono">2.84 GB / VRAM</span>
              </div>
            </div>

            {/* Run Engine Button toggler */}
            <button
              onClick={onTogglePlay}
              className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border shadow-lg ${
                isPlaying
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-gradient-to-r from-[#8b5cff] to-[#46b4ff] border-violet-400/30 text-white hover:scale-[1.02] hover:shadow-violet-500/10'
              }`}
            >
              {isPlaying ? (
                <>Stop Cosmos Engine</>
              ) : (
                <>Start Pipeline Run ▶</>
              )}
            </button>

            {/* Active thread simulation dashboard visual */}
            <div className="flex flex-col gap-1.5 mt-2 bg-black/40 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-[#8b82ad] flex items-center gap-1">
                <Activity size={11} className="text-[#ff5cc2] animate-pulse" /> ENGINE BUFFER TELEMETRY
              </span>
              <div className="h-1 w-full bg-[#1a1530] rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-violet-500 to-[#ff5cc2] transition-all`}
                  style={{ width: isPlaying ? '92%' : '4%' }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#8b28ae]">
                <span>LATENCY: 1.4ms</span>
                <span>DESYNC: 0.05%</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: WORKSPACE PRESET LOADS ==================== */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-wider text-[#8b82ad] uppercase">Pipeline Templates</span>
            
            {/* Template lists */}
            {[
              {
                name: 'Reactive Cosmic Wave',
                desc: 'Links Microphone Capture to Particle modulations, driving visual dispersion by sound decibels.',
                difficulty: 'Audio Interactive',
                accent: 'nebula'
              },
              {
                name: 'AI Style Weaver Suite',
                desc: 'Generates text prompts, maps Style Latents with custom weights, scaling output images to 4k.',
                difficulty: 'Deep Learning',
                accent: 'cosmic'
              },
              {
                name: 'VFX Particle Orbit Playground',
                desc: 'A procedural canvas with a high-dimensional Radar Node modulating vertex vectors on orbit clusters.',
                difficulty: 'Generative FX',
                accent: 'violet'
              },
              {
                name: 'Minimalist Clean Seed',
                desc: 'Clear the canvas grid entirely and initiate a single centered preview node setup.',
                difficulty: 'Fresh Slate',
                accent: 'aurora'
              }
            ].map((p, idx) => (
              <div
                key={idx}
                onClick={() => onLoadPreset(p.name)}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#8b5cff]/40 p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11.5px] font-semibold text-[#e7e2f5] group-hover:text-white">
                    {p.name}
                  </span>
                  <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded ${
                    p.accent === 'nebula' ? 'text-pink-300 bg-pink-950/20' :
                    p.accent === 'cosmic' ? 'text-cyan-300 bg-cyan-950/20' :
                    p.accent === 'violet' ? 'text-purple-300 bg-purple-950/20' :
                    'text-emerald-300 bg-emerald-950/20'
                  }`}>
                    {p.difficulty}
                  </span>
                </div>
                <p className="text-[10px] text-[#8b82ad] leading-relaxed">
                  {p.desc}
                </p>
                <div className="flex items-center gap-1 text-[9.5px] font-mono text-violet-400 group-hover:text-[#46b4ff] mt-1 transition-colors">
                  <Play size={8} /> Click to restore project preset
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Connection Info footer */}
      <div className="p-3 border-t border-violet-500/10 bg-[#0d0a1c]/40 text-[10px] text-[#8b82ad]/85 leading-relaxed flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-violet-400 font-semibold uppercase text-[8.5px]">
          <Info size={11} /> Presets warning
        </div>
        <span>Restoring a preset template will instantly save your current grid diagram to undo buffers. You can roll back using top undo/redo tools.</span>
      </div>
    </div>
  );
};
