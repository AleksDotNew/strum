import { initDb, monotonicNow, type VersionRecord } from './db'

export const MAX_VERSIONS_PER_PROJECT = 50

export const versionRepo = {
  async getForProject(projectId: string): Promise<VersionRecord[]> {
    const db = await initDb()
    const all = await db.getAllFromIndex('versions', 'projectId', projectId)
    return all.sort((a, b) => b.createdAt - a.createdAt)
  },

  async snapshot(
    projectId: string,
    code: string,
    note?: string
  ): Promise<VersionRecord> {
    const db = await initDb()
    const now = monotonicNow()
    const record: VersionRecord = {
      id: crypto.randomUUID(),
      projectId,
      code,
      note,
      createdAt: now,
    }
    await db.put('versions', record)

    const all = await db.getAllFromIndex('versions', 'projectId', projectId)
    if (all.length > MAX_VERSIONS_PER_PROJECT) {
      all.sort((a, b) => a.createdAt - b.createdAt)
      const toDelete = all.slice(0, all.length - MAX_VERSIONS_PER_PROJECT)
      const tx = db.transaction('versions', 'readwrite')
      for (const item of toDelete) {
        await tx.store.delete(item.id)
      }
      await tx.done
    }

    return record
  },

  async deleteForProject(projectId: string): Promise<number> {
    const db = await initDb()
    const all = await db.getAllFromIndex('versions', 'projectId', projectId)
    const tx = db.transaction('versions', 'readwrite')
    for (const item of all) {
      await tx.store.delete(item.id)
    }
    await tx.done
    return all.length
  },
}
