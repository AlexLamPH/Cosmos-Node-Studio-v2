import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Trash2, Save, Download, PlusCircle, Play, Square, Info } from 'lucide-react';
import { NODE_TEMPLATES } from '../data';
import { NodeTypeConfig, CATEGORIES } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: string) => void;
  onTriggerAction: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onAddNode,
  onTriggerAction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands and node templates based on query
  const filteredItems = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      type: 'node' | 'action';
      icon: any;
      description: string;
      nodeType?: string;
    }> = [];

    // Add nodes first
    NODE_TEMPLATES.forEach((n) => {
      list.push({
        id: `node-${n.type}`,
        title: `Add Node: ${n.name}`,
        category: CATEGORIES[n.category]?.name || 'Library',
        type: 'node',
        icon: PlusCircle,
        description: n.description,
        nodeType: n.type,
      });
    });

    // Add actions
    list.push(
      {
        id: 'run',
        title: 'Run Pipeline Engine',
        category: 'System Action',
        type: 'action',
        icon: Play,
        description: 'Initiate 60fps render buffer updates along active connections',
      },
      {
        id: 'stop',
        title: 'Stop Pipeline Engine',
        category: 'System Action',
        type: 'action',
        icon: Square,
        description: 'Terminate active render signals and particle processes',
      },
      {
        id: 'save',
        title: 'Save Pipeline state',
        category: 'Workspace file',
        type: 'action',
        icon: Save,
        description: 'Commit current graph layouts and slider states to LocalStorage',
      },
      {
        id: 'export',
        title: 'Export JSON',
        category: 'Workspace file',
        type: 'action',
        icon: Download,
        description: 'Download standard serialized pipeline file',
      },
      {
        id: 'clear',
        title: 'Clear Canvas Layout',
        category: 'System Danger Zone',
        type: 'action',
        icon: Trash2,
        description: 'Wipe all nodes, visualizers, and wires securely',
      },
      {
        id: 'reset',
        title: 'Load Starting Story Graph',
        category: 'Workspace file',
        type: 'action',
        icon: RefreshClockIcon,
        description: 'Reload default 9-node workspace storytelling graph',
      }
    );

    function RefreshClockIcon() {
      return <Info className="text-[#36d39a]" size={15} />;
    }

    if (!search) return list;

    const query = search.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [search]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global key events for Cmd+K and closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((idx) => (idx + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((idx) => (idx - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleSelect(filteredItems[selectedIndex]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems]);

  const handleSelect = (item: typeof filteredItems[0]) => {
    if (item.type === 'node' && item.nodeType) {
      onAddNode(item.nodeType);
    } else {
      onTriggerAction(item.id);
    }
    onClose();
  };

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-[#0d0a1c]/80 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden"
      >
        {/* Search header container */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-transparent">
          <Search className="text-violet-400" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[#e7e2f5] placeholder-[#8b82ad]/60 text-sm focus:outline-none w-full"
            placeholder="Type a node name or workspace action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] font-mono bg-white/5 border border-white/10 text-violet-300 px-1.5 py-0.5 rounded leading-none">
              ESC
            </kbd>
          </div>
        </div>

        {/* Scrollable list items */}
        <div className="max-h-[340px] overflow-y-auto py-2 divide-y divide-[#8b5cff]/5">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#8b82ad]">
              No nodes or commands match "{search}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`px-4 py-2.5 cursor-pointer flex items-start gap-3.5 transition-all outline-none ${
                    isSelected 
                      ? 'bg-white/5 border-l-2 border-[#8b5cff]' 
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#8b5cff]/20 text-[#8b5cff]' : 'bg-white/5 text-[#8b82ad]'} transition-colors`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-[#e7e2f5]' : 'text-[#8b82ad]'} transition-colors`}>
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-violet-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#8b82ad]/80 mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Shortcuts Footer */}
        <div className="px-4 py-2 bg-black/20 text-[#8b82ad] text-[9.5px] font-mono flex justify-between items-center border-t border-white/5">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>ENTER Choose</span>
          </div>
          <div>
            <span>Cosmos Command Shell v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
