import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { VISUAL_PRESETS, type VisualPreset } from '../visuals/visualPresets';
import { hydraEngine } from '../visuals/hydraEngine';
import {
  type VisualMode,
  getOpacityForMode,
  getModeForOpacity,
  clampOpacity,
  formatOpacityPercent,
  formatMetricLevel,
} from './VisualCanvas';

export interface VisualsSheetProps {
  open: boolean;
  onClose: () => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  activePresetId?: string;
  onSelectPreset?: (presetId: string) => void;
}

export function VisualsSheet(props: VisualsSheetProps) {
  const [metrics, setMetrics] = createSignal({ bass: 0, mid: 0, high: 0, rms: 0 });

  const currentOpacity = () => {
    return typeof props.opacity === 'number' ? props.opacity : hydraEngine.getOpacity();
  };

  const currentPresetId = () => {
    return props.activePresetId || hydraEngine.getCurrentPreset().id;
  };

  const activeMode = () => getModeForOpacity(currentOpacity());

  const handleSetOpacity = (op: number) => {
    const clamped = clampOpacity(op);
    hydraEngine.setOpacity(clamped);
    props.onOpacityChange?.(clamped);
  };

  const handleSelectPreset = (presetId: string) => {
    hydraEngine.setPreset(presetId);
    props.onSelectPreset?.(presetId);
    // If currently off (0%), nudge to Hybrid so the visual effect is immediately visible
    if (currentOpacity() <= 0.05) {
      handleSetOpacity(0.5);
    }
  };

  // Poll live audio metrics when the sheet is open
  createEffect(() => {
    if (!props.open) return;
    const interval = setInterval(() => {
      setMetrics(hydraEngine.getAudioMetrics());
    }, 50);

    onCleanup(() => clearInterval(interval));
  });

  return (
    <Show when={props.open}>
      <div class="tempo-sheet-backdrop" onClick={props.onClose}>
        <div
          class="tempo-sheet visuals-sheet"
          style={{
            'max-height': '85vh',
            overflow: 'hidden',
            display: 'flex',
            'flex-direction': 'column',
            gap: '12px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="tempo-sheet-header">
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <span>🎨 Visuals & Stage Mode</span>
              <span
                style={{
                  'font-size': '12px',
                  color: 'var(--accent)',
                  background: 'rgba(124, 240, 176, 0.12)',
                  padding: '2px 6px',
                  'border-radius': '4px',
                  'font-family': 'monospace',
                }}
              >
                {formatOpacityPercent(currentOpacity())}
              </span>
            </div>
            <button aria-label="Close Visuals" onClick={props.onClose}>
              ✕
            </button>
          </div>

          {/* Scrollable Body */}
          <div
            style={{
              'overflow-y': 'auto',
              display: 'flex',
              'flex-direction': 'column',
              gap: '14px',
              'padding-bottom': '12px',
            }}
          >
            {/* Mode / Opacity Quick Selector */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
              <div style={{ 'font-size': '12px', color: 'var(--muted)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
                Mode Quick Selector
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  class="menu-action-btn"
                  style={{
                    flex: '1',
                    'min-height': '48px',
                    'justify-content': 'center',
                    padding: '0 8px',
                    'font-size': '13px',
                    background: activeMode() === 'code' ? 'var(--accent)' : '#232834',
                    color: activeMode() === 'code' ? '#0e0f12' : 'var(--fg)',
                    'font-weight': activeMode() === 'code' ? '700' : '500',
                  }}
                  onClick={() => handleSetOpacity(getOpacityForMode('code'))}
                >
                  Code (0%)
                </button>
                <button
                  class="menu-action-btn"
                  style={{
                    flex: '1',
                    'min-height': '48px',
                    'justify-content': 'center',
                    padding: '0 8px',
                    'font-size': '13px',
                    background: activeMode() === 'hybrid' ? 'var(--accent)' : '#232834',
                    color: activeMode() === 'hybrid' ? '#0e0f12' : 'var(--fg)',
                    'font-weight': activeMode() === 'hybrid' ? '700' : '500',
                  }}
                  onClick={() => handleSetOpacity(getOpacityForMode('hybrid'))}
                >
                  Hybrid (50%)
                </button>
                <button
                  class="menu-action-btn"
                  style={{
                    flex: '1',
                    'min-height': '48px',
                    'justify-content': 'center',
                    padding: '0 8px',
                    'font-size': '13px',
                    background: activeMode() === 'stage' ? 'var(--accent)' : '#232834',
                    color: activeMode() === 'stage' ? '#0e0f12' : 'var(--fg)',
                    'font-weight': activeMode() === 'stage' ? '700' : '500',
                  }}
                  onClick={() => handleSetOpacity(getOpacityForMode('stage'))}
                >
                  Stage (100%)
                </button>
              </div>
            </div>

            {/* Continuous Opacity Slider */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '12px', color: 'var(--muted)' }}>
                <span>VISUAL OPACITY</span>
                <span style={{ 'font-family': 'monospace', color: 'var(--fg)' }}>{Math.round(currentOpacity() * 100)}%</span>
              </div>
              <input
                type="range"
                class="tempo-slider"
                min="0"
                max="100"
                value={Math.round(currentOpacity() * 100)}
                onInput={(e) => handleSetOpacity(Number(e.currentTarget.value) / 100)}
                style={{ width: '100%', height: '48px', 'accent-color': 'var(--accent)' }}
              />
            </div>

            {/* Live Audio Reactivity Meters */}
            <div
              style={{
                background: '#13161c',
                border: '1px solid #2a313e',
                'border-radius': '8px',
                padding: '10px 12px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '8px',
              }}
            >
              <div style={{ 'font-size': '12px', color: 'var(--muted)', 'font-weight': '600' }}>
                AUDIO REACTIVITY METRICS
              </div>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '8px' }}>
                {/* Bass */}
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', color: 'var(--muted)' }}>
                    <span>Bass</span>
                    <span>{formatMetricLevel(metrics().bass)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#232834', 'border-radius': '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: formatMetricLevel(metrics().bass),
                        height: '100%',
                        background: '#ff5577',
                        transition: 'width 0.05s linear',
                      }}
                    />
                  </div>
                </div>

                {/* Mid */}
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', color: 'var(--muted)' }}>
                    <span>Mid</span>
                    <span>{formatMetricLevel(metrics().mid)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#232834', 'border-radius': '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: formatMetricLevel(metrics().mid),
                        height: '100%',
                        background: '#eebb44',
                        transition: 'width 0.05s linear',
                      }}
                    />
                  </div>
                </div>

                {/* High */}
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', color: 'var(--muted)' }}>
                    <span>High</span>
                    <span>{formatMetricLevel(metrics().high)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#232834', 'border-radius': '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: formatMetricLevel(metrics().high),
                        height: '100%',
                        background: '#44bbff',
                        transition: 'width 0.05s linear',
                      }}
                    />
                  </div>
                </div>

                {/* RMS */}
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', color: 'var(--muted)' }}>
                    <span>RMS</span>
                    <span>{formatMetricLevel(metrics().rms)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#232834', 'border-radius': '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: formatMetricLevel(metrics().rms),
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.05s linear',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Presets List */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <div style={{ 'font-size': '12px', color: 'var(--muted)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
                Reactive Visual Presets ({VISUAL_PRESETS.length})
              </div>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                <For each={VISUAL_PRESETS}>
                  {(preset: VisualPreset) => {
                    const isActive = () => currentPresetId() === preset.id;
                    return (
                      <div
                        class="preset-item"
                        style={{
                          'min-height': '52px',
                          background: isActive() ? '#1a222f' : '#191d24',
                          border: isActive() ? '1.5px solid var(--accent)' : '1px solid #2a313e',
                          'border-radius': '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'space-between',
                          cursor: 'pointer',
                          'user-select': 'none',
                        }}
                        onClick={() => handleSelectPreset(preset.id)}
                      >
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                          <div style={{ 'font-size': '14px', 'font-weight': '600', color: isActive() ? 'var(--accent)' : 'var(--fg)' }}>
                            {preset.name}
                          </div>
                          <div style={{ 'font-size': '12px', color: 'var(--muted)' }}>
                            {preset.description}
                          </div>
                        </div>

                        <div style={{ display: 'flex', 'align-items': 'center', 'margin-left': '8px' }}>
                          <Show
                            when={isActive()}
                            fallback={
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  'border-radius': '50%',
                                  border: '1.5px solid #444c5c',
                                }}
                              />
                            }
                          >
                            <div
                              style={{
                                'font-size': '11px',
                                color: '#0e0f12',
                                background: 'var(--accent)',
                                'font-weight': '700',
                                padding: '3px 8px',
                                'border-radius': '12px',
                              }}
                            >
                              ACTIVE
                            </div>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
