import { createSignal, createMemo, For, Show } from 'solid-js'
import {
  findNotePatternsInCode,
  gridToNotesMini,
  type PianoRollModel,
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

  const activeCandidate = createMemo<NotePatternCandidate | undefined>(() => {
    const list = candidates()
    if (list.length === 0) return undefined
    return list[Math.min(selectedIdx(), list.length - 1)]
  })

  const isSupported = createMemo(() => {
    const c = activeCandidate()
    return c !== undefined && c.supported && c.model !== undefined
  })

  const handleStepToggle = (noteIndex: number, stepIndex: number) => {
    const c = activeCandidate()
    if (!c || !c.model) return

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
        {/* Piano Roll Grid */}
        <div
          style={{
            flex: 1,
            'overflow-y': 'auto',
            padding: '8px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '4px',
          }}
        >
          <For each={activeCandidate()?.model?.availableNotes}>
            {(noteName, noteIdx) => {
              const isSharp = noteName.includes('#') || noteName.includes('b')
              return (
                <div
                  data-testid={`piano-row-${noteName}`}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '4px',
                  }}
                >
                  {/* Piano Key */}
                  <div
                    style={{
                      width: '48px',
                      'min-width': '48px',
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
                    {noteName}
                  </div>

                  {/* Step Buttons */}
                  <div style={{ display: 'flex', gap: '3px', 'overflow-x': 'auto', flex: 1 }}>
                    <For each={activeCandidate()?.model?.matrix[noteIdx()]}>
                      {(active, stepIdx) => {
                        const isBeat = stepIdx() % 4 === 0
                        return (
                          <button
                            data-step={stepIdx()}
                            style={{
                              'min-width': '38px',
                              height: '36px',
                              background: active ? 'var(--accent)' : isBeat ? '#1b212c' : '#141820',
                              color: active ? '#000' : 'transparent',
                              border: isBeat ? '1px solid #364259' : '1px solid #232a38',
                              'border-radius': '4px',
                              cursor: 'pointer',
                              'touch-action': 'manipulation',
                              flex: '0 0 auto',
                            }}
                            onClick={() => handleStepToggle(noteIdx(), stepIdx())}
                          >
                            ●
                          </button>
                        )
                      }}
                    </For>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}
