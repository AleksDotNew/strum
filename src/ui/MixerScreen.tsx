import { createSignal, createMemo, For, Show } from 'solid-js'
import {
  findMixerChannels,
  updateChannelGainInCode,
  toggleChannelMuteInCode,
  type MixerChannel,
} from '../code-model/mixerModel'

export interface MixerScreenProps {
  code: string
  onUpdateCode(newCode: string): void
  onSwitchToCode(): void
}

export function MixerScreen(props: MixerScreenProps) {
  const channels = createMemo(() => findMixerChannels(props.code))
  const [soloedChannelId, setSoloedChannelId] = createSignal<string | null>(null)

  const handleGainChange = (channel: MixerChannel, newGain: number) => {
    const res = updateChannelGainInCode(props.code, channel, newGain)
    if (res.ok) {
      props.onUpdateCode(res.code)
    }
  }

  const handleToggleMute = (channel: MixerChannel) => {
    const nextMuted = !channel.isMuted
    const res = toggleChannelMuteInCode(props.code, channel, nextMuted)
    if (res.ok) {
      props.onUpdateCode(res.code)
    }
  }

  const handleToggleSolo = (channel: MixerChannel) => {
    if (soloedChannelId() === channel.id) {
      // Unsolo: unmute all
      setSoloedChannelId(null)
      let currentCode = props.code
      for (const ch of channels()) {
        const res = toggleChannelMuteInCode(currentCode, ch, false)
        if (res.ok) currentCode = res.code
      }
      props.onUpdateCode(currentCode)
    } else {
      // Solo this channel: unmute this, mute others
      setSoloedChannelId(channel.id)
      let currentCode = props.code
      for (const ch of channels()) {
        const shouldMute = ch.id !== channel.id
        const res = toggleChannelMuteInCode(currentCode, ch, shouldMute)
        if (res.ok) currentCode = res.code
      }
      props.onUpdateCode(currentCode)
    }
  }

  const handleLoadMultiChannelTemplate = () => {
    const template = `$: s("bd*2").gain(0.8)
$: s("~ cp").gain(0.7)
$: s("hh*8").gain(0.5)`
    props.onUpdateCode(template)
  }

  return (
    <div
      data-testid="mixer-screen"
      style={{
        flex: 1,
        display: 'flex',
        'flex-direction': 'column',
        overflow: 'hidden',
        background: '#0e0f12',
        color: '#e8e6e3',
      }}
    >
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '10px 16px',
          background: '#14171d',
          'border-bottom': '1px solid #1f242e',
        }}
      >
        <span style={{ 'font-weight': '600', color: 'var(--accent)' }}>
          Микшер дорожек ({channels().length})
        </span>
        <button
          style={{
            'min-height': '36px',
            padding: '0 10px',
            background: '#1e2430',
            border: '1px solid #2e3646',
            color: 'var(--text)',
            'border-radius': '6px',
            'font-size': '12px',
            cursor: 'pointer',
          }}
          onClick={handleLoadMultiChannelTemplate}
        >
          + 3-канальный джем
        </button>
      </div>

      {/* Channel Strips Container */}
      <div
        style={{
          flex: 1,
          'overflow-y': 'auto',
          padding: '12px',
          display: 'flex',
          'flex-direction': 'column',
          gap: '12px',
        }}
      >
        <Show
          when={channels().length > 0}
          fallback={
            <div
              style={{
                padding: '32px 16px',
                'text-align': 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                'flex-direction': 'column',
                gap: '12px',
                'align-items': 'center',
              }}
            >
              <div>В текущем коде не обнаружено независимых дорожек или блоков $:</div>
              <button
                style={{
                  'min-height': '48px',
                  padding: '0 16px',
                  background: 'var(--accent)',
                  color: '#000',
                  border: 'none',
                  'border-radius': '8px',
                  'font-weight': '600',
                  cursor: 'pointer',
                }}
                onClick={handleLoadMultiChannelTemplate}
              >
                Создать многоканальный шаблон
              </button>
            </div>
          }
        >
          <For each={channels()}>
            {(ch, idx) => (
              <div
                data-testid={`channel-strip-${idx()}`}
                style={{
                  background: '#13161c',
                  border: ch.isMuted ? '1px solid #362020' : '1px solid #232936',
                  'border-radius': '10px',
                  padding: '12px',
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: '10px',
                  opacity: ch.isMuted ? 0.7 : 1,
                }}
              >
                {/* Channel Label & Meter Header */}
                <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    <span
                      style={{
                        'font-weight': '700',
                        'font-size': '15px',
                        color: ch.isMuted ? '#888' : 'var(--accent)',
                        'font-family': 'monospace',
                      }}
                    >
                      {ch.label}
                    </span>
                    <Show when={ch.isLabeled}>
                      <span
                        style={{
                          'font-size': '11px',
                          padding: '1px 5px',
                          background: '#1d222e',
                          color: '#7cf0b0',
                          'border-radius': '4px',
                        }}
                      >
                        $:
                      </span>
                    </Show>
                  </div>

                  <span
                    style={{
                      'font-size': '13px',
                      'font-weight': '600',
                      color: ch.isMuted ? '#ff6b6b' : 'var(--text)',
                      'font-family': 'monospace',
                    }}
                  >
                    {ch.isMuted ? 'MUTE' : `gain: ${Math.round(ch.gain * 100) / 100}`}
                  </span>
                </div>

                {/* Slider Row & Mute / Solo Buttons */}
                <div style={{ display: 'flex', 'align-items': 'center', gap: '10px' }}>
                  <input
                    type="range"
                    role="slider"
                    aria-label={`Volume for ${ch.label}`}
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={ch.gain}
                    disabled={ch.isMuted}
                    onInput={(e) => handleGainChange(ch, parseFloat(e.currentTarget.value))}
                    style={{
                      flex: 1,
                      height: '48px',
                      cursor: 'pointer',
                      'accent-color': 'var(--accent)',
                      'touch-action': 'manipulation',
                    }}
                  />

                  {/* Mute Button */}
                  <button
                    aria-label="Mute"
                    class={ch.isMuted ? 'active-mute' : ''}
                    style={{
                      'min-width': '44px',
                      'min-height': '44px',
                      background: ch.isMuted ? '#ff4d4d' : '#1e2430',
                      color: ch.isMuted ? '#fff' : 'var(--text)',
                      border: '1px solid #363e50',
                      'border-radius': '6px',
                      'font-weight': '700',
                      'font-size': '14px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleMute(ch)}
                  >
                    M
                  </button>

                  {/* Solo Button */}
                  <button
                    aria-label="Solo"
                    class={soloedChannelId() === ch.id ? 'active-solo' : ''}
                    style={{
                      'min-width': '44px',
                      'min-height': '44px',
                      background: soloedChannelId() === ch.id ? '#ffd166' : '#1e2430',
                      color: soloedChannelId() === ch.id ? '#000' : 'var(--text)',
                      border: '1px solid #363e50',
                      'border-radius': '6px',
                      'font-weight': '700',
                      'font-size': '14px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleSolo(ch)}
                  >
                    S
                  </button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
