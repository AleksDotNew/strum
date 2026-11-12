import { initDb, monotonicNow, type PrebakeScript } from './db'

export const DEFAULT_PREBAKE_ID = 'builtin:default'

export const DEFAULT_PREBAKE_CODE = `// Default Strudel prebake
samples('github:tidalcycles/dirt-samples')
`

export const prebakeRepo = {
  async getAll(): Promise<PrebakeScript[]> {
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
    if (existing) return existing
    const now = monotonicNow()
    const builtin: PrebakeScript = {
      id: DEFAULT_PREBAKE_ID,
      name: 'Default dirt-samples',
      source: 'builtin',
      code: DEFAULT_PREBAKE_CODE,
      trusted: true,
      updatedAt: now,
    }
    await db.put('prebakes', builtin)
    return builtin
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
