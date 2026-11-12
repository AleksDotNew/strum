import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { autocompletion } from '@codemirror/autocomplete'
import { cursorContext } from './cursorContext'
import { getAllFunctions } from '../hints/functionCatalog'
import { getAllSounds } from '../hints/soundCatalog'
import { getAllScales, getAllChords } from '../hints/scaleCatalog'

export function strumCompletionSource(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc.toString()
  const textBefore = doc.slice(0, context.pos)
  const ctx = cursorContext(textBefore, context.pos)

  // 1. Inside mini-notation string ("..." or `...`)
  if (ctx === 'mini') {
    const word = context.matchBefore(/[a-zA-Z0-9_:]*/)
    if (!word && !context.explicit) return null

    const from = word ? word.from : context.pos
    const quoteIdx = Math.max(
      textBefore.lastIndexOf('"'),
      textBefore.lastIndexOf('`'),
      textBefore.lastIndexOf("'"),
    )
    const beforeQuote = quoteIdx !== -1 ? textBefore.slice(0, quoteIdx).trim() : ''

    // If inside .scale(...)
    if (beforeQuote.endsWith('.scale(')) {
      const scales = getAllScales()
      const options: Completion[] = scales.map((s) => ({
        label: s.name,
        type: 'constant',
        detail: s.category,
        info: s.description || s.intervals?.join(' '),
      }))
      return {
        from,
        options,
        validFor: /^[a-zA-Z0-9_:]*$/,
      }
    }

    // Otherwise suggest sounds and chords
    const sounds = getAllSounds()
    const chords = getAllChords()

    const soundOptions: Completion[] = sounds.map((s) => ({
      label: s.name,
      type: s.isSynth ? 'keyword' : 'variable',
      detail: s.category,
      info: s.description,
    }))

    const chordOptions: Completion[] = chords.map((c) => ({
      label: c.symbol,
      type: 'type',
      detail: c.name,
      info: c.description || c.intervals?.join(' '),
    }))

    return {
      from,
      options: [...soundOptions, ...chordOptions],
      validFor: /^[a-zA-Z0-9_:]*$/,
    }
  }

  // 2. JS Context
  // Check for dot call (e.g. .lpf, .gain, .fast)
  const dotMatch = context.matchBefore(/\.[a-zA-Z0-9_$]*/)
  if (dotMatch) {
    const from = dotMatch.from + 1 // skip the dot
    const fns = getAllFunctions()
    const options: Completion[] = fns
      .filter((f) => f.category !== 'system')
      .map((f) => ({
        label: f.name,
        type: 'function',
        detail: f.signature,
        info: f.description,
        apply: `${f.name}()`,
      }))
    return {
      from,
      options,
      validFor: /^[a-zA-Z0-9_$]*$/,
    }
  }

  // Expression or statement start
  const wordMatch = context.matchBefore(/[a-zA-Z0-9_$]+/)
  if (wordMatch || context.explicit) {
    const from = wordMatch ? wordMatch.from : context.pos
    const fns = getAllFunctions()
    const options: Completion[] = fns.map((f) => ({
      label: f.name,
      type: 'function',
      detail: f.signature,
      info: f.description,
      apply: `${f.name}()`,
    }))
    return {
      from,
      options,
      validFor: /^[a-zA-Z0-9_$]*$/,
    }
  }

  return null
}

export function strumAutocompleteExtension() {
  return autocompletion({
    override: [strumCompletionSource],
    defaultKeymap: true,
  })
}
