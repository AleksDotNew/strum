import { parseAst } from './acorn'

export interface RootBlock {
  line: number // 0-based line index in code
  start: number // character index start
  end: number // character index end of identifier/label
  name: string // block identifier, e.g. "$" or "d1" or "bass"
  prefix: string // the exact prefix token, e.g. "$:", "_$:", "d1:", "_d1:"
  muted: boolean // true if prefixed with "_"
  rawLine: string // line text
  range?: [number, number]
}

export interface ToggleBlockResult {
  newCode: string
  muted: boolean
  block: RootBlock
}

export type LineOrPos = number | { line?: number; pos?: number }

function getLineAndRawLine(code: string, offset: number): { line: number; rawLine: string } {
  const before = code.slice(0, offset)
  const line = (before.match(/\n/g) || []).length
  const lineStart = before.lastIndexOf('\n') === -1 ? 0 : before.lastIndexOf('\n') + 1
  const nextNewline = code.indexOf('\n', offset)
  const lineEnd = nextNewline === -1 ? code.length : nextNewline
  const rawLine = code.slice(lineStart, lineEnd)
  return { line, rawLine }
}

function findRootBlocksFallback(code: string): RootBlock[] {
  const lines = code.split('\n')
  const blocks: RootBlock[] = []
  let offset = 0
  let inBlockComment = false

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx]
    const trimmed = rawLine.trim()

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false
      }
      offset += rawLine.length + 1
      continue
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true
      }
      offset += rawLine.length + 1
      continue
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      offset += rawLine.length + 1
      continue
    }

    const match = rawLine.match(/^([ \t]*)(_?([a-zA-Z0-9_$]+))\s*:/)
    if (match) {
      const indent = match[1].length
      const label = match[2]
      if (label !== 'case' && label !== 'default') {
        const start = offset + indent
        const end = start + label.length
        const colonIdx = rawLine.indexOf(':', indent)
        const prefix = colonIdx !== -1 ? rawLine.slice(indent, colonIdx + 1) : `${label}:`
        const muted = label.startsWith('_') && label.length > 1
        const name = muted ? label.slice(1) : label

        blocks.push({
          line: lineIdx,
          start,
          end,
          name,
          prefix,
          muted,
          rawLine,
          range: [start, end],
        })
      }
    }
    offset += rawLine.length + 1
  }

  return blocks
}

export function findRootBlocks(code: string): RootBlock[] {
  const ast = parseAst(code) as any
  if (!ast || !ast.body || ast.body.length === 0) {
    return findRootBlocksFallback(code)
  }

  const blocks: RootBlock[] = []

  for (const stmt of ast.body) {
    let targetStmt = stmt
    if (targetStmt.type === 'ExportNamedDeclaration' && targetStmt.declaration) {
      targetStmt = targetStmt.declaration
    }

    if (targetStmt.type === 'LabeledStatement' && targetStmt.label) {
      const labelNode = targetStmt.label
      const labelName = labelNode.name as string
      const start = labelNode.start as number
      const end = labelNode.end as number
      const { line, rawLine } = getLineAndRawLine(code, start)

      const colonIdx = code.indexOf(':', end - 1)
      const prefix = colonIdx !== -1 ? code.slice(start, colonIdx + 1) : `${labelName}:`
      const muted = labelName.startsWith('_') && labelName.length > 1
      const name = muted ? labelName.slice(1) : labelName

      blocks.push({
        line,
        start,
        end,
        name,
        prefix,
        muted,
        rawLine,
        range: [start, end],
      })
    }
  }

  if (blocks.length === 0) {
    const fallback = findRootBlocksFallback(code)
    if (fallback.length > 0) return fallback
  }

  return blocks
}

export function toggleBlockMute(code: string, target: LineOrPos): ToggleBlockResult | null {
  const blocks = findRootBlocks(code)
  if (blocks.length === 0) return null

  let targetBlock: RootBlock | undefined

  if (typeof target === 'object') {
    if (target.line !== undefined) {
      const reqLine = target.line
      targetBlock = blocks.find((b) => b.line === reqLine)
      if (!targetBlock) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].line <= reqLine) {
            targetBlock = blocks[i]
            break
          }
        }
      }
    } else if (target.pos !== undefined) {
      const pos = Math.max(0, Math.min(target.pos, code.length))
      const { line: charLine } = getLineAndRawLine(code, pos)
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].line <= charLine) {
          targetBlock = blocks[i]
          break
        }
      }
    }
  } else {
    const totalLines = code.split('\n').length
    if (target >= totalLines) {
      const { line: charLine } = getLineAndRawLine(code, target)
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].line <= charLine) {
          targetBlock = blocks[i]
          break
        }
      }
    } else {
      targetBlock = blocks.find((b) => b.line === target)
      if (!targetBlock) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].line <= target) {
            targetBlock = blocks[i]
            break
          }
        }
      }
    }
  }

  if (!targetBlock) {
    targetBlock = blocks[0]
  }

  const newMuted = !targetBlock.muted
  let newCode: string
  const newStart = targetBlock.start
  let newEnd: number
  let newPrefix: string

  if (targetBlock.muted) {
    newCode = code.slice(0, targetBlock.start) + code.slice(targetBlock.start + 1)
    newEnd = targetBlock.end - 1
    newPrefix = targetBlock.prefix.replace(/^_/, '')
  } else {
    newCode = code.slice(0, targetBlock.start) + '_' + code.slice(targetBlock.start)
    newEnd = targetBlock.end + 1
    newPrefix = '_' + targetBlock.prefix
  }

  const { rawLine } = getLineAndRawLine(newCode, targetBlock.start)

  const updatedBlock: RootBlock = {
    ...targetBlock,
    muted: newMuted,
    prefix: newPrefix,
    end: newEnd,
    rawLine,
    range: [newStart, newEnd],
  }

  return {
    newCode,
    muted: newMuted,
    block: updatedBlock,
  }
}

export function toggleAllBlocks(code: string, mute: boolean): string {
  const blocks = findRootBlocks(code)
  if (blocks.length === 0) return code

  const toModify = blocks.filter((b) => (mute ? !b.muted : b.muted))
  toModify.sort((a, b) => b.start - a.start)

  let result = code
  for (const block of toModify) {
    if (mute) {
      result = result.slice(0, block.start) + '_' + result.slice(block.start)
    } else {
      result = result.slice(0, block.start) + result.slice(block.start + 1)
    }
  }

  return result
}
