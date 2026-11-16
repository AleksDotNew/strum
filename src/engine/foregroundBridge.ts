import { registerPlugin, Capacitor } from '@capacitor/core'

export interface AudioForegroundPluginInterface {
  start(options?: { trackName?: string }): Promise<void>
  stop(): Promise<void>
}

export const AudioForeground = registerPlugin<AudioForegroundPluginInterface>('AudioForeground')

let pluginInstance: AudioForegroundPluginInterface = AudioForeground

export function setAudioForegroundPluginForTest(plugin: AudioForegroundPluginInterface | null): void {
  pluginInstance = plugin || AudioForeground
}

type MediaAction = 'play' | 'pause' | 'stop'

const actionListeners: Map<MediaAction, Set<() => void>> = new Map([
  ['play', new Set()],
  ['pause', new Set()],
  ['stop', new Set()],
])

let currentBoundMediaSession: any = null

function ensureMediaSessionHandlers(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession) {
    return
  }
  if (currentBoundMediaSession === navigator.mediaSession) return

  currentBoundMediaSession = navigator.mediaSession
  const actions: MediaAction[] = ['play', 'pause', 'stop']
  for (const act of actions) {
    try {
      navigator.mediaSession.setActionHandler(act as MediaSessionAction, () => {
        const listeners = actionListeners.get(act)
        if (listeners) {
          for (const fn of listeners) {
            try {
              fn()
            } catch (err) {
              console.error(`[ForegroundBridge] Error in ${act} listener:`, err)
            }
          }
        }
      })
    } catch {}
  }
}

/**
 * Register a listener for system media actions (play, pause, stop).
 * Returns an unsubscribe callback.
 */
export function onMediaAction(action: MediaAction, callback: () => void): () => void {
  ensureMediaSessionHandlers()
  const listeners = actionListeners.get(action)
  listeners?.add(callback)

  return () => {
    listeners?.delete(callback)
  }
}

/**
 * Check if Android Foreground Service or Browser Media Session is supported.
 */
export function isForegroundSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) return true
  return false
}

export const isForegroundServiceSupported = isForegroundSupported

/**
 * Start the Android Media Foreground Service and/or set Web MediaSession to playing.
 */
export async function startForegroundAudio(trackName = 'Strum — Live Pattern'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await pluginInstance.start({ trackName })
    } catch (e) {
      console.warn('[ForegroundBridge] Native foreground service start failed:', e)
    }
  }

  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
    try {
      const metadataObj =
        typeof MediaMetadata !== 'undefined'
          ? new MediaMetadata({
              title: trackName,
              artist: 'Strum',
              album: 'Live Coding Studio',
            })
          : {
              title: trackName,
              artist: 'Strum',
              album: 'Live Coding Studio',
            }
      navigator.mediaSession.metadata = metadataObj as any
    } catch {}
    navigator.mediaSession.playbackState = 'playing'
    ensureMediaSessionHandlers()
  }
}

/**
 * Stop the Android Media Foreground Service and/or reset Web MediaSession.
 */
export async function stopForegroundAudio(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await pluginInstance.stop()
    } catch (e) {
      console.warn('[ForegroundBridge] Native foreground service stop failed:', e)
    }
  }

  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
    navigator.mediaSession.playbackState = 'none'
  }
}

/**
 * Update foreground playback state ('playing' | 'paused' | 'none').
 */
export const setForegroundPlaybackState = async (
  state: 'playing' | 'paused' | 'none',
  trackName?: string
): Promise<void> => {
  if (state === 'playing') {
    await startForegroundAudio(trackName)
  } else {
    await stopForegroundAudio()
    if (state === 'paused' && typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      navigator.mediaSession.playbackState = 'paused'
    }
  }
}

export const updateForegroundPlayback = setForegroundPlaybackState
