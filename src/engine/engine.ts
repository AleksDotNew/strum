import { repl, evalScope } from '@strudel/core'
import { transpiler } from '@strudel/transpiler'
import { getAudioContext, webaudioOutput, registerSynthSounds, samples } from '@strudel/webaudio'
import { Drawer } from '@strudel/draw'
import { toEngineError, type EngineError } from './errors'
import { runPrebake, type PrebakeReport } from '../prebake/runner'
import type { PrebakeScript } from '../storage/db'

export type { EngineError, PrebakeReport }
export type EvalResult = { ok: true; meta?: any } | { ok: false; error: EngineError }

export type HighlightCallback = (haps: any[], time: number) => void

export interface Engine {
  evaluate(code: string): Promise<EvalResult>
  stop(): void
  setCps(cps: number): void
  onHighlight(cb: HighlightCallback): () => void
  runPrebakeStack(prebakes: PrebakeScript[]): Promise<PrebakeReport>
  readonly started: boolean
}

let instance: Promise<Engine> | null = null

export function initEngine(): Promise<Engine> {
  return (instance ??= create())
}

async function create(): Promise<Engine> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  await evalScope(
    import('@strudel/core'),
    import('@strudel/mini'),
    import('@strudel/tonal'),
    import('@strudel/webaudio')
  )

  await registerSynthSounds()
  await samples('github:tidalcycles/dirt-samples')

  let lastError: unknown = null
  let lastMeta: any = null
  const r = repl({
    defaultOutput: webaudioOutput,
    getTime: () => getAudioContext().currentTime,
    transpiler,
    onEvalError: (e: unknown) => {
      lastError = e
    },
    afterEval: (options: any) => {
      lastMeta = options?.meta
    },
  })

  const highlightListeners = new Set<HighlightCallback>()
  const drawer = new Drawer((haps: any[], time: number) => {
    const currentFrame = haps.filter((hap: any) =>
      typeof hap.isActive === 'function' ? hap.isActive(time) : true
    )
    for (const listener of highlightListeners) {
      listener(currentFrame, time)
    }
  }, [0, 0])

  let started = false

  return {
    get started() {
      return started
    },
    async evaluate(code: string) {
      lastError = null
      lastMeta = null
      try {
        await r.evaluate(code)
      } catch (e) {
        lastError = e
      }
      if (lastError) {
        return { ok: false, error: toEngineError(lastError) }
      }
      started = true
      drawer.start(r.scheduler)
      drawer.invalidate(r.scheduler)
      return { ok: true, meta: lastMeta }
    },
    stop() {
      r.stop()
      drawer.stop()
      started = false
    },
    setCps(cps: number) {
      r.setCps(cps)
    },
    onHighlight(cb: HighlightCallback) {
      highlightListeners.add(cb)
      return () => {
        highlightListeners.delete(cb)
      }
    },
    async runPrebakeStack(prebakes: PrebakeScript[]) {
      return runPrebake(prebakes, async (code: string) => {
        await r.evaluate(code)
      })
    },
  }
}
