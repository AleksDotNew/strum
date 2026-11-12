import { symbolsFor, type SymbolAction } from './symbols'
import type { CursorCtx } from '../editor/cursorContext'
import type { CodeLiteral } from '../code-model/acorn'
import { Show } from 'solid-js'

export interface SymbolBarProps {
  context: CursorCtx
  activeLiteral?: CodeLiteral | null
  onAction(action: SymbolAction): void
  onOpenSlider?(): void
}

export function SymbolBar(props: SymbolBarProps) {
  const symbols = () => symbolsFor(props.context)

  return (
    <div class="symbol-bar" data-testid="symbol-bar">
      <div class="symbol-row">
        <Show when={props.activeLiteral?.type === 'number'}>
          <button
            class="symbol-btn symbol-btn-slider"
            data-testid="symbol-slider-btn"
            style={{
              background: 'var(--accent)',
              color: '#000',
              'font-weight': '600',
              padding: '0 12px',
              width: 'auto',
              'white-space': 'nowrap',
            }}
            onPointerDown={(e) => {
              e.preventDefault()
              props.onOpenSlider?.()
            }}
          >
            ⚡ {props.activeLiteral?.parentCall || 'Слайдер'}: {props.activeLiteral?.value}
          </button>
        </Show>
        {symbols().map((sym) => (
          <button
            class="symbol-btn"
            data-symbol={sym.label}
            onPointerDown={(e) => {
              e.preventDefault()
              props.onAction(sym)
            }}
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  )
}
