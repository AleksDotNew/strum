import { parseAst, findLiterals, replaceLiteral, type CodeLiteral } from './acorn'

export interface MixerChannel {
  id: string
  label: string
  gain: number
  gainLiteral?: CodeLiteral
  isMuted: boolean
  rawCode: string
  astNodeRange: { start: number; end: number }
  isLabeled?: boolean
}

export function findMixerChannels(code: string): MixerChannel[] {
  const ast = parseAst(code) as any
  if (!ast || !ast.body || ast.body.length === 0) return []

  const channels: MixerChannel[] = []
  const literals = findLiterals(code)

  // 1. Check if the top-level is a stack(...) expression
  const firstStmt = ast.body[0]
  let stackCall: any = null
  if (
    firstStmt?.type === 'ExpressionStatement' &&
    firstStmt.expression?.type === 'CallExpression' &&
    firstStmt.expression.callee?.name === 'stack'
  ) {
    stackCall = firstStmt.expression
  }

  if (stackCall && Array.isArray(stackCall.arguments)) {
    stackCall.arguments.forEach((argNode: any, idx: number) => {
      const channel = extractChannelFromNode(code, argNode, idx, literals, false, false)
      if (channel) channels.push(channel)
    })
    return channels
  }

  // 2. Otherwise iterate over body statements (e.g. LabeledStatement or ExpressionStatement)
  ast.body.forEach((stmt: any, idx: number) => {
    let exprNode = stmt
    let isMuted = false
    let isLabeled = false

    if (stmt.type === 'LabeledStatement') {
      isLabeled = true
      if (stmt.label?.name === '_$') {
        isMuted = true
      }
      exprNode = stmt.body
      if (exprNode?.type === 'ExpressionStatement') {
        exprNode = exprNode.expression
      }
    } else if (stmt.type === 'ExpressionStatement') {
      exprNode = stmt.expression
    }

    const channel = extractChannelFromNode(code, exprNode, idx, literals, isMuted, isLabeled, stmt)
    if (channel) channels.push(channel)
  })

  return channels
}

function extractChannelFromNode(
  code: string,
  node: any,
  index: number,
  literals: CodeLiteral[],
  initialMuted: boolean,
  isLabeled: boolean,
  parentStmt?: any,
): MixerChannel | null {
  if (!node) return null

  const start = parentStmt ? parentStmt.start : node.start
  const end = parentStmt ? parentStmt.end : node.end
  const rawCode = code.slice(start, end)

  // Find literals enclosed in this node range
  const nodeLiterals = literals.filter((l) => l.start >= node.start && l.end <= node.end)

  // First string literal defines label (e.g. "bd*2" or "hh*8")
  const stringLit = nodeLiterals.find((l) => l.type === 'string')
  const label = stringLit && typeof stringLit.value === 'string' ? stringLit.value : `Канал ${index + 1}`

  // Check for .gain(...) call
  const gainLit = nodeLiterals.find((l) => l.parentCall === 'gain' && l.type === 'number')
  const gain = gainLit && typeof gainLit.value === 'number' ? gainLit.value : 1.0
  const isMuted = initialMuted || gain === 0

  return {
    id: `ch-${index}-${label}`,
    label,
    gain,
    gainLiteral: gainLit,
    isMuted,
    rawCode,
    astNodeRange: { start, end },
    isLabeled,
  }
}

export function updateChannelGainInCode(
  code: string,
  channel: MixerChannel,
  newGain: number,
): { ok: boolean; code: string } {
  // If channel has an existing gain literal, replace it
  if (channel.gainLiteral) {
    const res = replaceLiteral(code, channel.gainLiteral, String(newGain))
    if (res.ok) {
      return { ok: true, code: res.code }
    }
  }

  // Otherwise append .gain(newGain) to the channel node end
  const insertPos = channel.astNodeRange.end
  const nextCode = code.slice(0, insertPos) + `.gain(${newGain})` + code.slice(insertPos)
  const ast = parseAst(nextCode)
  if (ast) {
    return { ok: true, code: nextCode }
  }

  return { ok: false, code }
}

export function toggleChannelMuteInCode(
  code: string,
  channel: MixerChannel,
  muted: boolean,
): { ok: boolean; code: string } {
  if (channel.isLabeled) {
    const chStart = channel.astNodeRange.start
    const segment = code.slice(chStart, chStart + 4)
    if (muted && segment.startsWith('$:')) {
      const nextCode = code.slice(0, chStart) + '_$:' + code.slice(chStart + 2)
      return { ok: true, code: nextCode }
    } else if (!muted && segment.startsWith('_$:')) {
      const nextCode = code.slice(0, chStart) + '$:' + code.slice(chStart + 3)
      return { ok: true, code: nextCode }
    }
  }

  // Fallback for non-labeled statements: mute via gain(0)
  if (muted) {
    return updateChannelGainInCode(code, channel, 0)
  } else {
    const restoreGain = channel.gain > 0 ? channel.gain : 1.0
    return updateChannelGainInCode(code, channel, restoreGain)
  }
}
