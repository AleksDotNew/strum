import { describe, expect, it } from 'vitest'
import {
  findMixerChannels,
  updateChannelGainInCode,
  toggleChannelMuteInCode,
} from '../../src/code-model/mixerModel'

describe('mixerModel - channel extraction and gain/mute code rewriting', () => {
  it('detects channels in a stack() expression', () => {
    const code = `stack(
  s("bd*2").gain(0.8),
  s("~ cp"),
  s("hh*8").gain(0.5)
)`
    const channels = findMixerChannels(code)
    expect(channels.length).toBe(3)

    expect(channels[0].label).toContain('bd')
    expect(channels[0].gain).toBe(0.8)
    expect(channels[0].gainLiteral).toBeDefined()

    expect(channels[1].label).toContain('cp')
    expect(channels[1].gain).toBe(1.0) // default
    expect(channels[1].gainLiteral).toBeUndefined()

    expect(channels[2].label).toContain('hh')
    expect(channels[2].gain).toBe(0.5)
  })

  it('detects channels in multi-block $: patterns with mute _$:', () => {
    const code = `$: s("bd sd").gain(0.9)
_$: s("hh*8")`

    const channels = findMixerChannels(code)
    expect(channels.length).toBe(2)
    expect(channels[0].isMuted).toBe(false)
    expect(channels[0].gain).toBe(0.9)

    expect(channels[1].isMuted).toBe(true)
  })

  it('updates channel gain in code by replacing existing gain literal', () => {
    const code = 's("bd*2").gain(0.8)'
    const channels = findMixerChannels(code)
    expect(channels.length).toBe(1)

    const res = updateChannelGainInCode(code, channels[0], 0.35)
    expect(res.ok).toBe(true)
    expect(res.code).toBe('s("bd*2").gain(0.35)')
  })

  it('adds .gain(value) call when channel has no existing gain', () => {
    const code = 's("bd sd")'
    const channels = findMixerChannels(code)
    expect(channels.length).toBe(1)

    const res = updateChannelGainInCode(code, channels[0], 0.75)
    expect(res.ok).toBe(true)
    expect(res.code).toBe('s("bd sd").gain(0.75)')
  })

  it('toggles channel mute between $: and _$:', () => {
    const code = '$: s("bd sd")'
    const channels = findMixerChannels(code)
    expect(channels[0].isMuted).toBe(false)

    const mutedRes = toggleChannelMuteInCode(code, channels[0], true)
    expect(mutedRes.ok).toBe(true)
    expect(mutedRes.code).toBe('_$: s("bd sd")')

    const unmutedChannels = findMixerChannels(mutedRes.code)
    expect(unmutedChannels[0].isMuted).toBe(true)
    const unmutedRes = toggleChannelMuteInCode(mutedRes.code, unmutedChannels[0], false)
    expect(unmutedRes.ok).toBe(true)
    expect(unmutedRes.code).toBe('$: s("bd sd")')
  })
})
