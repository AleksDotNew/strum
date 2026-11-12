import { initDb, monotonicNow, type TemplateRecord, type PrebakeScript } from './db'
import { prebakeRepo } from './prebakeRepo'

export interface TemplateBundle {
  schemaVersion: number
  template: {
    id: string
    name: string
    prebakeIds: string[]
    starterCode: string | null
    createdAt: number
  }
  prebakes: PrebakeScript[]
}

export const templateRepo = {
  async getAll(): Promise<TemplateRecord[]> {
    const db = await initDb()
    const all = await db.getAll('templates')
    return all.sort((a, b) => b.createdAt - a.createdAt)
  },

  async get(id: string): Promise<TemplateRecord | undefined> {
    const db = await initDb()
    return db.get('templates', id)
  },

  async create(data: {
    id?: string
    name: string
    prebakeIds: string[]
    starterCode?: string | null
  }): Promise<TemplateRecord> {
    const db = await initDb()
    const now = monotonicNow()
    const record: TemplateRecord = {
      id: data.id ?? `tpl:${crypto.randomUUID()}`,
      name: data.name,
      prebakeIds: data.prebakeIds,
      starterCode: data.starterCode ?? null,
      createdAt: now,
    }
    await db.put('templates', record)
    return record
  },

  async delete(id: string): Promise<boolean> {
    const db = await initDb()
    const existing = await db.get('templates', id)
    if (!existing) return false
    await db.delete('templates', id)
    return true
  },

  async packBundle(templateId: string): Promise<TemplateBundle | null> {
    const tpl = await this.get(templateId)
    if (!tpl) return null
    const prebakes: PrebakeScript[] = []
    for (const pid of tpl.prebakeIds) {
      if (pid === 'builtin:default') continue
      const pb = await prebakeRepo.get(pid)
      if (pb) {
        prebakes.push(pb)
      }
    }
    return {
      schemaVersion: 1,
      template: {
        id: tpl.id,
        name: tpl.name,
        prebakeIds: tpl.prebakeIds,
        starterCode: tpl.starterCode,
        createdAt: tpl.createdAt,
      },
      prebakes,
    }
  },

  async importBundle(bundle: TemplateBundle): Promise<TemplateRecord> {
    if (bundle.schemaVersion !== 1 || !bundle.template) {
      throw new Error('Unsupported template bundle schema')
    }

    if (Array.isArray(bundle.prebakes)) {
      for (const pb of bundle.prebakes) {
        const existing = await prebakeRepo.get(pb.id)
        if (!existing) {
          await prebakeRepo.create({
            id: pb.id,
            name: pb.name,
            source: pb.source ?? 'inline',
            code: pb.code,
            url: pb.url,
            trusted: false,
          })
        }
      }
    }

    const record = await this.create({
      id: bundle.template.id,
      name: bundle.template.name,
      prebakeIds: bundle.template.prebakeIds ?? [],
      starterCode: bundle.template.starterCode ?? null,
    })
    return record
  },
}
