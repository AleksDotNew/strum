import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { initDb } from '../../src/storage/db'
import {
  listSnippets,
  saveSnippet,
  deleteSnippet,
  getCategories,
  BUILTIN_SNIPPETS,
} from '../../src/storage/snippetRepo'

describe('snippetRepo', () => {
  beforeEach(async () => {
    const db = await initDb()
    if (db.objectStoreNames.contains('snippets')) {
      await db.clear('snippets')
    }
  })

  it('exposes standard categories', () => {
    const categories = getCategories()
    expect(categories).toEqual(['All', 'Beats', 'Bass', 'Melodies', 'FX', 'Custom'])
  })

  it('includes built-in starter snippets across categories', async () => {
    const all = await listSnippets()
    expect(all.length).toBeGreaterThanOrEqual(10)

    // Check specific builtins from brief
    const names = all.map((s) => s.name)
    expect(names).toContain('Trap Hat Roll')
    expect(names).toContain('Boom Bap')
    expect(names).toContain('Jungle Amen')
    expect(names).toContain('Acid 303')
    expect(names).toContain('Reese Bass')
    expect(names).toContain('Sub 808')
    expect(names).toContain('Arpeggio Pluck')
    expect(names).toContain('Synthwave Lead')
    expect(names).toContain('Noise Sweep')
    expect(names).toContain('Tape Stop')

    // All builtins should have isBuiltin = true
    const builtinList = all.filter((s) => s.isBuiltin)
    expect(builtinList.length).toBe(BUILTIN_SNIPPETS.length)
  })

  it('filters snippets by category', async () => {
    const beats = await listSnippets('Beats')
    expect(beats.length).toBeGreaterThanOrEqual(3)
    expect(beats.every((s) => s.category === 'Beats')).toBe(true)

    const bass = await listSnippets('Bass')
    expect(bass.length).toBeGreaterThanOrEqual(3)
    expect(bass.every((s) => s.category === 'Bass')).toBe(true)

    const fx = await listSnippets('FX')
    expect(fx.length).toBeGreaterThanOrEqual(2)
    expect(fx.every((s) => s.category === 'FX')).toBe(true)
  })

  it('saves and retrieves custom user snippets from IndexedDB', async () => {
    const id = await saveSnippet({
      name: 'Custom Acid 303 Bass',
      category: 'Bass',
      code: '$: note("0 12 0 7").s("sawtooth").cutoff(slider(800, 100, 4000))',
      tags: ['acid', 'tb303'],
    })
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')

    // Should appear in listSnippets('Bass') and listSnippets('All')
    const bassList = await listSnippets('Bass')
    const foundBass = bassList.find((s) => s.id === id)
    expect(foundBass).toBeDefined()
    expect(foundBass?.name).toBe('Custom Acid 303 Bass')
    expect(foundBass?.isBuiltin).toBeFalsy()

    // Should also appear under 'Custom' category view
    const customList = await listSnippets('Custom')
    expect(customList.some((s) => s.id === id)).toBe(true)

    // Deleting the snippet
    await deleteSnippet(id)
    const afterDelete = await listSnippets('Bass')
    expect(afterDelete.some((s) => s.id === id)).toBe(false)
  })

  it('does not delete built-in snippets', async () => {
    const builtin = BUILTIN_SNIPPETS[0]
    await deleteSnippet(builtin.id)

    const all = await listSnippets()
    expect(all.some((s) => s.id === builtin.id)).toBe(true)
  })
})
