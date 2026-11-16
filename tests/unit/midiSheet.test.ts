// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  formatMidiActivity,
  validateBindingInput,
  generateMidiOutSnippet,
} from '../../src/ui/MidiSheet'

describe('MidiSheet helpers', () => {
  describe('formatMidiActivity', () => {
    it('formats CC activity correctly', () => {
      const text = formatMidiActivity({
        type: 'cc',
        cc: 74,
        value: 120,
        channel: 2,
        deviceName: 'Minilab 3',
        timestamp: Date.now(),
      })
      expect(text).toBe('[Minilab 3] CC 74 = 120 (Ch 2)')
    })

    it('formats Note On and Note Off activity', () => {
      const onText = formatMidiActivity({
        type: 'noteon',
        note: 60,
        velocity: 100,
        channel: 1,
        deviceName: 'Keyboard',
        timestamp: Date.now(),
      })
      expect(onText).toBe('[Keyboard] Note On 60 (Vel 100, Ch 1)')

      const offText = formatMidiActivity({
        type: 'noteoff',
        note: 60,
        channel: 1,
        deviceName: 'Keyboard',
        timestamp: Date.now(),
      })
      expect(offText).toBe('[Keyboard] Note Off 60 (Ch 1)')
    })
  })

  describe('validateBindingInput', () => {
    it('accepts valid input and parses min and max', () => {
      const res = validateBindingInput('Filter Cutoff', '20', '20000')
      expect(res.valid).toBe(true)
      expect(res.min).toBe(20)
      expect(res.max).toBe(20000)
    })

    it('rejects empty name or invalid numbers', () => {
      expect(validateBindingInput('', '0', '1').valid).toBe(false)
      expect(validateBindingInput('Name', 'abc', '1').valid).toBe(false)
      expect(validateBindingInput('Name', '0', 'xyz').valid).toBe(false)
    })
  })

  describe('generateMidiOutSnippet', () => {
    it('generates pattern code with device name', () => {
      const snippet = generateMidiOutSnippet('Roland S-1')
      expect(snippet).toBe('s("midi").note("c3 e3 g3").midiout("Roland S-1")')
    })
  })
})
