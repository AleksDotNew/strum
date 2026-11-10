import { createSignal } from 'solid-js'
import './styles/app.css'
import { TopBar } from './ui/TopBar'
import { HintLine } from './ui/HintLine'
import { SymbolBar } from './ui/SymbolBar'
import { BottomNav, type Tab } from './ui/BottomNav'
import { Editor, type EditorApi } from './editor/Editor'
import { initEngine } from './engine/engine'

export default function App() {
  const [playing, setPlaying] = createSignal(false)
  const [status, setStatus] = createSignal('idle')
  const [bpm, setBpm] = createSignal(120)
  const [hint, setHint] = createSignal('Готов к игре. Нажмите ▶ для старта.')
  const [isError, setIsError] = createSignal(false)
  const [currentTab, setCurrentTab] = createSignal<Tab>('code')
  const [code, setCode] = createSignal('s("bd sd")')
  let editorApi: EditorApi | undefined

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
        const currentCode = editorApi ? editorApi.getCode() : code()
        const res = await engine.evaluate(currentCode)
        if (res.ok) {
          setPlaying(true)
          setStatus('playing')
          setIsError(false)
          setHint('Воспроизведение: ' + currentCode)
          editorApi?.markError(null)
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
      const currentCode = editorApi ? editorApi.getCode() : code()
      const res = await engine.evaluate(currentCode)
      if (res.ok) {
        setPlaying(true)
        setStatus('playing')
        setIsError(false)
        setHint('Код обновлён')
        editorApi?.markError(null)
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
            }}
            onChange={setCode}
          />
        )}
        {currentTab() === 'grid' && <div>Сетка (в разработке)</div>}
        {currentTab() === 'sounds' && <div>Браузер звуков (в разработке)</div>}
        {currentTab() === 'mix' && <div>Микшер (в разработке)</div>}
      </section>

      <HintLine message={hint()} isError={isError()} />
      <SymbolBar onInsert={(sym) => editorApi?.insert(sym)} />
      <BottomNav currentTab={currentTab()} onSelectTab={setCurrentTab} />
    </main>
  )
}
