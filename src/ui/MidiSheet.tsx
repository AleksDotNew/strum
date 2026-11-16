import { createSignal, createEffect, onCleanup, onMount, Show, For } from 'solid-js'
import {
  midiManager,
  type MidiDeviceInfo,
  type MidiActivityEvent,
} from '../midi/midiManager'
import {
  midiLearnRegistry,
  type MidiLearnBinding,
} from '../midi/midiLearn'
import type { CodeLiteral } from '../code-model/acorn'

export interface MidiSheetProps {
  open: boolean
  onClose: () => void
  activeLiteral?: CodeLiteral | null
  onApplyLiteralValue?: (val: number) => void
}

/**
 * Format a human-readable description of a MIDI activity event.
 */
export function formatMidiActivity(ev: MidiActivityEvent): string {
  const dev = ev.deviceName || 'MIDI'
  if (ev.type === 'cc') {
    return `[${dev}] CC ${ev.cc} = ${ev.value} (Ch ${ev.channel ?? 1})`
  }
  if (ev.type === 'noteon') {
    return `[${dev}] Note On ${ev.note} (Vel ${ev.velocity}, Ch ${ev.channel ?? 1})`
  }
  if (ev.type === 'noteoff') {
    return `[${dev}] Note Off ${ev.note} (Ch ${ev.channel ?? 1})`
  }
  return `[${dev}] MIDI Event (Ch ${ev.channel ?? 1})`
}

/**
 * Validate manual MIDI binding form parameters.
 */
export function validateBindingInput(
  name: string,
  minStr: string,
  maxStr: string
): { valid: boolean; error?: string; min?: number; max?: number } {
  if (!name.trim()) {
    return { valid: false, error: 'Введите название параметра' }
  }
  const min = parseFloat(minStr)
  if (isNaN(min)) {
    return { valid: false, error: 'Некорректное минимальное значение' }
  }
  const max = parseFloat(maxStr)
  if (isNaN(max)) {
    return { valid: false, error: 'Некорректное максимальное значение' }
  }
  return { valid: true, min, max }
}

/**
 * Generate a ready-to-use Strudel pattern snippet targeting an external MIDI output device.
 */
export function generateMidiOutSnippet(deviceName: string): string {
  const safeName = deviceName.replace(/"/g, '\\"')
  return `s("midi").note("c3 e3 g3").midiout("${safeName}")`
}

export function MidiSheet(props: MidiSheetProps) {
  const [inputs, setInputs] = createSignal<MidiDeviceInfo[]>([])
  const [outputs, setOutputs] = createSignal<MidiDeviceInfo[]>([])
  const [bindings, setBindings] = createSignal<MidiLearnBinding[]>([])
  const [activity, setActivity] = createSignal<MidiActivityEvent | null>(null)
  const [activityActive, setActivityActive] = createSignal(false)
  const [isLearning, setIsLearning] = createSignal(false)
  const [capturedCC, setCapturedCC] = createSignal<{ cc: number; channel: number } | null>(null)

  // Custom bind form state
  const [customName, setCustomName] = createSignal('')
  const [customMin, setCustomMin] = createMinMaxDefaults(props.activeLiteral)
  const [customMax, setCustomMax] = createSignal('1')
  const [customCurve, setCustomCurve] = createSignal<'linear' | 'exponential'>('linear')
  const [bindError, setBindError] = createSignal<string | null>(null)
  const [copiedSnippet, setCopiedSnippet] = createSignal<string | null>(null)

  function createMinMaxDefaults(literal?: CodeLiteral | null): [() => string, (v: string) => void] {
    const defaultMin = typeof literal?.value === 'number' && literal.value > 10 ? '20' : '0'
    return createSignal(defaultMin)
  }

  let activityTimeout: any = null
  let stopLearnFn: (() => void) | null = null

  const refreshDevices = () => {
    setInputs(midiManager.getInputs())
    setOutputs(midiManager.getOutputs())
  }

  const refreshBindings = () => {
    setBindings(midiLearnRegistry.getBindings())
  }

  // Subscribe to manager and registry events when sheet is open
  createEffect(() => {
    if (!props.open) {
      if (stopLearnFn) {
        stopLearnFn()
        stopLearnFn = null
        setIsLearning(false)
      }
      return
    }

    // Auto-init MIDI if not yet available
    if (midiManager.isSupported() && !midiManager.isAvailable()) {
      midiManager.init().then(() => {
        refreshDevices()
      }).catch(() => {})
    } else {
      refreshDevices()
    }

    refreshBindings()

    const unsubDevices = midiManager.onDevicesChange(() => {
      refreshDevices()
    })

    const unsubActivity = midiManager.onActivity((ev) => {
      setActivity(ev)
      setActivityActive(true)
      clearTimeout(activityTimeout)
      activityTimeout = setTimeout(() => {
        setActivityActive(false)
      }, 1500)
    })

    const unsubBindings = midiLearnRegistry.onBindingsChange(() => {
      refreshBindings()
    })

    onCleanup(() => {
      unsubDevices()
      unsubActivity()
      unsubBindings()
      clearTimeout(activityTimeout)
      if (stopLearnFn) {
        stopLearnFn()
        stopLearnFn = null
        setIsLearning(false)
      }
    })
  })

  // Set default param name if activeLiteral is provided
  createEffect(() => {
    if (props.open && props.activeLiteral) {
      const val = props.activeLiteral.value
      setCustomName(`Редактор: число ${val}`)
      if (typeof val === 'number') {
        if (val >= 20 && val <= 20000) {
          setCustomMin('20')
          setCustomMax('20000')
          setCustomCurve('exponential')
        } else if (val >= 0 && val <= 1) {
          setCustomMin('0')
          setCustomMax('1')
          setCustomCurve('linear')
        } else {
          setCustomMin('0')
          setCustomMax(String(Math.max(10, Math.round(val * 2))))
        }
      }
    }
  })

  const toggleLearn = () => {
    if (isLearning()) {
      if (stopLearnFn) {
        stopLearnFn()
        stopLearnFn = null
      }
      setIsLearning(false)
    } else {
      setCapturedCC(null)
      setIsLearning(true)
      stopLearnFn = midiLearnRegistry.startLearn((cc, channel) => {
        setCapturedCC({ cc, channel })
      })
    }
  }

  const handleBindToLiteral = () => {
    const captured = capturedCC()
    if (!captured || !props.activeLiteral || !props.onApplyLiteralValue) return

    const min = parseFloat(customMin()) || 0
    const max = parseFloat(customMax()) || 1
    const applyFn = props.onApplyLiteralValue

    midiLearnRegistry.bind(captured.cc, captured.channel, {
      name: `Код [${props.activeLiteral.value}]`,
      min,
      max,
      curve: customCurve(),
      paramPath: `literal_${props.activeLiteral.value}`,
      apply: (val) => {
        applyFn(Math.round(val * 1000) / 1000)
      },
    })

    // Turn off learn mode after successful binding
    toggleLearn()
    setCapturedCC(null)
  }

  const handleCreateCustomBinding = (e: Event) => {
    e.preventDefault()
    setBindError(null)

    const captured = capturedCC()
    if (!captured) {
      setBindError('Сначала поверните ручку контроллера в режиме Learn')
      return
    }

    const validation = validateBindingInput(customName(), customMin(), customMax())
    if (!validation.valid) {
      setBindError(validation.error || 'Ошибка валидации')
      return
    }

    const min = validation.min!
    const max = validation.max!
    const applyFn = props.onApplyLiteralValue

    midiLearnRegistry.bind(captured.cc, captured.channel, {
      name: customName().trim(),
      min,
      max,
      curve: customCurve(),
      apply: (val) => {
        if (applyFn) {
          applyFn(Math.round(val * 1000) / 1000)
        }
      },
    })

    toggleLearn()
    setCapturedCC(null)
    setCustomName('')
  }

  const handleUnbind = (id: string) => {
    midiLearnRegistry.unbind(id)
  }

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedSnippet(text)
      setTimeout(() => setCopiedSnippet(null), 2000)
    } catch {}
  }

  return (
    <Show when={props.open}>
      <div class="tempo-sheet-backdrop" onClick={props.onClose}>
        <div
          class="tempo-sheet midi-sheet"
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
              <span style={{ 'font-size': '18px' }}>🎹 Web MIDI Studio</span>
              <Show when={activityActive()}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    'border-radius': '50%',
                    background: 'var(--accent)',
                    'box-shadow': '0 0 6px var(--accent)',
                  }}
                  title="MIDI Activity"
                />
              </Show>
            </div>
            <button
              aria-label="Close MIDI Studio"
              class="close-button"
              style={{
                'min-width': '48px',
                'min-height': '48px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                'font-size': '20px',
                cursor: 'pointer',
              }}
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>

          {/* Scrollable Container */}
          <div
            style={{
              'overflow-y': 'auto',
              display: 'flex',
              'flex-direction': 'column',
              gap: '16px',
              'padding-bottom': '16px',
            }}
          >
            {/* Browser Support Check */}
            <Show when={!midiManager.isSupported()}>
              <div
                style={{
                  background: 'rgba(255, 85, 85, 0.15)',
                  border: '1px solid #ff5555',
                  padding: '12px',
                  'border-radius': '8px',
                  'font-size': '13px',
                  color: '#ff8888',
                }}
              >
                ⚠️ Web MIDI API не поддерживается данным браузером. Поддерживается в Chrome, Edge, Opera и Android WebView.
              </div>
            </Show>

            {/* Live Activity Monitor Banner */}
            <Show when={activity()}>
              {(ev) => (
                <div
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: activityActive() ? 'rgba(124, 240, 176, 0.12)' : '#191d24',
                    border: '1px solid',
                    'border-color': activityActive() ? 'var(--accent)' : '#2a313d',
                    'border-radius': '6px',
                    'font-family': 'monospace',
                    'font-size': '12px',
                    color: activityActive() ? 'var(--accent)' : 'var(--muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>⚡</span>
                  <span style={{ 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' }}>
                    {formatMidiActivity(ev())}
                  </span>
                </div>
              )}
            </Show>

            {/* Section 1: Connected Devices */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--muted)', 'text-transform': 'uppercase' }}>
                  Подключённые устройства
                </span>
                <button
                  class="menu-action-btn"
                  style={{
                    'min-height': '48px',
                    padding: '0 12px',
                    'font-size': '12px',
                    'align-items': 'center',
                  }}
                  onClick={() => {
                    midiManager.init().then(refreshDevices).catch(() => {})
                  }}
                >
                  🔄 Обновить
                </button>
              </div>

              {/* Inputs */}
              <div style={{ 'font-size': '12px', color: 'var(--accent)', 'font-weight': '600' }}>
                Входы (MIDI IN):
              </div>
              <Show
                when={inputs().length > 0}
                fallback={
                  <div style={{ 'font-size': '12px', color: 'var(--muted)', 'font-style': 'italic', padding: '4px 0' }}>
                    Нет активных входов (подключите контроллер по USB/Bluetooth)
                  </div>
                }
              >
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                  <For each={inputs()}>
                    {(dev) => (
                      <div
                        style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          padding: '10px 12px',
                          background: '#191d24',
                          border: '1px solid #2a313d',
                          'border-radius': '6px',
                          'font-size': '13px',
                        }}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                          <span>🎛️</span>
                          <span style={{ 'font-weight': '500' }}>{dev.name}</span>
                          <Show when={dev.manufacturer}>
                            <span style={{ 'font-size': '11px', color: 'var(--muted)' }}>({dev.manufacturer})</span>
                          </Show>
                        </div>
                        <span style={{ 'font-size': '11px', color: 'var(--accent)' }}>В сети</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Outputs */}
              <div style={{ 'font-size': '12px', color: '#68d391', 'font-weight': '600', 'margin-top': '4px' }}>
                Выходы (MIDI OUT):
              </div>
              <Show
                when={outputs().length > 0}
                fallback={
                  <div style={{ 'font-size': '12px', color: 'var(--muted)', 'font-style': 'italic', padding: '4px 0' }}>
                    Нет внешних синтезаторов
                  </div>
                }
              >
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                  <For each={outputs()}>
                    {(dev) => (
                      <div
                        style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          padding: '10px 12px',
                          background: '#191d24',
                          border: '1px solid #2a313d',
                          'border-radius': '6px',
                          'font-size': '13px',
                        }}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                          <span>🔊</span>
                          <span style={{ 'font-weight': '500' }}>{dev.name}</span>
                        </div>
                        <button
                          class="menu-action-btn"
                          style={{
                            'min-height': '48px',
                            padding: '0 8px',
                            'font-size': '11px',
                          }}
                          onClick={() => copyToClipboard(generateMidiOutSnippet(dev.name))}
                        >
                          {copiedSnippet() === generateMidiOutSnippet(dev.name) ? '✓ Скопировано' : 'Скопировать код'}
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Section 2: MIDI Learn Controller */}
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '10px',
                background: '#161922',
                border: '1px solid #2a313d',
                'border-radius': '8px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span style={{ 'font-weight': '600', 'font-size': '14px', color: 'var(--fg)' }}>
                  🎛️ MIDI Learn
                </span>
                <button
                  class="menu-action-btn"
                  style={{
                    'min-height': '48px',
                    padding: '0 16px',
                    'font-size': '13px',
                    'font-weight': '600',
                    background: isLearning() ? '#e53e3e' : 'var(--accent)',
                    color: isLearning() ? '#fff' : '#0e0f12',
                  }}
                  onClick={toggleLearn}
                >
                  {isLearning() ? '⏹ Остановить Learn' : '🎯 Начать Learn'}
                </button>
              </div>

              {/* Learn Active Guidance Banner */}
              <Show when={isLearning()}>
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(255, 170, 0, 0.15)',
                    border: '1px dashed #ffaa00',
                    'border-radius': '6px',
                    'font-size': '13px',
                    color: '#ffc107',
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '6px',
                  }}
                >
                  <div>👉 Twist a knob or move a fader on your MIDI controller...</div>
                  <div style={{ 'font-size': '11px', opacity: 0.85 }}>
                    Поверните ручку или подвигайте фейдер на контроллере для захвата CC
                  </div>
                </div>
              </Show>

              {/* Captured CC Info & Assignment Options */}
              <Show when={capturedCC()}>
                {(captured) => (
                  <div
                    style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '10px',
                      padding: '12px',
                      background: '#1f2430',
                      border: '1px solid var(--accent)',
                      'border-radius': '6px',
                    }}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                      <span style={{ 'font-weight': '600', color: 'var(--accent)', 'font-size': '14px' }}>
                        Захвачен CC {captured().cc} (Канал {captured().channel})
                      </span>
                    </div>

                    {/* Quick Bind to Active Editor Literal */}
                    <Show when={props.activeLiteral}>
                      <button
                        class="menu-action-btn"
                        style={{
                          'min-height': '48px',
                          'justify-content': 'center',
                          'font-size': '13px',
                          'font-weight': '600',
                          background: 'var(--accent)',
                          color: '#0e0f12',
                        }}
                        onClick={handleBindToLiteral}
                      >
                        ⚡ Привязать к числу в курсоре ({props.activeLiteral?.value})
                      </button>
                    </Show>

                    {/* Custom Param Binding Form */}
                    <form
                      onSubmit={handleCreateCustomBinding}
                      style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}
                    >
                      <input
                        type="text"
                        placeholder="Название параметра (напр. Filter Cutoff)"
                        value={customName()}
                        onInput={(e) => setCustomName(e.currentTarget.value)}
                        style={{
                          height: '48px',
                          background: '#12151c',
                          border: '1px solid #2a313d',
                          'border-radius': '6px',
                          color: 'var(--fg)',
                          padding: '0 12px',
                          'font-size': '13px',
                        }}
                      />

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                          <span style={{ 'font-size': '11px', color: 'var(--muted)' }}>Мин</span>
                          <input
                            type="number"
                            step="any"
                            value={customMin()}
                            onInput={(e) => setCustomMin(e.currentTarget.value)}
                            style={{
                              height: '48px',
                              background: '#12151c',
                              border: '1px solid #2a313d',
                              'border-radius': '6px',
                              color: 'var(--fg)',
                              padding: '0 8px',
                              'font-size': '13px',
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                          <span style={{ 'font-size': '11px', color: 'var(--muted)' }}>Макс</span>
                          <input
                            type="number"
                            step="any"
                            value={customMax()}
                            onInput={(e) => setCustomMax(e.currentTarget.value)}
                            style={{
                              height: '48px',
                              background: '#12151c',
                              border: '1px solid #2a313d',
                              'border-radius': '6px',
                              color: 'var(--fg)',
                              padding: '0 8px',
                              'font-size': '13px',
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                          <span style={{ 'font-size': '11px', color: 'var(--muted)' }}>Кривая</span>
                          <button
                            type="button"
                            class="menu-action-btn"
                            style={{
                              height: '48px',
                              'justify-content': 'center',
                              'font-size': '12px',
                            }}
                            onClick={() =>
                              setCustomCurve((c) => (c === 'linear' ? 'exponential' : 'linear'))
                            }
                          >
                            {customCurve() === 'linear' ? 'Linear' : 'Exp'}
                          </button>
                        </div>
                      </div>

                      <Show when={bindError()}>
                        <div style={{ color: '#ff6b6b', 'font-size': '12px' }}>{bindError()}</div>
                      </Show>

                      <button
                        type="submit"
                        class="menu-action-btn"
                        style={{
                          'min-height': '48px',
                          'justify-content': 'center',
                          'font-size': '13px',
                          'font-weight': '600',
                          background: '#232834',
                          color: 'var(--fg)',
                        }}
                      >
                        Сохранить привязку CC {captured().cc}
                      </button>
                    </form>
                  </div>
                )}
              </Show>
            </div>

            {/* Section 3: Active Bindings List */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--muted)', 'text-transform': 'uppercase' }}>
                Активные привязки MIDI ({bindings().length})
              </span>

              <Show
                when={bindings().length > 0}
                fallback={
                  <div style={{ 'font-size': '12px', color: 'var(--muted)', 'font-style': 'italic', padding: '6px 0' }}>
                    Нет сохранённых привязок MIDI Learn
                  </div>
                }
              >
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                  <For each={bindings()}>
                    {(b) => (
                      <div
                        style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          padding: '10px 12px',
                          background: '#191d24',
                          border: '1px solid #2a313d',
                          'border-radius': '6px',
                        }}
                      >
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                          <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--fg)' }}>
                            {b.name}
                          </span>
                          <span style={{ 'font-size': '11px', color: 'var(--muted)', 'font-family': 'monospace' }}>
                            CC {b.cc} | Ch {b.channel ?? 'Все'} | [{b.min}..{b.max}] {b.curve === 'exponential' ? '(exp)' : ''}
                          </span>
                        </div>
                        <button
                          class="menu-action-btn"
                          aria-label={`Удалить привязку ${b.name}`}
                          style={{
                            'min-width': '48px',
                            'min-height': '48px',
                            'justify-content': 'center',
                            color: '#ff6b6b',
                            'font-size': '16px',
                            background: 'transparent',
                          }}
                          onClick={() => handleUnbind(b.id)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Section 4: Strudel MIDI Out Helper Tips */}
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '6px',
                padding: '12px',
                background: '#141820',
                border: '1px solid #232834',
                'border-radius': '6px',
              }}
            >
              <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--fg)' }}>
                💡 Вывод MIDI из Strudel (MIDI Out)
              </span>
              <div style={{ 'font-size': '11px', color: 'var(--muted)', 'line-height': '1.4' }}>
                Для управления внешним железом используйте синтезатор <code>s("midi")</code> с методом <code>.midiout("Device")</code>:
              </div>
              <pre
                style={{
                  background: '#0e0f12',
                  padding: '8px',
                  'border-radius': '4px',
                  'font-size': '11px',
                  color: 'var(--accent)',
                  margin: '4px 0 0 0',
                  overflow: 'auto',
                }}
              >
                s("midi").note("c3 e3 g3").midiout("Device Name")
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
