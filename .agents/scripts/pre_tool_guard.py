#!/usr/bin/env python3
"""PreToolUse guard hook for Strum: blocks force-push and unsafe rm -rf."""

import json
import re
import sys

SAFE_RM_TARGETS = (
    'dist',
    'tmp',
    'android/app/build',
    'node_modules',
    '.vite',
    'test-results',
    'playwright-report',
)


def check_command(cmd: str):
  if re.search(r'\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)', cmd):
    return (
        'deny',
        'Blocked by strum-command-guard: git force-push is prohibited by project rules.',
    )

  # Match rm with -rf / -fr / -r -f
  for match in re.finditer(r'\brm\s+([^\n;&|]+)', cmd):
    args_str = match.group(1).strip()
    tokens = args_str.split()
    flags = [t for t in tokens if t.startswith('-')]
    targets = [t.strip('\'"') for t in tokens if not t.startswith('-')]
    is_recursive_force = any(
        ('r' in f and 'f' in f) or f in ('-rf', '-fr', '--recursive')
        for f in flags
    ) or ('-r' in flags and '-f' in flags)
    if is_recursive_force:
      for target in targets:
        norm = target.lstrip('./').rstrip('/')
        if not norm or norm in ('/', '.', '..', '~') or not any(
            norm == safe or norm.startswith(safe + '/')
            for safe in SAFE_RM_TARGETS
        ):
          return (
              'deny',
              f'Blocked by strum-command-guard: rm -rf on "{target}" is outside allowed directories {SAFE_RM_TARGETS}.',
          )

  return ('allow', '')


def main():
  try:
    payload = json.loads(sys.stdin.read() or '{}')
  except ValueError:
    print(json.dumps({'decision': 'allow'}))
    return

  tool_call = payload.get('toolCall') or {}
  args = tool_call.get('args') or {}
  cmd = args.get('CommandLine') or ''

  decision, reason = check_command(cmd)
  out = {'decision': decision}
  if reason:
    out['reason'] = reason
  print(json.dumps(out))


if __name__ == '__main__':
  main()

