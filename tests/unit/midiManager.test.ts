import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MidiManager, type MidiDeviceInfo } from '../../src/midi/midiManager'
import { MidiLearnRegistry } from '../../src/midi/midiLearn'

class MockMIDIInput {
  id: string
  name: string
  manufacturer: string
  state: string = 'connected'
  connection: string = 'open'
  type = 'input' as const
  onmidimessage: ((event: any) => void) | null = null

  constructor(id: string, name: string, manufacturer = 'Test') {
    this.id = id
    this.name = name
    this.manufacturer = manufacturer
  }

  simulateMessage(data: number[]) {
    if (this.onmidimessage) {
      this.onmidimessage({
        data: new Uint8Array(data),
        target: this,
      })
    }
  }
}

class MockMIDIOutput {
  id: string
  name: string
  manufacturer: string
  state: string = 'connected'
  connection: string = 'open'
  type = 'output' as const
  sentMessages: number[][] = []

  constructor(id: string, name: string, manufacturer = 'Test') {
    this.id = id
    this.name = name
    this.manufacturer = manufacturer
  }

  send(data: number[] | Uint8Array) {
    this.sentMessages.push(Array.from(data))
  }
}

describe('MidiManager', () => {
  let originalNavigator: any

  beforeEach(() => {
    originalNavigator = globalThis.navigator
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
  })

  it('reports unsupported when navigator.requestMIDIAccess is absent', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    })

    const manager = new MidiManager()
    expect(manager.isSupported()).toBe(false)
    expect(manager.isAvailable()).toBe(false)
    const success = await manager.init()
    expect(success).toBe(false)
  })

  it('enumerates inputs and outputs upon successful init', async () => {
    const input1 = new MockMIDIInput('in-1', 'Arturia Minilab 3', 'Arturia')
    const output1 = new MockMIDIOutput('out-1', 'Roland S-1', 'Roland')

    const inputsMap = new Map<string, any>([['in-1', input1]])
    const outputsMap = new Map<string, any>([['out-1', output1]])

    const mockMIDIAccess = {
      inputs: inputsMap,
      outputs: outputsMap,
      onstatechange: null as any,
    }

    const requestMIDIAccess = vi.fn().mockResolvedValue(mockMIDIAccess)

    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMIDIAccess },
      configurable: true,
      writable: true,
    })

    const registry = new MidiLearnRegistry()
    const manager = new MidiManager(registry)

    expect(manager.isSupported()).toBe(true)
    const initResult = await manager.init()
    expect(initResult).toBe(true)
    expect(manager.isAvailable()).toBe(true)
    expect(requestMIDIAccess).toHaveBeenCalledWith({ sysex: false })

    const inputs = manager.getInputs()
    const outputs = manager.getOutputs()

    expect(inputs).toHaveLength(1)
    expect(inputs[0].name).toBe('Arturia Minilab 3')
    expect(inputs[0].type).toBe('input')

    expect(outputs).toHaveLength(1)
    expect(outputs[0].name).toBe('Roland S-1')
    expect(outputs[0].type).toBe('output')

    expect(manager.getInputNames()).toEqual(['Arturia Minilab 3'])
    expect(manager.getOutputNames()).toEqual(['Roland S-1'])
  })

  it('routes incoming CC messages to MidiLearnRegistry and activity listeners', async () => {
    const input1 = new MockMIDIInput('in-1', 'Akai MPK Mini', 'Akai')
    const inputsMap = new Map<string, any>([['in-1', input1]])
    const outputsMap = new Map<string, any>()

    const mockMIDIAccess = {
      inputs: inputsMap,
      outputs: outputsMap,
      onstatechange: null as any,
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMIDIAccess: vi.fn().mockResolvedValue(mockMIDIAccess) },
      configurable: true,
      writable: true,
    })

    const registry = new MidiLearnRegistry()
    let receivedVal = 0
    registry.bind(74, 1, {
      min: 0,
      max: 100,
      apply: (v) => {
        receivedVal = v
      },
    })

    const manager = new MidiManager(registry)
    const activityEvents: any[] = []
    manager.onActivity((ev) => activityEvents.push(ev))

    await manager.init()

    // Send CC 74 with value 127 on Channel 1 (0xB0 = 176)
    input1.simulateMessage([0xb0, 74, 127])

    expect(receivedVal).toBe(100)
    expect(activityEvents).toHaveLength(1)
    expect(activityEvents[0]).toMatchObject({
      type: 'cc',
      cc: 74,
      value: 127,
      channel: 1,
      deviceName: 'Akai MPK Mini',
    })

    // Send Note On (0x90 = 144) Note 60 Vel 100
    input1.simulateMessage([0x90, 60, 100])
    expect(activityEvents).toHaveLength(2)
    expect(activityEvents[1]).toMatchObject({
      type: 'noteon',
      note: 60,
      velocity: 100,
      channel: 1,
      deviceName: 'Akai MPK Mini',
    })
  })

  it('handles device plugged/unplugged state changes', async () => {
    const inputsMap = new Map<string, any>()
    const outputsMap = new Map<string, any>()

    const mockMIDIAccess = {
      inputs: inputsMap,
      outputs: outputsMap,
      onstatechange: null as any,
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMIDIAccess: vi.fn().mockResolvedValue(mockMIDIAccess) },
      configurable: true,
      writable: true,
    })

    const manager = new MidiManager()
    const devicesChanged = vi.fn()
    manager.onDevicesChange(devicesChanged)

    await manager.init()
    expect(manager.getInputs()).toHaveLength(0)

    // Simulate plugging in a device
    const newInput = new MockMIDIInput('in-2', 'Korg NanoKONTROL', 'Korg')
    inputsMap.set('in-2', newInput)

    mockMIDIAccess.onstatechange({
      port: newInput,
    })

    expect(devicesChanged).toHaveBeenCalled()
    expect(manager.getInputs()).toHaveLength(1)
    expect(manager.getInputs()[0].name).toBe('Korg NanoKONTROL')

    // Verify message listener was attached to new device
    expect(newInput.onmidimessage).toBeTypeOf('function')
  })

  it('sends MIDI CC and Note messages to output devices', async () => {
    const output1 = new MockMIDIOutput('out-1', 'Yamaha Reface CS', 'Yamaha')
    const inputsMap = new Map<string, any>()
    const outputsMap = new Map<string, any>([['out-1', output1]])

    const mockMIDIAccess = {
      inputs: inputsMap,
      outputs: outputsMap,
      onstatechange: null as any,
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMIDIAccess: vi.fn().mockResolvedValue(mockMIDIAccess) },
      configurable: true,
      writable: true,
    })

    const manager = new MidiManager()
    await manager.init()

    // Send CC to device by name
    const ccSent = manager.sendCC('Yamaha Reface CS', 74, 127, 2)
    expect(ccSent).toBe(true)
    // Channel 2 CC status byte: 0xB0 | (2 - 1) = 0xB1
    expect(output1.sentMessages).toContainEqual([0xb1, 74, 127])

    // Send Note
    const noteSent = manager.sendNote('Yamaha Reface CS', 60, 99, 1)
    expect(noteSent).toBe(true)
    expect(output1.sentMessages).toContainEqual([0x90, 60, 99])

    // Invalid device name
    const unknownSent = manager.sendCC('Non-Existent Synth', 74, 0)
    expect(unknownSent).toBe(false)
  })
})
