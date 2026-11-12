import { createSignal, createMemo, onMount, For, Show } from 'solid-js'
import { getAllSounds, searchSounds, type SoundEntry } from '../hints/soundCatalog'
import { samplepackRepo } from '../storage/samplepackRepo'
import type { SamplepackRecord } from '../storage/db'

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
  const [browserTab, setBrowserTab] = createSignal<'sounds' | 'packs'>('sounds')
  const [query, setQuery] = createSignal('')
  const [selectedCategory, setSelectedCategory] = createSignal('all')
  const [auditioning, setAuditioning] = createSignal<string | null>(null)
  const [packs, setPacks] = createSignal<SamplepackRecord[]>([])
  const [loadingPacks, setLoadingPacks] = createSignal(false)
  const [soundListVersion, setSoundListVersion] = createSignal(0)
  let fileInputRef: HTMLInputElement | undefined

  const loadPacks = async () => {
    setLoadingPacks(true)
    try {
      const all = await samplepackRepo.getAll()
      setPacks(all)
    } finally {
      setLoadingPacks(false)
    }
  }

  onMount(() => {
    loadPacks()
  })

  const filteredSounds = createMemo<SoundEntry[]>(() => {
    soundListVersion()
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

  const handleTogglePack = async (pack: SamplepackRecord) => {
    await samplepackRepo.toggleActive(pack.id, !pack.active)
    await loadPacks()
    setSoundListVersion((v) => v + 1)
  }

  const handleDeletePack = async (id: string) => {
    await samplepackRepo.deletePack(id)
    await loadPacks()
    setSoundListVersion((v) => v + 1)
  }

  const handleFileChange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      await samplepackRepo.importPack(text)
      await loadPacks()
      setSoundListVersion((v) => v + 1)
      alert(`Сэмплпак "${file.name}" успешно импортирован!`)
    } catch (err: any) {
      alert(`Ошибка импорта: ${err?.message ?? err}`)
    } finally {
      target.value = ''
    }
  }

  return (
    <div
      data-testid="sound-browser"
      style={{
        flex: 1,
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'hidden',
        height: '100%',
        'min-height': '0',
        background: '#0e0f12',
        color: '#e8e6e3',
      }}
    >
      {/* Top Segmented Control: [Звуки] [Сэмплпаки] */}
      <div
        style={{
          display: 'flex',
          background: '#14171d',
          'border-bottom': '1px solid #1f242e',
          padding: '8px 12px',
          gap: '8px',
          'align-items': 'center',
          'justify-content': 'space-between',
          flex: '0 0 auto',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            style={{
              padding: '6px 14px',
              'min-height': '36px',
              background: browserTab() === 'sounds' ? 'var(--accent)' : '#191d24',
              color: browserTab() === 'sounds' ? '#000' : 'var(--text-muted)',
              border: '1px solid #2a313d',
              'border-radius': '6px',
              'font-size': '13px',
              'font-weight': '600',
              cursor: 'pointer',
            }}
            onClick={() => setBrowserTab('sounds')}
          >
            Звуки ({filteredSounds().length})
          </button>
          <button
            style={{
              padding: '6px 14px',
              'min-height': '36px',
              background: browserTab() === 'packs' ? 'var(--accent)' : '#191d24',
              color: browserTab() === 'packs' ? '#000' : 'var(--text-muted)',
              border: '1px solid #2a313d',
              'border-radius': '6px',
              'font-size': '13px',
              'font-weight': '600',
              cursor: 'pointer',
            }}
            onClick={() => setBrowserTab('packs')}
          >
            Сэмплпаки ({packs().length})
          </button>
        </div>

        <Show when={browserTab() === 'packs'}>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".weftpack,.json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              style={{
                padding: '6px 12px',
                'min-height': '36px',
                background: '#232936',
                color: 'var(--accent)',
                border: '1px solid #363e50',
                'border-radius': '6px',
                'font-size': '12px',
                'font-weight': '600',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef?.click()}
            >
              + Импорт .weftpack
            </button>
          </div>
        </Show>
      </div>

      {/* VIEW 1: SOUNDS LIST */}
      <Show when={browserTab() === 'sounds'}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            'flex-direction': 'column',
            height: '100%',
            'min-height': '0',
            overflow: 'hidden',
          }}
        >
          {/* Search Bar */}
          <div
            style={{
              padding: '10px 12px',
              background: '#14171d',
              'border-bottom': '1px solid #1f242e',
              display: 'flex',
              'flex-direction': 'column',
              gap: '8px',
              flex: '0 0 auto',
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
                height: '44px',
                background: '#191d24',
                border: '1px solid #2a313d',
                'border-radius': '8px',
                padding: '0 12px',
                color: '#fff',
                'font-size': '14px',
                outline: 'none',
              }}
            />

            {/* Category Pills (horizontally scrollable) */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                'overflow-x': 'auto',
                '-webkit-overflow-scrolling': 'touch',
                'padding-bottom': '4px',
              }}
            >
              <For each={CATEGORIES}>
                {(cat) => (
                  <button
                    data-testid={`filter-${cat.id}`}
                    style={{
                      'min-height': '32px',
                      padding: '0 10px',
                      background: selectedCategory() === cat.id ? 'var(--accent)' : '#191d24',
                      color: selectedCategory() === cat.id ? '#000' : 'var(--text-muted)',
                      border: '1px solid #2a313d',
                      'border-radius': '16px',
                      'font-size': '12px',
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

          {/* Sounds Scrollable List */}
          <div
            data-testid="sounds-scroll-list"
            style={{
              flex: 1,
              'overflow-y': 'auto',
              '-webkit-overflow-scrolling': 'touch',
              'min-height': '0',
              height: '100%',
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
                      padding: '8px 12px',
                      background: '#13161c',
                      border: '1px solid #222733',
                      'border-radius': '8px',
                      gap: '8px',
                      flex: '0 0 auto',
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                        <span
                          style={{
                            'font-weight': '700',
                            'font-size': '14px',
                            color: 'var(--accent)',
                            'font-family': 'monospace',
                          }}
                        >
                          {sound.name}
                        </span>
                        <span
                          style={{
                            'font-size': '10px',
                            padding: '2px 5px',
                            background: '#1e2430',
                            color: 'var(--text-muted)',
                            'border-radius': '4px',
                          }}
                        >
                          {sound.category}
                        </span>
                      </div>
                      <Show when={sound.description}>
                        <span style={{ 'font-size': '11px', color: '#8892a0', 'line-height': '1.3' }}>
                          {sound.description}
                        </span>
                      </Show>
                    </div>

                    {/* Actions: Audition & Insert */}
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                      <button
                        aria-label={`Audition ${sound.name}`}
                        style={{
                          'min-height': '40px',
                          'min-width': '40px',
                          padding: '0 8px',
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
                          'min-height': '40px',
                          padding: '0 10px',
                          background: '#232936',
                          color: 'var(--accent)',
                          border: '1px solid #363e50',
                          'border-radius': '6px',
                          'font-size': '12px',
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
      </Show>

      {/* VIEW 2: SAMPLEPACKS LIST */}
      <Show when={browserTab() === 'packs'}>
        <div
          data-testid="samplepacks-scroll-list"
          style={{
            flex: 1,
            'overflow-y': 'auto',
            '-webkit-overflow-scrolling': 'touch',
            'min-height': '0',
            height: '100%',
            padding: '12px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '12px',
          }}
        >
          <Show when={loadingPacks()}>
            <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--text-muted)' }}>
              Загрузка сэмплпаков...
            </div>
          </Show>

          <For each={packs()}>
            {(pack) => (
              <div
                style={{
                  background: '#13161c',
                  border: pack.active ? '1px solid var(--accent)' : '1px solid #222733',
                  'border-radius': '8px',
                  padding: '12px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '8px',
                  flex: '0 0 auto',
                }}
              >
                {/* Pack Header */}
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    <span style={{ 'font-weight': '700', 'font-size': '15px', color: '#fff' }}>
                      {pack.name}
                    </span>
                    <span
                      style={{
                        'font-size': '10px',
                        padding: '2px 6px',
                        background: '#1f242e',
                        color: 'var(--text-muted)',
                        'border-radius': '4px',
                      }}
                    >
                      {pack.by}
                    </span>
                  </div>

                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    <button
                      style={{
                        'min-height': '36px',
                        padding: '0 12px',
                        background: pack.active ? 'var(--accent)' : '#1e2430',
                        color: pack.active ? '#000' : 'var(--text-muted)',
                        border: '1px solid #363e50',
                        'border-radius': '6px',
                        'font-size': '12px',
                        'font-weight': '600',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleTogglePack(pack)}
                    >
                      {pack.active ? '✓ Подключен' : 'Подключить'}
                    </button>

                    <Show when={!pack.isBuiltin}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Удалить"
                        onClick={() => handleDeletePack(pack.id)}
                      >
                        🗑
                      </button>
                    </Show>
                  </div>
                </div>

                {/* About description */}
                <Show when={pack.about}>
                  <div style={{ 'font-size': '12px', color: '#8892a0', 'line-height': '1.3' }}>
                    {pack.about}
                  </div>
                </Show>

                {/* Sounds Chips */}
                <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '6px', 'margin-top': '4px' }}>
                  <For each={pack.soundNames}>
                    {(sName) => (
                      <div
                        style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '4px',
                          background: '#191e28',
                          border: '1px solid #28303e',
                          'border-radius': '6px',
                          padding: '2px 6px',
                        }}
                      >
                        <span
                          style={{
                            'font-family': 'monospace',
                            'font-size': '12px',
                            color: 'var(--accent)',
                          }}
                        >
                          {sName}
                        </span>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: auditioning() === sName ? 'var(--accent)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            'font-size': '11px',
                            padding: '2px',
                          }}
                          title="Прослушать"
                          onClick={() => handleAudition(sName)}
                        >
                          ▶
                        </button>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#4fc3f7',
                            cursor: 'pointer',
                            'font-size': '11px',
                            padding: '2px',
                          }}
                          title="Вставить в код"
                          onClick={() => props.onInsertSound(sName)}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
