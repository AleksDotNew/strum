import { describe, it, expect } from 'vitest';
import {
  VISUAL_PRESETS,
  getVisualPreset,
  type VisualPreset,
  type AudioMetrics,
} from '../../src/visuals/visualPresets';

describe('visualPresets', () => {
  it('contains at least 8 reactive visual presets with required properties', () => {
    expect(VISUAL_PRESETS.length).toBeGreaterThanOrEqual(8);

    for (const preset of VISUAL_PRESETS) {
      expect(preset.id).toBeTypeOf('string');
      expect(preset.name).toBeTypeOf('string');
      expect(preset.description).toBeTypeOf('string');
      expect(preset.render).toBeTypeOf('function');
    }
  });

  it('contains all 8 required preset IDs', () => {
    const expectedIds = [
      'neon-glitch',
      'cyber-tunnel',
      'audio-ripple',
      'feedback-void',
      'vhs-synthwave',
      'kinetic-acid',
      'liquid-metal',
      'wireframe-grid',
    ];

    for (const id of expectedIds) {
      const preset = getVisualPreset(id);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(id);
      expect(preset?.name.length).toBeGreaterThan(0);
      expect(preset?.description.length).toBeGreaterThan(0);
    }
  });

  it('returns undefined for non-existent preset id', () => {
    expect(getVisualPreset('non-existent-preset')).toBeUndefined();
  });

  it('runs preset render function with minimal mockHydra without throwing', () => {
    const mockHydra = {
      osc: () => mockHydra,
      kaleid: () => mockHydra,
      color: () => mockHydra,
      modulate: () => mockHydra,
      out: () => mockHydra,
      s0: { init: () => {} },
    };

    const metrics: AudioMetrics = { bass: 0.8, mid: 0.4, high: 0.2, rms: 0.5 };

    for (const preset of VISUAL_PRESETS) {
      expect(() => {
        preset.render(mockHydra, metrics);
      }).not.toThrow();
    }
  });

  it('runs preset render function with full mockHydra and time parameter without throwing', () => {
    const mockHydra: any = {
      osc: () => mockHydra,
      kaleid: () => mockHydra,
      color: () => mockHydra,
      modulate: () => mockHydra,
      rotate: () => mockHydra,
      scroll: () => mockHydra,
      scale: () => mockHydra,
      out: () => mockHydra,
      s0: { init: () => {} },
    };

    const metrics: AudioMetrics = { bass: 1.0, mid: 0.9, high: 0.7, rms: 0.8 };

    for (const preset of VISUAL_PRESETS) {
      expect(() => {
        preset.render(mockHydra, metrics, 12.34);
      }).not.toThrow();
    }
  });

  it('handles edge case audio metrics (all zeros / silence)', () => {
    const mockHydra = {
      osc: () => mockHydra,
      kaleid: () => mockHydra,
      color: () => mockHydra,
      modulate: () => mockHydra,
      out: () => mockHydra,
    };

    const silence: AudioMetrics = { bass: 0, mid: 0, high: 0, rms: 0 };

    for (const preset of VISUAL_PRESETS) {
      expect(() => {
        preset.render(mockHydra, silence, 0);
      }).not.toThrow();
    }
  });
});
