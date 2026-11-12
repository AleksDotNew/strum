export interface TopBarProps {
  playing: boolean
  bpm: number
  status: string
  onTogglePlay(): void
  onEval(): void
  onBpmClick(): void
  onMenuClick(): void
  onHush?(): void
}

export function TopBar(props: TopBarProps) {
  let startY = 0
  let isPointerDown = false

  const handlePointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    startY = e.clientY
    isPointerDown = true
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerDown) return
    if (e.clientY - startY > 40) {
      isPointerDown = false
      props.onHush?.()
    }
  }

  const handlePointerUp = (e: PointerEvent) => {
    isPointerDown = false
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerCancel = () => {
    isPointerDown = false
  }

  return (
    <header
      class="topbar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
        <button
          aria-label={props.playing ? 'Stop' : 'Play'}
          onClick={props.onTogglePlay}
        >
          {props.playing ? '■' : '▶'}
        </button>
        <button
          class="bpm-btn"
          aria-label="Set BPM"
          onClick={props.onBpmClick}
        >
          {props.bpm} bpm
        </button>
      </div>

      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
        <span class="status-pill" data-testid="engine-status">
          {props.status}
        </span>
        <button aria-label="Eval" onClick={props.onEval}>
          ⟳
        </button>
        <button aria-label="Menu" onClick={props.onMenuClick}>
          ⋮
        </button>
      </div>
    </header>
  )
}
