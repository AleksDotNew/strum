import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { strumCompletionSource } from '../../src/editor/autocomplete'

describe('autocomplete', () => {
  it('suggests method chain functions after dot in JS context', () => {
    const doc = 's("bd").'
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, true)
    const result = strumCompletionSource(context)

    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('lpf')
    expect(labels).toContain('gain')
    expect(labels).toContain('room')
    expect(labels).toContain('fast')
  })

  it('suggests top-level functions when starting typing in JS context', () => {
    const doc = 'st'
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, true)
    const result = strumCompletionSource(context)

    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('stack')
  })

  it('suggests sound samples when typing inside mini-notation', () => {
    const doc = 's("b'
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, true)
    const result = strumCompletionSource(context)

    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('bd')
    expect(labels).toContain('bass')
  })

  it('suggests scales when inside .scale("...")', () => {
    const doc = 'note("0 2 4").scale("do'
    const state = EditorState.create({ doc })
    const context = new CompletionContext(state, doc.length, true)
    const result = strumCompletionSource(context)

    expect(result).not.toBeNull()
    const labels = result!.options.map((o) => o.label)
    expect(labels).toContain('dorian')
  })
})
