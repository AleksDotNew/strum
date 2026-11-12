import { createSignal, createMemo, For, Show } from 'solid-js'
import { getAllSounds, searchSounds, type SoundEntry } from '../hints/soundCatalog'

export interface SoundBrowserProps {
  onInsertSound(soundName: string): void
  onAudition?(soundName: string): void
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'drum', label: 'Ударные' },
  { id: 'synth', label: 'Синты' },
  { id: 'bass', label: 'Бас' },
  { id: 'percussion', label: 'Перкуссия' },
  { id: 'melodic', label: 'Мелодия' },
  { id: 'fx', label: 'Эффекты' },
]

export function SoundBrowser(props: SoundBrowserProps) {
  const [query, setQuery] = createSignal('')
  const [selectedCategory, setSelectedCategory] = createSignal('all')
  const [auditioning, setAuditioning] = createSignal<string | null>(null)

  const filteredSounds = createMemo<SoundEntry[]>(() => {
    let list = query().trim() ? searchSounds(query()) : getAllSounds()
    const cat = selectedCategory()
    if (cat !== 'all') {
      list = list.filter((s) => s.category === cat)
    }
    return list
  })

  const handleAudition = (name: string) => {
    setAuditioning(name)
    props.onAudition?.(name)
    setTimeout(() => {
      if (auditioning() === name) {
        setAuditioning(null)
      }
    }, 1200)
  }

  return (
    <div
      data-testid="sound-browser"
      style={{
        flex: 1,
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'hidden',
        background: '#0e0f12',
        color: '#e8e6e3',
      }}
    >
      {/* Search Bar */}
      <div
        style={{
          padding: '12px',
          background: '#14171d',
          'border-bottom': '1px solid #1f242e',
          display: 'flex',
          'flex-direction': 'column',
          gap: '8px',
        }}
      >
        <input
          type="search"
          placeholder="Поиск звуков..."
          value={query()}
          onInput={(e) => {
            setQuery(e.currentTarget.value)
            if (e.currentTarget.value.trim() && selectedCategory() !== 'all') {
              setSelectedCategory('all')
            }
          }}
          style={{
            height: '48px',
            background: '#191d24',
            border: '1px solid #2a313d',
            'border-radius': '8px',
            padding: '0 12px',
            color: '#fff',
            'font-size': '15px',
            outline: 'none',
          }}
        />

        {/* Category Pills (horizontally scrollable) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            'overflow-x': 'auto',
            'padding-bottom': '4px',
          }}
        >
          <For each={CATEGORIES}>
            {(cat) => (
              <button
                data-testid={`filter-${cat.id}`}
                style={{
                  'min-height': '36px',
                  padding: '0 12px',
                  background: selectedCategory() === cat.id ? 'var(--accent)' : '#191d24',
                  color: selectedCategory() === cat.id ? '#000' : 'var(--text-muted)',
                  border: '1px solid #2a313d',
                  'border-radius': '18px',
                  'font-size': '13px',
                  'font-weight': selectedCategory() === cat.id ? '600' : 'normal',
                  'white-space': 'nowrap',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Sounds List */}
      <div
        style={{
          flex: 1,
          'overflow-y': 'auto',
          padding: '8px 12px',
          display: 'flex',
          'flex-direction': 'column',
          gap: '8px',
        }}
      >
        <Show
          when={filteredSounds().length > 0}
          fallback={
            <div style={{ padding: '32px 16px', 'text-align': 'center', color: 'var(--text-muted)' }}>
              Звуки не найдены
            </div>
          }
        >
          <For each={filteredSounds()}>
            {(sound) => (
              <div
                data-testid={`sound-item-${sound.name}`}
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  padding: '10px 12px',
                  background: '#13161c',
                  border: '1px solid #222733',
                  'border-radius': '8px',
                  gap: '8px',
                }}
              >
                <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    <span
                      style={{
                        'font-weight': '700',
                        'font-size': '15px',
                        color: 'var(--accent)',
                        'font-family': 'monospace',
                      }}
                    >
                      {sound.name}
                    </span>
                    <span
                      style={{
                        'font-size': '11px',
                        padding: '2px 6px',
                        background: '#1e2430',
                        color: 'var(--text-muted)',
                        'border-radius': '4px',
                      }}
                    >
                      {sound.category}
                    </span>
                  </div>
                  <Show when={sound.description}>
                    <span style={{ 'font-size': '12px', color: '#8892a0', 'line-height': '1.3' }}>
                      {sound.description}
                    </span>
                  </Show>
                </div>

                {/* Actions: Audition & Insert */}
                <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                  <button
                    aria-label={`Audition ${sound.name}`}
                    style={{
                      'min-height': '44px',
                      'min-width': '44px',
                      padding: '0 10px',
                      background: auditioning() === sound.name ? 'var(--accent)' : '#191d24',
                      color: auditioning() === sound.name ? '#000' : 'var(--text)',
                      border: '1px solid #2a313d',
                      'border-radius': '6px',
                      'font-size': '13px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleAudition(sound.name)}
                  >
                    ▶
                  </button>

                  <button
                    style={{
                      'min-height': '44px',
                      padding: '0 12px',
                      background: '#232936',
                      color: 'var(--accent)',
                      border: '1px solid #363e50',
                      'border-radius': '6px',
                      'font-size': '13px',
                      'font-weight': '600',
                      cursor: 'pointer',
                    }}
                    onClick={() => props.onInsertSound(sound.name)}
                  >
                    + Вставить
                  </button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
