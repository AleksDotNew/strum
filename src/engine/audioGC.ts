/**
 * Audio Performance & Memory Garbage Collection
 *
 * Tracks, cleans up, and safely disposes of Web Audio nodes,
 * preventing disconnected graph leaks during Strudel pattern swaps,
 * stop/hush events, and background lifecycle pauses.
 */

export type DisposableAudioNode =
  | AudioNode
  | AudioScheduledSourceNode
  | {
      disconnect?: () => void;
      stop?: () => void;
    };

export interface AudioMemoryStats {
  activeNodes: number;
  allocatedBytes: number;
}

export interface AudioStats extends AudioMemoryStats {
  allocatedBuffers: number;
  activeVoices: number;
}

const disposableNodes = new Set<DisposableAudioNode>();
let totalAllocatedBytes = 0;

/**
 * Register a node to be automatically cleaned up on next hush/stop/GC cycle.
 */
export function registerDisposableNode(node: DisposableAudioNode | null | undefined): void {
  if (!node) return;
  const target = node as { disconnect?: unknown; stop?: unknown };
  if (typeof target.disconnect !== 'function' && typeof target.stop !== 'function') {
    return;
  }
  disposableNodes.add(node);
}

/**
 * Unregister a node (e.g. if disposed manually elsewhere).
 */
export function unregisterDisposableNode(node: any): void {
  if (!node) return;
  disposableNodes.delete(node);
}

/**
 * Safely stops and disconnects all registered nodes, clearing the registry.
 */
export function disposeAllAudioNodes(): void {
  for (const node of disposableNodes) {
    try {
      const stoppable = node as { stop?: () => void };
      if (typeof stoppable.stop === 'function') {
        stoppable.stop();
      }
    } catch {
      // Ignored: node may already be stopped or scheduled stop expired
    }

    try {
      if (typeof node.disconnect === 'function') {
        node.disconnect();
      }
    } catch {
      // Ignored: node may already be disconnected
    }
  }
  disposableNodes.clear();
}

/**
 * Alias for disposeAllAudioNodes to support REPL hush cleanup interface.
 */
export function cleanupAudioNodes(): void {
  disposeAllAudioNodes();
}

/**
 * Return current count of active registered disposable nodes.
 */
export function getActiveNodeCount(): number {
  return disposableNodes.size;
}

/**
 * Track an allocated audio buffer or chunk in bytes.
 */
export function trackAudioAllocation(bytes: number): void {
  if (typeof bytes === 'number' && !isNaN(bytes)) {
    totalAllocatedBytes += Math.max(0, bytes);
  }
}

/**
 * Overload to track allocations with an optional category tag.
 */
export function trackAudioAllocations(tagOrBytes: string | number, size?: number): void {
  if (typeof tagOrBytes === 'number') {
    trackAudioAllocation(tagOrBytes);
  } else if (typeof size === 'number') {
    trackAudioAllocation(size);
  }
}

/**
 * Reset tracked audio allocation counter to zero.
 */
export function resetAudioAllocations(): void {
  totalAllocatedBytes = 0;
}

/**
 * Get active node count and total allocated bytes.
 */
export function getAudioMemoryStats(): AudioMemoryStats {
  return {
    activeNodes: disposableNodes.size,
    allocatedBytes: totalAllocatedBytes,
  };
}

/**
 * Get extended audio stats for monitoring/diagnostics.
 */
export function getAudioStats(): AudioStats {
  return {
    activeNodes: disposableNodes.size,
    activeVoices: disposableNodes.size,
    allocatedBuffers: 0,
    allocatedBytes: totalAllocatedBytes,
  };
}

/**
 * Run audio garbage collection cycle. Disposes disconnected nodes
 * and logs memory statistics in development.
 */
export function runAudioGC(audioCtx?: AudioContext): void {
  disposeAllAudioNodes();

  if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'closed')) {
    // Context is inactive or closed; ensure references are trimmed
    resetAudioAllocations();
  }

  const isDev = Boolean(
    import.meta.env?.DEV ||
      (typeof globalThis !== 'undefined' &&
        (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV ===
          'development')
  );

  if (isDev) {
    console.debug('[AudioGC] runAudioGC completed. Active nodes:', disposableNodes.size);
  }
}
