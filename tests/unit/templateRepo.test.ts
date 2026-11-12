import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../../src/storage/db'
import { prebakeRepo } from '../../src/storage/prebakeRepo'
import { templateRepo } from '../../src/storage/templateRepo'

describe('templateRepo', () => {
  beforeEach(async () => {
    const db = await initDb()
    await db.clear('templates')
    await db.clear('prebakes')
  })

  it('creates and retrieves a project template', async () => {
    const tpl = await templateRepo.create({
      name: 'Lo-Fi HipHop',
      prebakeIds: ['builtin:default'],
      starterCode: 's("bd [~ sd]")',
    })

    expect(tpl.id).toBeDefined()
    expect(tpl.name).toBe('Lo-Fi HipHop')
    expect(tpl.prebakeIds).toEqual(['builtin:default'])
    expect(tpl.starterCode).toBe('s("bd [~ sd]")')

    const fetched = await templateRepo.get(tpl.id)
    expect(fetched).toEqual(tpl)

    const all = await templateRepo.getAll()
    expect(all).toHaveLength(1)

    const deleted = await templateRepo.delete(tpl.id)
    expect(deleted).toBe(true)
    expect(await templateRepo.get(tpl.id)).toBeUndefined()
  })

  it('packs and imports a portable template JSON bundle', async () => {
    const pb = await prebakeRepo.create({
      name: 'Custom Drumkit',
      source: 'inline',
      code: 'samples("github:example/pack")',
      trusted: true,
    })

    const tpl = await templateRepo.create({
      name: 'DnB Template',
      prebakeIds: [pb.id],
      starterCode: 's("bd*2 [~ sd]")',
    })

    const bundle = await templateRepo.packBundle(tpl.id)
    expect(bundle).not.toBeNull()
    expect(bundle!.schemaVersion).toBe(1)
    expect(bundle!.template.name).toBe('DnB Template')
    expect(bundle!.prebakes).toHaveLength(1)
    expect(bundle!.prebakes[0].name).toBe('Custom Drumkit')

    // Clean DB and import bundle
    const db = await initDb()
    await db.clear('templates')
    await db.clear('prebakes')

    const imported = await templateRepo.importBundle(bundle!)
    expect(imported.name).toBe('DnB Template')
    expect(imported.starterCode).toBe('s("bd*2 [~ sd]")')

    const importedPb = await prebakeRepo.get(pb.id)
    expect(importedPb).toBeDefined()
    expect(importedPb!.name).toBe('Custom Drumkit')
    // Imported prebakes start untrusted for security
    expect(importedPb!.trusted).toBe(false)
  })
})
