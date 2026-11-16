import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { getAudioContext } from '@strudel/webaudio';
import { audioRecorder, type RecordResult } from '../engine/audioRecorder';
import { bouncePattern, type BounceResult } from '../engine/offlineBounce';

export const BOUNCE_CYCLES_OPTIONS = [1, 2, 4, 8, 16, 32, 64] as const;

export function formatRecordTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

export async function saveOrShareWav(
  wavBytes: Uint8Array,
  blobUrl: string,
  filename = 'strum-recording.wav'
): Promise<void> {
  // 1. Try Capacitor native Share or Filesystem if available
  const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
  if (cap?.isNativePlatform?.()) {
    try {
      const Plugins = cap.Plugins || {};
      if (Plugins.Share) {
        await Plugins.Share.share({
          title: filename,
          url: blobUrl,
        });
        return;
      }
    } catch (e) {
      console.warn('[saveOrShareWav] Capacitor share fallback:', e);
    }
  }

  // 2. Try Web Share API with File
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([wavBytes as unknown as BlobPart], filename, { type: 'audio/wav' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (e) {
      console.warn('[saveOrShareWav] Web share fallback:', e);
    }
  }

  // 3. Fallback to browser download via anchor tag
  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export interface RecordSheetProps {
  open: boolean;
  onClose: () => void;
  currentCode: string;
  initialResult?: { wavBytes: Uint8Array; durationSec: number; blobUrl: string } | null;
  initialTab?: 'live' | 'bounce';
}

export function RecordSheet(props: RecordSheetProps) {
  const [activeTab, setActiveTab] = createSignal<'live' | 'bounce'>('live');

  // Live recording state
  const [liveResult, setLiveResult] = createSignal<RecordResult | null>(null);
  const [isRecording, setIsRecording] = createSignal(false);
  const [elapsedSec, setElapsedSec] = createSignal(0);
  const [peakLevel, setPeakLevel] = createSignal(0);
  let liveInterval: any = null;

  // Bounce state
  const [cycles, setCycles] = createSignal<number>(4);
  const [cpm, setCpm] = createSignal<number>(120);
  const [bouncing, setBouncing] = createSignal(false);
  const [bounceProgress, setBounceProgress] = createSignal(0);
  const [bounceResult, setBounceResult] = createSignal<BounceResult | null>(null);

  // Synchronize initial tab and initial result when opened
  createEffect(() => {
    if (props.open) {
      if (props.initialTab) {
        setActiveTab(props.initialTab);
      } else if (props.initialResult) {
        setActiveTab('live');
      }

      if (props.initialResult) {
        setLiveResult(props.initialResult);
      }

      setIsRecording(audioRecorder.getState() === 'recording');
    }
  });

  // Subscribe to audio peak levels
  audioRecorder.onPeak((peak) => {
    setPeakLevel(peak);
  });

  const startLiveRecording = async () => {
    try {
      let ctx: AudioContext;
      try {
        ctx = getAudioContext();
      } catch {
        const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (globalThis as any).webkitAudioContext;
        ctx = new Ctx();
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      audioRecorder.start(ctx);
      setIsRecording(true);
      setLiveResult(null);
      setElapsedSec(0);

      if (liveInterval) clearInterval(liveInterval);
      liveInterval = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.error('[RecordSheet] Failed to start live recording:', e);
    }
  };

  const stopLiveRecording = async () => {
    if (liveInterval) {
      clearInterval(liveInterval);
      liveInterval = null;
    }
    setIsRecording(false);
    try {
      const res = await audioRecorder.stop();
      setLiveResult(res);
    } catch (e) {
      console.error('[RecordSheet] Failed to stop recording:', e);
    }
  };

  const handleStartBounce = async () => {
    setBouncing(true);
    setBounceProgress(5);
    setBounceResult(null);
    try {
      const res = await bouncePattern({
        code: props.currentCode,
        cycles: cycles(),
        cpm: cpm(),
        onProgress: (pct) => setBounceProgress(pct),
      });
      setBounceResult(res);
      setBounceProgress(100);
    } catch (e) {
      console.error('[RecordSheet] Failed to bounce pattern:', e);
    } finally {
      setBouncing(false);
    }
  };

  onCleanup(() => {
    if (liveInterval) clearInterval(liveInterval);
  });

  return (
    <Show when={props.open}>
      <div class="tempo-sheet-backdrop" onClick={props.onClose}>
        <div
          class="tempo-sheet record-sheet"
          onClick={(e) => e.stopPropagation()}
          style={{
            'max-height': '85vh',
            overflow: 'y-auto',
            display: 'flex',
            'flex-direction': 'column',
            gap: '16px',
          }}
        >
          {/* Header */}
          <div class="tempo-sheet-header">
            <span>Запись и экспорт WAV</span>
            <button aria-label="Close Record Sheet" onClick={props.onClose}>
              ✕
            </button>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: '#13161c',
              padding: '4px',
              'border-radius': '8px',
              gap: '4px',
            }}
          >
            <button
              style={{
                flex: 1,
                'min-height': '48px',
                background: activeTab() === 'live' ? 'var(--accent)' : 'transparent',
                color: activeTab() === 'live' ? '#0e0f12' : 'var(--fg)',
                border: 'none',
                'border-radius': '6px',
                'font-weight': '600',
                'font-size': '14px',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                gap: '6px',
              }}
              onClick={() => setActiveTab('live')}
            >
              <span>●</span>
              <span>Live Recording</span>
            </button>
            <button
              style={{
                flex: 1,
                'min-height': '48px',
                background: activeTab() === 'bounce' ? 'var(--accent)' : 'transparent',
                color: activeTab() === 'bounce' ? '#0e0f12' : 'var(--fg)',
                border: 'none',
                'border-radius': '6px',
                'font-weight': '600',
                'font-size': '14px',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                gap: '6px',
              }}
              onClick={() => setActiveTab('bounce')}
            >
              <span>💽</span>
              <span>Bounce Cycles</span>
            </button>
          </div>

          {/* Tab: Live Recording */}
          <Show when={activeTab() === 'live'}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              {/* Peak Meter & Status */}
              <div
                style={{
                  background: '#13161c',
                  border: '1px solid #2a313e',
                  'border-radius': '8px',
                  padding: '12px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <span style={{ 'font-size': '13px', color: 'var(--muted)' }}>
                    {isRecording() ? '🔴 Идёт запись звука...' : liveResult() ? 'Запись завершена' : 'Готов к записи'}
                  </span>
                  <span style={{ 'font-family': 'monospace', 'font-size': '16px', 'font-weight': 'bold', color: isRecording() ? '#ff4d4d' : 'var(--fg)' }}>
                    {isRecording() ? formatRecordTime(elapsedSec()) : liveResult() ? formatRecordTime(liveResult()!.durationSec) : '00:00'}
                  </span>
                </div>

                {/* Meter Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    background: '#232834',
                    'border-radius': '5px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.round(peakLevel() * 100))}%`,
                      height: '100%',
                      background: peakLevel() > 0.85 ? '#ff4d4d' : 'var(--accent)',
                      transition: 'width 0.08s linear',
                    }}
                  />
                </div>
              </div>

              {/* Start / Stop button */}
              <Show
                when={isRecording()}
                fallback={
                  <button
                    class="menu-action-btn"
                    style={{ 'justify-content': 'center', color: '#ff4d4d', 'font-weight': 'bold' }}
                    onClick={startLiveRecording}
                  >
                    ● Начать запись (Record)
                  </button>
                }
              >
                <button
                  class="menu-action-btn"
                  style={{ 'justify-content': 'center', color: '#ff4d4d', 'font-weight': 'bold' }}
                  onClick={stopLiveRecording}
                >
                  ■ Остановить запись (Stop)
                </button>
              </Show>

              {/* Recorded WAV Result */}
              <Show when={liveResult()}>
                <div
                  style={{
                    background: '#13161c',
                    border: '1px solid #2a313e',
                    'border-radius': '8px',
                    padding: '12px',
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ 'font-size': '13px', color: 'var(--muted)', display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Длительность: {liveResult()!.durationSec.toFixed(1)}s</span>
                    <span>Размер: {(liveResult()!.wavBytes.byteLength / 1024).toFixed(1)} KB</span>
                  </div>

                  {/* Audio Preview Player */}
                  <audio
                    controls
                    src={liveResult()!.blobUrl}
                    style={{ width: '100%', height: '40px' }}
                  />

                  {/* Save / Share button */}
                  <button
                    class="menu-action-btn"
                    style={{ 'justify-content': 'center', background: 'var(--accent)', color: '#0e0f12', 'font-weight': 'bold' }}
                    onClick={() => saveOrShareWav(liveResult()!.wavBytes, liveResult()!.blobUrl, 'strum-live-recording.wav')}
                  >
                    💾 Save / Share WAV
                  </button>
                </div>
              </Show>
            </div>
          </Show>

          {/* Tab: Bounce Cycles */}
          <Show when={activeTab() === 'bounce'}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              {/* Cycles selector */}
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                <label style={{ 'font-size': '13px', color: 'var(--muted)' }}>
                  Количество циклов (Cycles):
                </label>
                <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                  <For each={BOUNCE_CYCLES_OPTIONS}>
                    {(c) => (
                      <button
                        style={{
                          flex: '1 0 40px',
                          'min-height': '48px',
                          background: cycles() === c ? 'var(--accent)' : '#232834',
                          color: cycles() === c ? '#0e0f12' : 'var(--fg)',
                          border: '1px solid #32394a',
                          'border-radius': '8px',
                          'font-family': 'monospace',
                          'font-size': '14px',
                          'font-weight': cycles() === c ? 'bold' : 'normal',
                          cursor: 'pointer',
                        }}
                        onClick={() => setCycles(c)}
                      >
                        {c}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* CPM / BPM selector */}
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  gap: '8px',
                  background: '#13161c',
                  border: '1px solid #2a313e',
                  'border-radius': '8px',
                  padding: '8px 12px',
                }}
              >
                <label style={{ 'font-size': '14px', color: 'var(--fg)' }}>
                  Темп (CPM / BPM):
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={cpm()}
                  onInput={(e) => setCpm(Number(e.currentTarget.value) || 120)}
                  style={{
                    width: '80px',
                    'min-height': '48px',
                    padding: '0 8px',
                    background: '#232834',
                    border: '1px solid #32394a',
                    'border-radius': '8px',
                    color: 'var(--fg)',
                    'font-size': '16px',
                    'font-family': 'monospace',
                    'text-align': 'center',
                  }}
                />
              </div>

              {/* Start Bounce Button */}
              <button
                class="menu-action-btn"
                disabled={bouncing()}
                style={{
                  'justify-content': 'center',
                  background: bouncing() ? '#232834' : 'var(--accent)',
                  color: bouncing() ? 'var(--muted)' : '#0e0f12',
                  'font-weight': 'bold',
                }}
                onClick={handleStartBounce}
              >
                {bouncing() ? 'Рендеринг...' : '🚀 Start Bounce'}
              </button>

              {/* Progress Bar */}
              <Show when={bouncing() || bounceProgress() > 0}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '12px', color: 'var(--muted)' }}>
                    <span>{bouncing() ? 'Экспорт паттерна в WAV...' : 'Экспорт завершён'}</span>
                    <span>{bounceProgress()}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: '#232834',
                      'border-radius': '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${bounceProgress()}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.15s ease-out',
                      }}
                    />
                  </div>
                </div>
              </Show>

              {/* Bounce Result */}
              <Show when={bounceResult()}>
                <div
                  style={{
                    background: '#13161c',
                    border: '1px solid #2a313e',
                    'border-radius': '8px',
                    padding: '12px',
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ 'font-size': '13px', color: 'var(--muted)', display: 'flex', 'justify-content': 'space-between' }}>
                    <span>Длительность: {bounceResult()!.durationSec.toFixed(1)}s</span>
                    <span>Размер: {(bounceResult()!.wavBytes.byteLength / 1024).toFixed(1)} KB</span>
                  </div>

                  {/* Audio Preview Player */}
                  <audio
                    controls
                    src={bounceResult()!.blobUrl}
                    style={{ width: '100%', height: '40px' }}
                  />

                  {/* Save / Share button */}
                  <button
                    class="menu-action-btn"
                    style={{ 'justify-content': 'center', background: 'var(--accent)', color: '#0e0f12', 'font-weight': 'bold' }}
                    onClick={() => saveOrShareWav(bounceResult()!.wavBytes, bounceResult()!.blobUrl, 'strum-bounced.wav')}
                  >
                    💾 Save / Share WAV
                  </button>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
