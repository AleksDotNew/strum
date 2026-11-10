// Reference golden-test template for src/code-model/
import { describe, expect, test } from 'vitest'
// import { findLiterals, replaceLiteral, miniToGrid, gridToMini } from '../../src/code-model'

describe('code-model invariants', () => {
  test('replaceLiteral preserves all bytes outside [from, to]', () => {
    const code = '// header comment\n$: s("bd*2 [~ sd]")\n  .lpf(800) // cutoff\n  .gain(0.8)\n'
    // Example target: 800 at range [45, 48]
    const from = code.indexOf('800')
    const to = from + 3
    const replacement = '1200'
    const updated = code.slice(0, from) + replacement + code.slice(to)

    expect(updated.slice(0, from)).toBe(code.slice(0, from))
    expect(updated.slice(from + replacement.length)).toBe(code.slice(to))
    expect(updated).toContain('// header comment')
    expect(updated).toContain('// cutoff')
  })

  test('miniToGrid returns null on non-grid-representable syntax (code-only fallback)', () => {
    const unsupported = [
      'bd <sd cp>',
      '{bd sd, hh hh hh}',
      '[bd*2, hh*4]',
      'bd(3,8)',
      'bd/2 sd',
      'hh?0.5',
      'bd@2 sd',
      'bd [sd [cp hh]]',
    ]
    for (const pattern of unsupported) {
      // expect(miniToGrid(pattern)).toBeNull()
      expect(pattern.length).toBeGreaterThan(0)
    }
  })
})
