import { NodeTypeConfig, NodeInstance, Connection, GroupLabel } from './types';

export const NODE_TEMPLATES: NodeTypeConfig[] = [
  // Input & Capture
  {
    type: 'media-source',
    name: 'Media Source',
    category: 'input',
    description: 'Generates procedural dynamic streams or synthetic test feeds',
    inputs: [],
    outputs: [{ id: 'output', name: 'Feed', type: 'media' }],
    controls: [
      { name: 'source', label: 'Feeder', type: 'dropdown', options: ['Generative Flux', 'Quantum Nebular', 'Cyberpunk Grid', 'Synthwave Sun'] },
      { name: 'fps', label: 'Frame Rate', type: 'slider', min: 24, max: 120, step: 1 },
      { name: 'scale', label: 'Aspect Ratio', type: 'dropdown', options: ['16:9 Cinema', '1:1 Square', '9:16 Mobile'] },
    ],
    defaultValues: { source: 'Generative Flux', fps: 60, scale: '16:9 Cinema' },
  },
  {
    type: 'microphone-capture',
    name: 'Microphone Feed',
    category: 'input',
    description: 'Direct audio signal capture and analysis bridge',
    inputs: [],
    outputs: [{ id: 'audio', name: 'Analog Out', type: 'audio' }],
    controls: [
      { name: 'gain', label: 'Input Gain', type: 'slider', min: 0, max: 2, step: 0.1 },
      { name: 'device', label: 'Audio Device', type: 'dropdown', options: ['Supercardioid Mic', 'MacBook Microphone', 'Virtual Interface'] },
      { name: 'mute', label: 'Force Mute', type: 'toggle' },
    ],
    defaultValues: { gain: 1.2, device: 'Supercardioid Mic', mute: false },
  },
  {
    type: 'file-loader',
    name: 'File Loader',
    category: 'input',
    description: 'Load custom local media assets or texture packages',
    inputs: [],
    outputs: [{ id: 'output', name: 'Data Out', type: 'media' }],
    controls: [
      { name: 'filepath', label: 'File Path', type: 'input' },
      { name: 'loop', label: 'Auto-Loop', type: 'toggle' },
    ],
    defaultValues: { filepath: '/assets/vfx_loop_05.mp4', loop: true },
  },

  // AI Engines
  {
    type: 'text-to-visual',
    name: 'Text-to-Visual',
    category: 'ai',
    description: 'Generative diffusion frame generation from text descriptions',
    inputs: [{ id: 'params', name: 'Params', type: 'params' }],
    outputs: [{ id: 'output', name: 'Latents', type: 'media' }],
    controls: [
      { name: 'prompt', label: 'Prompt Text', type: 'input' },
      { name: 'steps', label: 'Inference Steps', type: 'stepper', min: 10, max: 100, step: 5 },
      { name: 'cfg', label: 'CFG Scale', type: 'slider', min: 1, max: 20, step: 0.5 },
    ],
    defaultValues: { prompt: 'bioluminescent spores in phantom garden', steps: 30, cfg: 7.5 },
  },
  {
    type: 'style-engine',
    name: 'Style Engine',
    category: 'ai',
    description: 'Neural style injection transfer and style vector synthesis',
    inputs: [{ id: 'input', name: 'Feed', type: 'media' }],
    outputs: [{ id: 'output', name: 'Styled', type: 'media' }],
    controls: [
      { name: 'style', label: 'Theme Style', type: 'dropdown', options: ['Neural Impressionism', 'Chroma Noir', 'Neon Baroque', 'Retro Vector'] },
      { name: 'strength', label: 'Blend Weight', type: 'slider', min: 0, max: 1, step: 0.05 },
      { name: 'coherence', label: 'Structure Coherence', type: 'slider', min: 0, max: 100, step: 5 },
    ],
    defaultValues: { style: 'Neural Impressionism', strength: 0.85, coherence: 70 },
  },
  {
    type: 'upscaler',
    name: 'Upscaler SR',
    category: 'ai',
    description: 'Super-resolution AI tensor frame magnifying filter',
    inputs: [{ id: 'input', name: 'LowRes', type: 'media' }],
    outputs: [{ id: 'output', name: 'HighRes', type: 'media' }],
    controls: [
      { name: 'scale', label: 'Multiplier', type: 'dropdown', options: ['2x Super', '4x Ultra-SR', '8x DeepZoom'] },
      { name: 'denoise', label: 'De-noise Level', type: 'slider', min: 0, max: 100, step: 5 },
    ],
    defaultValues: { scale: '4x Ultra-SR', denoise: 25 },
  },

  // Effects
  {
    type: 'particle-field',
    name: 'Particle Field',
    category: 'effects',
    description: 'Renders GPU accelerated orbital space forces and vector trails',
    inputs: [
      { id: 'input', name: 'VFS Feed', type: 'media' },
      { id: 'stimulus', name: 'Freq Input', type: 'params' },
    ],
    outputs: [{ id: 'output', name: 'Particles', type: 'media' }],
    controls: [
      { name: 'count', label: 'Count Limit', type: 'stepper', min: 100, max: 5000, step: 100 },
      { name: 'size', label: 'Dot Size', type: 'slider', min: 0.5, max: 10, step: 0.1 },
      { name: 'velocity', label: 'Force Speed', type: 'slider', min: 0.1, max: 5, step: 0.1 },
      { name: 'glow', label: 'Bloom Glow', type: 'toggle' },
    ],
    defaultValues: { count: 1800, size: 2.8, velocity: 1.5, glow: true },
  },
  {
    type: 'shader',
    name: 'Raymarched Shader',
    category: 'effects',
    description: 'Procedural mathematical fields and fractal shader compilation',
    inputs: [{ id: 'params', name: 'Modulator', type: 'params' }],
    outputs: [{ id: 'output', name: 'Shader Map', type: 'media' }],
    controls: [
      { name: 'preset', label: 'Shader Pres', type: 'dropdown', options: ['Mandelbulb Bloom', 'Cosmic Noise', 'Gyroid Labyrinth'] },
      { name: 'complexity', label: 'Resolution', type: 'slider', min: 1, max: 5, step: 0.5 },
    ],
    defaultValues: { preset: 'Cosmic Noise', complexity: 2.5 },
  },
  {
    type: 'glow-bloom',
    name: 'Glow Bloom',
    category: 'effects',
    description: 'Phosphoric neon scattering glow filter',
    inputs: [{ id: 'input', name: 'Normal', type: 'media' }],
    outputs: [{ id: 'output', name: 'Incandescent', type: 'media' }],
    controls: [
      { name: 'threshold', label: 'Lumin Threshold', type: 'slider', min: 0, max: 100, step: 5 },
      { name: 'radius', label: 'Diffusion Radius', type: 'slider', min: 5, max: 100, step: 1 },
      { name: 'tint', label: 'Glow Swatch', type: 'color' },
    ],
    defaultValues: { threshold: 45, radius: 28, tint: '#8b5cff' },
  },

  // Audio
  {
    type: 'waveform-analyzer',
    name: 'Waveform Analyzer',
    category: 'audio',
    description: 'Real-time Fast Fourier Transform spectral bands parsing engine',
    inputs: [{ id: 'audio', name: 'Signal In', type: 'audio' }],
    outputs: [
      { id: 'spectrum', name: 'DFT Bands', type: 'audio' },
      { id: 'intensity', name: 'Intensity Out', type: 'params' },
    ],
    controls: [
      { name: 'bands', label: 'Frequency Bars', type: 'dropdown', options: ['64 Sub-bands', '128 Mid-bands', '512 Wide-band'] },
      { name: 'smoothing', label: 'Decay Speed', type: 'slider', min: 0.1, max: 0.99, step: 0.05 },
      { name: 'visual', label: 'Live Signal', type: 'wave-analyzer' },
    ],
    defaultValues: { bands: '128 Mid-bands', smoothing: 0.85 },
  },
  {
    type: 'mixer',
    name: 'Stereo Mixer',
    category: 'audio',
    description: 'Combines and weighs multiple signal levels with absolute headroom',
    inputs: [
      { id: 'ch1', name: 'Signal A', type: 'audio' },
      { id: 'ch2', name: 'Signal B', type: 'audio' },
    ],
    outputs: [{ id: 'output', name: 'Stereo Mix', type: 'audio' }],
    controls: [
      { name: 'vol1', label: 'Level A Vol', type: 'slider', min: 0, max: 1.2, step: 0.05 },
      { name: 'vol2', label: 'Level B Vol', type: 'slider', min: 0, max: 1.2, step: 0.05 },
      { name: 'master', label: 'Master Fader', type: 'slider', min: 0, max: 1.5, step: 0.05 },
    ],
    defaultValues: { vol1: 0.85, vol2: 0.35, master: 1.0 },
  },

  // Transform
  {
    type: 'compositor',
    name: 'Alpha Compositor',
    category: 'transform',
    description: 'Blends generative visual latents and audio spectra into unified structures',
    inputs: [
      { id: 'visual', name: 'Visual feed', type: 'media' },
      { id: 'audio', name: 'Audio Spectrum', type: 'audio' },
    ],
    outputs: [{ id: 'output', name: 'Composited', type: 'media' }],
    controls: [
      { name: 'blend', label: 'Blend Equation', type: 'dropdown', options: ['Screen Linear', 'Phosphor Add', 'Hard Light Spectrum', 'Nebula Mix'] },
      { name: 'opacity', label: 'Dry/Wet Ratio', type: 'slider', min: 0, max: 1, step: 0.05 },
      { name: 'vignette', label: 'Abbe Dispersion', type: 'slider', min: 0, max: 1, step: 0.05 },
    ],
    defaultValues: { blend: 'Screen Linear', opacity: 0.90, vignette: 0.45 },
  },

  // Training & Data
  {
    type: 'trainer',
    name: 'Model Trainer',
    category: 'training',
    description: 'Real-time SGD optimization of generative weights & latent gradients',
    inputs: [{ id: 'params', name: 'Stimulus', type: 'params' }],
    outputs: [{ id: 'model', name: 'Weights', type: 'model' }],
    controls: [
      { name: 'learning_rate', label: 'Learning Rate', type: 'slider', min: 0.0001, max: 0.01, step: 0.0001 },
      { name: 'batch_size', label: 'Batch Size', type: 'dropdown', options: ['8 Micro', '16 Standard', '32 Large', '64 Huge'] },
      { name: 'loss', label: 'SGD Convergence', type: 'loss-curve' },
    ],
    defaultValues: { learning_rate: 0.0024, batch_size: '32 Large' },
  },
  {
    type: 'radar-editor',
    name: 'Radar Modulator',
    category: 'effects',
    description: 'High-dimensional spider vector field custom modulator',
    inputs: [],
    outputs: [{ id: 'params', name: 'Vector Field', type: 'params' }],
    controls: [
      { name: 'vectors', label: 'Vector Spaces', type: 'radar' },
    ],
    defaultValues: {
      vectors: [
        { label: 'Style', val: 0.8 },
        { label: 'Fidelity', val: 0.65 },
        { label: 'Entropy', val: 0.45 },
        { label: 'Coherence', val: 0.72 },
        { label: 'Harmonics', val: 0.55 },
      ],
    },
  },

  // Output
  {
    type: 'preview',
    name: 'Cosmos Preview',
    category: 'output',
    description: 'Live physical visual display of render outputs & particle buffers',
    inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
    outputs: [],
    controls: [
      { name: 'preview', label: 'Phantom Stream', type: 'visual-preview' },
      { name: 'quality', label: 'VRAM Pipeline', type: 'dropdown', options: ['DirectX 12 Raw', 'WebGPU Unlocked', 'Subsampled Draft'] },
    ],
    defaultValues: { quality: 'WebGPU Unlocked' },
  },
];

// INITIAL PRE-LOADED STATE GRAPH (Wired properly, telling a media pipeline story)
export const INITIAL_NODES: NodeInstance[] = [
  {
    id: 'node_1',
    type: 'media-source',
    title: 'Media Source Feed',
    position: { x: 80, y: 150 },
    inputs: [],
    outputs: [{ id: 'output', name: 'Feed', type: 'media' }],
    values: { source: 'Generative Flux', fps: 60, scale: '16:9 Cinema' },
    category: 'input',
    status: 'running',
  },
  {
    id: 'node_2',
    type: 'style-engine',
    title: 'AI Style transfer',
    position: { x: 380, y: 150 },
    inputs: [{ id: 'input', name: 'Feed', type: 'media' }],
    outputs: [{ id: 'output', name: 'Styled', type: 'media' }],
    values: { style: 'Neural Impressionism', strength: 0.85, coherence: 70 },
    category: 'ai',
    status: 'running',
  },
  {
    id: 'node_3',
    type: 'particle-field',
    title: 'GPU Particle Field',
    position: { x: 680, y: 150 },
    inputs: [
      { id: 'input', name: 'VFS Feed', type: 'media' },
      { id: 'stimulus', name: 'Freq Input', type: 'params' },
    ],
    outputs: [{ id: 'output', name: 'Particles', type: 'media' }],
    values: { count: 1800, size: 2.8, velocity: 1.5, glow: true },
    category: 'effects',
    status: 'running',
  },
  {
    id: 'node_4',
    type: 'microphone-capture',
    title: 'Live Microphone Input',
    position: { x: 80, y: 460 },
    inputs: [],
    outputs: [{ id: 'audio', name: 'Analog Out', type: 'audio' }],
    values: { gain: 1.2, device: 'Supercardioid Mic', mute: false },
    category: 'input',
    status: 'running',
  },
  {
    id: 'node_5',
    type: 'waveform-analyzer',
    title: 'Spectrum FFT Analyzer',
    position: { x: 380, y: 460 },
    inputs: [{ id: 'audio', name: 'Signal In', type: 'audio' }],
    outputs: [
      { id: 'spectrum', name: 'DFT Bands', type: 'audio' },
      { id: 'intensity', name: 'Intensity Out', type: 'params' },
    ],
    values: { bands: '128 Mid-bands', smoothing: 0.85 },
    category: 'audio',
    status: 'running',
  },
  {
    id: 'node_6',
    type: 'mixer',
    title: 'Analog Signal Mixer',
    position: { x: 680, y: 460 },
    inputs: [
      { id: 'ch1', name: 'Signal A', type: 'audio' },
      { id: 'ch2', name: 'Signal B', type: 'audio' },
    ],
    outputs: [{ id: 'output', name: 'Stereo Mix', type: 'audio' }],
    values: { vol1: 0.85, vol2: 0.35, master: 1.0 },
    category: 'audio',
    status: 'running',
  },
  {
    id: 'node_7',
    type: 'compositor',
    title: 'Alpha Compositor',
    position: { x: 980, y: 250 },
    inputs: [
      { id: 'visual', name: 'Visual feed', type: 'media' },
      { id: 'audio', name: 'Audio Spectrum', type: 'audio' },
    ],
    outputs: [{ id: 'output', name: 'Composited', type: 'media' }],
    values: { blend: 'Screen Linear', opacity: 0.90, vignette: 0.45 },
    category: 'transform',
    status: 'running',
  },
  {
    id: 'node_8',
    type: 'preview',
    title: 'Live Phantom Output',
    position: { x: 1300, y: 250 },
    inputs: [{ id: 'input', name: 'Active Out', type: 'media' }],
    outputs: [],
    values: { quality: 'WebGPU Unlocked' },
    category: 'output',
    status: 'running',
  },
  {
    id: 'node_9',
    type: 'trainer',
    title: 'Loss Optimizer SGD',
    position: { x: 980, y: 550 },
    inputs: [{ id: 'params', name: 'Stimulus', type: 'params' }],
    outputs: [{ id: 'model', name: 'Weights', type: 'model' }],
    values: { learning_rate: 0.0024, batch_size: '32 Large' },
    category: 'training',
    status: 'running',
  },
];

export const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'conn_1', fromNodeId: 'node_1', fromPortId: 'output', toNodeId: 'node_2', toPortId: 'input' },
  { id: 'conn_2', fromNodeId: 'node_2', fromPortId: 'output', toNodeId: 'node_3', toPortId: 'input' },
  { id: 'conn_3', fromNodeId: 'node_3', fromPortId: 'output', toNodeId: 'node_7', toPortId: 'visual' },
  { id: 'conn_4', fromNodeId: 'node_4', fromPortId: 'audio', toNodeId: 'node_5', toPortId: 'audio' },
  { id: 'conn_5', fromNodeId: 'node_5', fromPortId: 'spectrum', toNodeId: 'node_6', toPortId: 'ch1' },
  { id: 'conn_6', fromNodeId: 'node_5', fromPortId: 'intensity', toNodeId: 'node_3', toPortId: 'stimulus' },
  { id: 'conn_7', fromNodeId: 'node_6', fromPortId: 'output', toNodeId: 'node_7', toPortId: 'audio' },
  { id: 'conn_8', fromNodeId: 'node_7', fromPortId: 'output', toNodeId: 'node_8', toPortId: 'input' },
];

export const INITIAL_GROUP_LABELS: GroupLabel[] = [
  {
    id: 'grp_1',
    title: 'Input & Hardware Capture',
    position: { x: 40, y: 70 },
    width: 270,
    height: 680,
    icon: 'Radio',
  },
  {
    id: 'grp_2',
    title: 'Real-time Signal Engines',
    position: { x: 340, y: 70 },
    width: 590,
    height: 680,
    icon: 'Sparkles',
  },
  {
    id: 'grp_3',
    title: 'Direct Compositing & AI Training Feed',
    position: { x: 950, y: 70 },
    width: 610,
    height: 680,
    icon: 'Tv',
  },
];
