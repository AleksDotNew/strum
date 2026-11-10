import { repl, evalScope } from '@strudel/core'
import { transpiler } from '@strudel/transpiler'
import { getAudioContext, webaudioOutput, registerSynthSounds, samples } from '@strudel/webaudio'
import { toEngineError, type EngineError } from './errors'

export type { EngineError }
export type EvalResult = { ok: true } | { ok: false; error: EngineError }

export interface Engine {
  evaluate(code: string): Promise<EvalResult>
  stop(): void
  setCps(cps: number): void
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
  // Built-in default sample pack
  await samples('github:tidalcycles/dirt-samples')

  let lastError: unknown = null
  const r = repl({
    defaultOutput: webaudioOutput,
    getTime: () => getAudioContext().currentTime,
    transpiler,
    onEvalError: (e: unknown) => {
      lastError = e
    },
  })

  let started = false

  return {
    get started() {
      return started
    },
    async evaluate(code: string) {
      lastError = null
      try {
        await r.evaluate(code)
      } catch (e) {
        lastError = e
      }
      if (lastError) {
        return { ok: false, error: toEngineError(lastError) }
      }
      started = true
      return { ok: true }
    },
    stop() {
      r.stop()
      started = false
    },
    setCps(cps: number) {
      r.setCps(cps)
    },
  }
}

