import { describe, expect, it } from 'vitest'
import {
  getAllSounds,
  getSynths,
  isKnownSound,
  searchSounds,
} from '../../src/hints/soundCatalog'

describe('soundCatalog', () => {
  it('returns a comprehensive list of default Dirt samples and synths', () => {
    const all = getAllSounds()
    expect(all.length).toBeGreaterThanOrEqual(25)

    const names = all.map((s) => s.name)
    expect(names).toContain('bd')
    expect(names).toContain('sd')
    expect(names).toContain('hh')
    expect(names).toContain('cp')
    expect(names).toContain('sawtooth')
    expect(names).toContain('sine')
  })

  it('filters synths correctly', () => {
    const synths = getSynths()
    expect(synths.length).toBeGreaterThanOrEqual(5)
    for (const s of synths) {
      expect(s.isSynth).toBe(true)
      expect(s.category).toBe('synth')
    }
    const names = synths.map((s) => s.name)
    expect(names).toContain('sawtooth')
    expect(names).toContain('triangle')
  })

  it('checks if a sound is known', () => {
    expect(isKnownSound('bd')).toBe(true)
    expect(isKnownSound('sawtooth')).toBe(true)
    expect(isKnownSound('non_existent_sample_xyz')).toBe(false)
  })

  it('searches sounds by name and category query', () => {
    const drums = searchSounds('drum')
    expect(drums.length).toBeGreaterThan(0)
    expect(drums.some((d) => d.name === 'bd' || d.name === 'sd')).toBe(true)

    const matches = searchSounds('808')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((m) => m.name.includes('808') || m.description?.includes('808'))).toBe(true)
  })
})
