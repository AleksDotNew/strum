export const bpmToCps = (bpm: number, beatsPerCycle = 4): number => bpm / 60 / beatsPerCycle

export const cpsToBpm = (cps: number, beatsPerCycle = 4): number => cps * 60 * beatsPerCycle
