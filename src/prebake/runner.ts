import type { PrebakeScript } from '../storage/db'

export interface PrebakeScriptResult {
  scriptId: string
  name: string
  executed: boolean
  skippedReason?: 'untrusted' | 'empty'
  error?: string
}

export interface PrebakeReport {
  results: PrebakeScriptResult[]
  hasErrors: boolean
  untrustedCount: number
}

export async function runPrebake(
  scripts: PrebakeScript[],
  evalFn: (code: string) => Promise<any>
): Promise<PrebakeReport> {
  const results: PrebakeScriptResult[] = []
  let hasErrors = false
  let untrustedCount = 0

  for (const script of scripts) {
    const trimmed = script.code?.trim()
    if (!trimmed) {
      results.push({
        scriptId: script.id,
        name: script.name,
        executed: false,
        skippedReason: 'empty',
      })
      continue
    }

    if (!script.trusted) {
      untrustedCount++
      results.push({
        scriptId: script.id,
        name: script.name,
        executed: false,
        skippedReason: 'untrusted',
      })
      continue
    }

    try {
      await evalFn(script.code)
      results.push({
        scriptId: script.id,
        name: script.name,
        executed: true,
      })
    } catch (e: any) {
      hasErrors = true
      results.push({
        scriptId: script.id,
        name: script.name,
        executed: true,
        error: e?.message ?? String(e),
      })
    }
  }

  return {
    results,
    hasErrors,
    untrustedCount,
  }
}
