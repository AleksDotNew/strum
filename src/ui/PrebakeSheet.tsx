import { createSignal, onMount, For, Show } from 'solid-js'
import { prebakeRepo, DEFAULT_PREBAKE_ID } from '../storage/prebakeRepo'
import type { PrebakeScript } from '../storage/db'

export interface PrebakeSheetProps {
  projectId: string
  currentPrebakeIds: string[]
  onUpdatePrebakeIds(newIds: string[]): void
  onSaveAsTemplate(): void
  onClose(): void
}

export function PrebakeSheet(props: PrebakeSheetProps) {
  const [allPrebakes, setAllPrebakes] = createSignal<PrebakeScript[]>([])
  const [selectedScript, setSelectedScript] = createSignal<PrebakeScript | null>(null)
  const [showAddModal, setShowAddModal] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  const [newSource, setNewSource] = createSignal<'inline' | 'url'>('inline')
  const [newCode, setNewCode] = createSignal('')
  const [newUrl, setNewUrl] = createSignal('')

  const loadData = async () => {
    await prebakeRepo.ensureBuiltinDefault()
    const all = await prebakeRepo.getAll()
    setAllPrebakes(all)
  }

  onMount(() => {
    loadData()
  })

  const toggleScriptInStack = (id: string) => {
    const current = [...props.currentPrebakeIds]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(id)
    }
    props.onUpdatePrebakeIds(current)
  }

  const handleTrust = async (script: PrebakeScript) => {
    await prebakeRepo.update(script.id, { trusted: true })
    await loadData()
    if (selectedScript()?.id === script.id) {
      setSelectedScript({ ...script, trusted: true })
    }
  }

  const handleCreateScript = async () => {
    const name = newName().trim() || 'Новый скрипт'
    if (newSource() === 'url') {
      const url = newUrl().trim()
      let code = '// внешний скрипт'
      try {
        const resp = await fetch(url)
        code = await resp.text()
      } catch {
        code = '// Ошибка загрузки по URL, отредактируйте вручную'
      }
      await prebakeRepo.create({
        name,
        source: 'url',
        url,
        code,
        trusted: false, // external code starts untrusted
      })
    } else {
      await prebakeRepo.create({
        name,
        source: 'inline',
        code: newCode() || '// prebake code',
        trusted: true,
      })
    }
    setShowAddModal(false)
    setNewName('')
    setNewCode('')
    setNewUrl('')
    await loadData()
  }

  return (
    <div class="tempo-sheet-backdrop" onClick={props.onClose}>
      <div
        class="tempo-sheet prebake-sheet"
        style={{ 'max-height': '80vh', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="tempo-sheet-header">
          <span>Стек Prebake-скриптов</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              aria-label="Add Script"
              style={{ color: 'var(--accent)', 'font-size': '14px', width: 'auto', padding: '0 8px' }}
              onClick={() => setShowAddModal(true)}
            >
              + Добавить
            </button>
            <button aria-label="Close Prebake" onClick={props.onClose}>✕</button>
          </div>
        </div>

        <Show when={showAddModal()}>
          <div
            style={{
              padding: '12px',
              background: '#13161c',
              border: '1px solid #2a313e',
              'border-radius': '8px',
              display: 'flex',
              'flex-direction': 'column',
              gap: '8px',
            }}
          >
            <div style={{ 'font-weight': '600', 'font-size': '14px' }}>Добавить Prebake-скрипт</div>
            <input
              type="text"
              placeholder="Название (например: Acid synths)"
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              style={{ padding: '6px 8px', background: '#1e2430', border: '1px solid #333d4e', color: '#fff', 'border-radius': '4px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: '1',
                  padding: '6px',
                  background: newSource() === 'inline' ? 'var(--accent)' : '#232a37',
                  color: newSource() === 'inline' ? '#000' : '#fff',
                  border: 'none',
                  'border-radius': '4px',
                }}
                onClick={() => setNewSource('inline')}
              >
                Код
              </button>
              <button
                style={{
                  flex: '1',
                  padding: '6px',
                  background: newSource() === 'url' ? 'var(--accent)' : '#232a37',
                  color: newSource() === 'url' ? '#000' : '#fff',
                  border: 'none',
                  'border-radius': '4px',
                }}
                onClick={() => setNewSource('url')}
              >
                По URL
              </button>
            </div>
            <Show when={newSource() === 'url'}>
              <input
                type="url"
                placeholder="https://.../script.strudel.js"
                value={newUrl()}
                onInput={(e) => setNewUrl(e.currentTarget.value)}
                style={{ padding: '6px 8px', background: '#1e2430', border: '1px solid #333d4e', color: '#fff', 'border-radius': '4px' }}
              />
            </Show>
            <Show when={newSource() === 'inline'}>
              <textarea
                placeholder="register('acid', (x, pat) => pat.lpf(x))"
                value={newCode()}
                onInput={(e) => setNewCode(e.currentTarget.value)}
                rows={3}
                style={{
                  padding: '6px 8px',
                  background: '#1e2430',
                  border: '1px solid #333d4e',
                  color: '#fff',
                  'border-radius': '4px',
                  'font-family': 'monospace',
                }}
              />
            </Show>
            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '8px' }}>
              <button
                style={{ padding: '6px 12px', background: '#2a313e', border: 'none', color: '#fff', 'border-radius': '4px' }}
                onClick={() => setShowAddModal(false)}
              >
                Отмена
              </button>
              <button
                style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#000', 'border-radius': '4px', 'font-weight': '600' }}
                onClick={handleCreateScript}
              >
                Сохранить
              </button>
            </div>
          </div>
        </Show>

        <div style={{ 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '8px', 'padding-bottom': '12px' }}>
          <For each={allPrebakes()}>
            {(pb) => {
              const inStack = props.currentPrebakeIds.includes(pb.id)
              return (
                <div
                  class="prebake-item"
                  style={{
                    padding: '10px 12px',
                    background: inStack ? '#1a241f' : '#1a1e27',
                    border: inStack ? '1px solid var(--accent)' : '1px solid #2a313e',
                    'border-radius': '8px',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ 'min-width': '0', flex: '1' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                      <span style={{ 'font-weight': '600', color: inStack ? 'var(--accent)' : 'var(--fg)', 'font-size': '14px' }}>
                        {pb.name}
                      </span>
                      {pb.id === DEFAULT_PREBAKE_ID && (
                        <span style={{ 'font-size': '10px', background: '#293241', padding: '2px 6px', 'border-radius': '4px', color: 'var(--muted)' }}>
                          встроенный
                        </span>
                      )}
                      {!pb.trusted && (
                        <span style={{ 'font-size': '10px', background: '#592929', padding: '2px 6px', 'border-radius': '4px', color: '#ff9999' }}>
                          не проверен
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        'font-family': 'monospace',
                        'font-size': '12px',
                        color: 'var(--muted)',
                        'white-space': 'nowrap',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'margin-top': '2px',
                      }}
                    >
                      {pb.code.split('\n')[0].slice(0, 40)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    {!pb.trusted && (
                      <button
                        style={{
                          padding: '6px 8px',
                          background: '#ffaa44',
                          color: '#000',
                          border: 'none',
                          'border-radius': '4px',
                          'font-size': '11px',
                          'font-weight': '600',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleTrust(pb)}
                      >
                        Доверять
                      </button>
                    )}
                    <button
                      style={{
                        padding: '6px 12px',
                        background: inStack ? '#2a313e' : '#2b3443',
                        color: inStack ? 'var(--accent)' : 'var(--fg)',
                        border: inStack ? '1px solid var(--accent)' : 'none',
                        'border-radius': '6px',
                        cursor: 'pointer',
                        'font-size': '13px',
                        'font-weight': '500',
                      }}
                      onClick={() => toggleScriptInStack(pb.id)}
                    >
                      {inStack ? 'В стеке ✓' : '+ В стек'}
                    </button>
                  </div>
                </div>
              )
            }}
          </For>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'padding-top': '8px', 'border-top': '1px solid #232a37' }}>
          <button
            style={{
              padding: '8px 12px',
              background: '#232834',
              border: '1px solid #32394a',
              color: 'var(--accent)',
              'border-radius': '6px',
              cursor: 'pointer',
              'font-size': '13px',
              'font-weight': '500',
            }}
            onClick={props.onSaveAsTemplate}
          >
            ★ Сохранить стек как шаблон
          </button>
        </div>
      </div>
    </div>
  )
}
