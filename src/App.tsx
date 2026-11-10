import { createSignal } from 'solid-js'
import { initEngine } from './engine/engine'

export default function App() {
  const [status, setStatus] = createSignal<'idle' | 'loading' | 'playing' | 'error'>('idle')

  const play = async () => {
    setStatus('loading')
    try {
      const engine = await initEngine()
      const r = await engine.evaluate('s("bd sd")')
      setStatus(r.ok ? 'playing' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main class="app">
      <button aria-label="Play" onClick={play}>
        ▶
      </button>
      <span data-testid="engine-status">{status()}</span>
    </main>
  )
}
