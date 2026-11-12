import { expect, test } from 'vitest'
import { computeInset } from '../../src/ui/keyboardInset'

test('no keyboard', () => {
  expect(computeInset(915, 915, 0)).toBe(0)
})

test('keyboard 320px', () => {
  expect(computeInset(915, 595, 0)).toBe(320)
})

test('ignores tiny diffs (url bar jitter)', () => {
  expect(computeInset(915, 900, 0)).toBe(0)
})
