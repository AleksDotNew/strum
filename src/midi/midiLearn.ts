export interface MidiLearnBinding {
  id: string
  name: string
  cc: number // 0..127
  channel?: number // 1..16 (or undefined for any channel)
  min: number
  max: number
  curve?: 'linear' | 'exponential'
  paramPath?: string // identifier or slider description
  apply: (value: number) => void
}

export type BindingOptions = Partial<Omit<MidiLearnBinding, 'cc' | 'channel'>> & {
  apply: (value: number) => void
}

/**
 * Maps a 7-bit MIDI value (0..127) to a specified parameter range [min, max].
 * Clamps input between 0 and 127.
 */
export function mapMidiValue(
  midiValue: number,
  min: number,
  max: number,
  curve: 'linear' | 'exponential' = 'linear'
): number {
  const clamped = Math.max(0, Math.min(127, midiValue))
  const t = clamped / 127

  if (curve === 'exponential' && min > 0 && max > 0) {
    return min * Math.pow(max / min, t)
  }

  return min + t * (max - min)
}

/**
 * Registry managing MIDI Learn mappings between MIDI CC numbers and parameter setters.
 */
export class MidiLearnRegistry {
  private bindings: Map<string, MidiLearnBinding> = new Map()
  private learnCallback: ((cc: number, channel: number) => void) | null = null
  private changeListeners: Set<() => void> = new Set()

  /**
   * Register a new MIDI CC binding.
   * Returns unique binding id.
   */
  bind(
    cc: number,
    channel: number | undefined,
    binding: BindingOptions
  ): string {
    const id =
      binding.id ||
      `binding_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const min = binding.min ?? 0
    const max = binding.max ?? 127
    const name =
      binding.name ||
      binding.paramPath ||
      `CC ${cc}${channel ? ` (Ch ${channel})` : ''}`

    const record: MidiLearnBinding = {
      id,
      name,
      cc,
      channel,
      min,
      max,
      curve: binding.curve ?? 'linear',
      paramPath: binding.paramPath,
      apply: binding.apply,
    }

    this.bindings.set(id, record)
    this.notifyChange()
    return id
  }

  /**
   * Remove a binding by its id.
   */
  unbind(id: string): void {
    if (this.bindings.delete(id)) {
      this.notifyChange()
    }
  }

  /**
   * Clear all registered bindings.
   */
  clear(): void {
    this.bindings.clear()
    this.notifyChange()
  }

  /**
   * Return an array of all active bindings.
   */
  getBindings(): MidiLearnBinding[] {
    return Array.from(this.bindings.values())
  }

  /**
   * Handle incoming CC message from a MIDI device.
   * Dispatches to learn callback (if active) and triggers matching bindings.
   */
  handleCC(cc: number, value: number, channel?: number): void {
    if (this.learnCallback) {
      this.learnCallback(cc, channel ?? 1)
    }

    for (const b of this.bindings.values()) {
      if (b.cc === cc) {
        if (
          b.channel === undefined ||
          channel === undefined ||
          b.channel === channel
        ) {
          const mapped = mapMidiValue(value, b.min, b.max, b.curve)
          try {
            b.apply(mapped)
          } catch (err) {
            console.error('Error applying MIDI binding:', err)
          }
        }
      }
    }
  }

  /**
   * Put registry in "Learn" mode. Incoming CC triggers callback with captured (cc, channel).
   * Returns a cleanup function to exit learn mode.
   */
  startLearn(callback: (cc: number, channel: number) => void): () => void {
    this.learnCallback = callback
    return () => {
      if (this.learnCallback === callback) {
        this.learnCallback = null
      }
    }
  }

  /**
   * Check if registry is currently in learn mode.
   */
  isLearning(): boolean {
    return this.learnCallback !== null
  }

  /**
   * Subscribe to binding addition/removal. Returns unsubscribe function.
   */
  onBindingsChange(listener: () => void): () => void {
    this.changeListeners.add(listener)
    return () => {
      this.changeListeners.delete(listener)
    }
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener()
      } catch (e) {
        console.error('Error in onBindingsChange listener:', e)
      }
    }
  }
}

export const midiLearnRegistry = new MidiLearnRegistry()
