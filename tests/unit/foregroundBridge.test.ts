import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  startForegroundAudio,
  stopForegroundAudio,
  isForegroundSupported,
  isForegroundServiceSupported,
  setForegroundPlaybackState,
  onMediaAction,
  AudioForeground,
  setAudioForegroundPluginForTest,
} from '../../src/engine/foregroundBridge'
import { Capacitor } from '@capacitor/core'

describe('foregroundBridge', () => {
  const originalMediaSession = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (typeof navigator !== 'undefined' && originalMediaSession) {
      Object.defineProperty(navigator, 'mediaSession', {
        value: originalMediaSession,
        configurable: true,
        writable: true,
      })
    }
  })

  it('reports support correctly across environments', () => {
    const supported = isForegroundSupported()
    expect(typeof supported).toBe('boolean')
    expect(isForegroundServiceSupported()).toBe(supported)
  })

  it('gracefully handles web/desktop fallback when native plugin is unavailable', async () => {
    await expect(startForegroundAudio('Test Track')).resolves.not.toThrow()
    await expect(stopForegroundAudio()).resolves.not.toThrow()
    await expect(setForegroundPlaybackState('playing', 'My Track')).resolves.not.toThrow()
    await expect(setForegroundPlaybackState('none')).resolves.not.toThrow()
    await expect(setForegroundPlaybackState('paused', 'My Track')).resolves.not.toThrow()
  })

  it('updates navigator.mediaSession metadata and playbackState when available', async () => {
    const mockSetActionHandler = vi.fn()
    const mockMediaSession = {
      playbackState: 'none' as MediaSessionPlaybackState,
      metadata: null as any,
      setActionHandler: mockSetActionHandler,
    }

    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      configurable: true,
      writable: true,
    })

    await startForegroundAudio('Acid Jam #1')
    expect(mockMediaSession.playbackState).toBe('playing')
    expect(mockMediaSession.metadata?.title).toBe('Acid Jam #1')
    expect(mockMediaSession.metadata?.artist).toBe('Strum')

    await setForegroundPlaybackState('paused', 'Acid Jam #1')
    expect(mockMediaSession.playbackState).toBe('paused')

    await stopForegroundAudio()
    expect(mockMediaSession.playbackState).toBe('none')
  })

  it('allows registering and unregistering media action callbacks', async () => {
    const mockHandlers: Record<string, () => void> = {}
    const mockMediaSession = {
      playbackState: 'none' as MediaSessionPlaybackState,
      metadata: null as any,
      setActionHandler: vi.fn((action: string, handler: any) => {
        mockHandlers[action] = handler
      }),
    }

    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      configurable: true,
      writable: true,
    })

    const onStop1 = vi.fn()
    const onStop2 = vi.fn()
    const unsubscribe1 = onMediaAction('stop', onStop1)
    const unsubscribe2 = onMediaAction('stop', onStop2)

    mockHandlers['stop']?.()
    expect(onStop1).toHaveBeenCalledTimes(1)
    expect(onStop2).toHaveBeenCalledTimes(1)

    unsubscribe1()
    mockHandlers['stop']?.()
    expect(onStop1).toHaveBeenCalledTimes(1)
    expect(onStop2).toHaveBeenCalledTimes(2)

    unsubscribe2()
  })

  it('calls native plugin methods when running on native platform', async () => {
    const isNativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    const mockPlugin = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    }

    setAudioForegroundPluginForTest(mockPlugin)

    try {
      await startForegroundAudio('Drum Loop')
      expect(mockPlugin.start).toHaveBeenCalledWith({ trackName: 'Drum Loop' })

      await stopForegroundAudio()
      expect(mockPlugin.stop).toHaveBeenCalled()
    } finally {
      setAudioForegroundPluginForTest(null)
      isNativeSpy.mockRestore()
    }
  })
})
