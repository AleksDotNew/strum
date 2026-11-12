import { describe, expect, it } from 'vitest'
import { resolveCursorHint } from '../../src/hints/tokenInspector'

describe('tokenInspector', () => {
  it('returns function documentation for a known Strudel function under cursor', () => {
    const code = 's("bd sd").lpf(800)'
    // cursor on 'lpf' (index 12)
    const hint = resolveCursorHint(code, 12)
    expect(hint).not.toBeNull()
    expect(hint).toContain('lpf')
    expect(hint).toContain('low-pass')
  })

  it('returns sound sample documentation when cursor is inside mini-notation on a sample name', () => {
    const code = 's("bd sd hh")'
    // cursor on 'bd' (index 4)
    const hint = resolveCursorHint(code, 4)
    expect(hint).not.toBeNull()
    expect(hint).toContain('bd')
    expect(hint).toContain('Bass drum')
  })

  it('returns scale documentation when cursor is on a scale name inside .scale()', () => {
    const code = 'note("0 2 4").scale("dorian")'
    // cursor on 'dorian' (index 23)
    const hint = resolveCursorHint(code, 23)
    expect(hint).not.toBeNull()
    expect(hint).toContain('dorian')
    expect(hint).toContain('Dorian mode')
  })

  it('returns synth documentation when cursor is on a synth name', () => {
    const code = 's("sawtooth")'
    const hint = resolveCursorHint(code, 5)
    expect(hint).not.toBeNull()
    expect(hint).toContain('sawtooth')
    expect(hint).toContain('Sawtooth oscillator')
  })

  it('returns null on empty string or whitespace or unknown identifiers', () => {
    expect(resolveCursorHint('', 0)).toBeNull()
    expect(resolveCursorHint('s("bd")  ', 8)).toBeNull()
    expect(resolveCursorHint('const myUnknownVar = 1', 8)).toBeNull()
  })
})
