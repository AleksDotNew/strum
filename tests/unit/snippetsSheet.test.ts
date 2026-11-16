// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  filterSnippets,
  validateSnippetInput,
} from '../../src/ui/SnippetsSheet'
import type { SnippetRecord } from '../../src/storage/db'

describe('SnippetsSheet helpers', () => {
  const sampleSnippets: SnippetRecord[] = [
    {
      id: 'builtin:1',
      name: 'Trap Hat Roll',
      category: 'Beats',
      code: '$: s("hh*16")',
      tags: ['trap', 'drums'],
      isBuiltin: true,
      createdAt: 0,
    },
    {
      id: 'builtin:2',
      name: 'Acid 303',
      category: 'Bass',
      code: '$: note("0 12 0 7").s("sawtooth")',
      tags: ['acid', 'tb303'],
      isBuiltin: true,
      createdAt: 0,
    },
    {
      id: 'custom:1',
      name: 'My Special Beat',
      category: 'Custom',
      code: '$: s("bd sd")',
      tags: ['lofi'],
      isBuiltin: false,
      createdAt: 100,
    },
    {
      id: 'custom:2',
      name: 'Custom Acid Sub',
      category: 'Bass',
      code: '$: note("c1").s("sine")',
      tags: ['acid', 'sub'],
      isBuiltin: false,
      createdAt: 200,
    },
  ]

  describe('filterSnippets', () => {
    it('returns all snippets when category is "All" and search is empty', () => {
      const result = filterSnippets(sampleSnippets, 'All', '')
      expect(result).toHaveLength(4)
    })

    it('filters by category correctly', () => {
      const beats = filterSnippets(sampleSnippets, 'Beats', '')
      expect(beats).toHaveLength(1)
      expect(beats[0].name).toBe('Trap Hat Roll')

      const bass = filterSnippets(sampleSnippets, 'Bass', '')
      expect(bass).toHaveLength(2)

      const custom = filterSnippets(sampleSnippets, 'Custom', '')
      expect(custom).toHaveLength(2) // custom:1 (category Custom) and custom:2 (!isBuiltin)
    })

    it('filters by search term in name, code, or tags', () => {
      // By name
      const byName = filterSnippets(sampleSnippets, 'All', 'Special')
      expect(byName).toHaveLength(1)
      expect(byName[0].name).toBe('My Special Beat')

      // By code
      const byCode = filterSnippets(sampleSnippets, 'All', 'sawtooth')
      expect(byCode).toHaveLength(1)
      expect(byCode[0].name).toBe('Acid 303')

      // By tag
      const byTag = filterSnippets(sampleSnippets, 'All', 'tb303')
      expect(byTag).toHaveLength(1)
      expect(byTag[0].name).toBe('Acid 303')
    })

    it('combines category and search query', () => {
      const result = filterSnippets(sampleSnippets, 'Bass', 'tb303')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Acid 303')

      const noMatch = filterSnippets(sampleSnippets, 'Beats', 'sawtooth')
      expect(noMatch).toHaveLength(0)
    })
  })

  describe('validateSnippetInput', () => {
    it('rejects empty name or code', () => {
      expect(validateSnippetInput('', 's("bd")').valid).toBe(false)
      expect(validateSnippetInput('Test', '').valid).toBe(false)
      expect(validateSnippetInput('   ', '   ').valid).toBe(false)
    })

    it('accepts non-empty name and code', () => {
      const res = validateSnippetInput('My Lead', '$: note("c4").s("saw")')
      expect(res.valid).toBe(true)
      expect(res.error).toBeUndefined()
    })
  })
})
