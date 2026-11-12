import { describe, expect, it } from 'vitest'
import {
  getAllChords,
  getAllScales,
  getChord,
  getScale,
  parseScaleSpec,
  searchChords,
  searchScales,
} from '../../src/hints/scaleCatalog'

describe('scaleCatalog', () => {
  it('returns all common musical scales and modes', () => {
    const scales = getAllScales()
    expect(scales.length).toBeGreaterThanOrEqual(15)

    const names = scales.map((s) => s.name.toLowerCase())
    expect(names).toContain('major')
    expect(names).toContain('minor')
    expect(names).toContain('dorian')
    expect(names).toContain('phrygian')
    expect(names).toContain('lydian')
    expect(names).toContain('mixolydian')
    expect(names).toContain('aeolian')
    expect(names).toContain('locrian')
    expect(names).toContain('pentatonic')
    expect(names).toContain('blues')
  })

  it('returns common chord types', () => {
    const chords = getAllChords()
    expect(chords.length).toBeGreaterThanOrEqual(10)

    const names = chords.map((c) => c.symbol.toLowerCase())
    expect(names).toContain('maj')
    expect(names).toContain('min')
    expect(names).toContain('7')
    expect(names).toContain('maj7')
    expect(names).toContain('m7')
    expect(names).toContain('dim')
    expect(names).toContain('sus4')
  })

  it('searches scales by query', () => {
    const minorMatches = searchScales('minor')
    expect(minorMatches.length).toBeGreaterThanOrEqual(3) // minor, harmonic minor, melodic minor, etc.
    expect(minorMatches.some((s) => s.name === 'minor')).toBe(true)

    const dorian = getScale('dorian')
    expect(dorian).toBeDefined()
    expect(dorian?.name).toBe('dorian')
  })

  it('searches and retrieves chords by name or symbol', () => {
    const chord = getChord('maj7')
    expect(chord).toBeDefined()
    expect(chord?.symbol).toBe('maj7')

    const dim = getChord('dim')
    expect(dim).toBeDefined()

    const results = searchChords('7')
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('parses scale specification like "C:dorian" or "eb3:minor"', () => {
    expect(parseScaleSpec('c:minor')).toEqual({ root: 'c', scale: 'minor' })
    expect(parseScaleSpec('Eb3:dorian')).toEqual({ root: 'Eb3', scale: 'dorian' })
    expect(parseScaleSpec('major')).toEqual({ root: undefined, scale: 'major' })
    expect(parseScaleSpec('')).toEqual({ root: undefined, scale: '' })
  })
})
