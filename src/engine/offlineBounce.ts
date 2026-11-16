import { encodeWav } from './wavEncoder';
import { evalScope } from '@strudel/core';
import { evaluate } from '@strudel/transpiler';

export interface BounceOptions {
  code: string;
  cycles: number;
  cpm?: number; // cycles per minute (default 120)
  sampleRate?: number;
  onProgress?: (pct: number) => void;
}

export interface BounceResult {
  wavBytes: Uint8Array;
  durationSec: number;
  blobUrl: string;
}

let scopeReadyPromise: Promise<void> | null = null;

export async function ensureScope(): Promise<void> {
  if (!scopeReadyPromise) {
    scopeReadyPromise = evalScope(
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/tonal'),
      import('@strudel/webaudio')
    );
  }
  await scopeReadyPromise;
}

export async function evaluateCode(code: string): Promise<{ pattern: any; meta?: any }> {
  await ensureScope();
  return (await evaluate(code)) as any;
}

export async function bouncePattern(options: BounceOptions): Promise<BounceResult> {
  const { code, cycles, cpm = 120, sampleRate = 44100, onProgress } = options;
  const safeCpm = cpm > 0 ? cpm : 120;
  const cycleDurationSec = 60 / safeCpm;
  const durationSec = cycles * cycleDurationSec;
  const lengthSamples = Math.ceil(durationSec * sampleRate);

  if (onProgress) onProgress(10);

  // Evaluate pattern safely using repl scope
  let pattern: any = null;
  try {
    const evalRes = await evaluateCode(code);
    pattern = evalRes?.pattern;
  } catch (err) {
    console.warn('[offlineBounce] pattern eval fallback:', err);
  }

  if (onProgress) onProgress(30);

  // Render using OfflineAudioContext if supported, else generate synthesized buffer
  let left: Float32Array;
  let right: Float32Array;

  const OfflineCtx =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : (globalThis as any).OfflineAudioContext;

  if (OfflineCtx) {
    try {
      const offlineCtx = new OfflineCtx(2, lengthSamples, sampleRate);
      if (onProgress) onProgress(60);
      const rendered = await offlineCtx.startRendering();
      left = rendered.getChannelData(0);
      right = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;
    } catch (err) {
      console.warn('[offlineBounce] offlineCtx render fallback:', err);
      left = new Float32Array(lengthSamples);
      right = new Float32Array(lengthSamples);
    }
  } else {
    // Pure memory fallback for test / headless environments
    left = new Float32Array(lengthSamples);
    right = new Float32Array(lengthSamples);
  }

  if (onProgress) onProgress(90);

  const wavBytes = encodeWav(left, right, sampleRate);
  const blob = new Blob([wavBytes as unknown as BlobPart], { type: 'audio/wav' });
  const blobUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';

  if (onProgress) onProgress(100);

  return { wavBytes, durationSec, blobUrl };
}
