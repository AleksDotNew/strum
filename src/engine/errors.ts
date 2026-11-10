export type EngineError = { message: string; line: number | null }

export function toEngineError(e: unknown): EngineError {
  if (!(e instanceof Error)) return { message: String(e), line: null }
  const loc = (e as { loc?: { line?: number } }).loc
  if (typeof loc?.line === 'number') return { message: e.message, line: loc.line }
  const m = /\((\d+):\d+\)/.exec(e.message)
  return { message: e.message, line: m ? Number(m[1]) : null }
}

