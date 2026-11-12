import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb, closeDb } from '../../src/storage/db'
import { projectRepo } from '../../src/storage/projectRepo'
import { versionRepo } from '../../src/storage/versionRepo'

describe('IndexedDB storage', () => {
  beforeEach(async () => {
    const db = await initDb()
    await db.clear('projects')
    await db.clear('versions')
  })

  it('creates, retrieves, updates and deletes a project', async () => {
    const created = await projectRepo.create({
      name: 'Ambient Jam',
      code: 's("bd sd")',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Ambient Jam')
    expect(created.code).toBe('s("bd sd")')
    expect(created.prebakeIds).toEqual([])
    expect(created.createdAt).toBeGreaterThan(0)
    expect(created.updatedAt).toBe(created.createdAt)

    const fetched = await projectRepo.get(created.id)
    expect(fetched).toEqual(created)

    const all = await projectRepo.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(created.id)

    const updated = await projectRepo.update(created.id, {
      code: 's("hh*4")',
    })
    expect(updated).toBeDefined()
    expect(updated!.code).toBe('s("hh*4")')
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)

    const deleted = await projectRepo.delete(created.id)
    expect(deleted).toBe(true)
    expect(await projectRepo.get(created.id)).toBeUndefined()
  })

  it('creates version snapshots and enforces max 50 limit', async () => {
    const project = await projectRepo.create({
      name: 'Beat',
      code: 's("bd")',
    })

    const v1 = await versionRepo.snapshot(project.id, 's("bd")', 'Initial')
    expect(v1.id).toBeDefined()
    expect(v1.projectId).toBe(project.id)
    expect(v1.code).toBe('s("bd")')
    expect(v1.note).toBe('Initial')

    // Snapshot 55 times
    for (let i = 0; i < 55; i++) {
      await versionRepo.snapshot(project.id, `s("bd:${i}")`)
    }

    const versions = await versionRepo.getForProject(project.id)
    expect(versions.length).toBeLessThanOrEqual(50)
    // Most recent is first
    expect(versions[0].code).toBe('s("bd:54")')
  })
})
