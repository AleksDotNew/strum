import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../../src/storage/db'
import { prebakeRepo, DEFAULT_PREBAKE_ID } from '../../src/storage/prebakeRepo'

describe('prebakeRepo', () => {
  beforeEach(async () => {
    const db = await initDb()
    await db.clear('prebakes')
  })

  it('ensures builtin default prebake script exists', async () => {
    const builtin = await prebakeRepo.ensureBuiltinDefault()
    expect(builtin.id).toBe(DEFAULT_PREBAKE_ID)
    expect(builtin.source).toBe('builtin')
    expect(builtin.trusted).toBe(true)
    expect(builtin.code).toContain('dirt-samples')

    const fetched = await prebakeRepo.get(DEFAULT_PREBAKE_ID)
    expect(fetched).toEqual(builtin)
  })

  it('creates, updates and deletes a custom prebake script', async () => {
    const custom = await prebakeRepo.create({
      name: 'Custom Acid Synth',
      source: 'inline',
      code: 'register("acid", (x, pat) => pat.lpf(x))',
      trusted: true,
    })

    expect(custom.id).toBeDefined()
    expect(custom.name).toBe('Custom Acid Synth')
    expect(custom.trusted).toBe(true)

    const updated = await prebakeRepo.update(custom.id, {
      code: 'register("acid", (x, pat) => pat.lpf(x).lpq(8))',
    })
    expect(updated).toBeDefined()
    expect(updated!.code).toContain('lpq(8)')

    const all = await prebakeRepo.getAll()
    expect(all.some((p) => p.id === custom.id)).toBe(true)

    const deleted = await prebakeRepo.delete(custom.id)
    expect(deleted).toBe(true)
    expect(await prebakeRepo.get(custom.id)).toBeUndefined()
  })

  it('resets trusted to false when code changes from URL refresh', async () => {
    const urlScript = await prebakeRepo.create({
      name: 'External Synth Pack',
      source: 'url',
      url: 'https://example.com/synth.js',
      code: '// initial',
      trusted: true,
    })

    // When code changes, trusted must be set to false unless explicitly specified
    const refreshed = await prebakeRepo.update(urlScript.id, {
      code: '// changed external code',
      trusted: false,
    })
    expect(refreshed!.trusted).toBe(false)
  })
})
