import { describe, it, expect } from 'vitest';
import {
  type VisualMode,
  getOpacityForMode,
  getModeForOpacity,
  getNextVisualMode,
  clampOpacity,
  formatOpacityPercent,
  formatMetricLevel,
  resolvePreset,
} from '../../src/ui/VisualCanvas';
import { VISUAL_PRESETS } from '../../src/visuals/visualPresets';

describe('visualCanvas helper logic', () => {
  describe('opacity and visual modes', () => {
    it('returns correct opacity for each VisualMode', () => {
      expect(getOpacityForMode('code')).toBe(0.0);
      expect(getOpacityForMode('hybrid')).toBe(0.5);
      expect(getOpacityForMode('stage')).toBe(1.0);
    });

    it('determines the correct VisualMode from an opacity value', () => {
      expect(getModeForOpacity(0.0)).toBe('code');
      expect(getModeForOpacity(0.04)).toBe('code');
      expect(getModeForOpacity(0.4)).toBe('hybrid');
      expect(getModeForOpacity(0.5)).toBe('hybrid');
      expect(getModeForOpacity(0.7)).toBe('hybrid');
      expect(getModeForOpacity(0.9)).toBe('stage');
      expect(getModeForOpacity(1.0)).toBe('stage');
    });

    it('cycles through modes sequentially (code -> hybrid -> stage -> code)', () => {
      expect(getNextVisualMode('code')).toBe('hybrid');
      expect(getNextVisualMode('hybrid')).toBe('stage');
      expect(getNextVisualMode('stage')).toBe('code');
    });

    it('clamps opacity to [0, 1] range safely', () => {
      expect(clampOpacity(-0.5)).toBe(0);
      expect(clampOpacity(1.5)).toBe(1);
      expect(clampOpacity(0.42)).toBe(0.42);
      expect(clampOpacity(Number.NaN)).toBe(0);
    });

    it('formats opacity as percentage string', () => {
      expect(formatOpacityPercent(0)).toBe('0%');
      expect(formatOpacityPercent(0.5)).toBe('50%');
      expect(formatOpacityPercent(1)).toBe('100%');
      expect(formatOpacityPercent(0.426)).toBe('43%');
    });
  });

  describe('audio metric formatting', () => {
    it('clamps and formats audio metric level as CSS percentage string', () => {
      expect(formatMetricLevel(0)).toBe('0%');
      expect(formatMetricLevel(0.75)).toBe('75%');
      expect(formatMetricLevel(1.5)).toBe('100%');
      expect(formatMetricLevel(-0.2)).toBe('0%');
    });
  });

  describe('preset selection and fallback', () => {
    it('resolves known preset by id', () => {
      const preset = resolvePreset('neon-glitch');
      expect(preset).toBeDefined();
      expect(preset.id).toBe('neon-glitch');
      expect(preset.name).toBe('Neon Glitch');
    });

    it('falls back to the first default preset when id is invalid or unknown', () => {
      const fallback = resolvePreset('non-existent-preset-id');
      expect(fallback).toBeDefined();
      expect(fallback.id).toBe(VISUAL_PRESETS[0].id);
    });
  });
});
