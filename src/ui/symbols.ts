import type { CursorCtx } from '../editor/cursorContext'

export interface SymbolAction {
  label: string
  insert: string
  cursorOffset?: number
}

const MINI_SYMBOLS: SymbolAction[] = [
  { label: '~', insert: '~' },
  { label: '*', insert: '*' },
  { label: '/', insert: '/' },
  { label: '[ ]', insert: '[]', cursorOffset: 1 },
  { label: '< >', insert: '<>', cursorOffset: 1 },
  { label: ',', insert: ', ' },
  { label: '?', insert: '?' },
  { label: '!', insert: '!' },
  { label: '@', insert: '@' },
  { label: ':', insert: ':' },
  { label: '.', insert: '.' },
  { label: '|', insert: '|' },
  { label: '⇥', insert: '  ' },
  { label: '⌫', insert: '\b' },
]

const JS_SYMBOLS: SymbolAction[] = [
  { label: '$:', insert: '$: ' },
  { label: 's( )', insert: 's("")', cursorOffset: 3 },
  { label: 'note( )', insert: 'note("")', cursorOffset: 6 },
  { label: 'n( )', insert: 'n("")', cursorOffset: 3 },
  { label: '.bank( )', insert: '.bank("")', cursorOffset: 7 },
  { label: '.fast( )', insert: '.fast()', cursorOffset: 6 },
  { label: '.slow( )', insert: '.slow()', cursorOffset: 6 },
  { label: '.lpf( )', insert: '.lpf()', cursorOffset: 5 },
  { label: '.gain( )', insert: '.gain()', cursorOffset: 6 },
  { label: '.room( )', insert: '.room()', cursorOffset: 6 },
  { label: '.', insert: '.' },
  { label: '(', insert: '()', cursorOffset: 1 },
  { label: '[', insert: '[]', cursorOffset: 1 },
  { label: '"', insert: '""', cursorOffset: 1 },
  { label: '⇥', insert: '  ' },
  { label: '⌫', insert: '\b' },
]

export function symbolsFor(ctx: CursorCtx): SymbolAction[] {
  return ctx === 'mini' ? MINI_SYMBOLS : JS_SYMBOLS
}
