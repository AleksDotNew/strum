import { expect, test } from 'vitest'
import { bpmToCps, cpsToBpm } from '../../src/ui/tempo'

test('120 bpm in 4/4 = 0.5 cps', () => {
  expect(bpmToCps(120)).toBe(0.5)
})

test('roundtrip', () => {
  expect(cpsToBpm(bpmToCps(97))).toBeCloseTo(97)
})

test('custom beats per cycle', () => {
  expect(bpmToCps(120, 3)).toBeCloseTo(120 / 60 / 3)
})
