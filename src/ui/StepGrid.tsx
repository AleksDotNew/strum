import { createSignal, createMemo, createEffect, For, Index, Show } from 'solid-js'
import {
  findGridPatternsInCode,
  gridToMini,
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
  let scrollContainerRef: HTMLDivElement | undefined
  let savedScrollLeft = 0

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

  // Restore scrollLeft if code is updated
  createEffect(() => {
    props.code
    if (scrollContainerRef && savedScrollLeft > 0) {
      scrollContainerRef.scrollLeft = savedScrollLeft
    }
  })

  const handleStepToggle = (trackIndex: number, stepIndex: number) => {
    const c = activeCandidate()
    if (!c || !c.grid) return

    if (scrollContainerRef) {
      savedScrollLeft = scrollContainerRef.scrollLeft
    }

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
      if (scrollContainerRef && savedScrollLeft > 0) {
        scrollContainerRef.scrollLeft = savedScrollLeft
        requestAnimationFrame(() => {
          if (scrollContainerRef && savedScrollLeft > 0) {
            scrollContainerRef.scrollLeft = savedScrollLeft
          }
        })
      }
    }
  }

  const handleAddTrack = (sound: string) => {
    const c = activeCandidate()
    if (!c || !c.grid) return
    if (c.grid.tracks.some((t) => t.sound === sound)) return

    if (scrollContainerRef) {
      savedScrollLeft = scrollContainerRef.scrollLeft
    }

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

    if (scrollContainerRef) {
      savedScrollLeft = scrollContainerRef.scrollLeft
    }

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

            {/* Grid tracks container with unified horizontal scroll */}
            <div
              data-testid="grid-scroll-tracks"
              ref={scrollContainerRef}
              onScroll={(e) => {
                savedScrollLeft = e.currentTarget.scrollLeft
              }}
              style={{
                flex: 1,
                'overflow-x': 'auto',
                'overflow-y': 'auto',
                padding: '12px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '8px',
              }}
            >
              {/* Timeline Header Row (Step numbers aligned with columns) */}
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px',
                  'min-width': 'max-content',
                  'padding-bottom': '2px',
                }}
              >
                {/* Sticky label column spacer */}
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    'z-index': 10,
                    width: '84px',
                    'min-width': '84px',
                    'font-size': '11px',
                    'font-weight': '700',
                    color: 'var(--text-muted)',
                    'text-transform': 'uppercase',
                    background: '#0e0f12',
                  }}
                >
                  Трек
                </div>

                {/* Step numbers: 1 2 3 4 ... */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Index each={Array.from({ length: activeCandidate()?.grid?.stepCount || 16 })}>
                    {(_, stepIdx) => {
                      const isBeatStart = stepIdx % 4 === 0
                      return (
                        <div
                          style={{
                            'min-width': '42px',
                            'text-align': 'center',
                            'font-size': '11px',
                            'font-weight': isBeatStart ? '700' : '400',
                            color: isBeatStart ? 'var(--accent)' : 'var(--text-muted)',
                            'user-select': 'none',
                          }}
                        >
                          {stepIdx + 1}
                        </div>
                      )
                    }}
                  </Index>
                </div>
              </div>

              {/* Tracks (using Index to prevent DOM node re-creation on cell update) */}
              <Index each={activeCandidate()?.grid?.tracks}>
                {(track, trackIdx) => (
                  <div
                    data-testid={`track-${track().sound}`}
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '8px',
                      'min-width': 'max-content',
                      background: '#13161c',
                      border: '1px solid #232936',
                      'border-radius': '8px',
                      padding: '6px 8px',
                    }}
                  >
                    {/* Sticky Track Header on left */}
                    <div
                      style={{
                        position: 'sticky',
                        left: 0,
                        'z-index': 5,
                        background: '#13161c',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'space-between',
                        width: '84px',
                        'min-width': '84px',
                        padding: '0 4px',
                      }}
                    >
                      <span
                        style={{
                          'font-weight': '700',
                          color: 'var(--accent)',
                          'font-size': '14px',
                          'font-family': 'monospace',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap',
                        }}
                      >
                        {track().sound}
                      </span>
                      <Show when={(activeCandidate()?.grid?.tracks.length || 0) > 1}>
                        <button
                          aria-label={`Remove ${track().sound}`}
                          style={{
                            'min-height': '28px',
                            'min-width': '28px',
                            background: 'transparent',
                            border: 'none',
                            color: '#ff6b6b',
                            cursor: 'pointer',
                            'font-size': '14px',
                            padding: 0,
                          }}
                          onClick={() => handleRemoveTrack(trackIdx)}
                        >
                          ✕
                        </button>
                      </Show>
                    </div>

                    {/* Steps Row (aligned with header) */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                      }}
                    >
                      <Index each={track().steps}>
                        {(active, stepIdx) => {
                          const isBeatStart = stepIdx % 4 === 0
                          return (
                            <button
                              data-step={stepIdx}
                              class={`step-cell ${active() ? 'active' : ''}`}
                              style={{
                                'min-width': '42px',
                                'min-height': '48px',
                                background: active() ? 'var(--accent)' : isBeatStart ? '#1f2530' : '#161920',
                                color: active() ? '#000' : 'var(--text-muted)',
                                border: isBeatStart ? '1px solid #363e50' : '1px solid #232936',
                                'border-radius': '6px',
                                'font-size': '12px',
                                'font-weight': '600',
                                cursor: 'pointer',
                                'touch-action': 'manipulation',
                                flex: '0 0 auto',
                              }}
                              onClick={() => handleStepToggle(trackIdx, stepIdx)}
                            >
                              {stepIdx + 1}
                            </button>
                          )
                        }}
                      </Index>
                    </div>
                  </div>
                )}
              </Index>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  )
}
