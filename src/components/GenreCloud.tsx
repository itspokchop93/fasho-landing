import { useRef, useEffect, useCallback } from 'react';

export interface GenreGroupDef {
  label: string;
  items: string[];
}

interface GenreCloudProps {
  groups: GenreGroupDef[];
  selectedGenres: string[];
  onSelectionChange: (selected: string[]) => void;
  canvasHeight?: string;
}

interface Node {
  id: string;
  label: string;
  group: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  baseRadius: number;
  selected: boolean;
  displayScale: number;
  weight: number;
}

interface Edge {
  from: number;
  to: number;
}

// Popularity-style weights — top genres are noticeably larger
const ITEM_WEIGHTS: Record<string, number> = {
  'Hip-Hop': 1.35, 'Pop': 1.3, 'R&B': 1.28, 'Rock': 1.25,
  'Electronic': 1.05, 'Latin': 1.0, 'Indie': 1.0,
  'Afrobeats': 0.95, 'Reggae': 0.95, 'Country': 0.95,
  'Gospel': 0.88, 'Jazz': 0.9, 'Folk': 0.85, 'Lo-Fi': 0.95,
  'Podcast': 0.82,
  'Party': 1.1, 'Chill': 1.1, 'Sad': 1.0, 'Dark': 0.95,
  'Hype': 1.05, 'Love': 1.0, 'Motivation': 0.95,
  'Late Night': 0.92, 'Angry': 0.9,
  'Anthem': 0.95, 'Feel Good': 1.0, 'Happy': 1.05, 'Heartbreak': 0.95,
  'Experimental': 0.88, 'Gym': 0.95, 'Road Trip': 0.9,
  'Study': 0.9, 'Sleep': 0.88, 'Meditation': 0.85,
  'Summer': 1.0,
  'Guitar': 0.95, 'Piano': 0.95, 'Acoustic': 0.95,
  'Melodic': 0.95, 'Orchestral': 0.88,
  'Synth': 0.92,
};

const MIN_HOVER_GROW = 1.12;
const MAX_HOVER_GROW = 1.45;
const BASE_FONT = 12;
const PILL_H_BASE = 28;

// Group zone anchors as fractions of canvas [x, y]
const GROUP_ZONES: [number, number][] = [
  [0.20, 0.46],  // Genres — left
  [0.53, 0.46],  // Vibes — center
  [0.86, 0.46],  // Sounds — right
];

const GROUP_LABEL_COLOR = 'rgba(255, 255, 255, 0.18)';

export default function GenreCloud({ groups, selectedGenres, onSelectionChange, canvasHeight = '100%' }: GenreCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const dprRef = useRef(1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const groupLabelsRef = useRef<{ label: string; x: number; y: number }[]>([]);

  const HOVER_RADIUS = 120;
  const ATTRACT_RADIUS = 80;
  const PUSH_RADIUS = 140;
  const ATTRACT_STRENGTH = 0.15;
  const PUSH_STRENGTH = 0.45;
  const HOME_PULL = 0.03;
  const DAMPING = 0.88;

  const SELECTED_COLOR = '#59e3a5';
  const DEFAULT_FILL = 'rgba(15, 20, 28, 0.88)';
  const DEFAULT_BORDER = 'rgba(255, 255, 255, 0.18)';
  const EDGE_COLOR = 'rgba(255, 255, 255, 0.04)';
  const EDGE_COLOR_SELECTED = 'rgba(89, 227, 165, 0.08)';

  const initNodes = useCallback((w: number, h: number) => {
    if (initializedRef.current && nodesRef.current.length > 0) return;
    initializedRef.current = true;

    // Seeded PRNG for deterministic layout across refreshes
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const allNodes: Node[] = [];
    const labels: { label: string; x: number; y: number }[] = [];

    groups.forEach((group, gi) => {
      const zone = GROUP_ZONES[gi] || [0.5, 0.5];
      const zoneX = zone[0] * w;
      const zoneY = zone[1] * h;

      const items = group.items;
      const itemShare = items.length / groups.reduce((s, g) => s + g.items.length, 0);
      const zoneW = w * itemShare * 1.35;
      const zoneH = h * 0.72;

      const cols = Math.ceil(Math.sqrt(items.length * (zoneW / zoneH)));
      const rows = Math.ceil(items.length / cols);
      const cellW = zoneW / cols;
      const cellH = zoneH / rows;

      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jitterX = (seededRandom() - 0.5) * cellW * 0.25;
        const jitterY = (seededRandom() - 0.5) * cellH * 0.2;
        const x = zoneX - zoneW / 2 + cellW * (col + 0.5) + jitterX;
        const y = zoneY - zoneH / 2 + cellH * (row + 0.5) + jitterY;
        const weight = ITEM_WEIGHTS[item] ?? 0.9;

        allNodes.push({
          id: item,
          label: item,
          group: gi,
          x, y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          baseRadius: 0,
          selected: selectedGenres.includes(item),
          displayScale: 1,
          weight,
        });
      });

      // Group label position: above the zone
      labels.push({
        label: group.label,
        x: zoneX,
        y: zoneY - zoneH / 2 - 14,
      });
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        allNodes.forEach(n => {
          const fontSize = Math.round(BASE_FONT * n.weight);
          ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
          const textW = ctx.measureText(n.label).width;
          n.baseRadius = (textW / 2 + 22) * n.weight + 4;
        });
      }
    }

    // Collision resolution
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < allNodes.length; i++) {
        for (let j = i + 1; j < allNodes.length; j++) {
          const dx = allNodes[j].x - allNodes[i].x;
          const dy = allNodes[j].y - allNodes[i].y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = allNodes[i].baseRadius + allNodes[j].baseRadius + 10;
          if (dist < minDist) {
            const push = (minDist - dist) / 2 + 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            allNodes[i].x -= nx * push;
            allNodes[i].y -= ny * push;
            allNodes[j].x += nx * push;
            allNodes[j].y += ny * push;
          }
        }
      }
      allNodes.forEach(n => {
        const pad = n.baseRadius + 8;
        n.x = Math.max(pad, Math.min(w - pad, n.x));
        n.y = Math.max(pad, Math.min(h - pad, n.y));
      });
    }

    allNodes.forEach(n => { n.homeX = n.x; n.homeY = n.y; });

    // Edges — connect within groups more densely, across groups sparsely
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    allNodes.forEach((node, i) => {
      const distances = allNodes
        .map((other, j) => ({ j, dist: Math.hypot(node.x - other.x, node.y - other.y), sameGroup: other.group === node.group }))
        .filter(d => d.j !== i)
        .sort((a, b) => a.dist - b.dist);

      // Connect to 2-3 nearest same-group nodes
      let sameGroupConnected = 0;
      for (const d of distances) {
        if (sameGroupConnected >= 3) break;
        if (d.sameGroup) {
          const key = [Math.min(i, d.j), Math.max(i, d.j)].join('-');
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ from: i, to: d.j });
          }
          sameGroupConnected++;
        }
      }

      // Connect to 1 nearest cross-group node for inter-group links
      for (const d of distances) {
        if (!d.sameGroup) {
          const key = [Math.min(i, d.j), Math.max(i, d.j)].join('-');
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ from: i, to: d.j });
          }
          break;
        }
      }
    });

    // Update label positions to actual group centroids
    const groupCentroids = groups.map((_, gi) => {
      const groupNodes = allNodes.filter(n => n.group === gi);
      const cx = groupNodes.reduce((s, n) => s + n.x, 0) / groupNodes.length;
      const minY = Math.min(...groupNodes.map(n => n.y - n.baseRadius));
      return { x: cx, y: minY - 18 };
    });
    labels.forEach((l, i) => {
      l.x = groupCentroids[i].x;
      l.y = Math.max(16, groupCentroids[i].y);
    });

    nodesRef.current = allNodes;
    edgesRef.current = edges;
    groupLabelsRef.current = labels;
  }, [groups]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      dprRef.current = window.devicePixelRatio || 1;
      canvas.width = rect.width * dprRef.current;
      canvas.height = rect.height * dprRef.current;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { width: rect.width, height: rect.height };

      initNodes(rect.width, rect.height);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    handleResize();
    return () => ro.disconnect();
  }, [initNodes]);

  useEffect(() => {
    nodesRef.current.forEach(n => {
      n.selected = selectedGenres.includes(n.id);
    });
  }, [selectedGenres]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const labels = groupLabelsRef.current;
      const mouse = mouseRef.current;
      const { width: w, height: h } = sizeRef.current;
      const dpr = dprRef.current;

      if (w === 0 || nodes.length === 0) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      let closestIdx = -1;
      let closestDist = Infinity;
      if (mouse.x > -500) {
        nodes.forEach((n, i) => {
          const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
          if (d < closestDist) { closestDist = d; closestIdx = i; }
        });
      }

      nodes.forEach((n, i) => {
        const dxMouse = n.x - mouse.x;
        const dyMouse = n.y - mouse.y;
        const distMouse = Math.hypot(dxMouse, dyMouse) || 1;

        if (i === closestIdx && distMouse < ATTRACT_RADIUS) {
          const attractFactor = (1 - distMouse / ATTRACT_RADIUS) * ATTRACT_STRENGTH;
          n.vx -= (dxMouse / distMouse) * attractFactor;
          n.vy -= (dyMouse / distMouse) * attractFactor;
        } else if (distMouse < PUSH_RADIUS) {
          const pushFactor = Math.pow(1 - distMouse / PUSH_RADIUS, 2) * PUSH_STRENGTH;
          n.vx += (dxMouse / distMouse) * pushFactor;
          n.vy += (dyMouse / distMouse) * pushFactor;
        }

        n.vx += (n.homeX - n.x) * HOME_PULL;
        n.vy += (n.homeY - n.y) * HOME_PULL;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        if (Math.abs(n.vx) < 0.01) n.vx = 0;
        if (Math.abs(n.vy) < 0.01) n.vy = 0;
        n.x += n.vx;
        n.y += n.vy;

        const pad = n.baseRadius + 8;
        if (n.x < pad) { n.x = pad; n.vx = 0; }
        if (n.x > w - pad) { n.x = w - pad; n.vx = 0; }
        if (n.y < pad) { n.y = pad; n.vy = 0; }
        if (n.y > h - pad) { n.y = h - pad; n.vy = 0; }

        const t = Math.min(1, Math.max(0, (n.weight - 0.82) / (1.35 - 0.82)));
        const maxScale = MAX_HOVER_GROW - t * (MAX_HOVER_GROW - MIN_HOVER_GROW);
        const targetScale = distMouse < HOVER_RADIUS
          ? 1 + (maxScale - 1) * Math.pow(1 - distMouse / HOVER_RADIUS, 1.3)
          : 1;
        n.displayScale += (targetScale - n.displayScale) * 0.12;
        if (Math.abs(n.displayScale - 1) < 0.005) n.displayScale = 1;
      });

      // RENDER
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Group labels
      labels.forEach(l => {
        ctx.font = '500 9px Inter, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = GROUP_LABEL_COLOR;
        (ctx as any).letterSpacing = '2px';
        ctx.fillText(l.label.toUpperCase(), l.x, l.y);
      });

      // Edges
      edges.forEach(e => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const bothSelected = a.selected && b.selected;
        const eitherSelected = a.selected || b.selected;
        const crossGroup = a.group !== b.group;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = bothSelected
          ? EDGE_COLOR_SELECTED
          : eitherSelected
            ? 'rgba(89, 227, 165, 0.04)'
            : crossGroup
              ? 'rgba(255, 255, 255, 0.02)'
              : EDGE_COLOR;
        ctx.lineWidth = bothSelected ? 1.5 : crossGroup ? 0.5 : 1;
        ctx.stroke();
      });

      // Node dots
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = node.selected ? SELECTED_COLOR : 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
      });

      // Shadow pass
      nodes.forEach(n => {
        const scale = n.displayScale;
        const pillH = PILL_H_BASE * scale * n.weight;
        const pillW = n.baseRadius * 2 * scale;
        const shadowOffY = 3 * scale;
        const shadowBlur = 8 * scale;
        const x = n.x - pillW / 2;
        const y = n.y - pillH / 2 + shadowOffY;
        const r = pillH / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = shadowOffY;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + pillW - r, y);
        ctx.arc(x + pillW - r, y + r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x + r, y + pillH);
        ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        ctx.fill();
        ctx.restore();
      });

      // Pill pass
      nodes.forEach(n => {
        const scale = n.displayScale;
        const pillH = PILL_H_BASE * scale * n.weight;
        const pillW = n.baseRadius * 2 * scale;
        const x = n.x - pillW / 2;
        const y = n.y - pillH / 2;
        const r = pillH / 2;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + pillW - r, y);
        ctx.arc(x + pillW - r, y + r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x + r, y + pillH);
        ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();

        if (n.selected) {
          const grad = ctx.createLinearGradient(x, y, x + pillW, y + pillH);
          grad.addColorStop(0, 'rgba(89, 227, 165, 0.3)');
          grad.addColorStop(1, 'rgba(61, 212, 160, 0.18)');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = SELECTED_COLOR;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = DEFAULT_FILL;
          ctx.fill();
          ctx.strokeStyle = DEFAULT_BORDER;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        const baseFontSize = Math.round(BASE_FONT * n.weight);
        const fontSize = Math.round(baseFontSize * scale);
        ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = n.selected ? '#a0f0cf' : 'rgba(255, 255, 255, 0.8)';

        if (n.selected) {
          const textMetrics = ctx.measureText(n.label);
          const checkSize = 8 * scale;
          const totalW = checkSize + 4 + textMetrics.width;
          const startX = n.x - totalW / 2;

          ctx.save();
          ctx.strokeStyle = SELECTED_COLOR;
          ctx.lineWidth = 1.6 * scale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          const cx = startX + checkSize * 0.15;
          const cy = n.y - checkSize * 0.05;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + checkSize * 0.3, cy + checkSize * 0.35);
          ctx.lineTo(cx + checkSize * 0.85, cy - checkSize * 0.3);
          ctx.stroke();
          ctx.restore();

          ctx.fillText(n.label, startX + checkSize + 4 + textMetrics.width / 2, n.y + 1);
        } else {
          ctx.fillText(n.label, n.x, n.y + 1);
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
  }, []);

  const hitTestAndSelect = useCallback((mx: number, my: number) => {
    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const scale = n.displayScale;
      const pillW = n.baseRadius * 2 * scale;
      const pillH = PILL_H_BASE * scale * n.weight;
      if (
        mx >= n.x - pillW / 2 &&
        mx <= n.x + pillW / 2 &&
        my >= n.y - pillH / 2 &&
        my <= n.y + pillH / 2
      ) {
        const newSelected = n.selected
          ? selectedGenres.filter(g => g !== n.id)
          : [...selectedGenres, n.id];
        onSelectionChange(newSelected);
        break;
      }
    }
  }, [selectedGenres, onSelectionChange]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    hitTestAndSelect(e.clientX - rect.left, e.clientY - rect.top);
  }, [hitTestAndSelect]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.changedTouches.length === 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    hitTestAndSelect(touch.clientX - rect.left, touch.clientY - rect.top);
    mouseRef.current = { x: -1000, y: -1000 };
  }, [hitTestAndSelect]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const handleRemove = useCallback((genre: string) => {
    onSelectionChange(selectedGenres.filter(g => g !== genre));
  }, [selectedGenres, onSelectionChange]);

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: canvasHeight }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            display: 'block',
            touchAction: 'none',
          }}
        />
      </div>
      {selectedGenres.length > 0 && (
        <div
          className="mt-1 mx-auto px-5 pt-2 pb-3 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            maxWidth: 'fit-content',
          }}
        >
          <span className="text-white/40 uppercase tracking-wider mb-2.5 block text-center" style={{ fontSize: '0.55rem' }}>
            Selected
          </span>
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedGenres.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => handleRemove(g)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors hover:border-red-400/60 hover:bg-red-400/10 group"
                style={{
                  background: 'rgba(89, 227, 165, 0.12)',
                  borderColor: 'rgba(89, 227, 165, 0.35)',
                  color: '#59e3a5',
                  fontSize: '0.8rem',
                }}
              >
                {g}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="opacity-50 group-hover:opacity-100 transition-opacity"
                >
                  <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
