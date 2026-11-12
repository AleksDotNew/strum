import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../../src/storage/db'
import { samplepackRepo } from '../../src/storage/samplepackRepo'
import { getAllSounds, isKnownSound } from '../../src/hints/soundCatalog'

describe('samplepackRepo', () => {
  beforeEach(async () => {
    const db = await initDb()
    await db.clear('samplepacks')
  })

  it('seeds builtin samplepacks on getAll', async () => {
    const packs = await samplepackRepo.getAll()
    expect(packs.length).toBeGreaterThanOrEqual(10)
    expect(packs.some((p) => p.id === 'acid')).toBe(true)
    expect(packs.some((p) => p.id === 'chip')).toBe(true)
    expect(packs.some((p) => p.id === 'breaks')).toBe(true)
  })

  it('imports and toggles custom weftpacks', async () => {
    const customPackJson = JSON.stringify({
      weftpack: 1,
      id: 'custom-synth-pack',
      name: 'Custom Synth Pack',
      by: 'Test Author',
      about: 'Test sounds',
      sounds: [
        {
          name: 'test_synth_one',
          data: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        },
      ],
    })

    const pack = await samplepackRepo.importPack(customPackJson)
    expect(pack.id).toBe('custom-synth-pack')
    expect(pack.name).toBe('Custom Synth Pack')
    expect(pack.active).toBe(true)
    expect(pack.isBuiltin).toBe(false)

    // Should appear in known sounds
    expect(isKnownSound('test_synth_one')).toBe(true)

    // Toggle inactive
    await samplepackRepo.toggleActive('custom-synth-pack', false)
    expect(isKnownSound('test_synth_one')).toBe(false)

    // Toggle active back
    await samplepackRepo.toggleActive('custom-synth-pack', true)
    expect(isKnownSound('test_synth_one')).toBe(true)

    // Delete custom pack
    const deleted = await samplepackRepo.deletePack('custom-synth-pack')
    expect(deleted).toBe(true)
    expect(isKnownSound('test_synth_one')).toBe(false)

    // Cannot delete builtin pack
    const deleteBuiltin = await samplepackRepo.deletePack('acid')
    expect(deleteBuiltin).toBe(false)
  })
})
