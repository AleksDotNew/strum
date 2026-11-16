import { createSignal, createEffect, onMount, For, Show } from 'solid-js'
import {
  listSnippets,
  saveSnippet,
  deleteSnippet,
  getCategories,
} from '../storage/snippetRepo'
import type { SnippetRecord } from '../storage/db'

export function filterSnippets(
  snippets: SnippetRecord[],
  category: string,
  search: string
): SnippetRecord[] {
  const q = search.trim().toLowerCase()
  return snippets.filter((s) => {
    const matchCat =
      !category ||
      category === 'All' ||
      (category === 'Custom'
        ? !s.isBuiltin || s.category === 'Custom'
        : s.category.toLowerCase() === category.toLowerCase())
    if (!matchCat) return false

    if (!q) return true
    const nameMatch = s.name.toLowerCase().includes(q)
    const codeMatch = s.code.toLowerCase().includes(q)
    const tagMatch = s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false
    return nameMatch || codeMatch || tagMatch
  })
}

export function validateSnippetInput(
  name: string,
  code: string
): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'Введите название сниппета' }
  }
  if (!code.trim()) {
    return { valid: false, error: 'Код сниппета не может быть пустым' }
  }
  return { valid: true }
}

export interface SnippetsSheetProps {
  open: boolean
  onClose: () => void
  onInsert: (code: string) => void
  selectedCode?: string
}

export function SnippetsSheet(props: SnippetsSheetProps) {
  const [snippets, setSnippets] = createSignal<SnippetRecord[]>([])
  const [loading, setLoading] = createSignal(true)
  const [selectedCategory, setSelectedCategory] = createSignal('All')
  const [searchQuery, setSearchQuery] = createSignal('')

  // Save selection form state
  const [showSaveForm, setShowSaveForm] = createSignal(false)
  const [saveName, setSaveName] = createSignal('')
  const [saveCategory, setSaveCategory] = createSignal('Custom')
  const [saveCode, setSaveCode] = createSignal('')
  const [saveTags, setSaveTags] = createSignal('')
  const [saveError, setSaveError] = createSignal<string | null>(null)

  const categories = getCategories()

  const loadAll = async () => {
    setLoading(true)
    try {
      const all = await listSnippets()
      setSnippets(all)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    loadAll()
  })

  createEffect(() => {
    if (props.open) {
      loadAll()
      if (props.selectedCode && props.selectedCode.trim()) {
        setSaveCode(props.selectedCode.trim())
      }
    }
  })

  const visibleSnippets = () =>
    filterSnippets(snippets(), selectedCategory(), searchQuery())

  const handleSave = async (e?: Event) => {
    e?.preventDefault()
    setSaveError(null)

    const codeToSave = saveCode().trim() || props.selectedCode?.trim() || ''
    const validation = validateSnippetInput(saveName(), codeToSave)
    if (!validation.valid) {
      setSaveError(validation.error || 'Ошибка валидации')
      return
    }

    const tagsArray = saveTags()
      .split(/[, ]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean)

    try {
      await saveSnippet({
        name: saveName().trim(),
        category: saveCategory() || 'Custom',
        code: codeToSave,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      })

      // Reset form
      setSaveName('')
      setSaveTags('')
      setSaveCode('')
      setShowSaveForm(false)
      await loadAll()
    } catch (err: any) {
      setSaveError(err?.message || 'Не удалось сохранить сниппет')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSnippet(id)
      await loadAll()
    } catch (err) {
      console.warn('Failed to delete snippet:', err)
    }
  }

  const handleInsert = (code: string) => {
    props.onInsert(code)
    props.onClose()
  }

  return (
    <Show when={props.open}>
      <div class="tempo-sheet-backdrop" onClick={props.onClose}>
        <div
          class="tempo-sheet snippets-sheet"
          onClick={(e) => e.stopPropagation()}
          style={{
            'max-height': '85vh',
            display: 'flex',
            'flex-direction': 'column',
            gap: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div class="tempo-sheet-header">
            <span>✂️ Библиотека сниппетов</span>
            <button
              aria-label="Close Snippets"
              style={{
                'min-width': '48px',
                'min-height': '48px',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
              }}
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              'overflow-x': 'auto',
              'padding-bottom': '4px',
              'flex-shrink': '0',
            }}
          >
            <For each={categories}>
              {(cat) => (
                <button
                  style={{
                    'min-height': '48px',
                    'min-width': '48px',
                    padding: '0 14px',
                    background:
                      selectedCategory() === cat ? 'var(--accent)' : '#191d24',
                    color: selectedCategory() === cat ? '#0e0f12' : 'var(--fg)',
                    border: '1px solid #2a313e',
                    'border-radius': '24px',
                    'font-size': '13px',
                    'font-weight': selectedCategory() === cat ? '700' : '500',
                    cursor: 'pointer',
                    'white-space': 'nowrap',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              )}
            </For>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', gap: '8px', 'flex-shrink': '0' }}>
            <input
              type="text"
              placeholder="🔍 Поиск по названию, тегам или коду..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              style={{
                flex: 1,
                'min-height': '48px',
                padding: '0 12px',
                background: '#13161c',
                border: '1px solid #2a313e',
                'border-radius': '8px',
                color: 'var(--fg)',
                'font-size': '14px',
                'box-sizing': 'border-box',
              }}
            />
            <Show when={searchQuery().length > 0}>
              <button
                style={{
                  'min-height': '48px',
                  'min-width': '48px',
                  background: '#232834',
                  color: 'var(--fg)',
                  border: 'none',
                  'border-radius': '8px',
                  cursor: 'pointer',
                  'font-size': '14px',
                }}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            </Show>
          </div>

          {/* Save Selection Button & Form Toggle */}
          <div style={{ 'flex-shrink': '0' }}>
            <button
              style={{
                width: '100%',
                'min-height': '48px',
                background: showSaveForm() ? '#2b3442' : '#191d24',
                border: '1px dashed var(--accent)',
                color: 'var(--accent)',
                'border-radius': '8px',
                'font-size': '14px',
                'font-weight': '600',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                gap: '8px',
              }}
              onClick={() => setShowSaveForm(!showSaveForm())}
            >
              <span>💾</span>
              <span>
                {showSaveForm()
                  ? 'Скрыть форму сохранения'
                  : 'Сохранить фрагмент как сниппет'}
              </span>
            </button>

            <Show when={showSaveForm()}>
              <div
                style={{
                  'margin-top': '8px',
                  padding: '12px',
                  background: '#13161c',
                  border: '1px solid #2a313e',
                  'border-radius': '8px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '8px',
                }}
              >
                <div style={{ 'font-size': '14px', 'font-weight': '600' }}>
                  Новый сниппет
                </div>
                <input
                  type="text"
                  placeholder="Название (например, Trap Hihats)"
                  value={saveName()}
                  onInput={(e) => setSaveName(e.currentTarget.value)}
                  style={{
                    'min-height': '48px',
                    padding: '0 12px',
                    background: '#191d24',
                    border: '1px solid #2a313e',
                    'border-radius': '6px',
                    color: 'var(--fg)',
                    'font-size': '14px',
                  }}
                />
                <select
                  value={saveCategory()}
                  onChange={(e) => setSaveCategory(e.currentTarget.value)}
                  style={{
                    'min-height': '48px',
                    padding: '0 12px',
                    background: '#191d24',
                    border: '1px solid #2a313e',
                    'border-radius': '6px',
                    color: 'var(--fg)',
                    'font-size': '14px',
                  }}
                >
                  <option value="Beats">Beats</option>
                  <option value="Bass">Bass</option>
                  <option value="Melodies">Melodies</option>
                  <option value="FX">FX</option>
                  <option value="Custom">Custom</option>
                </select>
                <textarea
                  placeholder="Код сниппета..."
                  value={saveCode()}
                  onInput={(e) => setSaveCode(e.currentTarget.value)}
                  rows={3}
                  style={{
                    padding: '8px 12px',
                    background: '#191d24',
                    border: '1px solid #2a313e',
                    'border-radius': '6px',
                    color: 'var(--fg)',
                    'font-family': 'monospace',
                    'font-size': '13px',
                    resize: 'vertical',
                  }}
                />
                <input
                  type="text"
                  placeholder="Теги через запятую (например: trap, drums, hihat)"
                  value={saveTags()}
                  onInput={(e) => setSaveTags(e.currentTarget.value)}
                  style={{
                    'min-height': '48px',
                    padding: '0 12px',
                    background: '#191d24',
                    border: '1px solid #2a313e',
                    'border-radius': '6px',
                    color: 'var(--fg)',
                    'font-size': '14px',
                  }}
                />
                <Show when={saveError()}>
                  <div style={{ color: '#ff6b6b', 'font-size': '13px' }}>
                    {saveError()}
                  </div>
                </Show>
                <button
                  style={{
                    'min-height': '48px',
                    background: 'var(--accent)',
                    color: '#0e0f12',
                    border: 'none',
                    'border-radius': '6px',
                    'font-size': '14px',
                    'font-weight': '700',
                    cursor: 'pointer',
                  }}
                  onClick={handleSave}
                >
                  Сохранить сниппет
                </button>
              </div>
            </Show>
          </div>

          {/* Snippet List */}
          <div
            style={{
              flex: 1,
              'overflow-y': 'auto',
              display: 'flex',
              'flex-direction': 'column',
              gap: '10px',
              'padding-right': '2px',
            }}
          >
            <Show
              when={!loading()}
              fallback={
                <div style={{ padding: '20px', 'text-align': 'center', color: 'var(--muted)' }}>
                  Загрузка сниппетов...
                </div>
              }
            >
              <Show
                when={visibleSnippets().length > 0}
                fallback={
                  <div style={{ padding: '30px 10px', 'text-align': 'center', color: 'var(--muted)' }}>
                    Ничего не найдено в этой категории
                  </div>
                }
              >
                <For each={visibleSnippets()}>
                  {(snippet) => (
                    <div
                      style={{
                        background: '#13161c',
                        border: '1px solid #2a313e',
                        'border-radius': '8px',
                        padding: '12px',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Snippet Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', flex: 1 }}>
                          <span style={{ 'font-weight': '700', 'font-size': '14px', color: 'var(--fg)' }}>
                            {snippet.name}
                          </span>
                          <span
                            style={{
                              'font-size': '11px',
                              padding: '2px 8px',
                              background: '#232834',
                              color: 'var(--accent)',
                              'border-radius': '12px',
                              'font-weight': '600',
                            }}
                          >
                            {snippet.category}
                          </span>
                        </div>
                        <Show when={!snippet.isBuiltin}>
                          <button
                            aria-label={`Удалить ${snippet.name}`}
                            style={{
                              'min-height': '48px',
                              'min-width': '48px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ff6b6b',
                              'font-size': '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              'align-items': 'center',
                              'justify-content': 'center',
                            }}
                            onClick={() => handleDelete(snippet.id)}
                          >
                            🗑️
                          </button>
                        </Show>
                      </div>

                      {/* Code Block Preview */}
                      <pre
                        style={{
                          background: '#0a0c10',
                          color: '#7cf0b0',
                          padding: '8px 10px',
                          'border-radius': '6px',
                          'font-family': 'monospace',
                          'font-size': '12px',
                          'line-height': '1.4',
                          'overflow-x': 'auto',
                          'white-space': 'pre-wrap',
                          'word-break': 'break-all',
                          margin: 0,
                          border: '1px solid #1a202c',
                        }}
                      >
                        {snippet.code}
                      </pre>

                      {/* Tags */}
                      <Show when={snippet.tags && snippet.tags.length > 0}>
                        <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                          <For each={snippet.tags}>
                            {(tag) => (
                              <span
                                style={{
                                  'font-size': '11px',
                                  color: 'var(--muted)',
                                }}
                              >
                                #{tag}
                              </span>
                            )}
                          </For>
                        </div>
                      </Show>

                      {/* 1-Tap Insert Button */}
                      <button
                        style={{
                          width: '100%',
                          'min-height': '48px',
                          background: 'var(--accent)',
                          color: '#0e0f12',
                          border: 'none',
                          'border-radius': '6px',
                          'font-weight': '700',
                          'font-size': '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          gap: '6px',
                        }}
                        onClick={() => handleInsert(snippet.code)}
                      >
                        <span>↵</span>
                        <span>Вставить в код</span>
                      </button>
                    </div>
                  )}
                </For>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  )
}
