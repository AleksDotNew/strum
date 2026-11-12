export interface SoundEntry {
  name: string
  category: 'drum' | 'percussion' | 'synth' | 'bass' | 'melodic' | 'fx'
  description?: string
  isSynth?: boolean
}

export const SOUND_CATALOG: SoundEntry[] = [
  // Core Drums
  { name: 'bd', category: 'drum', description: 'Bass drum / kick' },
  { name: 'sd', category: 'drum', description: 'Snare drum' },
  { name: 'hh', category: 'drum', description: 'Closed hi-hat' },
  { name: 'oh', category: 'drum', description: 'Open hi-hat' },
  { name: 'cp', category: 'drum', description: 'Hand clap' },
  { name: 'cr', category: 'drum', description: 'Crash cymbal' },
  { name: 'rim', category: 'drum', description: 'Rimshot' },
  { name: 'cb', category: 'percussion', description: 'Cowbell' },
  { name: 'ht', category: 'drum', description: 'High tom' },
  { name: 'mt', category: 'drum', description: 'Mid tom' },
  { name: 'lt', category: 'drum', description: 'Low tom' },

  // 808 / 909 Series
  { name: '808bd', category: 'drum', description: 'TR-808 bass drum' },
  { name: '808sd', category: 'drum', description: 'TR-808 snare drum' },
  { name: '808cy', category: 'drum', description: 'TR-808 cymbal' },
  { name: '808', category: 'drum', description: 'TR-808 percussion kit' },
  { name: '909', category: 'drum', description: 'TR-909 drum kit' },

  // Percussion & Acoustic
  { name: 'can', category: 'percussion', description: 'Can percussion' },
  { name: 'clak', category: 'percussion', description: 'Wood / stick click' },
  { name: 'tabla', category: 'percussion', description: 'Indian tabla drums' },
  { name: 'perc', category: 'percussion', description: 'Acoustic & ethnic percussion' },
  { name: 'dr', category: 'drum', description: 'Acoustic drum roll' },
  { name: 'dr2', category: 'drum', description: 'Acoustic drum hit' },
  { name: 'dr_few', category: 'drum', description: 'Short drum sequence' },

  // Bass & Melodic Samples
  { name: 'bass', category: 'bass', description: 'Sub bass tone' },
  { name: 'bass0', category: 'bass', description: 'Deep bass' },
  { name: 'bass1', category: 'bass', description: 'Acoustic upright bass' },
  { name: 'bass2', category: 'bass', description: 'Synth bass' },
  { name: 'bass3', category: 'bass', description: 'Resonant bass' },
  { name: 'arpy', category: 'melodic', description: 'Arpeggiated synth tone' },
  { name: 'casio', category: 'melodic', description: 'Classic Casio VL-Tone / keyboard' },
  { name: 'juno', category: 'melodic', description: 'Roland Juno synth chords' },
  { name: 'organ', category: 'melodic', description: 'Electric organ' },
  { name: 'sax', category: 'melodic', description: 'Alto saxophone phrase' },
  { name: 'pluck', category: 'melodic', description: 'Short plucked string' },
  { name: 'kurt', category: 'melodic', description: 'Voice / spoken word sample' },
  { name: 'birds', category: 'fx', description: 'Bird chirps environmental audio' },
  { name: 'future', category: 'fx', description: 'Futuristic sweep and laser FX' },
  { name: 'feelfx', category: 'fx', description: 'Glitch / filter sweep FX' },
  { name: 'pad', category: 'melodic', description: 'Warm synth pad' },
  { name: 'moog', category: 'bass', description: 'Moog analog bass' },

  // WebAudio Synthesizers (built-in oscillators)
  { name: 'sawtooth', category: 'synth', description: 'Sawtooth oscillator (bright, rich harmonics)', isSynth: true },
  { name: 'sine', category: 'synth', description: 'Pure sine wave oscillator', isSynth: true },
  { name: 'triangle', category: 'synth', description: 'Triangle wave oscillator (mellow flute-like)', isSynth: true },
  { name: 'square', category: 'synth', description: 'Square wave oscillator (hollow, chiptune)', isSynth: true },
  { name: 'pulse', category: 'synth', description: 'Pulse wave with variable pulse width', isSynth: true },
  { name: 'pwm', category: 'synth', description: 'Pulse-width modulation synth', isSynth: true },
  { name: 'synth', category: 'synth', description: 'Default Strudel web audio synthesizer', isSynth: true },
  { name: 'supersaw', category: 'synth', description: 'Detuned multi-saw synth lead', isSynth: true },
]

export function getAllSounds(): SoundEntry[] {
  return SOUND_CATALOG
}

export function getSynths(): SoundEntry[] {
  return SOUND_CATALOG.filter((s) => s.isSynth === true)
}

export function isKnownSound(name: string): boolean {
  return SOUND_CATALOG.some((s) => s.name === name)
}

export function searchSounds(query: string): SoundEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return SOUND_CATALOG
  return SOUND_CATALOG.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)),
  )
}
