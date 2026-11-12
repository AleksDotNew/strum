import { createSignal, For } from 'solid-js'
import type { CodeLiteral } from '../code-model/acorn'
import { getSliderConfigForLiteral } from '../code-model/sliderConfig'

export interface NumberSliderSheetProps {
  literal: CodeLiteral
  onValueChange(val: number): void
  onClose(): void
}

export function NumberSliderSheet(props: NumberSliderSheetProps) {
  const config = () => getSliderConfigForLiteral(props.literal)
  const [val, setVal] = createSignal<number>(
    typeof props.literal.value === 'number' ? props.literal.value : config().min,
  )

  const handleInput = (newVal: number) => {
    setVal(newVal)
    props.onValueChange(newVal)
  }

  const stepAdjust = (delta: number) => {
    const next = Math.max(
      config().min,
      Math.min(config().max, Math.round((val() + delta) * 1000) / 1000),
    )
    handleInput(next)
  }

  return (
    <div
      class="tempo-sheet-backdrop"
      data-testid="number-slider-backdrop"
      onClick={props.onClose}
    >
      <div
        class="tempo-sheet number-slider-sheet"
        data-testid="number-slider-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '12px',
          padding: '16px',
        }}
      >
        <div class="tempo-sheet-header">
          <span style={{ 'font-weight': '600', color: 'var(--accent)' }}>
            ⚡ {config().label}: {val()}
          </span>
          <button
            aria-label="Close Slider"
            data-testid="close-slider-btn"
            style={{
              'min-height': '48px',
              'min-width': '48px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              'font-size': '18px',
              cursor: 'pointer',
            }}
            onClick={props.onClose}
          >
            ✕
          </button>
        </div>

        {/* Stepper buttons and slider row */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <button
            aria-label="Decrease"
            style={{
              'min-width': '48px',
              'min-height': '48px',
              background: '#191d24',
              border: '1px solid #2a313d',
              color: 'var(--text)',
              'font-size': '20px',
              'border-radius': '6px',
              cursor: 'pointer',
            }}
            onClick={() => stepAdjust(-config().step)}
          >
            −
          </button>

          <input
            type="range"
            data-testid="number-slider-input"
            min={config().min}
            max={config().max}
            step={config().step}
            value={val()}
            onInput={(e) => handleInput(parseFloat(e.currentTarget.value))}
            style={{
              flex: 1,
              height: '48px',
              'touch-action': 'manipulation',
              cursor: 'pointer',
              'accent-color': 'var(--accent)',
            }}
          />

          <button
            aria-label="Increase"
            style={{
              'min-width': '48px',
              'min-height': '48px',
              background: '#191d24',
              border: '1px solid #2a313d',
              color: 'var(--text)',
              'font-size': '20px',
              'border-radius': '6px',
              cursor: 'pointer',
            }}
            onClick={() => stepAdjust(config().step)}
          >
            +
          </button>
        </div>

        {/* Preset buttons */}
        <div
          style={{
            display: 'flex',
            'flex-wrap': 'wrap',
            gap: '8px',
            'margin-top': '4px',
          }}
        >
          <For each={config().presets}>
            {(preset) => (
              <button
                data-testid={`preset-${preset}`}
                style={{
                  'min-height': '48px',
                  padding: '0 16px',
                  background: val() === preset ? 'var(--accent)' : '#191d24',
                  color: val() === preset ? '#000' : 'var(--text)',
                  border: '1px solid #2a313d',
                  'border-radius': '6px',
                  'font-size': '14px',
                  'font-weight': val() === preset ? '600' : 'normal',
                  cursor: 'pointer',
                }}
                onClick={() => handleInput(preset)}
              >
                {preset}
              </button>
            )}
          </For>
        </div>

        {/* Done / Close full-width button */}
        <button
          data-testid="done-slider-btn"
          style={{
            'min-height': '48px',
            width: '100%',
            background: '#232936',
            color: 'var(--accent)',
            border: '1px solid #363e50',
            'border-radius': '8px',
            'font-size': '15px',
            'font-weight': '600',
            'margin-top': '8px',
            cursor: 'pointer',
          }}
          onClick={props.onClose}
        >
          Готово
        </button>
      </div>
    </div>
  )
}
