import { canRepresentAsGrid, miniToGrid } from './miniGrid'
import { findLiterals, type CodeLiteral } from './acorn'

export const DEFAULT_PIANO_NOTES = [
  'c4',
  'b3',
  'a#3',
  'a3',
  'g#3',
  'g3',
  'f#3',
  'f3',
  'e3',
  'd#3',
  'd3',
  'c3',
]

export interface PianoRollModel {
  stepCount: number
  availableNotes: string[]
  matrix: boolean[][] // [noteIndex][stepIndex]
}

export type ParseNotesMiniResult =
  | ({ supported: true } & PianoRollModel)
  | { supported: false; reason: string }

export interface NotePatternCandidate {
  literal: CodeLiteral
  supported: boolean
  reason?: string
  model?: PianoRollModel
}

export function parseNotesMini(mini: string, stepCount = 16): ParseNotesMiniResult {
  const gridRes = miniToGrid(mini, stepCount)
  if (!gridRes.supported) {
    return {
      supported: false,
      reason: gridRes.reason,
    }
  }

  // Combine discovered notes from pattern with default octave notes
  const discovered = gridRes.tracks.map((t) => t.sound)
  const noteSet = new Set<string>()

  // Add discovered notes first
  for (const n of discovered) {
    if (n && n !== '~') noteSet.add(n.toLowerCase())
  }
  // Add standard piano notes
  for (const n of DEFAULT_PIANO_NOTES) {
    noteSet.add(n.toLowerCase())
  }

  const availableNotes = Array.from(noteSet)
  const matrix: boolean[][] = availableNotes.map((note) => {
    const track = gridRes.tracks.find((t) => t.sound.toLowerCase() === note)
    return track ? [...track.steps] : new Array(stepCount).fill(false)
  })

  return {
    supported: true,
    stepCount,
    availableNotes,
    matrix,
  }
}

export function gridToNotesMini(notes: string[], matrix: boolean[][], stepCount: number): string {
  if (notes.length === 0) return '~'

  const stepTokens: string[] = []
  for (let s = 0; s < stepCount; s++) {
    const active: string[] = []
    for (let n = 0; n < notes.length; n++) {
      if (matrix[n][s]) {
        active.push(notes[n])
      }
    }
    if (active.length === 0) {
      stepTokens.push('~')
    } else if (active.length === 1) {
      stepTokens.push(active[0])
    } else {
      stepTokens.push(`[${active.join(' ')}]`)
    }
  }

  return stepTokens.join(' ')
}

export function findNotePatternsInCode(code: string): NotePatternCandidate[] {
  const literals = findLiterals(code)
  const noteLiterals = literals.filter(
    (l) =>
      l.type === 'string' &&
      (l.parentCall === 'note' || l.parentCall === 'n'),
  )

  return noteLiterals.map((lit) => {
    const val = typeof lit.value === 'string' ? lit.value : ''
    const parsed = parseNotesMini(val, 16)
    if (parsed.supported) {
      return {
        literal: lit,
        supported: true,
        model: {
          stepCount: parsed.stepCount,
          availableNotes: parsed.availableNotes,
          matrix: parsed.matrix,
        },
      }
    }
    return {
      literal: lit,
      supported: false,
      reason: parsed.reason,
    }
  })
}
