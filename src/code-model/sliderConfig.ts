import type { CodeLiteral } from './acorn'

export interface SliderConfig {
  label: string
  min: number
  max: number
  step: number
  presets: number[]
}

export function getSliderConfigForLiteral(lit: CodeLiteral): SliderConfig {
  const numVal = typeof lit.value === 'number' ? lit.value : 0
  const parent = lit.parentCall?.toLowerCase()

  switch (parent) {
    case 'lpf':
    case 'hpf':
      return {
        label: parent,
        min: 20,
        max: 10000,
        step: 10,
        presets: [200, 500, 1000, 2500, 5000, 8000],
      }

    case 'lpq':
      return {
        label: 'lpq',
        min: 0,
        max: 25,
        step: 0.2,
        presets: [1, 4, 8, 12, 16, 20],
      }

    case 'gain':
      return {
        label: 'gain',
        min: 0,
        max: 2,
        step: 0.05,
        presets: [0, 0.25, 0.5, 0.8, 1.0, 1.5],
      }

    case 'room':
    case 'delay':
    case 'pan':
      return {
        label: parent,
        min: 0,
        max: 1,
        step: 0.02,
        presets: [0, 0.2, 0.4, 0.5, 0.7, 1.0],
      }

    case 'fast':
    case 'slow':
      return {
        label: parent,
        min: 0.125,
        max: 8,
        step: 0.125,
        presets: [0.25, 0.5, 1, 2, 4, 8],
      }

    default: {
      const isFloat = !Number.isInteger(numVal)
      if (isFloat) {
        const max = Math.max(2, Math.round(numVal * 2 * 10) / 10)
        return {
          label: parent || 'Параметр',
          min: 0,
          max,
          step: 0.05,
          presets: [0, numVal / 2, numVal, numVal * 1.5].map((v) => Math.round(v * 100) / 100),
        }
      }
      const max = Math.max(100, Math.round(numVal * 2))
      return {
        label: parent || 'Число',
        min: 0,
        max,
        step: 1,
        presets: [Math.round(numVal * 0.5), numVal, Math.round(numVal * 1.5), Math.round(numVal * 2)].filter(
          (v) => v >= 0 && v <= max,
        ),
      }
    }
  }
}
