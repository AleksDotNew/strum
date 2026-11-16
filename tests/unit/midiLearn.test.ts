import { describe, it, expect, vi } from 'vitest'
import {
  mapMidiValue,
  MidiLearnRegistry,
  type MidiLearnBinding,
} from '../../src/midi/midiLearn'

describe('midiLearn', () => {
  describe('mapMidiValue', () => {
    it('scales 0-127 MIDI CC value to parameter range linearly', () => {
      expect(mapMidiValue(0, 100, 1000)).toBe(100)
      expect(mapMidiValue(127, 100, 1000)).toBe(1000)
      expect(mapMidiValue(64, 0, 1)).toBeCloseTo(0.504, 2)
    })

    it('clamps inputs below 0 and above 127', () => {
      expect(mapMidiValue(-10, 0, 100)).toBe(0)
      expect(mapMidiValue(200, 0, 100)).toBe(100)
    })

    it('handles inverted ranges (max < min)', () => {
      expect(mapMidiValue(0, 100, 0)).toBe(100)
      expect(mapMidiValue(127, 100, 0)).toBe(0)
      expect(mapMidiValue(64, 100, 0)).toBeCloseTo(49.6, 1)
    })

    it('supports exponential curve for positive ranges', () => {
      const min = 20
      const max = 20000
      expect(mapMidiValue(0, min, max, 'exponential')).toBeCloseTo(20, 1)
      expect(mapMidiValue(127, min, max, 'exponential')).toBeCloseTo(20000, 1)
      // Around midpoint (63.5 / 127 = 0.5), value should be close to geometric mean sqrt(20 * 20000) = 632.45
      const midVal = mapMidiValue(64, min, max, 'exponential')
      expect(midVal).toBeGreaterThan(500)
      expect(midVal).toBeLessThan(800)
    })

    it('falls back to linear when exponential range has non-positive min or max', () => {
      expect(mapMidiValue(0, -10, 10, 'exponential')).toBe(-10)
      expect(mapMidiValue(127, -10, 10, 'exponential')).toBe(10)
    })
  })

  describe('MidiLearnRegistry', () => {
    it('registers and triggers CC binding', () => {
      const registry = new MidiLearnRegistry()
      let updatedVal = -1
      const id = registry.bind(74, 1, {
        min: 200,
        max: 2000,
        apply: (val) => {
          updatedVal = val
        },
      })

      expect(typeof id).toBe('string')
      expect(registry.getBindings()).toHaveLength(1)
      expect(registry.getBindings()[0].id).toBe(id)

      registry.handleCC(74, 127, 1)
      expect(updatedVal).toBe(2000)

      registry.handleCC(74, 0, 1)
      expect(updatedVal).toBe(200)
    })

    it('respects channel matching and wildcard channels', () => {
      const registry = new MidiLearnRegistry()
      const callsCh1: number[] = []
      const callsAnyCh: number[] = []

      registry.bind(10, 1, {
        min: 0,
        max: 100,
        apply: (v) => callsCh1.push(v),
      })

      registry.bind(10, undefined, {
        min: 0,
        max: 100,
        apply: (v) => callsAnyCh.push(v),
      })

      // Send to channel 1 -> both should fire
      registry.handleCC(10, 127, 1)
      expect(callsCh1).toEqual([100])
      expect(callsAnyCh).toEqual([100])

      // Send to channel 2 -> only wildcard should fire
      registry.handleCC(10, 64, 2)
      expect(callsCh1).toHaveLength(1)
      expect(callsAnyCh).toHaveLength(2)
    })

    it('removes binding on unbind', () => {
      const registry = new MidiLearnRegistry()
      let called = false
      const id = registry.bind(7, undefined, {
        min: 0,
        max: 1,
        apply: () => {
          called = true
        },
      })

      expect(registry.getBindings()).toHaveLength(1)
      registry.unbind(id)
      expect(registry.getBindings()).toHaveLength(0)

      registry.handleCC(7, 127)
      expect(called).toBe(false)
    })

    it('handles MIDI Learn mode capture and cancellation', () => {
      const registry = new MidiLearnRegistry()
      expect(registry.isLearning()).toBe(false)

      const learnCb = vi.fn()
      const stopLearn = registry.startLearn(learnCb)

      expect(registry.isLearning()).toBe(true)

      registry.handleCC(22, 90, 3)
      expect(learnCb).toHaveBeenCalledWith(22, 3)

      stopLearn()
      expect(registry.isLearning()).toBe(false)

      registry.handleCC(23, 100, 3)
      expect(learnCb).toHaveBeenCalledTimes(1)
    })

    it('notifies listeners when bindings change', () => {
      const registry = new MidiLearnRegistry()
      const listener = vi.fn()
      const unsub = registry.onBindingsChange(listener)

      const id = registry.bind(1, undefined, {
        apply: () => {},
      })
      expect(listener).toHaveBeenCalledTimes(1)

      registry.unbind(id)
      expect(listener).toHaveBeenCalledTimes(2)

      unsub()
      registry.bind(2, undefined, { apply: () => {} })
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})
