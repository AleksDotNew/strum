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

export default function App() {
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('idle')
  const [bpm, setBpm] = createSignal(120)
  const [showTempoSheet, setShowTempoSheet] = createSignal(false)
  const [hint, setHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [isError, setIsError] = createSignal(false)
  const [currentTab, setCurrentTab] = createSignal<Tab>('code')
  const [code, setCode] = createSignal('s("bd sd")')
  const [cursorCtx, setCursorCtx] = createSignal<CursorCtx>('mini')
  let editorApi: EditorApi | undefined
  let unsubscribeHighlight: (() => void) | undefined
  let appRef: HTMLElement | undefined

  onMount(() => {
    if (appRef) {
      const cleanup = installKeyboardInset(appRef)
      onCleanup(cleanup)
    }
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
        onMenuClick={() => {}}
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
    </main>
  )
}
