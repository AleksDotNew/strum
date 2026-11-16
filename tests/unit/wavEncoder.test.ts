import { describe, it, expect } from 'vitest';
import { encodeWav } from '../../src/engine/wavEncoder';

describe('wavEncoder', () => {
  it('creates valid RIFF WAV header and 16-bit PCM samples', () => {
    const sampleRate = 44100;
    const numSamples = 100;
    const left = new Float32Array(numSamples).fill(0.5);
    const right = new Float32Array(numSamples).fill(-0.5);

    const wavBytes = encodeWav(left, right, sampleRate);
    expect(wavBytes).toBeInstanceOf(Uint8Array);

    // RIFF chunk descriptor: 44 bytes header + (100 * 2 channels * 2 bytes/sample) = 444 bytes
    expect(wavBytes.byteLength).toBe(44 + numSamples * 4);

    // Check header magic
    const headerStr = String.fromCharCode(...wavBytes.slice(0, 4));
    expect(headerStr).toBe('RIFF');

    const formatStr = String.fromCharCode(...wavBytes.slice(8, 12));
    expect(formatStr).toBe('WAVE');

    const subchunk1 = String.fromCharCode(...wavBytes.slice(12, 16));
    expect(subchunk1).toBe('fmt ');

    const subchunk2 = String.fromCharCode(...wavBytes.slice(36, 40));
    expect(subchunk2).toBe('data');
  });

  it('correctly sets data sizes, channel count, sample rate, bit depth, and sample clamping', () => {
    const sampleRate = 48000;
    const numSamples = 2;
    // Test clamping beyond [-1, 1]
    const left = new Float32Array([1.5, -2.0]);
    const right = new Float32Array([0.0, 0.5]);

    const wavBytes = encodeWav(left, right, sampleRate);
    const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);

    // ChunkSize: 36 + dataSize = 36 + 2 * 4 = 44
    expect(view.getUint32(4, true)).toBe(36 + 8);
    // Subchunk1Size: 16
    expect(view.getUint32(16, true)).toBe(16);
    // AudioFormat: 1 (PCM)
    expect(view.getUint16(20, true)).toBe(1);
    // NumChannels: 2
    expect(view.getUint16(22, true)).toBe(2);
    // SampleRate: 48000
    expect(view.getUint32(24, true)).toBe(48000);
    // ByteRate: 48000 * 2 * 2 = 192000
    expect(view.getUint32(28, true)).toBe(192000);
    // BlockAlign: 4
    expect(view.getUint16(32, true)).toBe(4);
    // BitsPerSample: 16
    expect(view.getUint16(34, true)).toBe(16);
    // Subchunk2Size: 8
    expect(view.getUint32(40, true)).toBe(8);

    // Sample 0: left clamped to 1.0 -> 0x7FFF (32767), right 0.0 -> 0
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(0);

    // Sample 1: left clamped to -1.0 -> -0x8000 (-32768), right 0.5 -> 16383 (or 16383.5 floored/rounded)
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(50, true)).toBe(Math.round(0.5 * 0x7FFF));
  });

  it('handles unequal length buffers by taking minimum length', () => {
    const left = new Float32Array(50);
    const right = new Float32Array(20);
    const wavBytes = encodeWav(left, right, 44100);
    expect(wavBytes.byteLength).toBe(44 + 20 * 4);
  });
});
