import { describe, expect, it } from 'vitest'
import {
  miniToGrid,
  gridToMini,
  canRepresentAsGrid,
  findGridPatternsInCode,
} from '../../src/code-model/miniGrid'

describe('miniGrid - bidirectional mini-notation step grid converter', () => {
  it('parses simple 4-step and 16-step mini-notation strings into step arrays', () => {
    // 4 beats
    const res4 = miniToGrid('bd sd hh cp', 4)
    expect(res4.supported).toBe(true)
    if (res4.supported) {
      expect(res4.stepCount).toBe(4)
      expect(res4.tracks.length).toBe(4) // 4 distinct sounds
      const bd = res4.tracks.find((t) => t.sound === 'bd')
      expect(bd?.steps).toEqual([true, false, false, false])
      const sd = res4.tracks.find((t) => t.sound === 'sd')
      expect(sd?.steps).toEqual([false, true, false, false])
    }

    // 16 steps with rest '~'
    const res16 = miniToGrid('bd ~ ~ ~ sd ~ ~ ~ bd ~ ~ ~ sd ~ ~ ~', 16)
    expect(res16.supported).toBe(true)
    if (res16.supported) {
      expect(res16.stepCount).toBe(16)
      const bd = res16.tracks.find((t) => t.sound === 'bd')
      expect(bd?.steps[0]).toBe(true)
      expect(bd?.steps[8]).toBe(true)
      expect(bd?.steps[4]).toBe(false)
    }
  })

  it('parses single-sound rhythm with subgroups like "bd*4" or "[bd bd]"', () => {
    const res = miniToGrid('bd*4', 4)
    expect(res.supported).toBe(true)
    if (res.supported) {
      const bd = res.tracks.find((t) => t.sound === 'bd')
      expect(bd?.steps).toEqual([true, true, true, true])
    }

    const resGroup = miniToGrid('[bd ~] [~ bd]', 4)
    expect(resGroup.supported).toBe(true)
    if (resGroup.supported) {
      const bd = resGroup.tracks.find((t) => t.sound === 'bd')
      expect(bd?.steps).toEqual([true, false, false, true])
    }
  })

  it('rejects unsupported complex mini-notation operators with explanation', () => {
    // Polyphony comma, alternating <>, slow/fast polymeter {}, random ? !
    expect(canRepresentAsGrid('bd, sd')).toBe(false)
    expect(canRepresentAsGrid('<bd sd>')).toBe(false)
    expect(canRepresentAsGrid('{bd sd}%4')).toBe(false)
    expect(canRepresentAsGrid('bd?')).toBe(false)
    expect(canRepresentAsGrid('bd:2')).toBe(false)

    const res = miniToGrid('<bd sd>', 16)
    expect(res.supported).toBe(false)
    if (!res.supported) {
      expect(res.reason).toContain('только в коде')
    }
  })

  it('converts grid model back to standard mini-notation string (gridToMini)', () => {
    const mini = gridToMini({
      stepCount: 16,
      tracks: [
        {
          sound: 'bd',
          steps: [
            true, false, false, false,
            false, false, false, false,
            true, false, false, false,
            false, false, false, false,
          ],
        },
      ],
    })
    expect(mini).toBe('bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~')
  })

  it('finds grid-compatible pattern string literals in JavaScript code', () => {
    const code = 'stack(\n  s("bd ~ bd ~"),\n  s("~ sd ~ sd")\n)'
    const patterns = findGridPatternsInCode(code)
    expect(patterns.length).toBe(2)
    expect(patterns[0].literal.value).toBe('bd ~ bd ~')
    expect(patterns[0].supported).toBe(true)
    expect(patterns[1].literal.value).toBe('~ sd ~ sd')
    expect(patterns[1].supported).toBe(true)
  })

  it('correctly updates a step in GridModel and generates updated mini string', () => {
    const grid = {
      stepCount: 8,
      tracks: [
        { sound: 'bd', steps: [true, false, false, false, true, false, false, false] },
      ],
    }
    // Toggle step 2 ON
    grid.tracks[0].steps[2] = true
    const updatedMini = gridToMini(grid)
    expect(updatedMini).toBe('bd ~ bd ~ bd ~ ~ ~')
  })

  it('handles empty mini string gracefully', () => {
    const res = miniToGrid('', 16)
    expect(res.supported).toBe(true)
    if (res.supported) {
      expect(res.tracks[0].steps.every((s) => s === false)).toBe(true)
    }
  })
})
