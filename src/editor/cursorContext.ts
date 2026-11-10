export type CursorCtx = 'mini' | 'js'

export function cursorContext(code: string, pos: number): CursorCtx {
  let q: '"' | '`' | "'" | null = null
  let lineComment = false
  let blockComment = false

  for (let i = 0; i < pos; i++) {
    const ch = code[i]
    const nx = code[i + 1]

    if (lineComment) {
      if (ch === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (ch === '*' && nx === '/') {
        blockComment = false
        i++
      }
      continue
    }
    if (q) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === q) q = null
      continue
    }
    if (ch === '/' && nx === '/') {
      lineComment = true
      i++
      continue
    }
    if (ch === '/' && nx === '*') {
      blockComment = true
      i++
      continue
    }
    if (ch === '"' || ch === '`' || ch === "'") {
      q = ch
    }
  }

  return q === '"' || q === '`' ? 'mini' : 'js'
}
