import { initDb, monotonicNow, type SamplepackRecord } from './db'
import { registerDynamicSounds, unregisterDynamicSounds, type SoundEntry } from '../hints/soundCatalog'
import { registerSampleMap } from '../engine/engine'

export interface WeftpackSound {
  name: string
  file?: string
  type?: string
  seconds?: number
  data: string // base64 WAV
}

export interface WeftpackFile {
  weftpack?: number
  id?: string
  name: string
  by?: string
  about?: string
  sounds: WeftpackSound[]
}

export const EMBEDDED_BUILTIN_PACKS: Array<{
  id: string
  name: string
  by: string
  about: string
  filename: string
  sounds: string[]
}> = [
  {
    id: 'acid',
    name: 'Acid Lines',
    by: 'Weft Loom',
    about: 'Acid at 132: squelching basses, tight kit and cowbell.',
    filename: 'Acid Lines.weftpack',
    sounds: ['acid_kick', 'acid_clap', 'acid_hat', 'acid_openhat', 'acid_cowbell', 'acid_squelch'],
  },
  {
    id: 'chip',
    name: 'Chip Arcade',
    by: 'Weft Loom',
    about: 'Chiptune at 150: noise drums, coin, laser, jump and square tones.',
    filename: 'Chip Arcade.weftpack',
    sounds: ['chip_kick', 'chip_snare', 'chip_hat', 'chip_coin', 'chip_laser', 'chip_jump'],
  },
  {
    id: 'minimal',
    name: 'Minimal Click',
    by: 'Weft Loom',
    about: 'Minimal at 124: tight kick, clicks, ticks, rim, wood block and sub blip.',
    filename: 'Minimal Click.weftpack',
    sounds: ['minimal_kick', 'minimal_click', 'minimal_tick', 'minimal_rim', 'minimal_wood', 'minimal_blip'],
  },
  {
    id: 'deep',
    name: 'Deep House',
    by: 'Weft Loom',
    about: 'Deep house at 122: round kick, clap, hats, shaker and minor 9th chord.',
    filename: 'Deep House.weftpack',
    sounds: ['deep_kick', 'deep_clap', 'deep_hat', 'deep_openhat', 'deep_shaker', 'deep_chord'],
  },
  {
    id: 'breaks',
    name: 'Breakbeat Heat',
    by: 'Weft Loom',
    about: 'Breakbeat at 130: big kick, layered snare, ride, crash and break slice.',
    filename: 'Breakbeat Heat.weftpack',
    sounds: ['breaks_kick', 'breaks_snare', 'breaks_hat', 'breaks_ride', 'breaks_crash', 'breaks_break'],
  },
  {
    id: 'garage',
    name: 'Garage Swing',
    by: 'Weft Loom',
    about: '2-step UK garage at 134: snappy kick, rim snare, clap, shaker and organ stab.',
    filename: 'Garage Swing.weftpack',
    sounds: ['garage_kick', 'garage_snare', 'garage_clap', 'garage_hat', 'garage_shaker', 'garage_organ'],
  },
  {
    id: 'dub',
    name: 'Dub Chords',
    by: 'Weft Loom',
    about: 'Basic Channel dub techno: deep kick, rim, shaker, filtered noise hiss and minor chord.',
    filename: 'Dub Chords.weftpack',
    sounds: ['dub_kick', 'dub_rim', 'dub_shaker', 'dub_hat', 'dub_chord', 'dub_hiss'],
  },
  {
    id: 'glitch',
    name: 'Glitch Lab',
    by: 'Weft Loom',
    about: 'Click-hop and microsound: microbursts, clicks, micro-kick and stutters.',
    filename: 'Glitch Lab.weftpack',
    sounds: ['glitch_burst', 'glitch_burst2', 'glitch_burst3', 'glitch_click', 'glitch_kick', 'glitch_snare', 'glitch_stutter'],
  },
  {
    id: 'electro',
    name: 'Electro Funk',
    by: 'Weft Loom',
    about: 'Detroit electro at 128: 808-derived kick, snappy snare, clap, tom and cowbell.',
    filename: 'Electro Funk.weftpack',
    sounds: ['electro_kick', 'electro_snare', 'electro_clap', 'electro_hat', 'electro_cowbell', 'electro_tom'],
  },
  {
    id: 'hands',
    name: 'Hand Drums',
    by: 'Weft Loom',
    about: 'Afro-Cuban hand percussion: congas, bongos, shaker, clave and cowbell.',
    filename: 'Hand Drums.weftpack',
    sounds: ['hands_conga', 'hands_congahi', 'hands_bongo', 'hands_shaker', 'hands_clave', 'hands_cowbell'],
  },
  {
    id: 'nudisco',
    name: 'Nu Disco',
    by: 'Weft Loom',
    about: 'Nu Disco / French Touch: disco kick, handclap, open hat, funk bass and guitar stab.',
    filename: 'Nu Disco.weftpack',
    sounds: ['nudisco_kick', 'nudisco_snare', 'nudisco_clap', 'nudisco_hat', 'nudisco_bass', 'nudisco_stab'],
  },
  {
    id: 'trapsub',
    name: 'Trap Sub',
    by: 'Weft Loom',
    about: 'Modern trap kit: hard 808 sub, snappy snare, roll-ready hats and chant.',
    filename: 'Trap Sub.weftpack',
    sounds: ['trap_kick', 'trap_sub', 'trap_snare', 'trap_hat', 'trap_openhat', 'trap_chant'],
  },
]

function inferCategory(soundName: string): SoundEntry['category'] {
  const s = soundName.toLowerCase()
  if (s.includes('sub') || s.includes('bass') || s.includes('squelch')) return 'bass'
  if (s.includes('chord') || s.includes('organ') || s.includes('stab') || s.includes('lead')) return 'melodic'
  if (s.includes('conga') || s.includes('bongo') || s.includes('shaker') || s.includes('clave') || s.includes('cowbell') || s.includes('wood') || s.includes('tom')) {
    return 'percussion'
  }
  if (s.includes('burst') || s.includes('glitch') || s.includes('laser') || s.includes('coin') || s.includes('jump') || s.includes('click') || s.includes('tick') || s.includes('hiss') || s.includes('fx')) {
    return 'fx'
  }
  return 'drum'
}

export const samplepackRepo = {
  async getAll(): Promise<SamplepackRecord[]> {
    await this.ensureBuiltinPacks()
    const db = await initDb()
    const all = await db.getAll('samplepacks')
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<SamplepackRecord | undefined> {
    const db = await initDb()
    return db.get('samplepacks', id)
  },

  async ensureBuiltinPacks(): Promise<void> {
    const db = await initDb()
    const now = monotonicNow()
    for (let i = 0; i < EMBEDDED_BUILTIN_PACKS.length; i++) {
      const p = EMBEDDED_BUILTIN_PACKS[i]
      const existing = await db.get('samplepacks', p.id)
      if (!existing) {
        // Activate the first 6 packs by default
        const active = i < 6
        await db.put('samplepacks', {
          id: p.id,
          name: p.name,
          by: p.by,
          about: p.about,
          filename: p.filename,
          isBuiltin: true,
          active,
          soundNames: p.sounds,
          updatedAt: now - i,
        })
      }
    }
  },

  async fetchPackFile(filename: string): Promise<WeftpackFile | null> {
    try {
      const res = await fetch(`/samplepacks/${filename}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  },

  async registerPackSounds(pack: SamplepackRecord): Promise<boolean> {
    let packData: WeftpackFile | null = pack.data ?? null
    if (!packData && pack.filename) {
      packData = await this.fetchPackFile(pack.filename)
      if (packData) {
        // Cache parsed data in DB for offline instant startup
        const db = await initDb()
        pack.data = packData
        await db.put('samplepacks', pack)
      }
    }

    if (!packData || !Array.isArray(packData.sounds)) {
      return false
    }

    const soundMap: Record<string, string> = {}
    const catalogEntries: SoundEntry[] = []

    for (const sound of packData.sounds) {
      if (!sound.name || !sound.data) continue
      soundMap[sound.name] = `data:audio/wav;base64,${sound.data}`
      catalogEntries.push({
        name: sound.name,
        category: inferCategory(sound.name),
        description: `${pack.name} (${pack.by})`,
      })
    }

    try {
      await registerSampleMap(soundMap)
      registerDynamicSounds(catalogEntries)
      return true
    } catch (e) {
      console.warn('Failed to register pack sounds in Strudel:', e)
      return false
    }
  },

  async toggleActive(id: string, active: boolean): Promise<SamplepackRecord | null> {
    const db = await initDb()
    const pack = await db.get('samplepacks', id)
    if (!pack) return null

    pack.active = active
    pack.updatedAt = monotonicNow()
    await db.put('samplepacks', pack)

    if (active) {
      await this.registerPackSounds(pack)
    } else {
      unregisterDynamicSounds(pack.soundNames)
    }

    return pack
  },

  async importPack(jsonText: string): Promise<SamplepackRecord> {
    let parsed: any
    try {
      parsed = JSON.parse(jsonText.trim())
    } catch (e: any) {
      throw new Error(`Невалидный JSON: ${e.message}`)
    }

    if (!parsed || !Array.isArray(parsed.sounds) || parsed.sounds.length === 0) {
      throw new Error('Файл не содержит допустимых сэмплов Weftpack')
    }

    const id = parsed.id ? String(parsed.id) : `pack:${crypto.randomUUID()}`
    const soundNames = parsed.sounds.map((s: any) => String(s.name))
    const now = monotonicNow()

    const record: SamplepackRecord = {
      id,
      name: parsed.name || 'Импортированный сэмплпак',
      by: parsed.by || 'Пользователь',
      about: parsed.about || 'Пользовательский сэмплпак Weftpack',
      isBuiltin: false,
      active: true,
      soundNames,
      data: parsed,
      updatedAt: now,
    }

    const db = await initDb()
    await db.put('samplepacks', record)
    await this.registerPackSounds(record)
    return record
  },

  async deletePack(id: string): Promise<boolean> {
    const db = await initDb()
    const pack = await db.get('samplepacks', id)
    if (!pack || pack.isBuiltin) return false
    unregisterDynamicSounds(pack.soundNames)
    await db.delete('samplepacks', id)
    return true
  },

  async loadAllActivePacks(): Promise<void> {
    const all = await this.getAll()
    const activePacks = all.filter((p) => p.active)
    for (const pack of activePacks) {
      await this.registerPackSounds(pack)
    }
  },
}
