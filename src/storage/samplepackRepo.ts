import { initDb, monotonicNow, type SamplepackRecord } from './db'
import { registerDynamicSounds, unregisterDynamicSounds, type SoundEntry } from '../hints/soundCatalog'
import { registerSampleMap } from '../engine/engine'
import { EMBEDDED_BUILTIN_PACKS } from './samplepacksManifest'

export { EMBEDDED_BUILTIN_PACKS }
export type { BuiltinPackMeta } from './samplepacksManifest'

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

