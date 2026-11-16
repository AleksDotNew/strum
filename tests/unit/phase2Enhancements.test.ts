import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { symbolsFor } from '../../src/ui/symbols'
import { strumCompletionKeymap } from '../../src/editor/autocomplete'
import { BUILTIN_TEMPLATES } from '../../src/storage/builtinTemplates'
import { prebakeRepo, SWITCH_ANGEL_PREBAKE_ID } from '../../src/storage/prebakeRepo'
import { EMBEDDED_BUILTIN_PACKS } from '../../src/storage/samplepacksManifest'
import { initDb } from '../../src/storage/db'

describe('Phase 2 enhancements: Enter key, Switch Angel prebake, templates, samplepacks', () => {
  beforeEach(async () => {
    const db = await initDb()
    await db.clear('prebakes')
    await db.clear('templates')
    await db.clear('samplepacks')
  })

  it('provides newline symbol (↵) in both mini and js symbol bars', () => {
    const mini = symbolsFor('mini')
    const js = symbolsFor('js')

    const miniEnter = mini.find((s) => s.label === '↵')
    const jsEnter = js.find((s) => s.label === '↵')

    expect(miniEnter).toBeDefined()
    expect(miniEnter?.insert).toBe('\n')

    expect(jsEnter).toBeDefined()
    expect(jsEnter?.insert).toBe('\n')
  })

  it('keeps Enter unbound in autocomplete keymap so Enter always inserts newline', () => {
    const enterBinding = strumCompletionKeymap.find((k) => k.key === 'Enter')
    expect(enterBinding).toBeUndefined()

    const tabBinding = strumCompletionKeymap.find((k) => k.key === 'Tab')
    expect(tabBinding).toBeDefined()
  })

  it('seeds Switch Angel prebake suite as trusted builtin', async () => {
    await prebakeRepo.ensureBuiltinDefault()
    const sw = await prebakeRepo.get(SWITCH_ANGEL_PREBAKE_ID)

    expect(sw).toBeDefined()
    expect(sw?.name).toContain('Switch Angel')
    expect(sw?.trusted).toBe(true)
    expect(sw?.code).toContain('window.DX')
    expect(sw?.code).toContain('acidenv')
    expect(sw?.code).toContain('soloOrbit')
    expect(sw?.code).toContain('col')
  })

  it('provides expanded collection of track templates', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(10)
    expect(BUILTIN_TEMPLATES.some((t) => t.id === 'builtin:tpl:switchangel-acid')).toBe(true)
    expect(BUILTIN_TEMPLATES.some((t) => t.id === 'builtin:tpl:dnb-subfocus')).toBe(true)
    expect(BUILTIN_TEMPLATES.some((t) => t.id === 'builtin:tpl:goodday-complete')).toBe(true)
  })

  it('embeds 42 built-in samplepacks in manifest', () => {
    expect(EMBEDDED_BUILTIN_PACKS.length).toBe(42)
    expect(EMBEDDED_BUILTIN_PACKS.some((p) => p.filename === 'samplepackSwAn.weftpack')).toBe(true)
    expect(EMBEDDED_BUILTIN_PACKS.some((p) => p.filename === 'padsSwAn.weftpack')).toBe(true)
    expect(EMBEDDED_BUILTIN_PACKS.some((p) => p.filename === 'ctvox.weftpack')).toBe(true)
  })
})

