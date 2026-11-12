import { describe, it, expect } from 'vitest'
import { getFunction, searchFunctions, getAllFunctions } from '../../src/hints/functionCatalog'

describe('functionCatalog', () => {
  it('returns all known Strudel functions', () => {
    const all = getAllFunctions()
    expect(all.length).toBeGreaterThan(10)
    expect(all.some((f) => f.name === 's')).toBe(true)
    expect(all.some((f) => f.name === 'lpf')).toBe(true)
  })

  it('retrieves function by exact name', () => {
    const fn = getFunction('lpf')
    expect(fn).toBeDefined()
    expect(fn!.name).toBe('lpf')
    expect(fn!.signature).toContain('frequency')
    expect(fn!.examples.length).toBeGreaterThan(0)
  })

  it('searches functions by substring in name and description', () => {
    const matches = searchFunctions('filter')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((f) => f.name === 'lpf')).toBe(true)
  })
})
