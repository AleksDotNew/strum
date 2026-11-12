import { createSignal, onMount, For, Show } from 'solid-js'
import { versionRepo } from '../storage/versionRepo'
import type { VersionRecord } from '../storage/db'

export interface VersionHistorySheetProps {
  projectId: string
  currentCode: string
  onRestore(code: string): void
  onClose(): void
}

export function VersionHistorySheet(props: VersionHistorySheetProps) {
  const [versions, setVersions] = createSignal<VersionRecord[]>([])
  const [loading, setLoading] = createSignal(true)

  const loadVersions = async () => {
    setLoading(true)
    try {
      const list = await versionRepo.getForProject(props.projectId)
      setVersions(list)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    loadVersions()
  })

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div class="tempo-sheet-backdrop" onClick={props.onClose}>
      <div
        class="tempo-sheet history-sheet"
        style={{ 'max-height': '70vh', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="tempo-sheet-header">
          <span>История версий ({versions().length})</span>
          <button aria-label="Close History" onClick={props.onClose}>✕</button>
        </div>

        <Show when={loading()}>
          <div style={{ padding: '16px 0', color: 'var(--muted)' }}>Загрузка истории...</div>
        </Show>

        <Show when={!loading() && versions().length === 0}>
          <div style={{ padding: '16px 0', color: 'var(--muted)' }}>
            Снимки сохраняются автоматически при каждом успешном запуске (Eval / ▶).
          </div>
        </Show>

        <div style={{ 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '8px', 'padding-bottom': '12px' }}>
          <For each={versions()}>
            {(v) => {
              const isCurrent = v.code.trim() === props.currentCode.trim()
              const preview = v.code.split('\n')[0].slice(0, 40)
              return (
                <div
                  class="history-item"
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    padding: '10px 12px',
                    background: isCurrent ? '#1f2824' : '#1e232c',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid #2a313e',
                    'border-radius': '8px',
                    gap: '8px',
                  }}
                >
                  <div style={{ 'min-width': '0', flex: '1' }}>
                    <div style={{ 'font-size': '12px', color: isCurrent ? 'var(--accent)' : 'var(--muted)' }}>
                      {formatTime(v.createdAt)} {v.note ? `• ${v.note}` : ''} {isCurrent ? '• (текущая)' : ''}
                    </div>
                    <div
                      style={{
                        'font-family': 'monospace',
                        'font-size': '13px',
                        'white-space': 'nowrap',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        color: 'var(--fg)',
                        'margin-top': '2px',
                      }}
                    >
                      {preview}
                    </div>
                  </div>

                  <button
                    style={{
                      'min-height': '36px',
                      'min-width': '96px',
                      padding: '0 12px',
                      background: isCurrent ? '#2a313e' : '#2d3748',
                      color: isCurrent ? 'var(--muted)' : 'var(--fg)',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: isCurrent ? 'default' : 'pointer',
                      'font-size': '13px',
                    }}
                    disabled={isCurrent}
                    onClick={() => {
                      props.onRestore(v.code)
                      props.onClose()
                    }}
                  >
                    {isCurrent ? 'Активна' : 'Откатить'}
                  </button>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}
