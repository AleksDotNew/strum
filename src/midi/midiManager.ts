import { midiLearnRegistry, type MidiLearnRegistry } from './midiLearn'

export interface MidiDeviceInfo {
  id: string
  name: string
  manufacturer?: string
  state?: string
  connection?: string
  type: 'input' | 'output'
}

export interface MidiActivityEvent {
  type: 'cc' | 'noteon' | 'noteoff' | 'other'
  channel?: number
  cc?: number
  value?: number
  note?: number
  velocity?: number
  deviceName?: string
  timestamp: number
}

/**
 * Web MIDI manager for Strum: handles hardware device discovery,
 * hot-plug reconnection, incoming CC routing into MidiLearnRegistry,
 * and sending MIDI output to external synths/drum machines.
 */
export class MidiManager {
  private midiAccess: any | null = null
  private inputs: MidiDeviceInfo[] = []
  private outputs: MidiDeviceInfo[] = []
  private deviceListeners: Set<() => void> = new Set()
  private activityListeners: Set<(ev: MidiActivityEvent) => void> = new Set()
  private lastActivity: MidiActivityEvent | null = null
  private boundInputs: Set<string> = new Set()

  constructor(private registry: MidiLearnRegistry = midiLearnRegistry) {}

  /**
   * Check if Web MIDI API is supported by the current browser environment.
   */
  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof (navigator as any).requestMIDIAccess === 'function'
    )
  }

  /**
   * Check if MIDIAccess has been granted and initialized.
   */
  isAvailable(): boolean {
    return this.midiAccess !== null
  }

  /**
   * Initialize Web MIDI access with sysex: false (safe permission model).
   * Safe to call multiple times (idempotent).
   */
  async init(): Promise<boolean> {
    if (!this.isSupported()) {
      return false
    }

    if (this.midiAccess) {
      return true
    }

    try {
      const access = await (navigator as any).requestMIDIAccess({ sysex: false })
      this.midiAccess = access
      this.updateDeviceLists()

      access.onstatechange = (e: any) => {
        this.handleStateChange(e)
      }

      this.attachInputListeners()
      return true
    } catch (err) {
      console.warn('Failed to initialize Web MIDI access:', err)
      return false
    }
  }

  /**
   * Return list of connected MIDI input devices.
   */
  getInputs(): MidiDeviceInfo[] {
    return [...this.inputs]
  }

  /**
   * Return list of connected MIDI output devices.
   */
  getOutputs(): MidiDeviceInfo[] {
    return [...this.outputs]
  }

  /**
   * Return array of input device names.
   */
  getInputNames(): string[] {
    return this.inputs.map((i) => i.name)
  }

  /**
   * Return array of output device names for Strudel `midiout("Name")`.
   */
  getOutputNames(): string[] {
    return this.outputs.map((o) => o.name)
  }

  /**
   * Find an active MIDI output port by name or ID.
   */
  getOutput(nameOrId: string): any | null {
    if (!this.midiAccess || !this.midiAccess.outputs) return null

    for (const output of this.midiAccess.outputs.values()) {
      if (output.name === nameOrId || output.id === nameOrId) {
        return output
      }
    }
    return null
  }

  /**
   * Send a MIDI Control Change (CC) message to a specified output port.
   */
  sendCC(outputNameOrId: string, cc: number, value: number, channel = 1): boolean {
    const output = this.getOutput(outputNameOrId)
    if (!output || typeof output.send !== 'function') return false

    const ch = Math.max(1, Math.min(16, channel)) - 1
    const status = 0xb0 | ch
    const c = Math.max(0, Math.min(127, cc))
    const v = Math.max(0, Math.min(127, value))

    try {
      output.send([status, c, v])
      return true
    } catch (err) {
      console.error(`Error sending CC to ${outputNameOrId}:`, err)
      return false
    }
  }

  /**
   * Send a MIDI Note On (and scheduled Note Off) message to a specified output port.
   */
  sendNote(
    outputNameOrId: string,
    note: number,
    velocity = 100,
    channel = 1,
    durationMs = 200
  ): boolean {
    const output = this.getOutput(outputNameOrId)
    if (!output || typeof output.send !== 'function') return false

    const ch = Math.max(1, Math.min(16, channel)) - 1
    const statusOn = 0x90 | ch
    const statusOff = 0x80 | ch
    const n = Math.max(0, Math.min(127, note))
    const vel = Math.max(0, Math.min(127, velocity))

    try {
      output.send([statusOn, n, vel])
      if (durationMs > 0) {
        setTimeout(() => {
          try {
            output.send([statusOff, n, 0])
          } catch {}
        }, durationMs)
      }
      return true
    } catch (err) {
      console.error(`Error sending note to ${outputNameOrId}:`, err)
      return false
    }
  }

  /**
   * Subscribe to device changes (connection/disconnection).
   */
  onDevicesChange(listener: () => void): () => void {
    this.deviceListeners.add(listener)
    return () => {
      this.deviceListeners.delete(listener)
    }
  }

  /**
   * Subscribe to MIDI activity events (incoming CC, notes, etc.).
   */
  onActivity(listener: (ev: MidiActivityEvent) => void): () => void {
    this.activityListeners.add(listener)
    return () => {
      this.activityListeners.delete(listener)
    }
  }

  /**
   * Get the most recently observed MIDI activity event.
   */
  getLastActivity(): MidiActivityEvent | null {
    return this.lastActivity
  }

  private handleStateChange(_event?: any): void {
    this.updateDeviceLists()
    this.attachInputListeners()
    this.notifyDeviceListeners()
  }

  private updateDeviceLists(): void {
    if (!this.midiAccess) return

    const newInputs: MidiDeviceInfo[] = []
    if (this.midiAccess.inputs) {
      for (const input of this.midiAccess.inputs.values()) {
        newInputs.push({
          id: input.id,
          name: input.name || `MIDI In ${input.id}`,
          manufacturer: input.manufacturer,
          state: input.state,
          connection: input.connection,
          type: 'input',
        })
      }
    }
    this.inputs = newInputs

    const newOutputs: MidiDeviceInfo[] = []
    if (this.midiAccess.outputs) {
      for (const output of this.midiAccess.outputs.values()) {
        newOutputs.push({
          id: output.id,
          name: output.name || `MIDI Out ${output.id}`,
          manufacturer: output.manufacturer,
          state: output.state,
          connection: output.connection,
          type: 'output',
        })
      }
    }
    this.outputs = newOutputs
  }

  private attachInputListeners(): void {
    if (!this.midiAccess || !this.midiAccess.inputs) return

    for (const input of this.midiAccess.inputs.values()) {
      // Check if listener is already attached
      if (!this.boundInputs.has(input.id)) {
        input.onmidimessage = (event: any) => this.handleMIDIMessage(event)
        this.boundInputs.add(input.id)
      }
    }
  }

  private handleMIDIMessage(event: any): void {
    if (!event || !event.data || event.data.length < 1) return

    const data = event.data
    const status = data[0]
    const cmd = status & 0xf0
    const channel = (status & 0x0f) + 1
    const deviceName = event.target?.name || 'MIDI Controller'
    const now = Date.now()

    if (cmd === 0xb0 && data.length >= 3) {
      // Control Change
      const cc = data[1]
      const value = data[2]
      this.registry.handleCC(cc, value, channel)

      const ev: MidiActivityEvent = {
        type: 'cc',
        channel,
        cc,
        value,
        deviceName,
        timestamp: now,
      }
      this.notifyActivity(ev)
    } else if (cmd === 0x90 && data.length >= 3) {
      // Note On (velocity 0 is equivalent to Note Off)
      const note = data[1]
      const velocity = data[2]
      const type = velocity > 0 ? 'noteon' : 'noteoff'

      const ev: MidiActivityEvent = {
        type,
        channel,
        note,
        velocity,
        deviceName,
        timestamp: now,
      }
      this.notifyActivity(ev)
    } else if (cmd === 0x80 && data.length >= 3) {
      // Note Off
      const note = data[1]
      const velocity = data[2]

      const ev: MidiActivityEvent = {
        type: 'noteoff',
        channel,
        note,
        velocity,
        deviceName,
        timestamp: now,
      }
      this.notifyActivity(ev)
    } else {
      const ev: MidiActivityEvent = {
        type: 'other',
        channel,
        deviceName,
        timestamp: now,
      }
      this.notifyActivity(ev)
    }
  }

  private notifyDeviceListeners(): void {
    for (const listener of this.deviceListeners) {
      try {
        listener()
      } catch (err) {
        console.error('Error in onDevicesChange listener:', err)
      }
    }
  }

  private notifyActivity(ev: MidiActivityEvent): void {
    this.lastActivity = ev
    for (const listener of this.activityListeners) {
      try {
        listener(ev)
      } catch (err) {
        console.error('Error in onActivity listener:', err)
      }
    }
  }
}

export const midiManager = new MidiManager()
