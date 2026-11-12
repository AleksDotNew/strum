import { createSignal, onMount, For, Show } from 'solid-js'
import { projectRepo } from '../storage/projectRepo'
import { versionRepo } from '../storage/versionRepo'
import type { ProjectRecord } from '../storage/db'

export interface ProjectsScreenProps {
  currentProjectId: string
  onSelectProject(project: ProjectRecord): void
  onClose(): void
}

export function ProjectsScreen(props: ProjectsScreenProps) {
  const [projects, setProjects] = createSignal<ProjectRecord[]>([])
  const [loading, setLoading] = createSignal(true)
  const [editingId, setEditingId] = createSignal<string | null>(null)
  const [editingName, setEditingName] = createSignal('')

  const loadProjects = async () => {
    setLoading(true)
    try {
      const all = await projectRepo.getAll()
      setProjects(all)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    loadProjects()
  })

  const handleCreateNew = async () => {
    const num = projects().length + 1
    const created = await projectRepo.create({
      name: `Проект #${num}`,
      code: 's("bd sd")',
    })
    await versionRepo.snapshot(created.id, created.code, 'Начало')
    await loadProjects()
    props.onSelectProject(created)
  }

  const handleDelete = async (p: ProjectRecord) => {
    if (projects().length <= 1) {
      alert('Нельзя удалить единственный проект')
      return
    }
    const ok = confirm(`Удалить проект "${p.name}"?`)
    if (!ok) return
    await projectRepo.delete(p.id)
    await versionRepo.deleteForProject(p.id)
    await loadProjects()
    if (props.currentProjectId === p.id && projects().length > 0) {
      props.onSelectProject(projects()[0])
    }
  }

  const handleDuplicate = async (p: ProjectRecord) => {
    const duplicated = await projectRepo.create({
      name: `${p.name} (копия)`,
      code: p.code,
      prebakeIds: p.prebakeIds,
    })
    await versionRepo.snapshot(duplicated.id, duplicated.code, 'Копия')
    await loadProjects()
  }

  const startRename = (p: ProjectRecord) => {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  const saveRename = async (id: string) => {
    const name = editingName().trim()
    if (name) {
      await projectRepo.update(id, { name })
      await loadProjects()
    }
    setEditingId(null)
  }

  return (
    <div class="tempo-sheet-backdrop" onClick={props.onClose}>
      <div
        class="tempo-sheet"
        style={{ 'max-height': '80vh', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="tempo-sheet-header">
          <span>Проекты</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              aria-label="New Project"
              style={{ color: 'var(--accent)', 'font-size': '14px', width: 'auto', padding: '0 8px' }}
              onClick={handleCreateNew}
            >
              + Новый
            </button>
            <button aria-label="Close Projects" onClick={props.onClose}>✕</button>
          </div>
        </div>

        <Show when={loading()}>
          <div style={{ padding: '16px 0', color: 'var(--muted)' }}>Загрузка проектов...</div>
        </Show>

        <div style={{ 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '10px', 'padding-bottom': '16px' }}>
          <For each={projects()}>
            {(p) => {
              const isCurrent = p.id === props.currentProjectId
              const isEditing = editingId() === p.id
              const preview = p.code.split('\n')[0].slice(0, 36)
              return (
                <div
                  class="project-card"
                  style={{
                    padding: '12px',
                    background: isCurrent ? '#1a241f' : '#1b2028',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid #2a313e',
                    'border-radius': '8px',
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                    <Show
                      when={isEditing}
                      fallback={
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                          <span style={{ 'font-weight': '600', color: isCurrent ? 'var(--accent)' : 'var(--fg)' }}>
                            {p.name}
                          </span>
                          {isCurrent && <span style={{ 'font-size': '11px', color: 'var(--accent)' }}>(текущий)</span>}
                        </div>
                      }
                    >
                      <input
                        type="text"
                        value={editingName()}
                        onInput={(e) => setEditingName(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(p.id)}
                        style={{
                          background: '#12151b',
                          color: 'var(--fg)',
                          border: '1px solid var(--accent)',
                          'border-radius': '4px',
                          padding: '4px 8px',
                        }}
                      />
                    </Show>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Show
                        when={isEditing}
                        fallback={
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px' }}
                            onClick={() => startRename(p)}
                          >
                            ✎
                          </button>
                        }
                      >
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px 8px' }}
                          onClick={() => saveRename(p.id)}
                        >
                          ✓
                        </button>
                      </Show>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => handleDuplicate(p)}
                        title="Дублировать"
                      >
                        ⎘
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => handleDelete(p)}
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={{ 'font-family': 'monospace', 'font-size': '12px', color: 'var(--muted)' }}>
                    {preview || 'Пустой проект'}
                  </div>

                  <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-top': '4px' }}>
                    <button
                      style={{
                        'min-height': '36px',
                        padding: '0 16px',
                        background: isCurrent ? '#2a313e' : '#2b3443',
                        color: isCurrent ? 'var(--muted)' : 'var(--fg)',
                        border: 'none',
                        'border-radius': '6px',
                        cursor: isCurrent ? 'default' : 'pointer',
                        'font-weight': '500',
                      }}
                      disabled={isCurrent}
                      onClick={() => {
                        props.onSelectProject(p)
                        props.onClose()
                      }}
                    >
                      {isCurrent ? 'Открыт' : 'Открыть'}
                    </button>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}
