export const SAMPLE_CACHE_NAME = 'strum-samples-v1'

function getCacheStorage(): CacheStorage | undefined {
  if (typeof window !== 'undefined' && 'caches' in window) {
    return window.caches
  }
  return undefined
}

export async function isSampleCached(url: string): Promise<boolean> {
  const cs = getCacheStorage()
  if (!cs) return false
  try {
    const cache = await cs.open(SAMPLE_CACHE_NAME)
    const match = await cache.match(url)
    return Boolean(match)
  } catch {
    return false
  }
}

export async function cacheAudioSample(url: string): Promise<boolean> {
  const cs = getCacheStorage()
  if (!cs) return false
  try {
    const cache = await cs.open(SAMPLE_CACHE_NAME)
    const resp = await fetch(url)
    if (resp.ok) {
      await cache.put(url, resp)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function getCachedSampleUrls(): Promise<string[]> {
  const cs = getCacheStorage()
  if (!cs) return []
  try {
    const cache = await cs.open(SAMPLE_CACHE_NAME)
    const requests = await cache.keys()
    return requests.map((req) => req.url)
  } catch {
    return []
  }
}

export async function clearSampleCache(): Promise<void> {
  const cs = getCacheStorage()
  if (!cs) return
  try {
    await cs.delete(SAMPLE_CACHE_NAME)
  } catch {}
}
