import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface ProjectRecord {
  id: string
  name: string
  code: string
  prebakeIds: string[]
  createdAt: number
  updatedAt: number
}

export interface VersionRecord {
  id: string
  projectId: string
  code: string
  note?: string
  createdAt: number
}

export interface StrumDB extends DBSchema {
  projects: {
    key: string
    value: ProjectRecord
    indexes: { updatedAt: number }
  }
  versions: {
    key: string
    value: VersionRecord
    indexes: { projectId: string; createdAt: number }
  }
  settings: {
    key: string
    value: any
  }
}

export const DB_NAME = 'strum_db'
export const DB_VERSION = 1

let lastTimestamp = 0
export function monotonicNow(): number {
  const now = Date.now()
  if (now <= lastTimestamp) {
    lastTimestamp += 1
  } else {
    lastTimestamp = now
  }
  return lastTimestamp
}

let dbPromise: Promise<IDBPDatabase<StrumDB>> | null = null

export function initDb(): Promise<IDBPDatabase<StrumDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StrumDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
          projectStore.createIndex('updatedAt', 'updatedAt')
        }
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' })
          versionStore.createIndex('projectId', 'projectId')
          versionStore.createIndex('createdAt', 'createdAt')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return dbPromise
}

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}
