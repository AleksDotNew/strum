#!/usr/bin/env python3
"""Prebake validator and Strum Template JSON bundler."""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
import time


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def check_balanced_delimiters(code: str) -> list[str]:
  errors = []
  stack = []
  pairs = {')': '(', ']': '[', '}': '{'}
  in_quote = None
  line_comment = False
  block_comment = False
  i = 0
  while i < len(code):
    ch = code[i]
    nx = code[i + 1] if i + 1 < len(code) else ''
    if line_comment:
      if ch == '\n':
        line_comment = False
      i += 1
      continue
    if block_comment:
      if ch == '*' and nx == '/':
        block_comment = False
        i += 2
        continue
      i += 1
      continue
    if in_quote:
      if ch == '\\':
        i += 2
        continue
      if ch == in_quote:
        in_quote = None
      i += 1
      continue
    if ch == '/' and nx == '/':
      line_comment = True
      i += 2
      continue
    if ch == '/' and nx == '*':
      block_comment = True
      i += 2
      continue
    if ch in ('"', "'", '`'):
      in_quote = ch
      i += 1
      continue
    if ch in '([{':
      stack.append(ch)
    elif ch in ')]}':
      if not stack or stack[-1] != pairs[ch]:
        errors.append(f'Unmatched closing delimiter "{ch}" at offset {i}')
        return errors
      stack.pop()
    i += 1
  if in_quote:
    errors.append(f'Unclosed string literal ({in_quote})')
  if stack:
    errors.append(f'Unclosed delimiters remaining: {stack}')
  return errors


def analyze_prebake(code: str) -> dict:
  syntax_errors = check_balanced_delimiters(code)
  sample_sources = re.findall(r'\bsamples\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', code)
  alias_banks = re.findall(r'\baliasBank\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', code)
  registered_fns = re.findall(r'\bregister\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', code)
  registered_sounds = re.findall(r'\bregisterSound\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', code)

  sensitive_apis = []
  for api in ('fetch(', 'XMLHttpRequest', 'eval(', 'Function(', 'localStorage', 'indexedDB', 'document.', 'window.'):
    if api in code:
      sensitive_apis.append(api.rstrip('(.'))

  return {
      'valid_syntax': len(syntax_errors) == 0,
      'syntax_errors': syntax_errors,
      'samples': sample_sources,
      'alias_banks': alias_banks,
      'registered_functions': registered_fns,
      'registered_sounds': registered_sounds,
      'sensitive_apis_detected': sensitive_apis,
      'requires_user_trust_confirmation': True,
  }


def cmd_validate(args) -> tuple[dict, bool]:
  p = pathlib.Path(args.script_file)
  if not p.exists():
    return ({'ok': False, 'error': f'File not found: {p}'}, False)
  code = p.read_text(encoding='utf-8')
  report = analyze_prebake(code)
  ok = report['valid_syntax']
  return ({'ok': ok, 'file': str(p), 'analysis': report}, ok)


def cmd_pack_template(args) -> tuple[dict, bool]:
  now_ms = int(time.time() * 1000)
  scripts = []
  prebake_ids = []
  for raw_path in [x.strip() for x in args.prebake_files.split(',') if x.strip()]:
    p = pathlib.Path(raw_path)
    if not p.exists():
      return ({'ok': False, 'error': f'Prebake file not found: {p}'}, False)
    code = p.read_text(encoding='utf-8')
    analysis = analyze_prebake(code)
    if not analysis['valid_syntax']:
      return (
          {
              'ok': False,
              'error': f'Syntax error in {p}: {analysis["syntax_errors"]}',
          },
          False,
      )
    digest = hashlib.sha256(code.encode('utf-8')).hexdigest()[:12]
    script_id = f'prebake:{p.stem}:{digest}'
    prebake_ids.append(script_id)
    scripts.append({
        'id': script_id,
        'name': p.stem,
        'source': 'file',
        'code': code,
        'trusted': False,
        'updatedAt': now_ms,
    })

  tpl_digest = hashlib.sha256(f'{args.name}:{now_ms}'.encode('utf-8')).hexdigest()[:10]
  bundle = {
      'schemaVersion': 1,
      'template': {
          'id': f'tpl:{tpl_digest}',
          'name': args.name,
          'prebakeIds': prebake_ids,
          'starterCode': args.starter_code,
          'createdAt': now_ms,
      },
      'prebakes': scripts,
  }
  return (bundle, True)


def cmd_inspect_template(args) -> tuple[dict, bool]:
  p = pathlib.Path(args.template_file)
  if not p.exists():
    return ({'ok': False, 'error': f'Template file not found: {p}'}, False)
  try:
    bundle = json.loads(p.read_text(encoding='utf-8'))
  except ValueError as e:
    return ({'ok': False, 'error': f'Invalid JSON: {e}'}, False)

  issues = []
  tpl = bundle.get('template') or {}
  prebakes = bundle.get('prebakes') or []
  for req in ('id', 'name', 'prebakeIds', 'createdAt'):
    if req not in tpl:
      issues.append(f'template.{req} is missing')

  pb_by_id = {pb.get('id'): pb for pb in prebakes if isinstance(pb, dict)}
  for pid in tpl.get('prebakeIds', []):
    if pid not in pb_by_id and not str(pid).startswith('builtin:'):
      issues.append(f'Referenced prebakeId "{pid}" is missing from embedded prebakes[]')

  summaries = []
  for pb in prebakes:
    analysis = analyze_prebake(pb.get('code', ''))
    if not analysis['valid_syntax']:
      issues.append(f"Prebake {pb.get('id')} has syntax errors: {analysis['syntax_errors']}")
    summaries.append({
        'id': pb.get('id'),
        'name': pb.get('name'),
        'analysis': analysis,
    })

  ok = len(issues) == 0
  return (
      {
          'ok': ok,
          'template_name': tpl.get('name'),
          'prebake_count': len(prebakes),
          'prebake_summaries': summaries,
          'issues': issues,
      },
      ok,
  )


def main():
  parser = argparse.ArgumentParser(description='Strum Prebake & Template CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_val = subparsers.add_parser('validate', help='Validate a prebake JS script')
  p_val.add_argument('--script-file', required=True)
  p_val.add_argument('--output', required=True)

  p_pack = subparsers.add_parser('pack-template', help='Pack prebake scripts + starter code into a template JSON')
  p_pack.add_argument('--name', required=True, help='Template display name')
  p_pack.add_argument('--starter-code', required=True, help='Starter Strudel code')
  p_pack.add_argument('--prebake-files', required=True, help='Comma-separated paths to prebake .js files')
  p_pack.add_argument('--output', required=True, help='Output template JSON path')

  p_insp = subparsers.add_parser('inspect-template', help='Validate and inspect a template JSON bundle')
  p_insp.add_argument('--template-file', required=True)
  p_insp.add_argument('--output', required=True)

  args = parser.parse_args()
  if args.command == 'validate':
    data, ok = cmd_validate(args)
  elif args.command == 'pack-template':
    data, ok = cmd_pack_template(args)
  elif args.command == 'inspect-template':
    data, ok = cmd_inspect_template(args)
  else:
    sys.exit(1)

  write_output(data, args.output)
  if not ok:
    sys.exit(1)


if __name__ == '__main__':
  main()
