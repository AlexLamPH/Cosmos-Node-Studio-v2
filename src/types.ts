export type AccentColor = 'aurora' | 'cosmic' | 'violet' | 'nebula' | 'sacred' | 'solaris' | 'white';
export type PortType = 'media' | 'audio' | 'text' | 'model' | 'params';

export interface Category {
  id: string;
  name: string;
  accent: AccentColor;
  color: string; // The hex/rgba color code
  icon: string;  // Lucide icon key
  description: string;
}

export const CATEGORIES: Record<string, Category> = {
  input: {
    id: 'input',
    name: 'Input & Capture',
    accent: 'aurora',
    color: '#36d39a',
    icon: 'Radio',
    description: 'Hardware feeds, camera, microphone or files',
  },
  ai: {
    id: 'ai',
    name: 'AI Engines',
    accent: 'cosmic',
    color: '#46b4ff',
    icon: 'Sparkles',
    description: 'Deep neural text, style, voice & upscalers',
  },
  effects: {
    id: 'effects',
    name: 'Effects',
    accent: 'violet',
    color: '#8b5cff',
    icon: 'Zap',
    description: 'Generative particles, shaders and glow nodes',
  },
  audio: {
    id: 'audio',
    name: 'Audio Filter',
    accent: 'nebula',
    color: '#ff5cc2',
    icon: 'Activity',
    description: 'Waveform analyzers, mixers, EQ, and hardware',
  },
  transform: {
    id: 'transform',
    name: 'Transform',
    accent: 'sacred',
    color: '#e0b24a',
    icon: 'Maximize2',
    description: 'Compositors, resize and color grading filters',
  },
  training: {
    id: 'training',
    name: 'Training & Data',
    accent: 'solaris',
    color: '#ff6a3d',
    icon: 'Database',
    description: 'Interactive dataset, training, and checkpointing',
  },
  output: {
    id: 'output',
    name: 'Output',
    accent: 'white',
    color: '#e7e2f5',
    icon: 'Tv',
    description: 'Live screens, MP4 export, and recorders',
  },
};

export const PORT_COLORS: Record<PortType, string> = {
  media: '#46b4ff',  // cosmic
  audio: '#ff5cc2',  // nebula
  text: '#36d39a',   // aurora
  model: '#ff6a3d',  // solaris
  params: '#8b5cff', // violet
};

export interface Port {
  id: string;
  name: string;
  type: PortType;
  label?: string;
}

export interface NodeControl {
  name: string;
  label: string;
  type: 'slider' | 'dropdown' | 'input' | 'toggle' | 'stepper' | 'color' | 'radar' | 'loss-curve' | 'wave-analyzer' | 'visual-preview';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface NodeTypeConfig {
  type: string;
  name: string;
  category: string;
  description: string;
  inputs: Port[];
  outputs: Port[];
  controls: NodeControl[];
  defaultValues: Record<string, any>;
}

export interface NodeInstance {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  inputs: Port[];
  outputs: Port[];
  values: Record<string, any>;
  isCollapsed?: boolean;
  status?: 'idle' | 'running' | 'success' | 'error';
  category: string; // matches Category.id
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface GroupLabel {
  id: string;
  title: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  icon: string;
}

export interface HistoryItem {
  nodes: NodeInstance[];
  connections: Connection[];
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
