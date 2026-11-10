import { symbolsFor, type SymbolAction } from './symbols'
import type { CursorCtx } from '../editor/cursorContext'

export interface SymbolBarProps {
  context: CursorCtx
  onAction(action: SymbolAction): void
}

export function SymbolBar(props: SymbolBarProps) {
  const symbols = () => symbolsFor(props.context)

  return (
    <div class="symbol-bar" data-testid="symbol-bar">
      <div class="symbol-row">
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
