import { cursorContext } from '../editor/cursorContext'
import { getFunction } from './functionCatalog'
import { SOUND_CATALOG } from './soundCatalog'
import { getChord, getScale, parseScaleSpec } from './scaleCatalog'

export interface ExtractedWord {
  word: string
  from: number
  to: number
}

export function extractWordAt(code: string, pos: number): ExtractedWord | null {
  if (pos < 0 || pos > code.length) return null

  let start = pos
  while (start > 0 && /[a-zA-Z0-9_$:]/.test(code[start - 1])) {
    start--
  }
  let end = pos
  while (end < code.length && /[a-zA-Z0-9_$:]/.test(code[end])) {
    end++
  }
  if (start >= end) return null
  return { word: code.slice(start, end), from: start, to: end }
}

export function resolveCursorHint(code: string, pos: number): string | null {
  if (!code || pos < 0 || pos > code.length) return null

  let targetPos = pos
  if (targetPos > 0 && (targetPos >= code.length || !/[a-zA-Z0-9_$:]/.test(code[targetPos]))) {
    if (/[a-zA-Z0-9_$:]/.test(code[targetPos - 1])) {
      targetPos = targetPos - 1
    }
  }

  const extracted = extractWordAt(code, targetPos)
  if (!extracted) return null
  const { word, from } = extracted
  const ctx = cursorContext(code, from)

  if (ctx === 'mini') {
    const beforeWord = code.slice(0, from)
    const scaleCallIndex = beforeWord.lastIndexOf('.scale(')
    if (scaleCallIndex !== -1 && scaleCallIndex > beforeWord.lastIndexOf(')')) {
      const { scale } = parseScaleSpec(word)
      const matchedScale = getScale(scale)
      if (matchedScale) {
        return `Scale ${matchedScale.name} [${matchedScale.category}]: ${matchedScale.description || matchedScale.intervals?.join(' ') || ''}`
      }
    }

    const sound = SOUND_CATALOG.find((s) => s.name === word)
    if (sound) {
      const typeLabel = sound.isSynth ? 'synth' : sound.category
      return `${sound.name} [${typeLabel}]: ${sound.description || ''}`
    }

    const chord = getChord(word)
    if (chord) {
      return `Chord ${chord.symbol} (${chord.name}): ${chord.description || chord.intervals?.join(' ') || ''}`
    }

    const fallbackScale = getScale(word)
    if (fallbackScale) {
      return `Scale ${fallbackScale.name} [${fallbackScale.category}]: ${fallbackScale.description || ''}`
    }
  }

  const cleanWord = word.replace(/^[$:]+/, '')
  const fn = getFunction(cleanWord) || getFunction(word)
  if (fn) {
    return `${fn.signature} — ${fn.description}`
  }

  const scaleInJs = getScale(word)
  if (scaleInJs) {
    return `Scale ${scaleInJs.name} [${scaleInJs.category}]: ${scaleInJs.description || ''}`
  }

  const soundInJs = SOUND_CATALOG.find((s) => s.name === word)
  if (soundInJs) {
    return `${soundInJs.name} [${soundInJs.category}]: ${soundInJs.description || ''}`
  }

  return null
}
