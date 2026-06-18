import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles, Radio, Zap, Activity, Maximize2, Database, Tv, GripVertical } from 'lucide-react';
import { NODE_TEMPLATES } from '../data';
import { CATEGORIES, NodeTypeConfig } from '../types';

interface NodeLibraryProps {
  onAddNode: (type: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const NodeLibrary: React.FC<NodeLibraryProps> = ({
  onAddNode,
  collapsed,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    input: true,
    ai: true,
    effects: true,
    audio: true,
    transform: true,
    training: true,
    output: true,
  });

  const categoryIcons: Record<string, any> = {
    Radio,
    Sparkles,
    Zap,
    Activity,
    Maximize2,
    Database,
    Tv
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Group and filter templates
  const filteredTemplates = React.useMemo(() => {
    return NODE_TEMPLATES.filter((tmpl) => {
      const matchSearch =
        tmpl.name.toLowerCase().includes(search.toLowerCase()) ||
        tmpl.description.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [search]);

  const groupedTemplates = React.useMemo(() => {
    const groups: Record<string, NodeTypeConfig[]> = {
      input: [],
      ai: [],
      effects: [],
      audio: [],
      transform: [],
      training: [],
      output: [],
    };

    filteredTemplates.forEach((tmpl) => {
      if (groups[tmpl.category]) {
        groups[tmpl.category].push(tmpl);
      }
    });

    return groups;
  }, [filteredTemplates]);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-[#0d0a1c]/40 backdrop-blur-md border-r border-white/10 flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <button 
          onClick={onToggleCollapse}
          className="p-1 px-1.5 rounded-md hover:bg-white/5 text-violet-400 hover:text-white transition-all text-xs font-bold font-mono tracking-wider"
          title="Expand Node Library"
        >
          &gt;&gt;
        </button>
        <div className="h-[1px] w-8 bg-white/10" />
        {Object.entries(CATEGORIES).map(([id, cat]) => {
          const IconComponent = categoryIcons[cat.icon] || Zap;
          return (
            <div 
              key={id} 
              className="p-2 rounded-lg hover:bg-white/5 text-[#8b82ad] hover:text-white relative group cursor-pointer transition-colors"
              onClick={onToggleCollapse}
            >
              <IconComponent size={16} style={{ color: cat.color }} />
              {/* Tooltip on hover */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#0d0a1c]/90 border border-white/10 text-[#e7e2f5] text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                {cat.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-[#0d0a1c]/80 backdrop-blur-xl border-r border-white/10 flex flex-col h-full relative transition-all duration-300">
      {/* Search Bar header */}
      <div className="p-3.5 border-b border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold tracking-widest text-[#8b82ad] uppercase flex items-center gap-1.5">
            <span className="w-1 h-3 rounded-full bg-[#8b5cff]" />
            Node Catalog
          </span>
          <button 
            onClick={onToggleCollapse}
            className="text-[10px] uppercase font-mono tracking-wider text-[#8b82ad] hover:text-[#e7e2f5] transition-colors"
          >
            Collapse
          </button>
        </div>

        {/* Input Text Box */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8b82ad]/60" />
          <input
            type="text"
            placeholder="Search processors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-[#8b5cff]/50 rounded-lg py-1.5 pl-8.5 pr-3 text-xs text-[#e7e2f5] placeholder-[#8b82ad]/40 focus:outline-none focus:ring-1 focus:ring-[#8b5cff]/30 transition-all font-sans"
          />
        </div>
      </div>

      {/* Catalog lists scroll area */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
        {Object.entries(CATEGORIES).map(([catId, cat]) => {
          const templates = groupedTemplates[catId] || [];
          if (templates.length === 0 && search) return null;

          const isExpanded = expandedCategories[catId];
          const IconComponent = categoryIcons[cat.icon] || Zap;

          return (
            <div key={catId} className="flex flex-col">
              {/* Category trigger accordion bar */}
              <div 
                onClick={() => toggleCategory(catId)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-violet-950/20 cursor-pointer text-[#8b82ad] hover:text-[#e7e2f5] transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                    <IconComponent size={12.5} style={{ color: cat.color }} />
                  </div>
                  <span className="text-[11.5px] font-semibold text-white/90">
                    {cat.name}
                  </span>
                  <span className="text-[9px] font-mono opacity-65 bg-[#1a1530]/60 px-1 rounded">
                    {templates.length}
                  </span>
                </div>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>

              {/* Collapsible nodes body list */}
              {isExpanded && (
                <div className="pl-6.5 pr-1 py-1 flex flex-col gap-1.5 transition-all">
                  {templates.length === 0 ? (
                    <div className="text-[10px] text-[#8b82ad]/50 py-1 font-mono italic">
                      Empty match
                    </div>
                  ) : (
                    templates.map((tmpl) => (
                      <div
                        key={tmpl.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tmpl.type)}
                        onClick={() => onAddNode(tmpl.type)}
                        className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#8b5cff]/40 rounded-xl p-2 cursor-grab active:cursor-grabbing transition-all flex flex-col select-none relative"
                      >
                        {/* Drag grip indicator left */}
                        <div className="absolute left-1.5 top-2 opacity-0 group-hover:opacity-100 text-violet-500/40 transition-opacity">
                          <GripVertical size={11} />
                        </div>

                        {/* Title and Action add button */}
                        <div className="pl-2.5 flex items-center justify-between">
                          <span className="text-[11.5px] font-semibold text-[#e7e2f5] group-hover:text-white">
                            {tmpl.name}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddNode(tmpl.type);
                            }}
                            className="w-4 h-4 rounded bg-violet-950 hover:bg-[#8b5cff] text-violet-400 hover:text-white flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all border border-violet-500/20"
                            title="Add node to canvas"
                          >
                            +
                          </button>
                        </div>

                        <p className="pl-2.5 mt-1 text-[9.5px] leading-relaxed text-[#8b82ad]">
                          {tmpl.description}
                        </p>

                        {/* Quick type tags at bottom */}
                        <div className="pl-2.5 mt-1.5 flex gap-1">
                          {tmpl.inputs.map((p) => (
                            <span 
                              key={p.id}
                              className="text-[8px] font-mono uppercase bg-[#1a1530] text-[#8b82ad] px-1 rounded border border-violet-500/5 hover:text-white"
                              title={`Input: ${p.name}`}
                            >
                              In
                            </span>
                          ))}
                          {tmpl.outputs.map((p) => (
                            <span 
                              key={p.id}
                              className="text-[8px] font-mono uppercase bg-[#1a1530] text-[#8b82ad] px-1 rounded border border-violet-500/5 hover:text-white"
                              title={`Output: ${p.name}`}
                            >
                              Out
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Tips Footer */}
      <div className="p-3 border-t border-white/5 bg-transparent text-[10px] text-[#8b82ad]/85 leading-relaxed flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-violet-400 font-semibold uppercase text-[8.5px]">
          <span className="w-1 h-1 bg-[#8b5cff] rounded-full animate-ping" /> Pro Tip
        </div>
        <span>Drag a node card onto the canvas grid, or click <strong>+</strong> to quick-spawn it at your view center. Press <strong>⌘K</strong> for workspace actions.</span>
      </div>
    </div>
  );
};
