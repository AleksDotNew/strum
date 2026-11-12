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
import { prebakeRepo, DEFAULT_PREBAKE_ID } from './storage/prebakeRepo'
import { templateRepo } from './storage/templateRepo'
import type { TemplateRecord, PrebakeScript } from './storage/db'
import { PrebakeSheet } from './ui/PrebakeSheet'
import { TemplatesSheet } from './ui/TemplatesSheet'
import { resolveCursorHint } from './hints/tokenInspector'
import { literalAt, replaceLiteral, type CodeLiteral } from './code-model/acorn'
import { NumberSliderSheet } from './ui/NumberSliderSheet'
import { StepGrid } from './ui/StepGrid'
import { SoundBrowser } from './ui/SoundBrowser'
import { MixerScreen } from './ui/MixerScreen'

export default function App() {
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('idle')
  const [bpm, setBpm] = createSignal(120)
  const [showTempoSheet, setShowTempoSheet] = createSignal(false)
  const [showMenu, setShowMenu] = createSignal(false)
  const [showHistory, setShowHistory] = createSignal(false)
  const [showProjects, setShowProjects] = createSignal(false)
  const [showPrebakes, setShowPrebakes] = createSignal(false)
  const [showTemplates, setShowTemplates] = createSignal(false)
  const [showNumberSlider, setShowNumberSlider] = createSignal(false)
  const [activeLiteral, setActiveLiteral] = createSignal<CodeLiteral | null>(null)
  const [projectId, setProjectId] = createSignal('')
  const [projectName, setProjectName] = createSignal('Мой джем')
  const [prebakeIds, setPrebakeIds] = createSignal<string[]>([DEFAULT_PREBAKE_ID])
  const [statusHint, setStatusHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [hint, setHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [isError, setIsError] = createSignal(false)
  const [currentTab, setCurrentTab] = createSignal<Tab>('code')
  const [code, setCode] = createSignal('s("bd sd")')
  const [cursorCtx, setCursorCtx] = createSignal<CursorCtx>('mini')
  let editorApi: EditorApi | undefined
  let unsubscribeHighlight: (() => void) | undefined
  let appRef: HTMLElement | undefined

  const runCurrentPrebakes = async (ids: string[]) => {
    try {
      const scripts: PrebakeScript[] = []
      for (const id of ids) {
        const s = await prebakeRepo.get(id)
        if (s) scripts.push(s)
      }
      const engine = await initEngine()
      const report = await engine.runPrebakeStack(scripts)
      if (report.hasErrors) {
        setHint('Предупреждение: ошибка в одном из prebake-скриптов')
      }
    } catch {}
  }

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

      await prebakeRepo.ensureBuiltinDefault()
      const all = await projectRepo.getAll()
      if (all.length > 0) {
        setProjectId(all[0].id)
        setProjectName(all[0].name)
        const pbs = all[0].prebakeIds?.length ? all[0].prebakeIds : [DEFAULT_PREBAKE_ID]
        setPrebakeIds(pbs)
        setCode(all[0].code)
        editorApi?.setCode(all[0].code)
        runCurrentPrebakes(pbs)
      } else {
        const created = await projectRepo.create({
          name: 'Мой первый джем',
          code: code(),
          prebakeIds: [DEFAULT_PREBAKE_ID],
        })
        await versionRepo.snapshot(created.id, created.code, 'Начало')
        setProjectId(created.id)
        setProjectName(created.name)
        setPrebakeIds([DEFAULT_PREBAKE_ID])
        runCurrentPrebakes([DEFAULT_PREBAKE_ID])
      }
    } catch {}
  })

  onCleanup(() => {
    unsubscribeHighlight?.()
  })

  const setAppHint = (msg: string, error = false) => {
    setIsError(error)
    if (!error) {
      setStatusHint(msg)
    }
    setHint(msg)
  }

  const updateCursor = (pos: number) => {
    const currentCode = editorApi ? editorApi.getCode() : code()
    setCursorCtx(cursorContext(currentCode, pos))

    const lit = literalAt(currentCode, pos)
    if (lit && lit.type === 'number') {
      setActiveLiteral(lit)
    } else if (!showNumberSlider()) {
      setActiveLiteral(null)
    }

    if (!isError()) {
      const tokenHint = resolveCursorHint(currentCode, pos)
      if (tokenHint) {
        setHint(tokenHint)
      } else {
        setHint(statusHint())
      }
    }
  }

  const handleSliderValueChange = async (newVal: number) => {
    const lit = activeLiteral()
    if (!lit) return
    const currentCode = editorApi ? editorApi.getCode() : code()
    const res = replaceLiteral(currentCode, lit, String(newVal))
    if (res.ok) {
      editorApi?.setCode(res.code)
      setCode(res.code)
      setActiveLiteral(res.updatedLiteral)
      if (playing()) {
        try {
          const engine = await initEngine()
          await engine.evaluate(res.code)
        } catch {}
      }
    }
  }

  const togglePlay = async () => {
    if (playing()) {
      const engine = await initEngine()
      engine.stop()
      setPlaying(false)
      setStatus('stopped')
      setAppHint('Воспроизведение остановлено')
      editorApi?.markError(null)
    } else {
      setStatus('loading')
      setAppHint('Запуск аудиодвижка...')
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
          setAppHint('Воспроизведение: ' + currentCode)
          editorApi?.markError(null)
          if (res.meta?.miniLocations) {
            editorApi?.setMiniLocations(res.meta.miniLocations)
          }
          saveSnapshotIfChanged(projectId(), currentCode)
        } else {
          setStatus('error')
          setAppHint(res.error.message, true)
          editorApi?.markError(res.error.line)
        }
      } catch (e: any) {
        setStatus('error')
        setAppHint(String(e), true)
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
        setAppHint('Код обновлён')
        editorApi?.markError(null)
        if (res.meta?.miniLocations) {
          editorApi?.setMiniLocations(res.meta.miniLocations)
        }
        saveSnapshotIfChanged(projectId(), currentCode)
      } else {
        setStatus('error')
        setAppHint(res.error.message, true)
        editorApi?.markError(res.error.line)
      }
    } catch (e: any) {
      setStatus('error')
      setAppHint(String(e), true)
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

  const handleSelectProject = async (p: ProjectRecord) => {
    setProjectId(p.id)
    setProjectName(p.name)
    const pbs = p.prebakeIds && p.prebakeIds.length > 0 ? p.prebakeIds : [DEFAULT_PREBAKE_ID]
    setPrebakeIds(pbs)
    setCode(p.code)
    editorApi?.setCode(p.code)
    setHint(`Открыт: ${p.name}`)
    await runCurrentPrebakes(pbs)
    handleEval()
  }

  const handleUpdatePrebakeIds = async (newIds: string[]) => {
    setPrebakeIds(newIds)
    if (projectId()) {
      await projectRepo.update(projectId(), { prebakeIds: newIds })
    }
    await runCurrentPrebakes(newIds)
    setHint('Стек скриптов обновлён')
  }

  const handleSaveAsTemplate = async () => {
    const name = prompt('Название нового шаблона:', projectName())
    if (!name) return
    await templateRepo.create({
      name,
      prebakeIds: prebakeIds(),
      starterCode: editorApi ? editorApi.getCode() : code(),
    })
    setHint(`Шаблон "${name}" сохранён`)
  }

  const handleApplyTemplate = async (tpl: TemplateRecord) => {
    const newProj = await projectRepo.create({
      name: `Проект (${tpl.name})`,
      code: tpl.starterCode || 's("bd sd")',
      prebakeIds: tpl.prebakeIds,
    })
    await versionRepo.snapshot(newProj.id, newProj.code, 'Из шаблона')
    await handleSelectProject(newProj)
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

  const handleInsertSoundFromBrowser = (soundName: string) => {
    if (editorApi) {
      const pos = editorApi.cursor()
      const currentCode = editorApi.getCode()
      const ctx = cursorContext(currentCode, pos)
      if (ctx === 'mini') {
        editorApi.insert(soundName)
      } else {
        editorApi.insert(`s("${soundName}")`)
      }
      setCode(editorApi.getCode())
    } else {
      setCode(`s("${soundName}")`)
    }
    setCurrentTab('code')
    setAppHint(`Звук "${soundName}" добавлен в код`)
  }

  const handleAuditionSound = async (soundName: string) => {
    try {
      const engine = await initEngine()
      await engine.evaluate(`s("${soundName}").fast(2).gain(0.8)`)
      setTimeout(() => {
        if (playing()) {
          engine.evaluate(code())
        } else {
          engine.stop()
        }
      }, 800)
    } catch {}
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
        {currentTab() === 'grid' && (
          <StepGrid
            code={code()}
            onUpdateCode={(newCode) => {
              setCode(newCode)
              editorApi?.setCode(newCode)
              if (playing()) {
                initEngine()
                  .then((engine) => engine.evaluate(newCode))
                  .catch(() => {})
              }
            }}
            onSwitchToCode={() => setCurrentTab('code')}
          />
        )}
        {currentTab() === 'sounds' && (
          <SoundBrowser
            onInsertSound={handleInsertSoundFromBrowser}
            onAudition={handleAuditionSound}
          />
        )}
        {currentTab() === 'mix' && (
          <MixerScreen
            code={code()}
            onUpdateCode={(newCode) => {
              setCode(newCode)
              editorApi?.setCode(newCode)
              if (playing()) {
                initEngine()
                  .then((engine) => engine.evaluate(newCode))
                  .catch(() => {})
              }
            }}
            onSwitchToCode={() => setCurrentTab('code')}
          />
        )}
      </section>

      <HintLine message={hint()} isError={isError()} />
      <SymbolBar
        context={cursorCtx()}
        activeLiteral={activeLiteral()}
        onOpenSlider={() => setShowNumberSlider(true)}
        onAction={handleSymbolAction}
      />
      <BottomNav currentTab={currentTab()} onSelectTab={setCurrentTab} />

      <Show when={showNumberSlider() && activeLiteral()}>
        <NumberSliderSheet
          literal={activeLiteral()!}
          onValueChange={handleSliderValueChange}
          onClose={() => setShowNumberSlider(false)}
        />
      </Show>

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
                  setShowPrebakes(true)
                }}
              >
                ⚙️ Стек Prebake
              </button>
              <button
                class="menu-action-btn"
                onClick={() => {
                  setShowMenu(false)
                  setShowTemplates(true)
                }}
              >
                📑 Шаблоны проектов
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

      <Show when={showPrebakes()}>
        <PrebakeSheet
          projectId={projectId()}
          currentPrebakeIds={prebakeIds()}
          onUpdatePrebakeIds={handleUpdatePrebakeIds}
          onSaveAsTemplate={handleSaveAsTemplate}
          onClose={() => setShowPrebakes(false)}
        />
      </Show>

      <Show when={showTemplates()}>
        <TemplatesSheet
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      </Show>
    </main>
  )
}
