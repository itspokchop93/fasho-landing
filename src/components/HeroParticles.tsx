import { useEffect, useRef, useState } from 'react';

const PARTICLE_COUNT = 22;
const COLORS = [
  'rgba(20,192,255,0.10)', // blue
  'rgba(89,227,165,0.08)', // green
  'rgba(139,92,246,0.10)', // purple
  'rgba(255,255,255,0.07)', // white
];

type Particle = {
  x: number;
  y: number;
  r: number;
  color: string;
  speed: number;
  angle: number;
  drift: number;
};

function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 600 });

  useEffect(() => {
    function updateSize() {
      const width = window.innerWidth;
      // Calculate hero section height (viewport height minus some space for the campaign section)
      const heroHeight = Math.min(window.innerHeight * 0.85, 800);
      setCanvasSize({ width, height: heroHeight });
    }
    updateSize();
    
    // Only update on actual resize, not mobile scroll events
    let resizeTimeout: NodeJS.Timeout;
    const debouncedUpdateSize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 250); // Longer delay to prevent scroll-triggered updates
    };
    
    window.addEventListener('resize', debouncedUpdateSize);
    return () => {
      window.removeEventListener('resize', debouncedUpdateSize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvasSize.width;
    let height = canvasSize.height;
    canvas.width = width;
    canvas.height = height;

    // Initialize particles ONLY if they don't exist yet (preserve positions across resizes)
    if (particles.current.length === 0) {
      particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: randomBetween(0, width),
        y: randomBetween(0, height),
        r: randomBetween(32, 80),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: randomBetween(0.04, 0.12),
        angle: randomBetween(0, Math.PI * 2),
        drift: randomBetween(-0.04, 0.04),
      }));
    }

    // Draw static particles (no animation loop needed)
    function drawStaticParticles() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles.current) {
        // Draw lens flare (radial gradient) - no movement, just static positioning
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.5, p.color.replace(/0\.[0-9]+\)/, '0.04)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.fill();
      }
    }
    drawStaticParticles();

    return () => {
      // No animation to cancel since particles are static
    };
  }, [canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${canvasSize.height}px`,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.7,
      }}
      width={canvasSize.width}
      height={canvasSize.height}
      aria-hidden="true"
    />
  );
} 