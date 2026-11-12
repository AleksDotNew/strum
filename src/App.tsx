import { createSignal, onCleanup } from 'solid-js'
import './styles/app.css'
import { TopBar } from './ui/TopBar'
import { HintLine } from './ui/HintLine'
import { SymbolBar } from './ui/SymbolBar'
import { BottomNav, type Tab } from './ui/BottomNav'
import { Editor, type EditorApi } from './editor/Editor'
import { cursorContext, type CursorCtx } from './editor/cursorContext'
import type { SymbolAction } from './ui/symbols'
import { initEngine } from './engine/engine'

export default function App() {
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('idle')
  const [bpm, setBpm] = createSignal(120)
  const [hint, setHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [isError, setIsError] = createSignal(false)
  const [currentTab, setCurrentTab] = createSignal<Tab>('code')
  const [code, setCode] = createSignal('s("bd sd")')
  const [cursorCtx, setCursorCtx] = createSignal<CursorCtx>('mini')
  let editorApi: EditorApi | undefined
  let unsubscribeHighlight: (() => void) | undefined

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
    <main class="app">
      <TopBar
        playing={playing()}
        bpm={bpm()}
        status={status()}
        onTogglePlay={togglePlay}
        onEval={handleEval}
        onBpmClick={() => {}}
        onMenuClick={() => {}}
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
    </main>
  )
}
