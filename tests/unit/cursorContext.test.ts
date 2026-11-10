import { expect, test } from 'vitest'
import { cursorContext as c } from '../../src/editor/cursorContext'

test('inside double quotes is mini', () => expect(c('s("bd ', 6)).toBe('mini'))
test('inside backticks is mini', () => expect(c('s(`bd\nsd', 8)).toBe('mini'))
test('single quotes are plain js strings', () => expect(c("samples('gith", 13)).toBe('js'))
test('after closing quote is js', () => expect(c('s("bd").', 8)).toBe('js'))
test('escaped quote stays in string', () => expect(c('s("a\\"b ', 8)).toBe('mini'))
test('line comment is js', () => expect(c('// "x', 5)).toBe('js'))
