import { createSignal, onCleanup } from 'solid-js'
import { getAudioContext } from '@strudel/webaudio'
import { audioRecorder, type RecordResult } from '../engine/audioRecorder'
import { formatRecordTime } from './RecordSheet'

export interface TopBarProps {
  playing: boolean
  bpm: number
  status: string
  onTogglePlay(): void
  onEval(): void
  onBpmClick(): void
  onMenuClick(): void
  onHush?(): void
  onOpenRecordSheet?(result?: RecordResult | null, initialTab?: 'live' | 'bounce'): void
  onBounceClick?(): void
}

export function TopBar(props: TopBarProps) {
  let startY = 0
  let isPointerDown = false

  const [isRecording, setIsRecording] = createSignal(false)
  const [seconds, setSeconds] = createSignal(0)
  let timerInterval: any = null

  const handleToggleRecord = async () => {
    if (!isRecording()) {
      try {
        let ctx: AudioContext
        try {
          ctx = getAudioContext()
        } catch {
          const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (globalThis as any).webkitAudioContext
          ctx = new Ctx()
        }
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        audioRecorder.start(ctx)
        setIsRecording(true)
        setSeconds(0)
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(() => {
          setSeconds((s) => s + 1)
        }, 1000)
      } catch (e) {
        console.error('[TopBar] Failed to start recording:', e)
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      setIsRecording(false)
      try {
        const result = await audioRecorder.stop()
        props.onOpenRecordSheet?.(result, 'live')
      } catch (e) {
        console.error('[TopBar] Failed to stop recording:', e)
        props.onOpenRecordSheet?.(null, 'live')
      }
    }
  }

  onCleanup(() => {
    if (timerInterval) clearInterval(timerInterval)
  })

  const handlePointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    startY = e.clientY
    isPointerDown = true
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerDown) return
    if (e.clientY - startY > 40) {
      isPointerDown = false
      props.onHush?.()
    }
  }

  const handlePointerUp = (e: PointerEvent) => {
    isPointerDown = false
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerCancel = () => {
    isPointerDown = false
  }

  return (
    <header
      class="topbar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
        <button
          aria-label={props.playing ? 'Stop' : 'Play'}
          onClick={props.onTogglePlay}
        >
          {props.playing ? '■' : '▶'}
        </button>
        <button
          class="bpm-btn"
          aria-label="Set BPM"
          onClick={props.onBpmClick}
        >
          {props.bpm} bpm
        </button>
        <button
          class="rec-btn"
          classList={{ recording: isRecording() }}
          aria-label={isRecording() ? 'Stop Recording' : 'Record'}
          onClick={handleToggleRecord}
          style={{
            'min-width': '48px',
            'min-height': '48px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            gap: '4px',
            color: isRecording() ? '#ff4d4d' : 'var(--muted)',
            'font-size': '13px',
            'font-family': 'monospace',
            padding: '0 8px',
          }}
        >
          <span class="rec-dot" style={{ color: '#ff4d4d' }}>●</span>
          <span>{isRecording() ? formatRecordTime(seconds()) : 'REC'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
        <span class="status-pill" data-testid="engine-status">
          {props.status}
        </span>
        <button aria-label="Eval" onClick={props.onEval}>
          ⟳
        </button>
        <button aria-label="Menu" onClick={props.onMenuClick}>
          ⋮
        </button>
      </div>
    </header>
  )
}
