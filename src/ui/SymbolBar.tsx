export interface SymbolBarProps {
  onInsert(symbol: string): void
}

const DEFAULT_SYMBOLS = ['~', '*', '/', '[', ']', '<', '>', ',', '?', '!', '@', ':', '.', '|', '(', ')', '$:']

export function SymbolBar(props: SymbolBarProps) {
  return (
    <div class="symbol-bar">
      <div class="symbol-row">
        {DEFAULT_SYMBOLS.map((sym) => (
          <button
            class="symbol-btn"
            onPointerDown={(e) => {
              e.preventDefault()
              props.onInsert(sym)
            }}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}
