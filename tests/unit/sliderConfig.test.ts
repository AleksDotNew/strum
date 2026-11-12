import { describe, expect, it } from 'vitest'
import { getSliderConfigForLiteral } from '../../src/code-model/sliderConfig'
import type { CodeLiteral } from '../../src/code-model/acorn'

describe('sliderConfig', () => {
  it('deduces appropriate range for filter functions (lpf, hpf, lpq)', () => {
    const lpfLit: CodeLiteral = {
      value: 800,
      raw: '800',
      start: 0,
      end: 3,
      type: 'number',
      parentCall: 'lpf',
    }
    const config = getSliderConfigForLiteral(lpfLit)
    expect(config.min).toBe(20)
    expect(config.max).toBeGreaterThanOrEqual(8000)
    expect(config.step).toBe(10)
    expect(config.label).toBe('lpf')
  })

  it('deduces appropriate range for gain and room (0..1 or 0..2)', () => {
    const gainLit: CodeLiteral = {
      value: 0.8,
      raw: '0.8',
      start: 0,
      end: 3,
      type: 'number',
      parentCall: 'gain',
    }
    const config = getSliderConfigForLiteral(gainLit)
    expect(config.min).toBe(0)
    expect(config.max).toBe(2)
    expect(config.step).toBe(0.05)
    expect(config.label).toBe('gain')
  })

  it('falls back to safe generic range for unknown numeric literals', () => {
    const genericInt: CodeLiteral = {
      value: 42,
      raw: '42',
      start: 0,
      end: 2,
      type: 'number',
    }
    const config = getSliderConfigForLiteral(genericInt)
    expect(config.min).toBe(0)
    expect(config.max).toBeGreaterThanOrEqual(84)
    expect(config.step).toBe(1)
  })
})
