import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bouncePattern, evaluateCode } from '../../src/engine/offlineBounce';

describe('offlineBounce', () => {
  it('computes cycle duration and returns encoded WAV buffer', async () => {
    const progressCalls: number[] = [];
    const result = await bouncePattern({
      code: 's("bd sd")',
      cycles: 2,
      cpm: 120,
      sampleRate: 44100,
      onProgress: (pct) => progressCalls.push(pct),
    });

    expect(result.durationSec).toBe(1.0); // 2 cycles at 120 cpm (60/120 = 0.5s per cycle) -> 1.0 sec
    expect(result.wavBytes).toBeInstanceOf(Uint8Array);
    expect(result.wavBytes.byteLength).toBe(44 + 44100 * 4);
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0]).toBe(10);
    expect(progressCalls[progressCalls.length - 1]).toBe(100);
    expect(typeof result.blobUrl).toBe('string');
  });

  it('uses default cpm (120) and default sampleRate (44100) when omitted', async () => {
    const result = await bouncePattern({
      code: 's("hh*4")',
      cycles: 1,
    });

    expect(result.durationSec).toBe(0.5); // 1 cycle at 120 cpm -> 0.5s
    expect(result.wavBytes.byteLength).toBe(44 + Math.ceil(0.5 * 44100) * 4);
  });

  it('calculates custom duration with different cycles, cpm, and sampleRate', async () => {
    const result = await bouncePattern({
      code: 's("bd [sd cp]")',
      cycles: 4,
      cpm: 60,
      sampleRate: 48000,
    });

    // 4 cycles * (60 / 60) = 4.0 sec
    expect(result.durationSec).toBe(4.0);
    const expectedSamples = 4.0 * 48000;
    expect(result.wavBytes.byteLength).toBe(44 + expectedSamples * 4);
  });

  describe('OfflineAudioContext integration', () => {
    const originalOfflineCtx = (globalThis as any).OfflineAudioContext;

    afterEach(() => {
      (globalThis as any).OfflineAudioContext = originalOfflineCtx;
    });

    it('uses OfflineAudioContext when available to render audio channels', async () => {
      const mockRender = vi.fn().mockImplementation(function (channels: number, length: number, sampleRate: number) {
        return {
          startRendering: async () => {
            const leftChannel = new Float32Array(length).fill(0.5);
            const rightChannel = new Float32Array(length).fill(-0.5);
            return {
              numberOfChannels: 2,
              getChannelData: (ch: number) => (ch === 0 ? leftChannel : rightChannel),
            };
          },
        };
      });

      (globalThis as any).OfflineAudioContext = mockRender;

      const progressCalls: number[] = [];
      const result = await bouncePattern({
        code: 's("bd")',
        cycles: 1,
        cpm: 120,
        sampleRate: 1000,
        onProgress: (pct) => progressCalls.push(pct),
      });

      expect(mockRender).toHaveBeenCalledWith(2, 500, 1000);
      expect(result.wavBytes.byteLength).toBe(44 + 500 * 4);
      expect(progressCalls).toContain(60);

      // Verify samples were encoded
      const view = new DataView(result.wavBytes.buffer, result.wavBytes.byteOffset, result.wavBytes.byteLength);
      // Sample 0 left = 0.5 -> ~16383, right = -0.5 -> -16384
      expect(view.getInt16(44, true)).toBe(Math.round(0.5 * 0x7FFF));
      expect(view.getInt16(46, true)).toBe(Math.round(-0.5 * 0x8000));
    });

    it('falls back gracefully to zeroed buffers if startRendering rejects', async () => {
      const mockFailingOfflineCtx = vi.fn().mockImplementation(function () {
        return {
          startRendering: async () => {
            throw new Error('AudioContext crashed');
          },
        };
      });

      (globalThis as any).OfflineAudioContext = mockFailingOfflineCtx;

      const result = await bouncePattern({
        code: 's("bd")',
        cycles: 1,
        cpm: 120,
        sampleRate: 1000,
      });

      expect(result.durationSec).toBe(0.5);
      expect(result.wavBytes.byteLength).toBe(44 + 500 * 4);
    });
  });

  describe('evaluateCode and error handling', () => {
    it('evaluates valid Strudel code and extracts pattern', async () => {
      const res = await evaluateCode('s("bd sd")');
      expect(res).toBeDefined();
      expect(res.pattern).toBeDefined();
    });

    it('gracefully handles pattern evaluation errors without throwing during bouncePattern', async () => {
      const result = await bouncePattern({
        code: 'this is not valid syntax (()!#$%)',
        cycles: 2,
        cpm: 120,
        sampleRate: 2000,
      });

      expect(result.durationSec).toBe(1.0);
      expect(result.wavBytes.byteLength).toBe(44 + 2000 * 4);
    });
  });
});
