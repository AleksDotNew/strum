import { initDb, monotonicNow, type PrebakeScript } from './db'

export const DEFAULT_PREBAKE_ID = 'builtin:default'
export const WEFT_HELPERS_PREBAKE_ID = 'builtin:weft-helpers'

export const DEFAULT_PREBAKE_CODE = `// Default Strudel prebake
samples('github:tidalcycles/dirt-samples')
`

export const WEFT_HELPERS_CODE = `// Weft Helpers (adapted from Weft Loom)
// Time shifting:
window.shiftBy = register('shiftBy', (amt, pat) => pat.late(amt))

// Cycle degrade:
window.cycleDegrade = register('cycleDegrade', pat => pat.mask("<[0|1]>"))
window.cycleDegradeBy = register('cycleDegradeBy', (by, pat) => pat.mask(wchooseCycles(["1", 1 - by], ["0", by])))

// Cycle counter visualizer:
window.cycleCounter = () => note(time.seg("1").round()).postgain(0).dry(0).rsize(0).room(0)

// TB-303 acid filter envelope helper:
register('acidenv', (x, pat) => pat.lpf(100).lpenv(x * 9).lps(.2).lpd(.12).lpq(2))

// DX FM synth helper:
window.DX = (env = 8, fm = 2, harm = 2) => s("sine").fm(fm).fmenv(env).fmh(harm).fmdecay(.2)

// Postgain multiplier:
register('pg', (pgain, x) => x.mul(postgain(pgain)))

// Orbits solo/mute helpers:
window.soloedOrbits = []
window.soloOrbit = (...orbits) => { window.soloedOrbits = orbits }
window.mutedOrbits = []
window.muteOrbit = (...orbits) => { window.mutedOrbits = orbits }
`

export const prebakeRepo = {
  async getAll(): Promise<PrebakeScript[]> {
    await this.ensureBuiltinDefault()
    const db = await initDb()
    const all = await db.getAll('prebakes')
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<PrebakeScript | undefined> {
    const db = await initDb()
    return db.get('prebakes', id)
  },

  async ensureBuiltinDefault(): Promise<PrebakeScript> {
    const db = await initDb()
    const existing = await db.get('prebakes', DEFAULT_PREBAKE_ID)
    const now = monotonicNow()
    let builtin = existing
    if (!existing) {
      builtin = {
        id: DEFAULT_PREBAKE_ID,
        name: 'Default dirt-samples',
        source: 'builtin',
        code: DEFAULT_PREBAKE_CODE,
        trusted: true,
        updatedAt: now,
      }
      await db.put('prebakes', builtin)
    }

    const weftExisting = await db.get('prebakes', WEFT_HELPERS_PREBAKE_ID)
    if (!weftExisting) {
      await db.put('prebakes', {
        id: WEFT_HELPERS_PREBAKE_ID,
        name: 'Weft Helpers (shiftBy, cycleDegrade, DX, acidenv)',
        source: 'builtin',
        code: WEFT_HELPERS_CODE,
        trusted: true,
        updatedAt: now,
      })
    }

    return builtin!
  },

  async create(data: {
    id?: string
    name: string
    source: PrebakeScript['source']
    code: string
    url?: string
    trusted?: boolean
  }): Promise<PrebakeScript> {
    const db = await initDb()
    const now = monotonicNow()
    const record: PrebakeScript = {
      id: data.id ?? `pb:${crypto.randomUUID()}`,
      name: data.name,
      source: data.source,
      code: data.code,
      url: data.url,
      trusted: data.trusted ?? false,
      updatedAt: now,
    }
    await db.put('prebakes', record)
    return record
  },

  async update(
    id: string,
    patch: Partial<Pick<PrebakeScript, 'name' | 'code' | 'url' | 'trusted'>>
  ): Promise<PrebakeScript | undefined> {
    const db = await initDb()
    const existing = await db.get('prebakes', id)
    if (!existing) return undefined
    const updated: PrebakeScript = {
      ...existing,
      ...patch,
      updatedAt: monotonicNow(),
    }
    await db.put('prebakes', updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    if (id === DEFAULT_PREBAKE_ID) {
      return false
    }
    const db = await initDb()
    const existing = await db.get('prebakes', id)
    if (!existing) return false
    await db.delete('prebakes', id)
    return true
  },
}
