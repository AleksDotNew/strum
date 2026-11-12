import { findLiterals, type CodeLiteral } from './acorn'

export interface GridTrack {
  sound: string
  steps: boolean[]
}

export interface GridModel {
  stepCount: number
  tracks: GridTrack[]
}

export type MiniToGridResult =
  | ({ supported: true } & GridModel)
  | { supported: false; reason: string }

export interface GridPatternCandidate {
  literal: CodeLiteral
  supported: boolean
  reason?: string
  grid?: GridModel
}

const UNSUPPORTED_OPERATORS = /[<>{},?!@:]/

export function canRepresentAsGrid(mini: string): boolean {
  if (UNSUPPORTED_OPERATORS.test(mini)) {
    return false
  }

  // Check bracket nesting level > 1
  let depth = 0
  for (const ch of mini) {
    if (ch === '[') {
      depth++
      if (depth > 1) return false
    } else if (ch === ']') {
      depth--
      if (depth < 0) return false
    }
  }

  return depth === 0
}

interface ParsedToken {
  sound: string
  startFraction: number
  endFraction: number
}

function parseMiniTokens(mini: string): ParsedToken[] {
  const trimmed = mini.trim()
  if (!trimmed) return []

  // Split top-level by space, respecting [ ... ] groups
  const topItems: string[] = []
  let current = ''
  let inGroup = false

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '[') {
      inGroup = true
      current += ch
    } else if (ch === ']') {
      inGroup = false
      current += ch
    } else if (/\s/.test(ch) && !inGroup) {
      if (current.trim()) {
        topItems.push(current.trim())
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current.trim()) {
    topItems.push(current.trim())
  }

  if (topItems.length === 0) return []

  const totalBeats = topItems.length
  const tokens: ParsedToken[] = []

  for (let b = 0; b < totalBeats; b++) {
    const item = topItems[b]
    const beatStart = b / totalBeats
    const beatEnd = (b + 1) / totalBeats

    // Check if bracket group: [ a b c ]
    if (item.startsWith('[') && item.endsWith(']')) {
      const inner = item.slice(1, -1).trim()
      const subItems = inner.split(/\s+/).filter(Boolean)
      const subCount = subItems.length
      for (let s = 0; s < subCount; s++) {
        const sub = subItems[s]
        const sStart = beatStart + (s / subCount) * (beatEnd - beatStart)
        const sEnd = beatStart + ((s + 1) / subCount) * (beatEnd - beatStart)
        expandItem(sub, sStart, sEnd, tokens)
      }
    } else {
      expandItem(item, beatStart, beatEnd, tokens)
    }
  }

  return tokens
}

function expandItem(item: string, start: number, end: number, tokens: ParsedToken[]) {
  // Check repetition: e.g. bd*4
  if (item.includes('*')) {
    const [name, repStr] = item.split('*')
    const rep = parseInt(repStr, 10) || 1
    for (let r = 0; r < rep; r++) {
      const rStart = start + (r / rep) * (end - start)
      const rEnd = start + ((r + 1) / rep) * (end - start)
      if (name !== '~') {
        tokens.push({ sound: name, startFraction: rStart, endFraction: rEnd })
      }
    }
  } else if (item !== '~') {
    tokens.push({ sound: item, startFraction: start, endFraction: end })
  }
}

export function miniToGrid(mini: string, stepCount = 16): MiniToGridResult {
  if (!canRepresentAsGrid(mini)) {
    return {
      supported: false,
      reason: 'Сложный паттерн: редактирование доступно только в коде',
    }
  }

  const tokens = parseMiniTokens(mini)
  const soundSet = new Set<string>()
  for (const t of tokens) {
    if (t.sound && t.sound !== '~') {
      soundSet.add(t.sound)
    }
  }

  const sounds = Array.from(soundSet)
  if (sounds.length === 0) {
    return {
      supported: true,
      stepCount,
      tracks: [{ sound: 'bd', steps: new Array(stepCount).fill(false) }],
    }
  }

  const tracks: GridTrack[] = sounds.map((sound) => {
    const steps = new Array(stepCount).fill(false)
    for (const t of tokens) {
      if (t.sound === sound) {
        // Map fraction to step index
        const stepIdx = Math.floor(t.startFraction * stepCount)
        if (stepIdx >= 0 && stepIdx < stepCount) {
          steps[stepIdx] = true
        }
      }
    }
    return { sound, steps }
  })

  return {
    supported: true,
    stepCount,
    tracks,
  }
}

export function gridToMini(grid: GridModel): string {
  if (grid.tracks.length === 0) return '~'

  // If single track
  if (grid.tracks.length === 1) {
    const track = grid.tracks[0]
    const parts = track.steps.map((on) => (on ? track.sound : '~'))
    return parts.join(' ')
  }

  // If multiple tracks with different sounds at different steps:
  // For each step, collect sounds triggering at that step
  const stepSounds: string[] = []
  for (let s = 0; s < grid.stepCount; s++) {
    const active = grid.tracks.filter((t) => t.steps[s]).map((t) => t.sound)
    if (active.length === 0) {
      stepSounds.push('~')
    } else if (active.length === 1) {
      stepSounds.push(active[0])
    } else {
      stepSounds.push(`[${active.join(' ')}]`)
    }
  }

  return stepSounds.join(' ')
}

export function findGridPatternsInCode(code: string): GridPatternCandidate[] {
  const literals = findLiterals(code)
  const stringLiterals = literals.filter(
    (l) =>
      l.type === 'string' &&
      (l.parentCall === 's' || l.parentCall === 'note' || l.parentCall === 'n'),
  )

  return stringLiterals.map((lit) => {
    const val = typeof lit.value === 'string' ? lit.value : ''
    const gridRes = miniToGrid(val, 16)
    if (gridRes.supported) {
      return {
        literal: lit,
        supported: true,
        grid: { stepCount: gridRes.stepCount, tracks: gridRes.tracks },
      }
    }
    return {
      literal: lit,
      supported: false,
      reason: gridRes.reason,
    }
  })
}
