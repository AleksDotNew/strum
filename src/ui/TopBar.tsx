export interface TopBarProps {
  playing: boolean
  bpm: number
  status: string
  onTogglePlay(): void
  onEval(): void
  onBpmClick(): void
  onMenuClick(): void
}

export function TopBar(props: TopBarProps) {
  return (
    <header class="topbar">
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
