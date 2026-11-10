import { expect, test } from 'vitest'
import { toEngineError } from '../../src/engine/errors'

test('extracts line from strudel/acorn error', () => {
  const e = Object.assign(new SyntaxError('Unexpected token (3:5)'), {
    loc: { line: 3, column: 5 },
  })
  expect(toEngineError(e)).toEqual({ message: 'Unexpected token (3:5)', line: 3 })
})

test('handles non-Error values', () => {
  expect(toEngineError('boom')).toEqual({ message: 'boom', line: null })
})

test('parses line from message when loc absent', () => {
  expect(toEngineError(new Error('foo (7:1)'))).toEqual({ message: 'foo (7:1)', line: 7 })
})

