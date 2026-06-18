import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Sparkles, Play, RefreshCw, Layers } from 'lucide-react';

// ==================== HERO 1: WAVEFORM ANALYZER ====================
interface WaveformAnalyzerProps {
  isPlaying?: boolean;
  gain?: number;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({ isPlaying = true, gain = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [bannedCount] = useState(24);

  // Initialize bars
  const barsRef = useRef<number[]>(Array(24).fill(10));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      // Handle resizing cleanly
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, width, height);

      phase += 0.05;

      // Draw background slot grid
      ctx.fillStyle = 'rgba(26, 21, 48, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Render nice neon violet/nebula spectrum bars
      const barPadding = 3;
      const barWidth = (width - barPadding * (bannedCount - 1)) / bannedCount;

      for (let i = 0; i < bannedCount; i++) {
        // Generate target amplitude based on math functions (some frequency wave combination)
        let target = 5;
        if (isPlaying) {
          const sine1 = Math.sin(phase + i * 0.4) * 22;
          const sine2 = Math.cos(phase * 1.8 - i * 0.9) * 12;
          const noise = Math.random() * 8;
          // Apply gain and weight of frequencies (boost bass, taper highs)
          const freqMultiplier = Math.exp(-i / bannedCount * 1.5);
          target = Math.max(4, (12 + sine1 + sine2 + noise) * gain * freqMultiplier);
        }

        // Decay speed
        barsRef.current[i] += (target - barsRef.current[i]) * 0.22;
        const currentVal = Math.min(height - 6, barsRef.current[i]);

        // Draw spectral bar with neon gradient
        const x = i * (barWidth + barPadding);
        const y = height - currentVal;

        const grad = ctx.createLinearGradient(x, y, x, height);
        grad.addColorStop(0, '#ff5cc2'); // nebula pink
        grad.addColorStop(0.5, '#8b5cff'); // violet
        grad.addColorStop(1, '#0d0a1c'); // glass surface dark

        ctx.fillStyle = grad;
        // Rounded top bars
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, currentVal, [2, 2, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, currentVal);
        }
        ctx.fill();

        // Top glow capsid cap for high precision feels
        ctx.fillStyle = '#ff9ade';
        ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gain, bannedCount]);

  return (
    <div className="relative w-full h-24 bg-[#0d0a1c]/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-1.5 right-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5cc2] animate-ping" />
        <span className="text-[9px] font-mono tracking-widest text-[#ff5cc2] font-semibold bg-[rgba(255,92,194,0.15)] px-1 rounded uppercase">
          FFT ACTIVE
        </span>
      </div>
    </div>
  );
};


// ==================== HERO 2: DRAGGABLE RADAR SPIDER CHART ====================
interface RadarValue {
  label: string;
  val: number;
}

interface RadarChartProps {
  values?: RadarValue[];
  onChange?: (updated: RadarValue[]) => void;
}

export const RadarChart: React.FC<RadarChartProps> = ({ values, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

  // Fallback defaults
  const list = useMemo(() => {
    return values || [
      { label: 'Style', val: 0.8 },
      { label: 'Fidelity', val: 0.65 },
      { label: 'Entropy', val: 0.45 },
      { label: 'Coherence', val: 0.72 },
      { label: 'Harmonics', val: 0.55 },
    ];
  }, [values]);

  const CX = 75;
  const CY = 75;
  const R = 50; // max radius
  const N = list.length;

  // Calculate coordinates of current points
  const points = useMemo(() => {
    return list.map((item, i) => {
      const angle = (i * 2 * Math.PI) / N - Math.PI / 2; // offset by 90deg to start top
      return {
        x: CX + R * item.val * Math.cos(angle),
        y: CY + R * item.val * Math.sin(angle),
        angle,
        label: item.label,
        val: item.val,
      };
    });
  }, [list, N]);

  // Create path of polygon
  const polygonPath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' ' + `${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  }, [points]);

  const handlePointerDown = (index: number) => {
    setActiveDragIndex(index);
  };

  useEffect(() => {
    if (activeDragIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Translate coordinates to center CX, CY
      // Coordinate conversions: scale of coordinates is bound within container. SVG size is 150x150, which fills layout container
      const scaleX = 150 / rect.width;
      const scaleY = 150 / rect.height;

      const relativeX = (x * scaleX) - CX;
      const relativeY = (y * scaleY) - CY;

      // Find projection along the constraint vertex line angle
      const angle = points[activeDragIndex].angle;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Dot product to project relative cursor vector to the vertex direction
      let dot = (relativeX * cosA + relativeY * sinA) / R;
      dot = Math.max(0.1, Math.min(1.0, dot)); // clamping value factor between 0.1 and 1

      const updated = [...list];
      updated[activeDragIndex] = {
        ...updated[activeDragIndex],
        val: parseFloat(dot.toFixed(2)),
      };

      if (onChange) {
        onChange(updated);
      }
    };

    const handlePointerUp = () => {
      setActiveDragIndex(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDragIndex, list, onChange, points]);

  return (
    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
      <div 
        ref={containerRef}
        className="w-32 h-32 relative select-none cursor-crosshair touch-none flex-shrink-0"
      >
        <svg viewBox="0 0 150 150" className="w-full h-full overflow-visible">
          {/* Circular grid ranges */}
          {[1, 2, 3, 4, 5].map((level) => {
            const rad = (R / 5) * level;
            return (
              <circle
                key={level}
                cx={CX}
                cy={CY}
                r={rad}
                fill="none"
                stroke="rgba(139, 92, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Draggable vector ray lines */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={CX + R * Math.cos(p.angle)}
              y2={CY + R * Math.sin(p.angle)}
              stroke="rgba(139, 92, 255, 0.15)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          ))}

          {/* Filled polygon path representer */}
          <polygon
            points={polygonPath}
            fill="rgba(139, 92, 255, 0.18)"
            stroke="#8b5cff"
            strokeWidth="1.5"
            className="transition-colors duration-150"
          />

          {/* Draggable Handle Nodes */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Outer glow ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r={activeDragIndex === i ? 8 : 5}
                fill="#05030d"
                stroke={activeDragIndex === i ? '#ff5cc2' : '#8b5cff'}
                strokeWidth="2"
                className="cursor-pointer transition-all hover:scale-125"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(139, 92, 255, 0.6))' }}
                onPointerDown={() => handlePointerDown(i)}
              />
              {/* Tiny inner center */}
              <circle
                cx={p.x}
                cy={p.y}
                r="1.5"
                fill="#ffffff"
                className="pointer-events-none"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Side list representing current parameter states */}
      <div className="flex-1 flex flex-col gap-1.5">
        {list.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-[10px] font-mono leading-none">
            <span className="text-[#8b82ad] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#8b5cff]" />
              {item.label}
            </span>
            <span className="text-white font-semibold bg-[#1a1530]/60 px-1.5 py-0.5 rounded border border-[rgba(139,92,255,0.08)]">
              {(item.val * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


// ==================== HERO 3: LIVE MODEL TRAINING LOSS CURVE ====================
interface LossCurveProps {
  isTraining?: boolean;
}

export const LossCurve: React.FC<LossCurveProps> = ({ isTraining = true }) => {
  const [lossData, setLossData] = useState<number[]>([]);
  const [epochsCount, setEpochsCount] = useState<number>(0);
  const [trainSpeed, setTrainSpeed] = useState<number>(278);
  const [isDone, setIsDone] = useState(false);

  // Initialize and feed SGD gradient loss simulated data
  useEffect(() => {
    // Scaffold initial list
    let points = [0.89, 0.72, 0.61, 0.54, 0.44, 0.38, 0.33, 0.28, 0.24, 0.21, 0.18, 0.15, 0.14, 0.12, 0.11, 0.10, 0.085, 0.078, 0.072];
    setLossData(points);
    setEpochsCount(points.length * 5);
  }, []);

  useEffect(() => {
    if (!isTraining || isDone) return;

    const interval = setInterval(() => {
      setLossData((prev) => {
        const last = prev[prev.length - 1];
        if (last <= 0.038) {
          setIsDone(true);
          setTrainSpeed(0);
          return prev;
        }

        // Add small random convergence decay stepping
        let decay = (last * 0.04) + (Math.random() * 0.008 - 0.002);
        let nextVal = parseFloat(Math.max(0.035, last - decay).toFixed(4));
        const updated = [...prev, nextVal];

        // Maintain view bounds (up to last 35 points for clear tracking visual)
        if (updated.length > 35) {
          updated.shift();
        }

        setEpochsCount((e) => e + 5);
        setTrainSpeed(Math.floor(260 + Math.random() * 40));
        return updated;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isTraining, isDone]);

  // Convert array rates to SVG points
  const svgWidth = 180;
  const svgHeight = 70;
  const paddingX = 8;
  const paddingY = 8;

  const pointsString = useMemo(() => {
    if (lossData.length <= 1) return '';
    const stepX = (svgWidth - paddingX * 2) / (lossData.length - 1);
    const maxY = 1.0; // scale limit representation

    return lossData.map((val, idx) => {
      const x = paddingX + idx * stepX;
      // invert Y (loss 1.0 = top, 0.0 = bottom)
      const graphHeight = svgHeight - paddingY * 2;
      const y = paddingY + graphHeight * (1 - (val / maxY));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [lossData]);

  const gradientAreaPath = useMemo(() => {
    if (lossData.length <= 1) return '';
    const points = pointsString.split(' ');
    const firstX = points[0].split(',')[0];
    const lastX = points[points.length - 1].split(',')[0];
    return `M ${firstX},${(svgHeight - paddingY).toFixed(1)} L ${pointsString} L ${lastX},${(svgHeight - paddingY).toFixed(1)} Z`;
  }, [pointsString, lossData]);

  const handleReset = () => {
    setLossData([0.89, 0.72, 0.61, 0.54, 0.44]);
    setEpochsCount(25);
    setTrainSpeed(284);
    setIsDone(false);
  };

  const currentLoss = lossData.length > 0 ? lossData[lossData.length - 1] : 0.89;

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-2.5 rounded-xl flex flex-col gap-2">
      {/* Stat Bar Header */}
      <div className="flex justify-between items-center text-[10px] font-mono leading-none">
        <span className="text-[#ff6a3d] font-semibold tracking-wider flex items-center gap-1 uppercase">
          <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-[#ff6a3d] animate-pulse'}`} />
          {isDone ? 'CONVERGED' : 'SGD TRAINING'}
        </span>
        <div className="flex items-center gap-2">
          {isDone && (
            <button 
              onClick={handleReset}
              className="text-[#ff6a3d] hover:text-white flex items-center gap-0.5 cursor-pointer bg-[#ff6a3d]/10 px-1.5 py-0.5 rounded border border-[rgba(255,106,61,0.22)] transition-all"
            >
              <RefreshCw size={8} /> RETRAIN
            </button>
          )}
          <span className="text-[#8b82ad]">EPOCH <strong className="text-white font-semibold tabular-nums">{epochsCount}</strong></span>
        </div>
      </div>

      {/* SVG Canvas Plot */}
      <div className="relative w-full h-[70px] bg-black/40 rounded-lg overflow-hidden border border-white/5">
        {/* Horizontal grid guide lines */}
        <div className="absolute inset-x-0 top-1/4 border-b border-[rgba(255,106,61,0.04)]" />
        <div className="absolute inset-x-0 top-2/4 border-b border-[rgba(255,106,61,0.04)]" />
        <div className="absolute inset-x-0 top-3/4 border-b border-[rgba(255,106,61,0.04)]" />

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="lossAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 106, 61, 0.22)" />
              <stop offset="100%" stopColor="rgba(255, 106, 61, 0)" />
            </linearGradient>
          </defs>

          {/* Area under curve gradient fill */}
          {lossData.length > 1 && (
            <path d={gradientAreaPath} fill="url(#lossAreaGrad)" />
          )}

          {/* Curve line */}
          {lossData.length > 1 && (
            <polyline
              points={pointsString}
              fill="none"
              stroke="#ff6a3d"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* End tracking glow node dot */}
          {lossData.length > 1 && (
            <circle
              cx={paddingX + (lossData.length - 1) * ((svgWidth - paddingX * 2) / (lossData.length - 1))}
              cy={paddingY + (svgHeight - paddingY * 2) * (1 - (currentLoss / 1.0))}
              r="3"
              fill="#ff6a3d"
              stroke="#ffffff"
              strokeWidth="1"
              style={{ filter: 'drop-shadow(0 0 3px #ff6a3d)' }}
            />
          )}
        </svg>
      </div>

      {/* Info status line */}
      <div className="flex justify-between items-center text-[9px] font-mono leading-none text-[#8b82ad]">
        <span>VAL-LOSS: <strong className="text-white font-bold tabular-nums">{(currentLoss).toFixed(4)}</strong></span>
        <span>RATE: <strong className="text-white font-bold tabular-nums">{trainSpeed} steps/s</strong></span>
      </div>
    </div>
  );
};


// ==================== HERO 4: GENERATIVE PREVIEW RENDERER ====================
interface VisualPreviewProps {
  isPlaying?: boolean;
  styleMode?: string;
  intensityFactor?: number;
}

export const VisualPreview: React.FC<VisualPreviewProps> = ({ 
  isPlaying = true, 
  styleMode = 'Neural Impressionism',
  intensityFactor = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build elegant floating particles
    const particleCount = 45;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      angle: number;
      speed: number;
      orbit: number;
    }> = [];

    const colorsMap: Record<string, string[]> = {
      'Neural Impressionism': ['#8b5cff', '#ff5cc2', '#46b4ff', '#ff6a3d'],
      'Chroma Noir': ['#ffffff', '#cccccc', '#555555', '#46b4ff'],
      'Neon Baroque': ['#ff5cc2', '#36d39a', '#ff6a3d', '#8b5cff'],
      'Retro Vector': ['#36d39a', '#e0b24a', '#ff6a3d', '#46b4ff'],
    };

    const colors = colorsMap[styleMode] || colorsMap['Neural Impressionism'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * 200,
        y: Math.random() * 100,
        radius: Math.random() * 2.2 + 0.8,
        color: colors[i % colors.length],
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.15,
        orbit: Math.random() * 35 + 10,
      });
    }

    let frame = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      }

      // Draw background cosmic gradient
      ctx.fillStyle = '#05030d';
      ctx.fillRect(0, 0, w, h);

      frame += 0.012;

      // Draw flowing nebula gas backgrounds
      const pulse = Math.sin(frame) * 0.2 + 0.8;
      const gradient = ctx.createRadialGradient(
        w / 2 + Math.cos(frame * 1.5) * 30,
        h / 2 + Math.sin(frame * 0.8) * 15,
        5,
        w / 2,
        h / 2,
        w / 1.5
      );

      // Sift colors
      if (styleMode === 'Chroma Noir') {
        gradient.addColorStop(0, 'rgba(70, 180, 255, 0.18)');
        gradient.addColorStop(0.5, 'rgba(10, 8, 22, 0.7)');
        gradient.addColorStop(1, 'rgba(5, 3, 13, 1)');
      } else if (styleMode === 'Neon Baroque') {
        gradient.addColorStop(0, 'rgba(255, 92, 194, 0.22)');
        gradient.addColorStop(0.4, 'rgba(139, 92, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(5, 3, 13, 1)');
      } else if (styleMode === 'Retro Vector') {
        gradient.addColorStop(0, 'rgba(54, 211, 154, 0.18)');
        gradient.addColorStop(0.5, 'rgba(13, 10, 28, 0.6)');
        gradient.addColorStop(1, 'rgba(5, 3, 13, 1)');
      } else {
        // Neural Impressionism - deep violet / electric pink
        gradient.addColorStop(0, 'rgba(139, 92, 255, 0.24)');
        gradient.addColorStop(0.5, 'rgba(255, 92, 194, 0.08)');
        gradient.addColorStop(1, 'rgba(5, 3, 13, 1)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Draw some generative abstract lines (VFX)
      ctx.strokeStyle = styleMode === 'Chroma Noir' ? 'rgba(70, 180, 255, 0.12)' : 'rgba(139, 92, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 15) {
        const lineY = h / 2 + Math.sin(x * 0.02 + frame * 3.5) * 20 * intensityFactor;
        if (x === 0) ctx.moveTo(x, lineY);
        else ctx.lineTo(x, lineY);
      }
      ctx.stroke();

      // Render flowing space orbits
      if (isPlaying) {
        ctx.globalCompositeOperation = 'screen';
        particles.forEach((p, idx) => {
          p.angle += p.speed * 0.05 * intensityFactor;
          const orbitCX = w / 2 + Math.cos(frame * 0.5) * 20;
          const orbitCY = h / 2 + Math.sin(frame * 0.3) * 10;

          const px = orbitCX + Math.cos(p.angle) * (p.orbit + Math.sin(frame * 2 + idx) * 5);
          const py = orbitCY + Math.sin(p.angle) * (p.orbit / 1.5 + Math.cos(frame * 1.5 + idx) * 3);

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Connect nearby nodes to form constellation VFX networks!
          particles.forEach((other, oIdx) => {
            if (idx === oIdx) return;
            const ox = orbitCX + Math.cos(other.angle) * (other.orbit + Math.sin(frame * 2 + oIdx) * 5);
            const oy = orbitCY + Math.sin(other.angle) * (other.orbit / 1.5 + Math.cos(frame * 1.5 + oIdx) * 3);

            const dist = Math.hypot(px - ox, py - oy);
            if (dist < 30) {
              ctx.strokeStyle = `rgba(139, 92, 255, ${(1 - dist / 30) * 0.12})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(ox, oy);
              ctx.stroke();
            }
          });
        });
        ctx.globalCompositeOperation = 'source-over';
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, styleMode, intensityFactor]);

  return (
    <div className="relative w-full h-32 bg-[#0d0a1c]/45 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 shadow-md">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 text-[9px] font-mono text-[#8b82ad]">
        <Layers size={9} />
        <span>VFX: <strong className="text-[#36d39a]">{styleMode}</strong></span>
      </div>
      <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[9px] font-mono tracking-widest text-[#46b4ff] font-semibold bg-[#46b4ff]/10 px-1.5 py-0.5 rounded uppercase">
        <Sparkles size={9} className="text-[#46b4ff] animate-spin" style={{ animationDuration: '4s' }} /> MONITOR
      </div>
    </div>
  );
};
