import { describe, expect, it } from 'vitest'
import {
  parseNotesMini,
  gridToNotesMini,
  findNotePatternsInCode,
} from '../../src/code-model/pianoRollModel'

describe('pianoRollModel - melodic note patterns to interactive piano roll', () => {
  it('parses melodic note mini-string into piano roll matrix', () => {
    const mini = 'c3 ~ e3 g3'
    const res = parseNotesMini(mini, 4)
    expect(res.supported).toBe(true)
    if (res.supported) {
      expect(res.stepCount).toBe(4)
      expect(res.availableNotes).toContain('c3')
      expect(res.availableNotes).toContain('e3')
      expect(res.availableNotes).toContain('g3')

      // Check hit on step 0 for c3
      const c3Idx = res.availableNotes.indexOf('c3')
      expect(res.matrix[c3Idx][0]).toBe(true)
      expect(res.matrix[c3Idx][1]).toBe(false)
    }
  })

  it('converts piano roll matrix back to melodic mini-notation string', () => {
    const notes = ['c3', 'eb3', 'g3']
    const matrix = [
      [true, false, false, false],
      [false, true, false, false],
      [false, false, true, false],
    ]
    const mini = gridToNotesMini(notes, matrix, 4)
    expect(mini).toBe('c3 eb3 g3 ~')
  })

  it('finds note() and n() pattern string literals in code', () => {
    const code = 'note("c3 e3 g3 b3").s("sawtooth")'
    const patterns = findNotePatternsInCode(code)
    expect(patterns.length).toBe(1)
    expect(patterns[0].literal.value).toBe('c3 e3 g3 b3')
    expect(patterns[0].supported).toBe(true)
  })
})

