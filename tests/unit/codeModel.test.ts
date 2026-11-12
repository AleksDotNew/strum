import { describe, expect, it } from 'vitest'
import {
  findLiterals,
  literalAt,
  replaceLiteral,
  type CodeLiteral,
} from '../../src/code-model/acorn'

describe('codeModel - acorn AST literal extraction and surgery', () => {
  it('finds numeric literals and identifies their enclosing method call', () => {
    const code = 's("bd").lpf(800).gain(0.7)'
    const literals = findLiterals(code)

    expect(literals.length).toBeGreaterThanOrEqual(2)
    const numLiterals = literals.filter((l) => l.type === 'number')

    const lpfLit = numLiterals.find((l) => l.parentCall === 'lpf')
    expect(lpfLit).toBeDefined()
    expect(lpfLit?.value).toBe(800)
    expect(code.slice(lpfLit!.start, lpfLit!.end)).toBe('800')

    const gainLit = numLiterals.find((l) => l.parentCall === 'gain')
    expect(gainLit).toBeDefined()
    expect(gainLit?.value).toBe(0.7)
    expect(code.slice(gainLit!.start, gainLit!.end)).toBe('0.7')
  })

  it('locates literal at cursor position (literalAt)', () => {
    const code = 's("bd").lpf(800).gain(0.7)'

    // Cursor inside 800 (indices 11..14)
    const lit = literalAt(code, 12)
    expect(lit).not.toBeNull()
    expect(lit?.value).toBe(800)
    expect(lit?.parentCall).toBe('lpf')

    // Cursor on 'lpf' identifier (pos 8) -> not a literal
    expect(literalAt(code, 8)).toBeNull()

    // Cursor on dot (pos 7) -> null
    expect(literalAt(code, 7)).toBeNull()
  })

  it('surgically replaces literal without modifying any surrounding code (golden invariant)', () => {
    const original = '/* comment */\n  s("bd").lpf(800).gain(0.7); // end\n'
    const index800 = original.indexOf('800')
    const lit = literalAt(original, index800 + 1) // inside 800
    expect(lit).not.toBeNull()

    const result = replaceLiteral(original, lit!, '1250')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.code).toBe('/* comment */\n  s("bd").lpf(1250).gain(0.7); // end\n')
      expect(result.updatedLiteral.value).toBe(1250)
      expect(result.updatedLiteral.start).toBe(lit!.start)
      expect(result.updatedLiteral.end).toBe(lit!.start + '1250'.length)
    }
  })

  it('rejects replacement that introduces invalid JavaScript syntax', () => {
    const code = 's("bd").lpf(800)'
    const lit = literalAt(code, 12)
    expect(lit).not.toBeNull()

    const result = replaceLiteral(code, lit!, '800..bad+')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeDefined()
    }
  })

  it('handles multiple replacements sequentially without drifting AST positions', () => {
    let code = 's("bd").lpf(800).gain(0.7)'
    const lpfLit = literalAt(code, code.indexOf('800') + 1)
    const res1 = replaceLiteral(code, lpfLit!, '1500')
    expect(res1.ok).toBe(true)
    code = res1.ok ? res1.code : code
    expect(code).toBe('s("bd").lpf(1500).gain(0.7)')

    const gainLit = literalAt(code, code.indexOf('0.7') + 1)
    const res2 = replaceLiteral(code, gainLit!, '0.35')
    expect(res2.ok).toBe(true)
    code = res2.ok ? res2.code : code
    expect(code).toBe('s("bd").lpf(1500).gain(0.35)')
  })

  it('allows replacing string literals cleanly', () => {
    const code = 's("bd").bank("RolandTR808")'
    const lit = literalAt(code, code.indexOf('bd') + 1)
    expect(lit?.type).toBe('string')

    const res = replaceLiteral(code, lit!, '"808bd"')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.code).toBe('s("808bd").bank("RolandTR808")')
    }
  })
})
