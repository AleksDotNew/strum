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

export type PrebakeSource = 'builtin' | 'file' | 'url' | 'inline'

export interface PrebakeScript {
  id: string
  name: string
  source: PrebakeSource
  code: string
  url?: string
  trusted: boolean
  updatedAt: number
}

export interface TemplateRecord {
  id: string
  name: string
  prebakeIds: string[]
  starterCode: string | null
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
  prebakes: {
    key: string
    value: PrebakeScript
    indexes: { updatedAt: number }
  }
  templates: {
    key: string
    value: TemplateRecord
    indexes: { createdAt: number }
  }
  settings: {
    key: string
    value: any
  }
}

export const DB_NAME = 'strum_db'
export const DB_VERSION = 2

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
        if (!db.objectStoreNames.contains('prebakes')) {
          const prebakeStore = db.createObjectStore('prebakes', { keyPath: 'id' })
          prebakeStore.createIndex('updatedAt', 'updatedAt')
        }
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' })
          templateStore.createIndex('createdAt', 'createdAt')
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
