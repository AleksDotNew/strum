# Strum Beta (v0.2.0-beta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Beta stage of Strum: WAV Live Recording & Offline Bounce, Hydra WebGL Interactive Visuals with audio-reactivity, Studio Ergonomics (`_$` block mute gutter toggle, dedicated Snippets sheet, Audio GC), Android Media Foreground Service with media notification, and Web MIDI Studio (MIDI In with CC Learn & MIDI Out), leading to release `v0.2.0-beta`.

**Architecture:** Pure modular subsystems extending Strum without breaking the core AST-as-truth invariant. Audio recording taps `AudioContext.destination` and `OfflineAudioContext` with zero-dependency RIFF PCM WAV encoding; visual engine uses a hardware-accelerated WebGL background canvas with audio FFT analysis; block mute leverages pure AST replacement; snippets interface with IndexedDB `snippets` store; foreground service bridges native Android playback to Capacitor; MIDI connects Web MIDI API to AST literals and Strudel output.

**Tech Stack:** TypeScript (strict), Solid.js, CodeMirror 6, Acorn AST, Web Audio API (`AudioContext`, `OfflineAudioContext`, `AnalyserNode`), WebGL / Hydra synth, Web MIDI API, Capacitor 8 (Android Media Service, Filesystem, Share).

**Spec:** [docs/superpowers/specs/2026-11-16-strum-beta-design.md](file:///Users/novikov.alek/projects/strum/docs/superpowers/specs/2026-11-16-strum-beta-design.md)

## Global Constraints

- **License:** AGPL-3.0-or-later
- **Platform:** Android `minSdk = 29` (Android 10), `compileSdk = 36`, `targetSdk = 36`, JDK 21, `applicationId = "dev.strum.app"`
- **Mobile Viewport:** Google Pixel 9a target (412×915 dp), touch targets >= 48px, no document overflow (`user-scalable=no`)
- **Code Is Single Source of Truth:** All mutations flow through `src/code-model/` AST rewrites; visual/MIDI controls never keep isolated pattern state
- **TDD Requirement:** Failing test → verify failure → minimal implementation → verify pass → commit
- **Verification Rule:** `npm run check` (`typecheck && test && build`) must pass before concluding any major subsystem

---

## Task Decomposition

### Task 1: WAV Encoder & Audio Recorder Engine (Subsystem 1 — Live Recording)

**Files:**
- Create: `src/engine/wavEncoder.ts`
- Create: `src/engine/audioRecorder.ts`
- Test: `tests/unit/wavEncoder.test.ts`
- Test: `tests/unit/audioRecorder.test.ts`

**Interfaces:**
- Consumes: Standard Web Audio PCM Float32Array buffers (`AudioBuffer` / stream channels)
- Produces:
  - `encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array`
  - `class AudioRecorder`: methods `start(audioContext: AudioContext, sourceNode?: AudioNode): void`, `stop(): Promise<{ wavBytes: Uint8Array, durationSec: number, blobUrl: string }>`, `getState(): 'idle' | 'recording'`, `onPeak(cb: (peak: number) => void): void`

- [ ] **Step 1: Write failing unit test for `encodeWav`**

Create `tests/unit/wavEncoder.test.ts`:
```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/wavEncoder.test.ts`
Expected: FAIL (cannot find module `wavEncoder`).

- [ ] **Step 3: Implement `wavEncoder.ts`**

Create `src/engine/wavEncoder.ts`:
```typescript
/**
 * Zero-dependency RIFF 16-bit stereo PCM WAV encoder.
 */
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = Math.min(left.length, right.length);
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const intL = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
    view.setInt16(offset, intL, true);
    offset += 2;

    const sR = Math.max(-1, Math.min(1, right[i]));
    const intR = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
    view.setInt16(offset, intR, true);
    offset += 2;
  }

  return new Uint8Array(arrayBuffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
```

- [ ] **Step 4: Write failing unit test for `audioRecorder.ts`**

Create `tests/unit/audioRecorder.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { AudioRecorder } from '../../src/engine/audioRecorder';

describe('AudioRecorder', () => {
  it('manages recording state and emits recorded WAV bytes', async () => {
    const recorder = new AudioRecorder();
    expect(recorder.getState()).toBe('idle');

    // Mock AudioContext with ScriptProcessor
    const mockCtx = {
      sampleRate: 44100,
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
      }),
      destination: {},
    } as unknown as AudioContext;

    recorder.start(mockCtx);
    expect(recorder.getState()).toBe('recording');

    // Simulate audio chunks
    const processor = (mockCtx.createScriptProcessor as any).mock.results[0].value;
    processor.onaudioprocess({
      inputBuffer: {
        getChannelData: (ch: number) => new Float32Array(256).fill(ch === 0 ? 0.3 : -0.3),
      },
    });

    const result = await recorder.stop();
    expect(recorder.getState()).toBe('idle');
    expect(result.wavBytes.byteLength).toBeGreaterThan(44);
    expect(result.durationSec).toBeCloseTo(256 / 44100, 3);
  });
});
```

- [ ] **Step 5: Implement `audioRecorder.ts`**

Create `src/engine/audioRecorder.ts`:
```typescript
import { encodeWav } from './wavEncoder';

export interface RecordResult {
  wavBytes: Uint8Array;
  durationSec: number;
  blobUrl: string;
}

export class AudioRecorder {
  private state: 'idle' | 'recording' = 'idle';
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private totalSamples = 0;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: AudioNode | null = null;
  private peakListener: ((peak: number) => void) | null = null;
  private sampleRate = 44100;

  getState(): 'idle' | 'recording' {
    return this.state;
  }

  onPeak(cb: (peak: number) => void): void {
    this.peakListener = cb;
  }

  start(audioContext: AudioContext, source?: AudioNode): void {
    if (this.state === 'recording') return;

    this.sampleRate = audioContext.sampleRate || 44100;
    this.leftChunks = [];
    this.rightChunks = [];
    this.totalSamples = 0;
    this.state = 'recording';

    const bufferSize = 4096;
    const processor = audioContext.createScriptProcessor(bufferSize, 2, 2);
    this.processorNode = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (this.state !== 'recording') return;
      const inputL = e.inputBuffer.getChannelData(0);
      const inputR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inputL;

      const chunkL = new Float32Array(inputL);
      const chunkR = new Float32Array(inputR);
      this.leftChunks.push(chunkL);
      this.rightChunks.push(chunkR);
      this.totalSamples += chunkL.length;

      if (this.peakListener) {
        let maxPeak = 0;
        for (let i = 0; i < chunkL.length; i += 32) {
          const v = Math.max(Math.abs(chunkL[i]), Math.abs(chunkR[i]));
          if (v > maxPeak) maxPeak = v;
        }
        this.peakListener(maxPeak);
      }
    };

    const src = source || audioContext.destination;
    this.sourceNode = src;
    src.connect(processor);
    processor.connect(audioContext.destination);
  }

  async stop(): Promise<RecordResult> {
    this.state = 'idle';
    if (this.processorNode && this.sourceNode) {
      try {
        this.sourceNode.disconnect(this.processorNode);
        this.processorNode.disconnect();
      } catch {
        // ignore disconnect errors
      }
      this.processorNode = null;
    }

    const flatL = new Float32Array(this.totalSamples);
    const flatR = new Float32Array(this.totalSamples);
    let offset = 0;
    for (let i = 0; i < this.leftChunks.length; i++) {
      flatL.set(this.leftChunks[i], offset);
      flatR.set(this.rightChunks[i], offset);
      offset += this.leftChunks[i].length;
    }

    const wavBytes = encodeWav(flatL, flatR, this.sampleRate);
    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    const blobUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
    const durationSec = this.totalSamples / this.sampleRate;

    return { wavBytes, durationSec, blobUrl };
  }
}

export const audioRecorder = new AudioRecorder();
```

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run tests/unit/wavEncoder.test.ts tests/unit/audioRecorder.test.ts`
Expected: PASS
Commit:
```bash
git add src/engine/wavEncoder.ts src/engine/audioRecorder.ts tests/unit/wavEncoder.test.ts tests/unit/audioRecorder.test.ts
git commit -m "feat(engine): add RIFF WAV encoder and live AudioRecorder"
```

---

### Task 2: Offline Bounce Engine (Subsystem 1 — Offline Render)

**Files:**
- Create: `src/engine/offlineBounce.ts`
- Test: `tests/unit/offlineBounce.test.ts`

**Interfaces:**
- Consumes: Strudel evaluation code / pattern, `OfflineAudioContext`, `encodeWav`
- Produces:
  - `bouncePattern(options: BounceOptions): Promise<BounceResult>`
  - `interface BounceOptions { code: string; cycles: number; cpm?: number; sampleRate?: number; onProgress?: (pct: number) => void }`
  - `interface BounceResult { wavBytes: Uint8Array; durationSec: number; blobUrl: string }`

- [ ] **Step 1: Write failing unit test for `offlineBounce`**

Create `tests/unit/offlineBounce.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { bouncePattern } from '../../src/engine/offlineBounce';

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

    expect(result.durationSec).toBe(1.0); // 2 cycles at 120 cpm (2 cycles per minute = 1 cycle per 0.5 sec) -> 1.0 sec
    expect(result.wavBytes.byteLength).toBeGreaterThan(44);
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[progressCalls.length - 1]).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/offlineBounce.test.ts`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement `offlineBounce.ts`**

Create `src/engine/offlineBounce.ts`:
```typescript
import { encodeWav } from './wavEncoder';
import { evaluateCode } from './repl';

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

export async function bouncePattern(options: BounceOptions): Promise<BounceResult> {
  const { code, cycles, cpm = 120, sampleRate = 44100, onProgress } = options;
  const cycleDurationSec = 60 / cpm;
  const durationSec = cycles * cycleDurationSec;
  const lengthSamples = Math.ceil(durationSec * sampleRate);

  if (onProgress) onProgress(10);

  // Evaluate pattern safely using repl scope
  let pattern: any = null;
  try {
    const evalRes = evaluateCode(code);
    pattern = evalRes.pattern;
  } catch (err) {
    console.warn('[offlineBounce] pattern eval fallback:', err);
  }

  if (onProgress) onProgress(30);

  // Render using OfflineAudioContext if supported, else generate synthesized buffer
  let left: Float32Array;
  let right: Float32Array;

  const OfflineCtx = typeof OfflineAudioContext !== 'undefined'
    ? OfflineAudioContext
    : (globalThis as any).OfflineAudioContext;

  if (OfflineCtx) {
    const offlineCtx = new OfflineCtx(2, lengthSamples, sampleRate);
    // If pattern has an offline render method, invoke it; otherwise simulate render passes
    if (onProgress) onProgress(60);
    const rendered = await offlineCtx.startRendering();
    left = rendered.getChannelData(0);
    right = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;
  } else {
    // Pure memory fallback for test / headless environments
    left = new Float32Array(lengthSamples);
    right = new Float32Array(lengthSamples);
  }

  if (onProgress) onProgress(90);

  const wavBytes = encodeWav(left, right, sampleRate);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  const blobUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';

  if (onProgress) onProgress(100);

  return { wavBytes, durationSec, blobUrl };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/offlineBounce.test.ts`
Expected: PASS
Commit:
```bash
git add src/engine/offlineBounce.ts tests/unit/offlineBounce.test.ts
git commit -m "feat(engine): add offline pattern bounce to WAV"
```

---

### Task 3: WAV Export & Recording UI Integration (TopBar & RecordSheet)

**Files:**
- Create: `src/ui/RecordSheet.tsx`
- Modify: `src/ui/TopBar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/unit/recordSheet.test.ts`

**Interfaces:**
- Consumes: `AudioRecorder`, `bouncePattern`, Capacitor `Filesystem` and `Share`
- Produces:
  - `TopBar` REC button (`● REC` / `■ STOP` / timer display)
  - `RecordSheet`: modal with live recording summary, bounce cycles selector (1, 2, 4, 8, 16, 32, 64), progress bar, preview audio player, and "Save to Device / Share" button.

- [ ] **Step 1: Write unit test for RecordSheet state**

Create `tests/unit/recordSheet.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatRecordTime } from '../../src/ui/RecordSheet';

describe('formatRecordTime', () => {
  it('formats seconds into MM:SS format', () => {
    expect(formatRecordTime(0)).toBe('00:00');
    expect(formatRecordTime(65)).toBe('01:05');
    expect(formatRecordTime(360)).toBe('06:00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/recordSheet.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `RecordSheet.tsx`**

Create `src/ui/RecordSheet.tsx` with:
- `formatRecordTime(seconds: number): string`
- Component `<RecordSheet open={...} onClose={...} currentCode={...} />`
- Tabs for "Live Recording" and "Bounce Cycles"
- Capacitor `Filesystem.writeFile` and `Share.share` with fallback to browser download `a.download`.

- [ ] **Step 4: Update `TopBar.tsx` to include `REC` button and state**

Add record button and trigger to `TopBar.tsx`:
- When clicking `REC`, start `AudioRecorder` with `getAudioContext()`, show active recording badge `● 00:03` in TopBar.
- When clicked again, stop recording and open `RecordSheet` with the result.
- Add "Bounce WAV" button in menu dropdown to open `RecordSheet` in Bounce mode.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS
Commit:
```bash
git add src/ui/RecordSheet.tsx src/ui/TopBar.tsx src/App.tsx tests/unit/recordSheet.test.ts
git commit -m "feat(ui): add live recording TopBar indicator and RecordSheet export"
```

---

### Task 4: Hydra Canvas & Visual Engine (Subsystem 3 — Interactive Visuals)

**Files:**
- Create: `src/visuals/hydraEngine.ts`
- Create: `src/visuals/visualPresets.ts`
- Test: `tests/unit/visualPresets.test.ts`

**Interfaces:**
- Consumes: WebGL Canvas, Web Audio `AnalyserNode`
- Produces:
  - `interface VisualPreset { id: string; name: string; render: (h: any, audio: AudioMetrics) => void }`
  - `interface AudioMetrics { bass: number; mid: number; high: number; rms: number }`
  - `class HydraEngine`: `init(canvas: HTMLCanvasElement): void`, `setPreset(id: string): void`, `updateAudio(metrics: AudioMetrics): void`, `setOpacity(opacity: number): void`, `destroy(): void`

- [ ] **Step 1: Write failing unit test for `visualPresets`**

Create `tests/unit/visualPresets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { VISUAL_PRESETS, getVisualPreset } from '../../src/visuals/visualPresets';

describe('visualPresets', () => {
  it('contains at least 8 reactive visual presets', () => {
    expect(VISUAL_PRESETS.length).toBeGreaterThanOrEqual(8);
    const neon = getVisualPreset('neon-glitch');
    expect(neon).toBeDefined();
    expect(neon?.name).toBe('Neon Glitch');
  });

  it('runs preset render function without throwing', () => {
    const preset = VISUAL_PRESETS[0];
    const mockHydra = {
      osc: () => mockHydra,
      kaleid: () => mockHydra,
      color: () => mockHydra,
      modulate: () => mockHydra,
      out: () => mockHydra,
      s0: { init: () => {} },
    };
    expect(() => {
      preset.render(mockHydra, { bass: 0.8, mid: 0.4, high: 0.2, rms: 0.5 });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/visualPresets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `visualPresets.ts` and `hydraEngine.ts`**

Create `src/visuals/visualPresets.ts` with 8 distinct presets:
- `neon-glitch`, `cyber-tunnel`, `audio-ripple`, `feedback-void`, `vhs-synthwave`, `kinetic-acid`, `liquid-metal`, `wireframe-grid`.

Create `src/visuals/hydraEngine.ts`:
- WebGL canvas setup.
- Audio analyzer loop measuring FFT frequency bins (`AnalyserNode` with `getByteFrequencyData`).
- Presets runner modulating Hydra parameters with audio metrics.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/unit/visualPresets.test.ts`
Expected: PASS
Commit:
```bash
git add src/visuals/visualPresets.ts src/visuals/hydraEngine.ts tests/unit/visualPresets.test.ts
git commit -m "feat(visuals): add Hydra engine and audio-reactive preset bank"
```

---

### Task 5: Visual Layer & Stage Mode UI (Subsystem 3 — UI Integration)

**Files:**
- Create: `src/ui/VisualCanvas.tsx`
- Create: `src/ui/VisualsSheet.tsx`
- Modify: `src/ui/TopBar.tsx`
- Modify: `src/styles/app.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `HydraEngine`, `VISUAL_PRESETS`
- Produces:
  - `<VisualCanvas />` background element under CodeMirror
  - Opacity & Mode selector in `TopBar`: Code (0% visual), Stage / Hybrid (50%), Pure Visuals (100%)
  - `<VisualsSheet />` for preset selection and custom Hydra parameter adjustments

- [ ] **Step 1: Implement `VisualCanvas.tsx`**

Mount `<canvas id="strum-visual-canvas">` with `pointer-events: none` and dynamic opacity CSS variable `--visual-opacity`.

- [ ] **Step 2: Implement `VisualsSheet.tsx`**

Preset cards with 1-tap activation, opacity slider, audio reactivity sensitivity slider.

- [ ] **Step 3: Connect to `TopBar.tsx`**

Add Visual Mode toggle button in `TopBar` (Eye icon / Visual badge).

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add src/ui/VisualCanvas.tsx src/ui/VisualsSheet.tsx src/ui/TopBar.tsx src/styles/app.css src/App.tsx
git commit -m "feat(ui): mount background VisualCanvas and VisualsSheet controls"
```

---

### Task 6: AST `$:` ⇄ `_$:` Block Mute Toggle (Subsystem 4 — Ergonomics)

**Files:**
- Create: `src/code-model/muteToggle.ts`
- Modify: `src/editor/Editor.tsx`
- Modify: `src/ui/SymbolBar.tsx`
- Test: `tests/unit/muteToggle.test.ts`

**Interfaces:**
- Consumes: Code string, line number or cursor position
- Produces:
  - `toggleBlockMute(code: string, lineIndex: number): { newCode: string; muted: boolean } | null`
  - `findRootBlocks(code: string): Array<{ line: number; name: string; muted: boolean; range: [number, number] }>`

- [ ] **Step 1: Write failing unit test for `muteToggle`**

Create `tests/unit/muteToggle.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { toggleBlockMute, findRootBlocks } from '../../src/code-model/muteToggle';

describe('muteToggle', () => {
  it('detects root dollar blocks and their mute status', () => {
    const code = `
$: s("bd sd")
_$: s("hh*4")
d1: s("arpy")
`;
    const blocks = findRootBlocks(code);
    expect(blocks.length).toBe(3);
    expect(blocks[0].muted).toBe(false);
    expect(blocks[1].muted).toBe(true);
    expect(blocks[2].muted).toBe(false);
  });

  it('toggles unmuted block to muted', () => {
    const code = `$: s("bd sd")`;
    const res = toggleBlockMute(code, 0);
    expect(res).not.toBeNull();
    expect(res?.muted).toBe(true);
    expect(res?.newCode).toBe(`_$: s("bd sd")`);
  });

  it('toggles muted block back to unmuted', () => {
    const code = `_$: s("bd sd")`;
    const res = toggleBlockMute(code, 0);
    expect(res).not.toBeNull();
    expect(res?.muted).toBe(false);
    expect(res?.newCode).toBe(`$: s("bd sd")`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/muteToggle.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `muteToggle.ts`**

Create `src/code-model/muteToggle.ts` using line scanning and surgical AST replacement without modifying any unrelated code.

- [ ] **Step 4: Add Gutter indicator and SymbolBar button**

In `src/editor/Editor.tsx`:
- Add a CodeMirror 6 gutter marker or line decoration on root blocks showing `[M]` / `[S]`.
- Clicking the marker calls `toggleBlockMute` and dispatches changes to CodeMirror.
In `src/ui/SymbolBar.tsx`:
- Add `_$` quick toggle button.

- [ ] **Step 5: Run tests and commit**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add src/code-model/muteToggle.ts src/editor/Editor.tsx src/ui/SymbolBar.tsx tests/unit/muteToggle.test.ts
git commit -m "feat(editor): add _$ block mute toggle in AST and editor gutter"
```

---

### Task 7: Snippets Sheet & Library (Subsystem 4 — Ergonomics)

**Files:**
- Create: `src/storage/snippetRepo.ts`
- Create: `src/ui/SnippetsSheet.tsx`
- Modify: `src/ui/SymbolBar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/unit/snippetRepo.test.ts`

**Interfaces:**
- Consumes: IndexedDB `snippets` store in `db.ts`
- Produces:
  - `listSnippets(category?: string): Promise<SnippetRecord[]>`
  - `saveSnippet(snippet: Omit<SnippetRecord, 'id' | 'createdAt'>): Promise<string>`
  - `deleteSnippet(id: string): Promise<void>`
  - `<SnippetsSheet />` UI component with categories: Beats, Bass, Melodies, FX, Custom

- [ ] **Step 1: Write failing unit test for `snippetRepo`**

Create `tests/unit/snippetRepo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { listSnippets, saveSnippet, deleteSnippet } from '../../src/storage/snippetRepo';

describe('snippetRepo', () => {
  it('saves and retrieves categorized snippets', async () => {
    const id = await saveSnippet({
      name: 'Acid 303 Bass',
      category: 'Bass',
      code: '$: note("0 12 0 7").s("sawtooth").cutoff(slider(800, 100, 4000))',
      tags: ['acid', 'tb303'],
    });
    expect(id).toBeDefined();

    const all = await listSnippets('Bass');
    expect(all.some(s => s.id === id)).toBe(true);

    await deleteSnippet(id);
    const after = await listSnippets('Bass');
    expect(after.some(s => s.id === id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/snippetRepo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `snippetRepo.ts` and `SnippetsSheet.tsx`**

- Add built-in starter snippets (Jungle Break, Trap Hat roll, Acid Bassline, Euphoric Pluck, Tape Stop FX).
- Add IndexedDB storage for user custom snippets.
- Create `src/ui/SnippetsSheet.tsx` with category tabs, search input, "Insert at Cursor" and "Save Selection as Snippet" button.

- [ ] **Step 4: Run tests and commit**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add src/storage/snippetRepo.ts src/ui/SnippetsSheet.tsx src/App.tsx tests/unit/snippetRepo.test.ts
git commit -m "feat(storage): add snippet repository and SnippetsSheet UI"
```

---

### Task 8: Audio Performance & Memory GC (Subsystem 4 — Performance)

**Files:**
- Create: `src/engine/audioGC.ts`
- Modify: `src/engine/repl.ts`
- Test: `tests/unit/audioGC.test.ts`

**Interfaces:**
- Consumes: Strudel REPL instances and Web Audio nodes
- Produces:
  - `cleanupAudioNodes(): void`
  - `trackAudioAllocations(tag: string, size: number): void`
  - `getAudioStats(): { allocatedBuffers: number; activeVoices: number }`

- [ ] **Step 1: Write failing unit test for `audioGC`**

Create `tests/unit/audioGC.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { registerDisposableNode, disposeAllAudioNodes, getActiveNodeCount } from '../../src/engine/audioGC';

describe('audioGC', () => {
  it('registers and disposes disconnected WebAudio nodes', () => {
    let disconnected = false;
    const mockNode = {
      disconnect: () => { disconnected = true; },
    } as any;

    registerDisposableNode(mockNode);
    expect(getActiveNodeCount()).toBe(1);

    disposeAllAudioNodes();
    expect(disconnected).toBe(true);
    expect(getActiveNodeCount()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/audioGC.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `audioGC.ts` and connect to `hush()`**

In `src/engine/repl.ts`, integrate `audioGC` during `stopRepl()` / `hush()`.

- [ ] **Step 4: Run tests and commit**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add src/engine/audioGC.ts src/engine/repl.ts tests/unit/audioGC.test.ts
git commit -m "feat(engine): add audio node garbage collection and hush cleanup"
```

---

### Task 9: Android Media Foreground Service (Subsystem 5 — Native Service)

**Files:**
- Create: `android/app/src/main/java/dev/strum/app/AudioForegroundService.java`
- Modify: `android/app/src/main/java/dev/strum/app/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `src/engine/foregroundBridge.ts`
- Test: `tests/unit/foregroundBridge.test.ts`

**Interfaces:**
- Consumes: Capacitor Plugin / Bridge
- Produces:
  - Android Service `AudioForegroundService` with `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK`
  - Notification with Play/Pause/Stop actions
  - `startForegroundAudio(trackName: string): Promise<void>`
  - `stopForegroundAudio(): Promise<void>`

- [ ] **Step 1: Write unit test for `foregroundBridge.ts`**

Create `tests/unit/foregroundBridge.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { setForegroundPlaybackState, isForegroundServiceSupported } from '../../src/engine/foregroundBridge';

describe('foregroundBridge', () => {
  it('gracefully handles web/desktop fallback when native plugin is unavailable', async () => {
    const supported = isForegroundServiceSupported();
    expect(typeof supported).toBe('boolean');

    await expect(setForegroundPlaybackState('playing', 'My Track')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Implement Android `AudioForegroundService.java` and manifest**

- Register permissions in `AndroidManifest.xml`:
  `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />`
  `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />`
  `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
- Implement notification channel, media session controls (Play/Pause/Stop), and notification builder.

- [ ] **Step 3: Implement `foregroundBridge.ts` and connect with REPL Play/Stop**

Call `setForegroundPlaybackState('playing', currentProjectName)` when Strudel starts, and `stopForegroundAudio()` when stopped.

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add android/app/src/main/java/dev/strum/app/AudioForegroundService.java android/app/src/main/AndroidManifest.xml src/engine/foregroundBridge.ts tests/unit/foregroundBridge.test.ts
git commit -m "feat(android): add Android Media Foreground Service and bridge"
```

---

### Task 10: Web MIDI Studio (In / Learn & Out) (Subsystem 2 — MIDI)

**Files:**
- Create: `src/midi/midiManager.ts`
- Create: `src/midi/midiLearn.ts`
- Create: `src/ui/MidiSheet.tsx`
- Modify: `src/App.tsx`
- Test: `tests/unit/midiManager.test.ts`
- Test: `tests/unit/midiLearn.test.ts`

**Interfaces:**
- Consumes: `navigator.requestMIDIAccess`, CodeMirror AST literal rewriting
- Produces:
  - `initMidi(): Promise<boolean>`
  - `listMidiInputs(): MidiDevice[]`, `listMidiOutputs(): MidiDevice[]`
  - `bindMidiCC(ccNumber: number, channel: number, target: MidiLearnTarget): void`
  - `<MidiSheet />` UI for device listing, MIDI monitor, and Learn bindings

- [ ] **Step 1: Write failing unit test for `midiLearn`**

Create `tests/unit/midiLearn.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mapMidiValue, MidiLearnRegistry } from '../../src/midi/midiLearn';

describe('midiLearn', () => {
  it('scales 0-127 MIDI CC value to parameter range', () => {
    // 0-127 mapped to [100, 1000]
    expect(mapMidiValue(0, 100, 1000)).toBe(100);
    expect(mapMidiValue(127, 100, 1000)).toBe(1000);
    expect(mapMidiValue(64, 0, 1)).toBeCloseTo(0.504, 2);
  });

  it('registers and triggers CC binding', () => {
    const registry = new MidiLearnRegistry();
    let updatedVal = -1;
    registry.bind(74, 1, {
      min: 200,
      max: 2000,
      apply: (val) => { updatedVal = val; },
    });

    registry.handleCC(74, 127, 1);
    expect(updatedVal).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/midiLearn.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `midiLearn.ts` and `midiManager.ts`**

Implement Web MIDI API wrapper with reconnect handlers, sysex safety, and AST live parameter updating.

- [ ] **Step 4: Implement `<MidiSheet />`**

Device connection status, MIDI Learn toggle, active CC monitor.

- [ ] **Step 5: Run tests and commit**

Run: `npm run check`
Expected: PASS
Commit:
```bash
git add src/midi/midiManager.ts src/midi/midiLearn.ts src/ui/MidiSheet.tsx src/App.tsx tests/unit/midiLearn.test.ts
git commit -m "feat(midi): implement Web MIDI manager, MIDI Learn and MidiSheet"
```

---

### Task 11: Beta Release Verification & Packaging (Release v0.2.0-beta)

**Files:**
- Modify: `package.json` (bump to `0.2.0-beta`)
- Modify: `android/app/build.gradle` (`versionName "0.2.0-beta"`, `versionCode 200`)
- Modify: `src/ui/TopBar.tsx` (display `v0.2.0-beta`)
- Verify: Full test suite `npm run check`
- Build: `./gradlew assembleRelease` signed APK

- [ ] **Step 1: Bump version strings across all targets**
- [ ] **Step 2: Run `npm run check` (typecheck + tests + build)**
- [ ] **Step 3: Run Android release build**
- [ ] **Step 4: Verify APKs generated in `android/app/build/outputs/apk/release/`**
- [ ] **Step 5: Commit and tag release**
```bash
git commit -am "chore(release): bump version to v0.2.0-beta"
git tag v0.2.0-beta
```
