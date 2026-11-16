import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerDisposableNode,
  unregisterDisposableNode,
  disposeAllAudioNodes,
  getActiveNodeCount,
  trackAudioAllocation,
  trackAudioAllocations,
  resetAudioAllocations,
  getAudioMemoryStats,
  getAudioStats,
  cleanupAudioNodes,
  runAudioGC,
} from '../../src/engine/audioGC';

describe('audioGC', () => {
  beforeEach(() => {
    disposeAllAudioNodes();
    resetAudioAllocations();
  });

  it('registers and disposes disconnected WebAudio nodes', () => {
    let disconnected = false;
    let stopped = false;
    const mockNode = {
      disconnect: vi.fn(() => {
        disconnected = true;
      }),
      stop: vi.fn(() => {
        stopped = true;
      }),
    };

    registerDisposableNode(mockNode);
    expect(getActiveNodeCount()).toBe(1);

    disposeAllAudioNodes();
    expect(disconnected).toBe(true);
    expect(stopped).toBe(true);
    expect(getActiveNodeCount()).toBe(0);
  });

  it('unregisters specific nodes', () => {
    const node1 = { disconnect: vi.fn() };
    const node2 = { disconnect: vi.fn() };

    registerDisposableNode(node1);
    registerDisposableNode(node2);
    expect(getActiveNodeCount()).toBe(2);

    unregisterDisposableNode(node1);
    expect(getActiveNodeCount()).toBe(1);

    disposeAllAudioNodes();
    expect(node1.disconnect).not.toHaveBeenCalled();
    expect(node2.disconnect).toHaveBeenCalledTimes(1);
    expect(getActiveNodeCount()).toBe(0);
  });

  it('handles errors gracefully if disconnect or stop throws', () => {
    const errorNode = {
      disconnect: vi.fn(() => {
        throw new Error('Already disconnected');
      }),
      stop: vi.fn(() => {
        throw new Error('Already stopped');
      }),
    };
    const healthyNode = {
      disconnect: vi.fn(),
      stop: vi.fn(),
    };

    registerDisposableNode(errorNode);
    registerDisposableNode(healthyNode);
    expect(getActiveNodeCount()).toBe(2);

    expect(() => disposeAllAudioNodes()).not.toThrow();
    expect(healthyNode.disconnect).toHaveBeenCalledTimes(1);
    expect(healthyNode.stop).toHaveBeenCalledTimes(1);
    expect(getActiveNodeCount()).toBe(0);
  });

  it('handles invalid or partial node objects gracefully', () => {
    registerDisposableNode(null as any);
    registerDisposableNode(undefined as any);
    registerDisposableNode({} as any);
    const nodeWithOnlyDisconnect = { disconnect: vi.fn() };
    registerDisposableNode(nodeWithOnlyDisconnect);

    expect(getActiveNodeCount()).toBe(1);
    expect(() => disposeAllAudioNodes()).not.toThrow();
    expect(nodeWithOnlyDisconnect.disconnect).toHaveBeenCalledTimes(1);
    expect(getActiveNodeCount()).toBe(0);
  });

  it('tracks audio allocation bytes and reports memory stats', () => {
    expect(getAudioMemoryStats()).toEqual({ activeNodes: 0, allocatedBytes: 0 });

    trackAudioAllocation(1024 * 1024);
    trackAudioAllocation(512 * 1024);
    expect(getAudioMemoryStats().allocatedBytes).toBe(1.5 * 1024 * 1024);

    // Support tagged allocation overload if called
    trackAudioAllocations('buffer-pool', 256 * 1024);
    expect(getAudioMemoryStats().allocatedBytes).toBe(1.75 * 1024 * 1024);

    const stats = getAudioStats();
    expect(stats.allocatedBytes).toBe(1.75 * 1024 * 1024);
    expect(typeof stats.activeVoices).toBe('number');
    expect(typeof stats.allocatedBuffers).toBe('number');

    resetAudioAllocations();
    expect(getAudioMemoryStats().allocatedBytes).toBe(0);
  });

  it('supports cleanupAudioNodes alias', () => {
    const node = { disconnect: vi.fn() };
    registerDisposableNode(node);
    cleanupAudioNodes();
    expect(node.disconnect).toHaveBeenCalled();
    expect(getActiveNodeCount()).toBe(0);
  });

  it('runs runAudioGC with or without AudioContext', () => {
    const node = { disconnect: vi.fn(), stop: vi.fn() };
    registerDisposableNode(node);

    const mockCtx = {
      state: 'suspended',
      close: vi.fn(),
    } as unknown as AudioContext;

    expect(() => runAudioGC(mockCtx)).not.toThrow();
    expect(node.disconnect).toHaveBeenCalled();
    expect(getActiveNodeCount()).toBe(0);

    // Running with closed context or undefined context
    const node2 = { disconnect: vi.fn() };
    registerDisposableNode(node2);
    expect(() => runAudioGC(undefined)).not.toThrow();
    expect(node2.disconnect).toHaveBeenCalled();
    expect(getActiveNodeCount()).toBe(0);
  });

  it('re-exports runAudioGC from engine.ts', async () => {
    const engineModule = await import('../../src/engine/engine');
    expect(typeof engineModule.runAudioGC).toBe('function');
    expect(typeof engineModule.registerDisposableNode).toBe('function');
  });
});
