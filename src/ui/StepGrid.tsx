import { createSignal, createMemo, For, Show } from 'solid-js'
import {
  findGridPatternsInCode,
  gridToMini,
  miniToGrid,
  type GridModel,
  type GridPatternCandidate,
} from '../code-model/miniGrid'
import { replaceLiteral } from '../code-model/acorn'
import { PianoRoll } from './PianoRoll'

export interface StepGridProps {
  code: string
  onUpdateCode(newCode: string): void
  onSwitchToCode(): void
}

const COMMON_DRUM_SOUNDS = ['bd', 'sd', 'hh', 'oh', 'cp', 'cr', 'rim', 'cb', 'tabla']

export function StepGrid(props: StepGridProps) {
  const [gridMode, setGridMode] = createSignal<'drums' | 'piano'>('drums')
  const candidates = createMemo(() => findGridPatternsInCode(props.code))
  const [selectedCandidateIndex, setSelectedCandidateIndex] = createSignal(0)

  const activeCandidate = createMemo<GridPatternCandidate | undefined>(() => {
    const list = candidates()
    if (list.length === 0) return undefined
    const idx = Math.min(selectedCandidateIndex(), list.length - 1)
    return list[idx]
  })

  const isSupported = createMemo(() => {
    const c = activeCandidate()
    return c !== undefined && c.supported && c.grid !== undefined
  })

  const handleStepToggle = (trackIndex: number, stepIndex: number) => {
    const c = activeCandidate()
    if (!c || !c.grid) return

    const tracks = c.grid.tracks.map((t, idx) => {
      if (idx === trackIndex) {
        const steps = [...t.steps]
        steps[stepIndex] = !steps[stepIndex]
        return { ...t, steps }
      }
      return t
    })

    const newGrid: GridModel = {
      stepCount: c.grid.stepCount,
      tracks,
    }

    const newMini = gridToMini(newGrid)
    const res = replaceLiteral(props.code, c.literal, JSON.stringify(newMini))
    if (res.ok) {
      props.onUpdateCode(res.code)
    }
  }

  const handleAddTrack = (sound: string) => {
    const c = activeCandidate()
    if (!c || !c.grid) return
    if (c.grid.tracks.some((t) => t.sound === sound)) return

    const steps = new Array(c.grid.stepCount).fill(false)
    steps[0] = true

    const newTrack = {
      sound,
      steps,
    }

    const newGrid: GridModel = {
      stepCount: c.grid.stepCount,
      tracks: [...c.grid.tracks, newTrack],
    }

    const newMini = gridToMini(newGrid)
    const res = replaceLiteral(props.code, c.literal, JSON.stringify(newMini))
    if (res.ok) {
      props.onUpdateCode(res.code)
    }
  }

  const handleRemoveTrack = (trackIndex: number) => {
    const c = activeCandidate()
    if (!c || !c.grid || c.grid.tracks.length <= 1) return

    const newTracks = c.grid.tracks.filter((_, idx) => idx !== trackIndex)
    const newGrid: GridModel = {
      stepCount: c.grid.stepCount,
      tracks: newTracks,
    }

    const newMini = gridToMini(newGrid)
    const res = replaceLiteral(props.code, c.literal, JSON.stringify(newMini))
    if (res.ok) {
      props.onUpdateCode(res.code)
    }
  }

  const handleLoadDefaultTemplate = () => {
    props.onUpdateCode('s("bd [~ bd] sd [~ cp]")')
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'hidden',
        background: '#0e0f12',
        color: '#e8e6e3',
      }}
    >
      {/* Mode switcher tabs: Drums vs Piano Roll */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#10141a',
          'border-bottom': '1px solid #1f242e',
        }}
      >
        <button
          style={{
            'min-height': '36px',
            padding: '0 12px',
            background: gridMode() === 'drums' ? 'var(--accent)' : '#191d24',
            color: gridMode() === 'drums' ? '#000' : 'var(--text-muted)',
            border: '1px solid #2a313d',
            'border-radius': '6px',
            'font-size': '13px',
            'font-weight': '600',
            cursor: 'pointer',
          }}
          onClick={() => setGridMode('drums')}
        >
          🥁 Ударные
        </button>
        <button
          style={{
            'min-height': '36px',
            padding: '0 12px',
            background: gridMode() === 'piano' ? 'var(--accent)' : '#191d24',
            color: gridMode() === 'piano' ? '#000' : 'var(--text-muted)',
            border: '1px solid #2a313d',
            'border-radius': '6px',
            'font-size': '13px',
            'font-weight': '600',
            cursor: 'pointer',
          }}
          onClick={() => setGridMode('piano')}
        >
          🎹 Пиано-ролл
        </button>
      </div>

      <Show
        when={gridMode() === 'drums'}
        fallback={
          <PianoRoll
            code={props.code}
            onUpdateCode={props.onUpdateCode}
            onSwitchToCode={props.onSwitchToCode}
          />
        }
      >
        <Show
          when={isSupported()}
        fallback={
          <div
            data-testid="grid-fallback"
            style={{
              padding: '24px 16px',
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'text-align': 'center',
              gap: '16px',
              'max-width': '380px',
              margin: 'auto',
            }}
          >
            <div style={{ 'font-size': '36px' }}>🎹</div>
            <div style={{ 'font-weight': '600', 'font-size': '17px' }}>
              Сетка ритма недоступна
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '14px', 'line-height': '1.4' }}>
              {activeCandidate()?.reason ||
                'Текущий паттерн содержит сложные операторы полиметрии (<>, {}, ?), либо в коде нет строковых паттернов ритма. Редактирование доступно только в коде.'}
            </div>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', width: '100%', 'margin-top': '8px' }}>
              <button
                data-testid="grid-load-template-btn"
                style={{
                  'min-height': '48px',
                  background: 'var(--accent)',
                  color: '#000',
                  border: 'none',
                  'border-radius': '8px',
                  'font-weight': '600',
                  'font-size': '14px',
                  cursor: 'pointer',
                }}
                onClick={handleLoadDefaultTemplate}
              >
                Загрузить стандартный 16-шаговый бит
              </button>
              <button
                style={{
                  'min-height': '48px',
                  background: '#191d24',
                  color: 'var(--text)',
                  border: '1px solid #2a313d',
                  'border-radius': '8px',
                  'font-size': '14px',
                  cursor: 'pointer',
                }}
                onClick={props.onSwitchToCode}
              >
                Вернуться в редактор кода
              </button>
            </div>
          </div>
        }
      >
        <div
          data-testid="step-grid"
          style={{
            flex: 1,
            display: 'flex',
            'flex-direction': 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top toolbar */}
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              padding: '8px 12px',
              'border-bottom': '1px solid #1f242e',
              background: '#14171d',
            }}
          >
            <span style={{ 'font-weight': '600', 'font-size': '14px', color: 'var(--accent)' }}>
              Сетка ({activeCandidate()?.grid?.stepCount} шагов)
            </span>

            {/* Quick add sound buttons */}
            <div style={{ display: 'flex', gap: '6px', 'overflow-x': 'auto' }}>
              <For each={COMMON_DRUM_SOUNDS.slice(0, 4)}>
                {(snd) => (
                  <button
                    style={{
                      'min-height': '36px',
                      padding: '0 8px',
                      background: '#1e2430',
                      border: '1px solid #2e3646',
                      color: 'var(--text)',
                      'border-radius': '4px',
                      'font-size': '12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleAddTrack(snd)}
                  >
                    + {snd}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Grid tracks container */}
          <div
            style={{
              flex: 1,
              'overflow-y': 'auto',
              padding: '12px',
              display: 'flex',
              'flex-direction': 'column',
              gap: '12px',
            }}
          >
            <For each={activeCandidate()?.grid?.tracks}>
              {(track, trackIdx) => (
                <div
                  data-testid={`track-${track.sound}`}
                  style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '6px',
                    background: '#13161c',
                    border: '1px solid #232936',
                    'border-radius': '8px',
                    padding: '8px',
                  }}
                >
                  {/* Track header */}
                  <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                    <span
                      style={{
                        'font-weight': '700',
                        color: 'var(--accent)',
                        'font-size': '15px',
                        'font-family': 'monospace',
                      }}
                    >
                      {track.sound}
                    </span>
                    <Show when={(activeCandidate()?.grid?.tracks.length || 0) > 1}>
                      <button
                        aria-label={`Remove ${track.sound}`}
                        style={{
                          'min-height': '32px',
                          'min-width': '32px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRemoveTrack(trackIdx())}
                      >
                        ✕
                      </button>
                    </Show>
                  </div>

                  {/* Steps row (horizontally scrollable with 48px touch targets) */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      'overflow-x': 'auto',
                      padding: '4px 0',
                    }}
                  >
                    <For each={track.steps}>
                      {(active, stepIdx) => {
                        const isBeatStart = stepIdx() % 4 === 0
                        return (
                          <button
                            data-step={stepIdx()}
                            class={`step-cell ${active ? 'active' : ''}`}
                            style={{
                              'min-width': '42px',
                              'min-height': '48px',
                              background: active ? 'var(--accent)' : isBeatStart ? '#1f2530' : '#161920',
                              color: active ? '#000' : 'var(--text-muted)',
                              border: isBeatStart ? '1px solid #363e50' : '1px solid #232936',
                              'border-radius': '6px',
                              'font-size': '12px',
                              'font-weight': '600',
                              cursor: 'pointer',
                              'touch-action': 'manipulation',
                              flex: '0 0 auto',
                            }}
                            onClick={() => handleStepToggle(trackIdx(), stepIdx())}
                          >
                            {stepIdx() + 1}
                          </button>
                        )
                      }}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      </Show>
    </div>
  )
}
