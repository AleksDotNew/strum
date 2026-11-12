import { describe, it, expect } from 'vitest'
import { encodeStrudelUrl, decodeStrudelUrl } from '../../src/storage/shareUrl'

describe('shareUrl', () => {
  it('encodes code into strudel.cc URL', () => {
    const code = 's("bd sd")'
    const url = encodeStrudelUrl(code)
    expect(url.startsWith('https://strudel.cc/#')).toBe(true)
  })

  it('roundtrips utf-8 code through encode and decode', () => {
    const code = '// Привет, мир!\ns("bd [~ cp]")\n.lpf(800)'
    const url = encodeStrudelUrl(code)
    const decoded = decodeStrudelUrl(url)
    expect(decoded).toBe(code)
  })

  it('decodes raw hash', () => {
    const code = 's("hh*8")'
    const url = encodeStrudelUrl(code)
    const hash = url.split('#')[1]
    expect(decodeStrudelUrl(hash)).toBe(code)
  })

  it('returns null on invalid hash', () => {
    expect(decodeStrudelUrl('invalid!!base64')).toBeNull()
  })
})
