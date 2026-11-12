import { describe, it, expect, beforeEach } from 'vitest'
import { cacheAudioSample, isSampleCached, getCachedSampleUrls, clearSampleCache } from '../../src/storage/sampleCache'

describe('sampleCache', () => {
  beforeEach(async () => {
    await clearSampleCache()
  })

  it('handles caching and checking sample URLs gracefully', async () => {
    // In node/vitest, caches might be mock or undefined; must not throw
    const url = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/master/bd/BT0A0A0.wav'
    const cachedBefore = await isSampleCached(url)
    expect(typeof cachedBefore).toBe('boolean')

    const cachedList = await getCachedSampleUrls()
    expect(Array.isArray(cachedList)).toBe(true)
  })
})
