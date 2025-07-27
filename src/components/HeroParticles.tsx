import { useEffect, useRef, useState } from 'react';

const PARTICLE_COUNT = 18;
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
      const height = Math.max(window.innerHeight * 0.6, 500);
      setCanvasSize({ width, height });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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

    // Initialize particles
    particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: randomBetween(0, width),
      y: randomBetween(0, height),
      r: randomBetween(32, 80),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: randomBetween(0.04, 0.12),
      angle: randomBetween(0, Math.PI * 2),
      drift: randomBetween(-0.04, 0.04),
    }));

    let animationId: number;
    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles.current) {
        // Move particle
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += p.drift * 0.1;
        // Wrap around
        if (p.x < -p.r) p.x = width + p.r;
        if (p.x > width + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = height + p.r;
        if (p.y > height + p.r) p.y = -p.r;
        // Draw lens flare (radial gradient)
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
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '60vh',
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