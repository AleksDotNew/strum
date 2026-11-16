import { symbolsFor, type SymbolAction } from './symbols'
import type { CursorCtx } from '../editor/cursorContext'
import type { CodeLiteral } from '../code-model/acorn'
import { Show } from 'solid-js'

export interface SymbolBarProps {
  context: CursorCtx
  activeLiteral?: CodeLiteral | null
  onAction(action: SymbolAction): void
  onOpenSlider?(): void
  onToggleMute?(): void
}

export function SymbolBar(props: SymbolBarProps) {
  const symbols = () => symbolsFor(props.context)

  return (
    <div class="symbol-bar" data-testid="symbol-bar">
      <div class="symbol-row">
        <button
          class="symbol-btn symbol-btn-mute"
          data-symbol="_$"
          data-testid="symbol-mute-btn"
          style={{
            'font-weight': '700',
            color: '#ff6b6b',
            'min-width': '38px',
          }}
          title="Toggle block mute (_$)"
          onPointerDown={(e) => {
            e.preventDefault()
            if (props.onToggleMute) {
              props.onToggleMute()
            } else {
              props.onAction({ label: '_$', insert: '_$' })
            }
          }}
        >
          _$
        </button>
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
