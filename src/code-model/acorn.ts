import * as acorn from 'acorn'

export interface CodeLiteral {
  value: string | number | boolean | null
  raw: string
  start: number
  end: number
  type: 'number' | 'string' | 'boolean' | 'null'
  parentCall?: string
  argIndex?: number
}

export type ReplaceLiteralResult =
  | { ok: true; code: string; updatedLiteral: CodeLiteral }
  | { ok: false; error: string }

export function parseAst(code: string): acorn.Node | null {
  try {
    return acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ranges: true,
    })
  } catch {
    return null
  }
}

export function findLiterals(code: string): CodeLiteral[] {
  const ast = parseAst(code)
  if (!ast) return []

  const literals: CodeLiteral[] = []

  function walk(node: any, parent?: any) {
    if (!node || typeof node !== 'object') return

    if (node.type === 'Literal') {
      let litType: CodeLiteral['type'] = 'null'
      if (typeof node.value === 'number') litType = 'number'
      else if (typeof node.value === 'string') litType = 'string'
      else if (typeof node.value === 'boolean') litType = 'boolean'

      let parentCall: string | undefined
      let argIndex: number | undefined

      if (parent && parent.type === 'CallExpression') {
        const callee = parent.callee
        if (callee.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
          parentCall = callee.property.name
        } else if (callee.type === 'Identifier') {
          parentCall = callee.name
        }
        if (Array.isArray(parent.arguments)) {
          argIndex = parent.arguments.indexOf(node)
        }
      }

      literals.push({
        value: node.value,
        raw: node.raw || code.slice(node.start, node.end),
        start: node.start,
        end: node.end,
        type: litType,
        parentCall,
        argIndex: argIndex !== -1 ? argIndex : undefined,
      })
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const c of child) {
          walk(c, node)
        }
      } else if (child && typeof child === 'object' && typeof child.type === 'string') {
        walk(child, node)
      }
    }
  }

  walk(ast)
  return literals
}

export function literalAt(code: string, pos: number): CodeLiteral | null {
  const literals = findLiterals(code)
  if (literals.length === 0) return null

  // Prioritize literals strictly enclosing pos
  for (const lit of literals) {
    if (pos > lit.start && pos < lit.end) {
      return lit
    }
  }

  // Then check inclusive boundaries
  for (const lit of literals) {
    if (pos === lit.start || pos === lit.end) {
      return lit
    }
  }

  return null
}

export function replaceLiteral(
  code: string,
  literal: CodeLiteral,
  newText: string,
): ReplaceLiteralResult {
  const before = code.slice(0, literal.start)
  const after = code.slice(literal.end)
  const nextCode = before + newText + after

  const ast = parseAst(nextCode)
  if (!ast) {
    return { ok: false, error: 'Syntax error after literal replacement' }
  }

  // Re-extract updated literal
  const updated = literalAt(nextCode, literal.start)
  if (!updated) {
    return { ok: false, error: 'Could not re-locate updated literal in AST' }
  }

  return {
    ok: true,
    code: nextCode,
    updatedLiteral: updated,
  }
}
