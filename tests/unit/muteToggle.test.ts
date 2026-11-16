import { describe, it, expect } from 'vitest'
import {
  findRootBlocks,
  toggleBlockMute,
  toggleAllBlocks,
  type RootBlock,
} from '../../src/code-model/muteToggle'

describe('muteToggle', () => {
  describe('findRootBlocks', () => {
    it('detects root dollar blocks and their mute status', () => {
      const code = `
$: s("bd sd")
_$: s("hh*4")
d1: s("arpy")
`
      const blocks = findRootBlocks(code)
      expect(blocks.length).toBe(3)

      expect(blocks[0].name).toBe('$')
      expect(blocks[0].prefix).toBe('$:')
      expect(blocks[0].muted).toBe(false)
      expect(blocks[0].line).toBe(1)

      expect(blocks[1].name).toBe('$')
      expect(blocks[1].prefix).toBe('_$:')
      expect(blocks[1].muted).toBe(true)
      expect(blocks[1].line).toBe(2)

      expect(blocks[2].name).toBe('d1')
      expect(blocks[2].prefix).toBe('d1:')
      expect(blocks[2].muted).toBe(false)
      expect(blocks[2].line).toBe(3)
    })

    it('detects custom block names and preserves indentation offsets', () => {
      const code = `  drums: s("bd sd")\n    _bass: note("0 3 7")`
      const blocks = findRootBlocks(code)
      expect(blocks.length).toBe(2)

      expect(blocks[0].name).toBe('drums')
      expect(blocks[0].prefix).toBe('drums:')
      expect(blocks[0].muted).toBe(false)
      expect(blocks[0].start).toBe(2)
      expect(blocks[0].line).toBe(0)

      expect(blocks[1].name).toBe('bass')
      expect(blocks[1].prefix).toBe('_bass:')
      expect(blocks[1].muted).toBe(true)
      expect(blocks[1].line).toBe(1)
      expect(blocks[1].start).toBe(code.indexOf('_bass'))
    })

    it('ignores comments and switch statements', () => {
      const code = `
// $: s("commented")
/* _$: s("block comment") */
$: s("active")
`
      const blocks = findRootBlocks(code)
      expect(blocks.length).toBe(1)
      expect(blocks[0].name).toBe('$')
      expect(blocks[0].line).toBe(3)
    })

    it('tolerates incomplete syntax on other lines', () => {
      const code = `$: s("bd sd")\n_$: s("hh"\ninvalid (((`
      const blocks = findRootBlocks(code)
      expect(blocks.length).toBe(2)
      expect(blocks[0].name).toBe('$')
      expect(blocks[1].name).toBe('$')
      expect(blocks[1].muted).toBe(true)
    })
  })

  describe('toggleBlockMute', () => {
    it('toggles unmuted block to muted', () => {
      const code = `$: s("bd sd")`
      const res = toggleBlockMute(code, 0)
      expect(res).not.toBeNull()
      expect(res?.muted).toBe(true)
      expect(res?.newCode).toBe(`_$: s("bd sd")`)
      expect(res?.block.prefix).toBe('_$:')
    })

    it('toggles muted block back to unmuted', () => {
      const code = `_$: s("bd sd")`
      const res = toggleBlockMute(code, 0)
      expect(res).not.toBeNull()
      expect(res?.muted).toBe(false)
      expect(res?.newCode).toBe(`$: s("bd sd")`)
      expect(res?.block.prefix).toBe('$:')
    })

    it('toggles named blocks correctly', () => {
      const code = `d1: s("arpy")\n_drums: s("saw")`
      const res1 = toggleBlockMute(code, 0)
      expect(res1?.newCode).toBe(`_d1: s("arpy")\n_drums: s("saw")`)
      expect(res1?.muted).toBe(true)

      const res2 = toggleBlockMute(code, 1)
      expect(res2?.newCode).toBe(`d1: s("arpy")\ndrums: s("saw")`)
      expect(res2?.muted).toBe(false)
    })

    it('preserves indentation when toggling', () => {
      const code = `    $: s("bd sd")`
      const res = toggleBlockMute(code, 0)
      expect(res?.newCode).toBe(`    _$: s("bd sd")`)

      const unmuted = toggleBlockMute(res!.newCode, 0)
      expect(unmuted?.newCode).toBe(`    $: s("bd sd")`)
    })

    it('locates block by cursor offset within multi-line block', () => {
      const code = `$: s("bd sd")\n  .fast(2)\n  .gain(0.8)\n_$: s("hh")`
      // Cursor in the middle of `.fast(2)` line
      const offsetInFast = code.indexOf('.fast')
      const res = toggleBlockMute(code, offsetInFast)
      expect(res).not.toBeNull()
      expect(res?.block.name).toBe('$')
      expect(res?.block.line).toBe(0)
      expect(res?.muted).toBe(true)
      expect(res?.newCode.startsWith('_$: s("bd sd")')).toBe(true)
    })

    it('returns null if no root blocks found', () => {
      const code = `console.log("hello world")`
      const res = toggleBlockMute(code, 0)
      expect(res).toBeNull()
    })

    it('correctly handles cursor offset at small positions (0, 1, 2) on line 0 in multi-block document', () => {
      const code = `$: s("bd")\n_$: s("hh")\nd1: s("arpy")`
      // Cursor pos 0 (before '$' on line 0)
      const res0 = toggleBlockMute(code, { pos: 0 })
      expect(res0?.block.name).toBe('$')
      expect(res0?.block.line).toBe(0)
      expect(res0?.muted).toBe(true)
      expect(res0?.newCode).toBe(`_$: s("bd")\n_$: s("hh")\nd1: s("arpy")`)

      // Cursor pos 1 (between '$' and ':' on line 0)
      const res1 = toggleBlockMute(code, { pos: 1 })
      expect(res1?.block.name).toBe('$')
      expect(res1?.block.line).toBe(0)
      expect(res1?.muted).toBe(true)

      // Cursor pos 2 (after ':' on line 0) - MUST NOT match line 2!
      const res2 = toggleBlockMute(code, { pos: 2 })
      expect(res2?.block.name).toBe('$')
      expect(res2?.block.line).toBe(0)
      expect(res2?.muted).toBe(true)
      expect(res2?.newCode).toBe(`_$: s("bd")\n_$: s("hh")\nd1: s("arpy")`)
    })

    it('correctly targets explicit line index via { line: N }', () => {
      const code = `$: s("bd")\n_$: s("hh")\nd1: s("arpy")`
      const resLine2 = toggleBlockMute(code, { line: 2 })
      expect(resLine2?.block.name).toBe('d1')
      expect(resLine2?.block.line).toBe(2)
      expect(resLine2?.muted).toBe(true)
      expect(resLine2?.newCode).toBe(`$: s("bd")\n_$: s("hh")\n_d1: s("arpy")`)
    })
  })

  describe('toggleAllBlocks', () => {
    it('mutes all unmuted blocks at once', () => {
      const code = `$: s("bd")\n_$: s("hh")\nd1: s("arpy")`
      const mutedAll = toggleAllBlocks(code, true)
      expect(mutedAll).toBe(`_$: s("bd")\n_$: s("hh")\n_d1: s("arpy")`)
    })

    it('unmutes all muted blocks at once', () => {
      const code = `_$: s("bd")\n_$: s("hh")\n_d1: s("arpy")`
      const unmutedAll = toggleAllBlocks(code, false)
      expect(unmutedAll).toBe(`$: s("bd")\n$: s("hh")\nd1: s("arpy")`)
    })

    it('handles mixed blocks with indentation and preserves surrounding text', () => {
      const code = `  $: s("bd")\n  _d1: s("hh")`
      const muted = toggleAllBlocks(code, true)
      expect(muted).toBe(`  _$: s("bd")\n  _d1: s("hh")`)

      const unmuted = toggleAllBlocks(muted, false)
      expect(unmuted).toBe(`  $: s("bd")\n  d1: s("hh")`)
    })
  })
})
