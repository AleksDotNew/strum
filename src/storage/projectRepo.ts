import { initDb, monotonicNow, type ProjectRecord } from './db'

export const projectRepo = {
  async getAll(): Promise<ProjectRecord[]> {
    const db = await initDb()
    const all = await db.getAll('projects')
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  async get(id: string): Promise<ProjectRecord | undefined> {
    const db = await initDb()
    return db.get('projects', id)
  },

  async create(data: {
    name: string
    code?: string
    prebakeIds?: string[]
  }): Promise<ProjectRecord> {
    const db = await initDb()
    const now = monotonicNow()
    const record: ProjectRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code ?? 's("bd sd")',
      prebakeIds: data.prebakeIds ?? [],
      createdAt: now,
      updatedAt: now,
    }
    await db.put('projects', record)
    return record
  },

  async update(
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'code' | 'prebakeIds'>>
  ): Promise<ProjectRecord | undefined> {
    const db = await initDb()
    const existing = await db.get('projects', id)
    if (!existing) return undefined
    const updated: ProjectRecord = {
      ...existing,
      ...patch,
      updatedAt: monotonicNow(),
    }
    await db.put('projects', updated)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    const db = await initDb()
    const existing = await db.get('projects', id)
    if (!existing) return false
    await db.delete('projects', id)
    return true
  },
}
