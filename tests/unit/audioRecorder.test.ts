import { describe, it, expect, vi } from 'vitest';
import { AudioRecorder, audioRecorder } from '../../src/engine/audioRecorder';

describe('AudioRecorder', () => {
  it('manages recording state and emits recorded WAV bytes', async () => {
    const recorder = new AudioRecorder();
    expect(recorder.getState()).toBe('idle');

    let peakReceived = -1;
    recorder.onPeak((peak) => {
      peakReceived = peak;
    });

    const mockProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null as ((e: any) => void) | null,
    };

    const mockDestination = {};
    const mockCtx = {
      sampleRate: 44100,
      createScriptProcessor: vi.fn().mockReturnValue(mockProcessor),
      destination: mockDestination,
    } as unknown as AudioContext;

    recorder.start(mockCtx);
    expect(recorder.getState()).toBe('recording');
    expect(mockCtx.createScriptProcessor).toHaveBeenCalledWith(4096, 2, 2);

    // Call start again while recording - should be no-op
    recorder.start(mockCtx);
    expect(mockCtx.createScriptProcessor).toHaveBeenCalledTimes(1);

    // Simulate audio chunks
    expect(mockProcessor.onaudioprocess).toBeTypeOf('function');
    mockProcessor.onaudioprocess!({
      inputBuffer: {
        numberOfChannels: 2,
        getChannelData: (ch: number) => new Float32Array(256).fill(ch === 0 ? 0.3 : -0.3),
      },
    });

    expect(peakReceived).toBeCloseTo(0.3, 5);

    // Second chunk
    mockProcessor.onaudioprocess!({
      inputBuffer: {
        numberOfChannels: 2,
        getChannelData: (ch: number) => new Float32Array(256).fill(ch === 0 ? 0.6 : -0.4),
      },
    });
    expect(peakReceived).toBeCloseTo(0.6, 5);

    const result = await recorder.stop();
    expect(recorder.getState()).toBe('idle');
    expect(result.wavBytes).toBeInstanceOf(Uint8Array);
    expect(result.wavBytes.byteLength).toBe(44 + 512 * 4); // 44 header + 512 samples * 2 ch * 2 bytes
    expect(result.durationSec).toBeCloseTo(512 / 44100, 4);
    expect(mockProcessor.disconnect).toHaveBeenCalled();
  });

  it('handles custom sourceNode and single-channel inputBuffer', async () => {
    const recorder = new AudioRecorder();
    const mockProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null as ((e: any) => void) | null,
    };
    const mockSource = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as AudioNode;

    const mockCtx = {
      sampleRate: 48000,
      createScriptProcessor: vi.fn().mockReturnValue(mockProcessor),
      destination: {},
    } as unknown as AudioContext;

    recorder.start(mockCtx, mockSource);
    expect(mockSource.connect).toHaveBeenCalledWith(mockProcessor);
    expect(mockProcessor.connect).toHaveBeenCalledWith(mockCtx.destination);

    // Single-channel input
    mockProcessor.onaudioprocess!({
      inputBuffer: {
        numberOfChannels: 1,
        getChannelData: (_ch: number) => new Float32Array(128).fill(0.25),
      },
    });

    const result = await recorder.stop();
    expect(result.durationSec).toBeCloseTo(128 / 48000, 4);
    expect(result.wavBytes.byteLength).toBe(44 + 128 * 4);
    expect((mockSource.disconnect as any)).toHaveBeenCalledWith(mockProcessor);
  });

  it('exports singleton audioRecorder', () => {
    expect(audioRecorder).toBeInstanceOf(AudioRecorder);
    expect(audioRecorder.getState()).toBe('idle');
  });
});
