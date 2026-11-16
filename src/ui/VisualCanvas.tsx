import { onMount, onCleanup, createEffect } from 'solid-js';
import { hydraEngine } from '../visuals/hydraEngine';
import { VISUAL_PRESETS, getVisualPreset, type VisualPreset } from '../visuals/visualPresets';
import { getAudioContext } from '@strudel/webaudio';

export type VisualMode = 'code' | 'hybrid' | 'stage';

export function getOpacityForMode(mode: VisualMode): number {
  switch (mode) {
    case 'code':
      return 0.0;
    case 'hybrid':
      return 0.5;
    case 'stage':
      return 1.0;
  }
}

export function getModeForOpacity(opacity: number): VisualMode {
  const op = clampOpacity(opacity);
  if (op < 0.1) return 'code';
  if (op >= 0.85) return 'stage';
  return 'hybrid';
}

export function getNextVisualMode(currentMode: VisualMode): VisualMode {
  switch (currentMode) {
    case 'code':
      return 'hybrid';
    case 'hybrid':
      return 'stage';
    case 'stage':
      return 'code';
  }
}

export function clampOpacity(val: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
}

export function formatOpacityPercent(opacity: number): string {
  const pct = Math.round(clampOpacity(opacity) * 100);
  return `${pct}%`;
}

export function formatMetricLevel(level: number): string {
  const norm = Math.max(0, Math.min(1, typeof level === 'number' && !Number.isNaN(level) ? level : 0));
  return `${Math.round(norm * 100)}%`;
}

export function resolvePreset(id?: string): VisualPreset {
  if (!id) return VISUAL_PRESETS[0];
  const found = getVisualPreset(id);
  return found || VISUAL_PRESETS[0];
}

export interface VisualCanvasProps {
  opacity?: number;
  activePresetId?: string;
  playing?: boolean;
}

export function VisualCanvas(props: VisualCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  const tryConnectAudio = () => {
    try {
      let ctx: AudioContext | undefined;
      try {
        ctx = getAudioContext();
      } catch {
        const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (globalThis as any).webkitAudioContext;
        if (Ctx) ctx = new Ctx();
      }
      if (ctx) {
        hydraEngine.connectAudio(ctx);
      }
    } catch {
      // AudioContext may not be active yet
    }
  };

  onMount(() => {
    if (canvasRef) {
      hydraEngine.init(canvasRef);
      hydraEngine.start();
    }

    const handleResize = () => {
      if (canvasRef) {
        hydraEngine.init(canvasRef);
      }
    };

    window.addEventListener('resize', handleResize);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      hydraEngine.stop();
    });
  });

  createEffect(() => {
    const op = clampOpacity(props.opacity ?? 0);
    hydraEngine.setOpacity(op);
  });

  createEffect(() => {
    if (props.activePresetId) {
      hydraEngine.setPreset(props.activePresetId);
    }
  });

  createEffect(() => {
    if (props.playing) {
      tryConnectAudio();
    }
  });

  const effectiveOpacity = () => clampOpacity(props.opacity ?? 0);

  return (
    <canvas
      ref={canvasRef}
      id="strum-visual-canvas"
      class="visual-canvas"
      style={{
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': '0',
        opacity: effectiveOpacity(),
        '--visual-opacity': effectiveOpacity(),
      }}
    />
  );
}
