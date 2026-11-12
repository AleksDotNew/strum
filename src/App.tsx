import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import './styles/app.css'
import { TopBar } from './ui/TopBar'
import { HintLine } from './ui/HintLine'
import { SymbolBar } from './ui/SymbolBar'
import { BottomNav, type Tab } from './ui/BottomNav'
import { Editor, type EditorApi } from './editor/Editor'
import { cursorContext, type CursorCtx } from './editor/cursorContext'
import type { SymbolAction } from './ui/symbols'
import { initEngine } from './engine/engine'
import { installKeyboardInset } from './ui/keyboardInset'
import { bpmToCps } from './ui/tempo'
import { projectRepo } from './storage/projectRepo'
import { versionRepo } from './storage/versionRepo'
import type { ProjectRecord } from './storage/db'
import { encodeStrudelUrl, decodeStrudelUrl, exportJsFile } from './storage/shareUrl'
import { VersionHistorySheet } from './ui/VersionHistorySheet'
import { ProjectsScreen } from './ui/ProjectsScreen'

export default function App() {
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('idle')
  const [bpm, setBpm] = createSignal(120)
  const [showTempoSheet, setShowTempoSheet] = createSignal(false)
  const [showMenu, setShowMenu] = createSignal(false)
  const [showHistory, setShowHistory] = createSignal(false)
  const [showProjects, setShowProjects] = createSignal(false)
  const [projectId, setProjectId] = createSignal('')
  const [projectName, setProjectName] = createSignal('Мой джем')
  const [hint, setHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [isError, setIsError] = createSignal(false)
  const [currentTab, setCurrentTab] = createSignal<Tab>('code')
  const [code, setCode] = createSignal('s("bd sd")')
  const [cursorCtx, setCursorCtx] = createSignal<CursorCtx>('mini')
  let editorApi: EditorApi | undefined
  let unsubscribeHighlight: (() => void) | undefined
  let appRef: HTMLElement | undefined

  const saveSnapshotIfChanged = async (pId: string, currentCode: string) => {
    if (!pId) return
    try {
      await projectRepo.update(pId, { code: currentCode })
      const versions = await versionRepo.getForProject(pId)
      if (versions.length === 0 || versions[0].code.trim() !== currentCode.trim()) {
        await versionRepo.snapshot(pId, currentCode)
      }
    } catch {}
  }

  onMount(async () => {
    if (appRef) {
      const cleanup = installKeyboardInset(appRef)
      onCleanup(cleanup)
    }

    try {
      // Check for deep link in hash
      if (window.location.hash) {
        const decoded = decodeStrudelUrl(window.location.hash)
        if (decoded) {
          const imported = await projectRepo.create({
            name: 'Импортированный паттерн',
            code: decoded,
          })
          await versionRepo.snapshot(imported.id, decoded, 'Импорт из ссылки')
          setProjectId(imported.id)
          setProjectName(imported.name)
          setCode(decoded)
          editorApi?.setCode(decoded)
          setHint('Паттерн импортирован из ссылки')
          return
        }
      }

      const all = await projectRepo.getAll()
      if (all.length > 0) {
        setProjectId(all[0].id)
        setProjectName(all[0].name)
        setCode(all[0].code)
        editorApi?.setCode(all[0].code)
      } else {
        const created = await projectRepo.create({
          name: 'Мой первый джем',
          code: code(),
        })
        await versionRepo.snapshot(created.id, created.code, 'Начало')
        setProjectId(created.id)
        setProjectName(created.name)
      }
    } catch {}
  })

  onCleanup(() => {
    unsubscribeHighlight?.()
  })

  const updateCursor = (pos: number) => {
    const currentCode = editorApi ? editorApi.getCode() : code()
    setCursorCtx(cursorContext(currentCode, pos))
  }

  const togglePlay = async () => {
    if (playing()) {
      const engine = await initEngine()
      engine.stop()
      setPlaying(false)
      setStatus('stopped')
      setHint('Воспроизведение остановлено')
      editorApi?.markError(null)
    } else {
      setStatus('loading')
      setHint('Запуск аудиодвижка...')
      try {
        const engine = await initEngine()
        if (!unsubscribeHighlight) {
          unsubscribeHighlight = engine.onHighlight((haps, time) => {
            editorApi?.highlightHaps(time, haps)
          })
        }
        const currentCode = editorApi ? editorApi.getCode() : code()
        const res = await engine.evaluate(currentCode)
        if (res.ok) {
          setPlaying(true)
          setStatus('playing')
          setIsError(false)
          setHint('Воспроизведение: ' + currentCode)
          editorApi?.markError(null)
          if (res.meta?.miniLocations) {
            editorApi?.setMiniLocations(res.meta.miniLocations)
          }
          saveSnapshotIfChanged(projectId(), currentCode)
        } else {
          setStatus('error')
          setIsError(true)
          setHint(res.error.message)
          editorApi?.markError(res.error.line)
        }
      } catch (e: any) {
        setStatus('error')
        setIsError(true)
        setHint(String(e))
      }
    }
  }

  const handleEval = async () => {
    setStatus('evaluating')
    try {
      const engine = await initEngine()
      if (!unsubscribeHighlight) {
        unsubscribeHighlight = engine.onHighlight((haps, time) => {
          editorApi?.highlightHaps(time, haps)
        })
      }
      const currentCode = editorApi ? editorApi.getCode() : code()
      const res = await engine.evaluate(currentCode)
      if (res.ok) {
        setPlaying(true)
        setStatus('playing')
        setIsError(false)
        setHint('Код обновлён')
        editorApi?.markError(null)
        if (res.meta?.miniLocations) {
          editorApi?.setMiniLocations(res.meta.miniLocations)
        }
        saveSnapshotIfChanged(projectId(), currentCode)
      } else {
        setStatus('error')
        setIsError(true)
        setHint(res.error.message)
        editorApi?.markError(res.error.line)
      }
    } catch (e: any) {
      setStatus('error')
      setIsError(true)
      setHint(String(e))
    }
  }

  const handleSetBpm = async (newBpm: number) => {
    setBpm(newBpm)
    try {
      const engine = await initEngine()
      engine.setCps(bpmToCps(newBpm))
      setHint(`Темп: ${newBpm} BPM`)
    } catch {}
  }

  const handleHush = async () => {
    try {
      const engine = await initEngine()
      engine.stop()
      setPlaying(false)
      setStatus('idle')
      setHint('Тишина (hush)')
      editorApi?.markError(null)
    } catch {}
  }

  const handleSelectProject = (p: ProjectRecord) => {
    setProjectId(p.id)
    setProjectName(p.name)
    setCode(p.code)
    editorApi?.setCode(p.code)
    setHint(`Открыт: ${p.name}`)
    handleEval()
  }

  const handleRestoreVersion = (restoredCode: string) => {
    setCode(restoredCode)
    editorApi?.setCode(restoredCode)
    setHint('Версия восстановлена')
    handleEval()
  }

  const handleExport = () => {
    exportJsFile(projectName(), editorApi ? editorApi.getCode() : code())
    setHint('Файл .js сохранён')
  }

  const handleShare = async () => {
    const currentCode = editorApi ? editorApi.getCode() : code()
    const url = encodeStrudelUrl(currentCode)
    try {
      await navigator.clipboard.writeText(url)
      setHint('Ссылка strudel.cc скопирована в буфер!')
    } catch {
      setHint(url)
    }
  }

  const handleSymbolAction = (act: SymbolAction) => {
    if (!editorApi) return
    if (act.insert === '\b') {
      const pos = editorApi.cursor()
      if (pos > 0) {
        editorApi.view.dispatch({
          changes: { from: pos - 1, to: pos },
          selection: { anchor: pos - 1 },
          scrollIntoView: true,
        })
      }
    } else {
      editorApi.insert(act.insert, act.cursorOffset)
    }
    updateCursor(editorApi.cursor())
  }

  return (
    <main class="app" ref={appRef}>
      <TopBar
        playing={playing()}
        bpm={bpm()}
        status={status()}
        onTogglePlay={togglePlay}
        onEval={handleEval}
        onBpmClick={() => setShowTempoSheet(true)}
        onMenuClick={() => setShowMenu(true)}
        onHush={handleHush}
      />

      <section style={{ height: '100%', 'min-height': '0', overflow: 'hidden' }}>
        {currentTab() === 'code' && (
          <Editor
            initialCode={code()}
            onReady={(api) => {
              editorApi = api
              updateCursor(api.cursor())
            }}
            onChange={(newCode) => {
              setCode(newCode)
              if (editorApi) updateCursor(editorApi.cursor())
            }}
            onCursorMove={updateCursor}
          />
        )}
        {currentTab() === 'grid' && <div>Сетка (в разработке)</div>}
        {currentTab() === 'sounds' && <div>Браузер звуков (в разработке)</div>}
        {currentTab() === 'mix' && <div>Микшер (в разработке)</div>}
      </section>

      <HintLine message={hint()} isError={isError()} />
      <SymbolBar context={cursorCtx()} onAction={handleSymbolAction} />
      <BottomNav currentTab={currentTab()} onSelectTab={setCurrentTab} />

      <Show when={showTempoSheet()}>
        <div class="tempo-sheet-backdrop" onClick={() => setShowTempoSheet(false)}>
          <div class="tempo-sheet" onClick={(e) => e.stopPropagation()}>
            <div class="tempo-sheet-header">
              <span>Темп: {bpm()} BPM</span>
              <button aria-label="Close" onClick={() => setShowTempoSheet(false)}>✕</button>
            </div>
            <input
              type="range"
              class="tempo-slider"
              min="40"
              max="240"
              value={bpm()}
              onInput={(e) => handleSetBpm(Number(e.currentTarget.value))}
            />
            <div class="tempo-presets">
              <button onClick={() => handleSetBpm(60)}>60</button>
              <button onClick={() => handleSetBpm(90)}>90</button>
              <button onClick={() => handleSetBpm(120)}>120</button>
              <button onClick={() => handleSetBpm(140)}>140</button>
              <button onClick={() => handleSetBpm(175)}>175</button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showMenu()}>
        <div class="tempo-sheet-backdrop" onClick={() => setShowMenu(false)}>
          <div class="tempo-sheet" onClick={(e) => e.stopPropagation()}>
            <div class="tempo-sheet-header">
              <span>{projectName()}</span>
              <button aria-label="Close Menu" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <button
                class="menu-action-btn"
                onClick={() => {
                  setShowMenu(false)
                  setShowProjects(true)
                }}
              >
                📁 Проекты
              </button>
              <button
                class="menu-action-btn"
                onClick={() => {
                  setShowMenu(false)
                  setShowHistory(true)
                }}
              >
                🕒 История версий
              </button>
              <button
                class="menu-action-btn"
                onClick={() => {
                  setShowMenu(false)
                  handleExport()
                }}
              >
                💾 Экспорт в файл (.js)
              </button>
              <button
                class="menu-action-btn"
                onClick={() => {
                  setShowMenu(false)
                  handleShare()
                }}
              >
                🔗 Поделиться (strudel.cc)
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={showHistory()}>
        <VersionHistorySheet
          projectId={projectId()}
          currentCode={code()}
          onRestore={handleRestoreVersion}
          onClose={() => setShowHistory(false)}
        />
      </Show>

      <Show when={showProjects()}>
        <ProjectsScreen
          currentProjectId={projectId()}
          onSelectProject={handleSelectProject}
          onClose={() => setShowProjects(false)}
        />
      </Show>
    </main>
  )
}
