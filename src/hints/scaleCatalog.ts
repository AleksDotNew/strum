export interface ScaleEntry {
  name: string
  intervals?: string[]
  aliases?: string[]
  category: 'diatonic' | 'mode' | 'pentatonic' | 'minor-variation' | 'blues' | 'exotic'
  description?: string
}

export interface ChordEntry {
  name: string
  symbol: string
  intervals?: string[]
  aliases?: string[]
  description?: string
}

export const COMMON_SCALES: ScaleEntry[] = [
  // Diatonic & Modes
  { name: 'major', category: 'diatonic', aliases: ['ionian'], intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7M'], description: 'Major / Ionian scale' },
  { name: 'minor', category: 'diatonic', aliases: ['aeolian', 'natural minor'], intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m'], description: 'Natural minor / Aeolian' },
  { name: 'dorian', category: 'mode', intervals: ['1P', '2M', '3m', '4P', '5P', '6M', '7m'], description: 'Dorian mode (minor with raised 6th)' },
  { name: 'phrygian', category: 'mode', intervals: ['1P', '2m', '3m', '4P', '5P', '6m', '7m'], description: 'Phrygian mode (minor with flat 2nd)' },
  { name: 'lydian', category: 'mode', intervals: ['1P', '2M', '3M', '4A', '5P', '6M', '7M'], description: 'Lydian mode (major with sharp 4th)' },
  { name: 'mixolydian', category: 'mode', intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7m'], description: 'Mixolydian mode (major with flat 7th)' },
  { name: 'aeolian', category: 'mode', aliases: ['minor'], intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7m'], description: 'Aeolian mode' },
  { name: 'locrian', category: 'mode', intervals: ['1P', '2m', '3m', '4P', '5d', '6m', '7m'], description: 'Locrian mode (diminished 5th)' },

  // Minor variations
  { name: 'harmonic minor', category: 'minor-variation', intervals: ['1P', '2M', '3m', '4P', '5P', '6m', '7M'], description: 'Harmonic minor (raised 7th)' },
  { name: 'melodic minor', category: 'minor-variation', intervals: ['1P', '2M', '3m', '4P', '5P', '6M', '7M'], description: 'Melodic minor (raised 6th and 7th)' },

  // Pentatonic & Blues
  { name: 'pentatonic', category: 'pentatonic', aliases: ['major pentatonic'], intervals: ['1P', '2M', '3M', '5P', '6M'], description: 'Major pentatonic 5-note scale' },
  { name: 'minor pentatonic', category: 'pentatonic', intervals: ['1P', '3m', '4P', '5P', '7m'], description: 'Minor pentatonic 5-note scale' },
  { name: 'blues', category: 'blues', aliases: ['minor blues'], intervals: ['1P', '3m', '4P', '5d', '5P', '7m'], description: '6-note blues scale with blue note' },
  { name: 'major blues', category: 'blues', intervals: ['1P', '2M', '3m', '3M', '5P', '6M'], description: 'Major blues scale' },

  // Exotic & Symmetrical
  { name: 'whole tone', category: 'exotic', intervals: ['1P', '2M', '3M', '4A', '5A', '7m'], description: 'Whole-tone symmetrical scale' },
  { name: 'chromatic', category: 'exotic', description: '12-tone chromatic scale' },
  { name: 'diminished', category: 'exotic', aliases: ['octatonic'], description: 'Half-whole diminished scale' },
  { name: 'hungarian minor', category: 'exotic', description: 'Double harmonic minor' },
  { name: 'hirajoshi', category: 'exotic', description: 'Japanese Hirajoshi pentatonic scale' },
]

export const COMMON_CHORDS: ChordEntry[] = [
  { name: 'Major', symbol: 'maj', aliases: ['M', ''], intervals: ['1P', '3M', '5P'], description: 'Major triad' },
  { name: 'Minor', symbol: 'min', aliases: ['m', '-'], intervals: ['1P', '3m', '5P'], description: 'Minor triad' },
  { name: 'Dominant 7th', symbol: '7', aliases: ['dom7'], intervals: ['1P', '3M', '5P', '7m'], description: 'Dominant 7th chord' },
  { name: 'Major 7th', symbol: 'maj7', aliases: ['M7', 'Δ'], intervals: ['1P', '3M', '5P', '7M'], description: 'Major 7th chord' },
  { name: 'Minor 7th', symbol: 'm7', aliases: ['min7', '-7'], intervals: ['1P', '3m', '5P', '7m'], description: 'Minor 7th chord' },
  { name: 'Diminished', symbol: 'dim', aliases: ['°'], intervals: ['1P', '3m', '5d'], description: 'Diminished triad' },
  { name: 'Diminished 7th', symbol: 'dim7', aliases: ['°7'], intervals: ['1P', '3m', '5d', '7d'], description: 'Full diminished 7th chord' },
  { name: 'Augmented', symbol: 'aug', aliases: ['+'], intervals: ['1P', '3M', '5A'], description: 'Augmented triad' },
  { name: 'Suspended 4th', symbol: 'sus4', aliases: ['sus'], intervals: ['1P', '4P', '5P'], description: 'Suspended 4th chord' },
  { name: 'Suspended 2nd', symbol: 'sus2', intervals: ['1P', '2M', '5P'], description: 'Suspended 2nd chord' },
  { name: 'Half-diminished 7th', symbol: 'm7b5', aliases: ['ø7'], intervals: ['1P', '3m', '5d', '7m'], description: 'Half-diminished 7th chord' },
  { name: 'Major 6th', symbol: '6', intervals: ['1P', '3M', '5P', '6M'], description: 'Major 6th chord' },
  { name: 'Minor 6th', symbol: 'm6', intervals: ['1P', '3m', '5P', '6M'], description: 'Minor 6th chord' },
  { name: '9th', symbol: '9', intervals: ['1P', '3M', '5P', '7m', '9M'], description: 'Dominant 9th chord' },
  { name: 'Add 9', symbol: 'add9', intervals: ['1P', '3M', '5P', '9M'], description: 'Major triad with added 9th' },
]

export function getAllScales(): ScaleEntry[] {
  return COMMON_SCALES
}

export function getAllChords(): ChordEntry[] {
  return COMMON_CHORDS
}

export function getScale(name: string): ScaleEntry | undefined {
  const q = name.trim().toLowerCase()
  return COMMON_SCALES.find((s) => s.name.toLowerCase() === q || s.aliases?.some((a) => a.toLowerCase() === q))
}

export function getChord(nameOrSymbol: string): ChordEntry | undefined {
  const q = nameOrSymbol.trim().toLowerCase()
  return COMMON_CHORDS.find(
    (c) =>
      c.symbol.toLowerCase() === q ||
      c.name.toLowerCase() === q ||
      c.aliases?.some((a) => a.toLowerCase() === q),
  )
}

export function searchScales(query: string): ScaleEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return COMMON_SCALES
  return COMMON_SCALES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.aliases?.some((a) => a.toLowerCase().includes(q)),
  )
}

export function searchChords(query: string): ChordEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return COMMON_CHORDS
  return COMMON_CHORDS.filter(
    (c) =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.aliases?.some((a) => a.toLowerCase().includes(q)) ||
      c.description?.toLowerCase().includes(q),
  )
}

/**
 * Parses scale pattern specifier like "C:dorian" or "eb3:minor" or "major"
 */
export function parseScaleSpec(spec: string): { root?: string; scale: string } {
  const trimmed = spec.trim()
  if (!trimmed) return { root: undefined, scale: '' }
  if (trimmed.includes(':')) {
    const [root, ...rest] = trimmed.split(':')
    return {
      root: root.trim() || undefined,
      scale: rest.join(':').trim(),
    }
  }
  return { root: undefined, scale: trimmed }
}
