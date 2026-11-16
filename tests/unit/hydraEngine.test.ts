import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HydraEngine } from '../../src/visuals/hydraEngine';
import { VISUAL_PRESETS } from '../../src/visuals/visualPresets';

describe('HydraEngine', () => {
  let engine: HydraEngine;

  beforeEach(() => {
    engine = new HydraEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('initialization and presets', () => {
    it('initializes with default preset and opacity', () => {
      const preset = engine.getCurrentPreset();
      expect(preset).toBeDefined();
      expect(preset.id).toBe('neon-glitch');
      expect(engine.getOpacity()).toBe(1.0);
      expect(engine.getAudioMetrics()).toEqual({ bass: 0, mid: 0, high: 0, rms: 0 });
    });

    it('changes preset with setPreset', () => {
      engine.setPreset('cyber-tunnel');
      expect(engine.getCurrentPreset().id).toBe('cyber-tunnel');

      // Invalid preset does not change current preset
      engine.setPreset('unknown-preset-xyz');
      expect(engine.getCurrentPreset().id).toBe('cyber-tunnel');
    });

    it('sets and clamps opacity between 0 and 1', () => {
      engine.setOpacity(0.5);
      expect(engine.getOpacity()).toBe(0.5);

      engine.setOpacity(-0.2);
      expect(engine.getOpacity()).toBe(0);

      engine.setOpacity(1.5);
      expect(engine.getOpacity()).toBe(1);
    });
  });

  describe('canvas initialization & mobile sizing', () => {
    it('initializes canvas and sets mobile dimensions without throwing in headless mode', () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        clientWidth: 412,
        clientHeight: 915,
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      expect(() => {
        engine.init(mockCanvas);
      }).not.toThrow();

      expect(mockCanvas.width).toBeGreaterThanOrEqual(412);
      expect(mockCanvas.height).toBeGreaterThanOrEqual(915);
    });

    it('falls back to default dimensions when clientWidth/clientHeight are 0', () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        clientWidth: 0,
        clientHeight: 0,
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      engine.init(mockCanvas);
      expect(mockCanvas.width).toBe(412);
      expect(mockCanvas.height).toBe(915);
    });
  });

  describe('audio integration and metrics calculation', () => {
    it('manually updates audio metrics with updateAudio', () => {
      engine.updateAudio({ bass: 0.9, mid: 0.4, high: 0.2, rms: 0.7 });
      const metrics = engine.getAudioMetrics();
      expect(metrics.bass).toBe(0.9);
      expect(metrics.mid).toBe(0.4);
      expect(metrics.high).toBe(0.2);
      expect(metrics.rms).toBe(0.7);
    });

    it('connects to AudioContext and AnalyserNode', () => {
      const mockAnalyser = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn((arr: Uint8Array) => {
          // Fill bass bins with high values, high bins with low values
          arr.fill(200, 0, 5);
          arr.fill(100, 5, 30);
          arr.fill(50, 30, 128);
        }),
        getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
          // Fill oscillating waveform
          for (let i = 0; i < arr.length; i++) {
            arr[i] = 128 + Math.sin(i) * 50;
          }
        }),
      };

      const mockSource = {
        connect: vi.fn(),
        disconnect: vi.fn(),
      };

      const mockCtx = {
        sampleRate: 44100,
        createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
      } as unknown as AudioContext;

      engine.connectAudio(mockCtx, mockSource as unknown as AudioNode);
      expect(mockCtx.createAnalyser).toHaveBeenCalled();
      expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser);

      const metrics = engine.getAudioMetrics();
      expect(metrics.bass).toBeGreaterThan(0.5);
      expect(metrics.mid).toBeGreaterThan(0.2);
      expect(metrics.rms).toBeGreaterThan(0);
    });
  });

  describe('Hydra chaining DSL', () => {
    it('supports chainable Hydra DSL methods', () => {
      const chain = engine
        .osc(20, 0.1, 0.8)
        .kaleid(4)
        .color(1, 0.5, 0.2)
        .rotate(0.5, 0.1)
        .scroll(0.1, 0.2)
        .modulate(engine.osc(10, 0.1, 0), 0.5);

      expect(chain).toBeDefined();
      expect(typeof chain.out).toBe('function');
      expect(() => chain.out()).not.toThrow();
    });

    it('provides s0 source object for Hydra compatibility', () => {
      expect(engine.s0).toBeDefined();
      expect(typeof engine.s0.init).toBe('function');
      expect(() => engine.s0.init()).not.toThrow();
    });
  });

  describe('rendering and animation loop', () => {
    it('renders frame for current preset without throwing', () => {
      for (const preset of VISUAL_PRESETS) {
        engine.setPreset(preset.id);
        expect(() => {
          engine.renderFrame(1.5);
        }).not.toThrow();
      }
    });

    it('starts and stops animation loop safely', () => {
      const origRaf = globalThis.requestAnimationFrame;
      const origCaf = globalThis.cancelAnimationFrame;

      let rafId = 100;
      globalThis.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
        return rafId++;
      });
      globalThis.cancelAnimationFrame = vi.fn();

      engine.start();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();

      // Starting while running should be a no-op
      engine.start();

      engine.stop();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();

      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    });

    it('destroys cleanly and stops loop', () => {
      engine.start();
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});
