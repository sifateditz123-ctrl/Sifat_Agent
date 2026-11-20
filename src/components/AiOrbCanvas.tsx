import { useEffect, useRef } from 'react';
import type { VoiceStage } from '../types/assistant';

interface AiOrbCanvasProps {
  stage: VoiceStage;
  micLevel: number;
  size?: number;
}

export function AiOrbCanvas({ stage, micLevel, size = 168 }: AiOrbCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ stage, micLevel });
  stateRef.current = { stage, micLevel };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let angle = 0;

    const renderFrame = () => {
      const dpr = window.devicePixelRatio || 1;
      const targetPx = Math.round(size * dpr);
      if (canvas.width !== targetPx || canvas.height !== targetPx) {
        canvas.width = targetPx;
        canvas.height = targetPx;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const { stage: currentStage, micLevel: level } = stateRef.current;
      const cx = size / 2;
      const cy = size / 2;

      const stageMultiplier =
        currentStage === 'LISTENING'
          ? 1 + level * 0.22
          : currentStage === 'PROCESSING'
          ? 1.07
          : currentStage === 'SPEAKING'
          ? 1.04 + Math.sin(angle * 3) * 0.04
          : 1 + Math.sin(angle) * 0.025;

      const radius = size * 0.29 * stageMultiplier;

      // Ambient halo
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.75);
      halo.addColorStop(0, currentStage === 'ERROR' ? 'rgba(220,38,38,0.32)' : 'rgba(59,130,246,0.30)');
      halo.addColorStop(0.55, 'rgba(139,92,246,0.14)');
      halo.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.75, 0, Math.PI * 2);
      ctx.fill();

      // Orbital ring
      const ox = cx + Math.cos(angle) * 2.5;
      const oy = cy + Math.sin(angle) * 2.5;
      const ringGrad = ctx.createLinearGradient(0, 0, size, size);
      ringGrad.addColorStop(0, '#38BDF8');
      ringGrad.addColorStop(0.5, '#3B82F6');
      ringGrad.addColorStop(1, '#8B5CF6');
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, radius * 1.18, 0, Math.PI * 2);
      ctx.stroke();

      // Core orb
      const coreGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      coreGrad.addColorStop(0, currentStage === 'ERROR' ? '#DC2626' : '#3B82F6');
      coreGrad.addColorStop(1, currentStage === 'ERROR' ? '#991B1B' : '#8B5CF6');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner specular highlight
      const inner = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.32,
        2,
        cx,
        cy,
        radius
      );
      inner.addColorStop(0, 'rgba(255,255,255,0.42)');
      inner.addColorStop(0.45, 'rgba(255,255,255,0.08)');
      inner.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (!prefersReducedMotion) {
        angle += currentStage === 'PROCESSING' ? 0.07 : 0.025;
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-label={`Sifat Agent orb state: ${stage.toLowerCase()}`}
      data-testid="ai-orb-canvas"
      data-stage={stage}
      className="block mx-auto"
    />
  );
}

export function VoiceWaveformBars({ active, level }: { active: boolean; level: number }) {
  const heights = [0.32, 0.55, 0.85, 0.62, 0.95, 0.72, 0.88, 0.54, 0.76, 0.42];
  return (
    <div
      className="flex items-center justify-center gap-1.5 h-9"
      aria-label={active ? 'Microphone waveform active' : 'Microphone waveform idle'}
    >
      {heights.map((base, idx) => {
        const scale = active ? Math.min(1, Math.max(0.22, base * (0.55 + level * 0.65))) : 0.16;
        return (
          <span
            key={idx}
            className="w-1.5 h-8 rounded-full bg-gradient-to-t from-blue-500 to-violet-500 transition-transform duration-150"
            style={{ transform: `scaleY(${scale})` }}
          />
        );
      })}
    </div>
  );
}
