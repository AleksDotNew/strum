import { createSignal, createMemo, createEffect, Index, Show } from 'solid-js'
import {
  findNotePatternsInCode,
  gridToNotesMini,
  type NotePatternCandidate,
} from '../code-model/pianoRollModel'
import { replaceLiteral } from '../code-model/acorn'

export interface PianoRollProps {
  code: string
  onUpdateCode(newCode: string): void
  onSwitchToCode(): void
}

export function PianoRoll(props: PianoRollProps) {
  const candidates = createMemo(() => findNotePatternsInCode(props.code))
  const [selectedIdx, setSelectedIdx] = createSignal(0)
  let pianoScrollRef: HTMLDivElement | undefined
  let savedPianoScrollLeft = 0

  const activeCandidate = createMemo<NotePatternCandidate | undefined>(() => {
    const list = candidates()
    if (list.length === 0) return undefined
    return list[Math.min(selectedIdx(), list.length - 1)]
  })

  const isSupported = createMemo(() => {
    const c = activeCandidate()
    return c !== undefined && c.supported && c.model !== undefined
  })

  // Restore scrollLeft if code is updated
  createEffect(() => {
    props.code
    if (pianoScrollRef && savedPianoScrollLeft > 0) {
      pianoScrollRef.scrollLeft = savedPianoScrollLeft
    }
  })

  const handleStepToggle = (noteIndex: number, stepIndex: number) => {
    const c = activeCandidate()
    if (!c || !c.model) return

    if (pianoScrollRef) {
      savedPianoScrollLeft = pianoScrollRef.scrollLeft
    }

    const matrix = c.model.matrix.map((row, rIdx) => {
      if (rIdx === noteIndex) {
        const next = [...row]
        next[stepIndex] = !next[stepIndex]
        return next
      }
      return row
    })

    const newMini = gridToNotesMini(c.model.availableNotes, matrix, c.model.stepCount)
    const res = replaceLiteral(props.code, c.literal, JSON.stringify(newMini))
    if (res.ok) {
      props.onUpdateCode(res.code)
      if (pianoScrollRef && savedPianoScrollLeft > 0) {
        pianoScrollRef.scrollLeft = savedPianoScrollLeft
        requestAnimationFrame(() => {
          if (pianoScrollRef && savedPianoScrollLeft > 0) {
            pianoScrollRef.scrollLeft = savedPianoScrollLeft
          }
        })
      }
    }
  }

  const handleLoadMelodyTemplate = () => {
    props.onUpdateCode('note("c3 ~ e3 g3").s("sawtooth").gain(0.8)')
  }

  return (
    <div
      data-testid="piano-roll"
      style={{
        flex: 1,
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'hidden',
        height: '100%',
        'min-height': '0',
        background: '#0e0f12',
        color: '#e8e6e3',
      }}
    >
      <Show
        when={isSupported()}
        fallback={
          <div
            style={{
              padding: '24px 16px',
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'text-align': 'center',
              gap: '16px',
              margin: 'auto',
              'max-width': '380px',
            }}
          >
            <div style={{ 'font-size': '36px' }}>🎹</div>
            <div style={{ 'font-weight': '600', 'font-size': '17px' }}>
              Мелодический паттерн не найден
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '14px', 'line-height': '1.4' }}>
              В коде отсутствует вызов note("...") или n("..."). Создайте мелодический паттерн с синтезатором.
            </div>
            <button
              data-testid="piano-load-melody-btn"
              style={{
                'min-height': '48px',
                padding: '0 20px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                'border-radius': '8px',
                'font-weight': '600',
                cursor: 'pointer',
              }}
              onClick={handleLoadMelodyTemplate}
            >
              Загрузить мелодический шаблон
            </button>
          </div>
        }
      >
        {/* Unified Piano Roll Grid (Scrolls horizontally as a whole) */}
        <div
          data-testid="piano-roll-scroll"
          ref={pianoScrollRef}
          onScroll={(e) => {
            savedPianoScrollLeft = e.currentTarget.scrollLeft
          }}
          style={{
            flex: 1,
            'overflow-x': 'auto',
            'overflow-y': 'auto',
            '-webkit-overflow-scrolling': 'touch',
            padding: '8px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '4px',
            height: '100%',
            'min-height': '0',
          }}
        >
          {/* Step Timeline Header Row */}
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '4px',
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
                width: '52px',
                'min-width': '52px',
                'font-size': '10px',
                'font-weight': '700',
                color: 'var(--text-muted)',
                'text-transform': 'uppercase',
                background: '#0e0f12',
              }}
            >
              Нота
            </div>

            {/* Step numbers: 1 2 3 4 ... */}
            <div style={{ display: 'flex', gap: '3px' }}>
              <Index each={Array.from({ length: activeCandidate()?.model?.stepCount || 16 })}>
                {(_, stepIdx) => {
                  const isBeat = stepIdx % 4 === 0
                  return (
                    <div
                      style={{
                        'min-width': '38px',
                        'text-align': 'center',
                        'font-size': '11px',
                        'font-weight': isBeat ? '700' : '400',
                        color: isBeat ? 'var(--accent)' : 'var(--text-muted)',
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

          {/* Note Rows */}
          <Index each={activeCandidate()?.model?.availableNotes}>
            {(noteName, noteIdx) => {
              const isSharp = noteName().includes('#') || noteName().includes('b')
              return (
                <div
                  data-testid={`piano-row-${noteName()}`}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '4px',
                    'min-width': 'max-content',
                  }}
                >
                  {/* Piano Key (Sticky Left) */}
                  <div
                    style={{
                      position: 'sticky',
                      left: 0,
                      'z-index': 5,
                      width: '52px',
                      'min-width': '52px',
                      height: '36px',
                      background: isSharp ? '#1e2430' : '#30394a',
                      color: isSharp ? '#7cf0b0' : '#fff',
                      border: '1px solid #455269',
                      'border-radius': '4px',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'font-size': '12px',
                      'font-weight': '700',
                      'font-family': 'monospace',
                    }}
                  >
                    {noteName()}
                  </div>

                  {/* Step Buttons (Aligned with header) */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <Index each={activeCandidate()?.model?.matrix[noteIdx]}>
                      {(active, stepIdx) => {
                        const isBeat = stepIdx % 4 === 0
                        return (
                          <button
                            data-step={stepIdx}
                            style={{
                              'min-width': '38px',
                              height: '36px',
                              background: active() ? 'var(--accent)' : isBeat ? '#1b212c' : '#141820',
                              color: active() ? '#000' : 'transparent',
                              border: isBeat ? '1px solid #364259' : '1px solid #232a38',
                              'border-radius': '4px',
                              cursor: 'pointer',
                              'touch-action': 'manipulation',
                              flex: '0 0 auto',
                            }}
                            onClick={() => handleStepToggle(noteIdx, stepIdx)}
                          >
                            ●
                          </button>
                        )
                      }}
                    </Index>
                  </div>
                </div>
              )
            }}
          </Index>
        </div>
      </Show>
    </div>
  )
}
