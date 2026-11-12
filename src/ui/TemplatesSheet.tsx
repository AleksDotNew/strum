import { createSignal, onMount, For, Show } from 'solid-js'
import { templateRepo, type TemplateBundle } from '../storage/templateRepo'
import type { TemplateRecord } from '../storage/db'

export interface TemplatesSheetProps {
  onApplyTemplate(template: TemplateRecord): void
  onClose(): void
}

export function TemplatesSheet(props: TemplatesSheetProps) {
  const [templates, setTemplates] = createSignal<TemplateRecord[]>([])
  const [loading, setLoading] = createSignal(true)
  const [importJson, setImportJson] = createSignal('')
  const [showImport, setShowImport] = createSignal(false)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const all = await templateRepo.getAll()
      setTemplates(all)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    loadTemplates()
  })

  const handleDelete = async (id: string) => {
    await templateRepo.delete(id)
    await loadTemplates()
  }

  const handleExport = async (id: string) => {
    const bundle = await templateRepo.packBundle(id)
    if (!bundle) return
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bundle.template.name.toLowerCase().replace(/\s+/g, '-')}.template.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson().trim()) as TemplateBundle
      await templateRepo.importBundle(parsed)
      setShowImport(false)
      setImportJson('')
      await loadTemplates()
    } catch (e: any) {
      alert(`Ошибка импорта шаблона: ${e?.message ?? e}`)
    }
  }

  return (
    <div class="tempo-sheet-backdrop" onClick={props.onClose}>
      <div
        class="tempo-sheet templates-sheet"
        style={{ 'max-height': '80vh', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="tempo-sheet-header">
          <span>Шаблоны проектов</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              aria-label="Import Template"
              style={{ color: 'var(--accent)', 'font-size': '13px', width: 'auto', padding: '0 8px' }}
              onClick={() => setShowImport(true)}
            >
              Импорт JSON
            </button>
            <button aria-label="Close Templates" onClick={props.onClose}>✕</button>
          </div>
        </div>

        <Show when={showImport()}>
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
            <div style={{ 'font-weight': '600', 'font-size': '14px' }}>Вставьте JSON шаблона</div>
            <textarea
              placeholder='{"schemaVersion": 1, ...}'
              value={importJson()}
              onInput={(e) => setImportJson(e.currentTarget.value)}
              rows={4}
              style={{
                padding: '6px 8px',
                background: '#1e2430',
                border: '1px solid #333d4e',
                color: '#fff',
                'border-radius': '4px',
                'font-family': 'monospace',
                'font-size': '12px',
              }}
            />
            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '8px' }}>
              <button
                style={{ padding: '6px 12px', background: '#2a313e', border: 'none', color: '#fff', 'border-radius': '4px' }}
                onClick={() => setShowImport(false)}
              >
                Отмена
              </button>
              <button
                style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#000', 'border-radius': '4px', 'font-weight': '600' }}
                onClick={handleImport}
              >
                Импортировать
              </button>
            </div>
          </div>
        </Show>

        <Show when={loading()}>
          <div style={{ padding: '16px 0', color: 'var(--muted)' }}>Загрузка шаблонов...</div>
        </Show>

        <Show when={!loading() && templates().length === 0}>
          <div style={{ padding: '16px 0', color: 'var(--muted)' }}>
            Нет сохранённых шаблонов. Сохраните текущий проект или стек скриптов как шаблон.
          </div>
        </Show>

        <div style={{ 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '8px', 'padding-bottom': '12px' }}>
          <For each={templates()}>
            {(tpl) => (
              <div
                class="template-card"
                style={{
                  padding: '12px',
                  background: '#1a1f28',
                  border: '1px solid #2a313e',
                  'border-radius': '8px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <span style={{ 'font-weight': '600', color: 'var(--fg)', 'font-size': '15px' }}>{tpl.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
                      title="Экспорт JSON"
                      onClick={() => handleExport(tpl.id)}
                    >
                      💾
                    </button>
                    <button
                      style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                      title="Удалить"
                      onClick={() => handleDelete(tpl.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div style={{ 'font-size': '12px', color: 'var(--muted)' }}>
                  Скриптов в стеке: {tpl.prebakeIds.length}
                </div>

                <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-top': '4px' }}>
                  <button
                    style={{
                      padding: '6px 14px',
                      background: '#2d3748',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-weight': '600',
                      'font-size': '13px',
                    }}
                    onClick={() => {
                      props.onApplyTemplate(tpl)
                      props.onClose()
                    }}
                  >
                    Создать проект из шаблона
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
