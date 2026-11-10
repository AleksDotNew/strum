#!/usr/bin/env python3
"""Strum verification suite runner.

Writes structured JSON output to --output and prints a concise status message.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import time


def run_step(name: str, cmd: list[str], cwd: pathlib.Path) -> dict:
  start = time.monotonic()
  try:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    elapsed = round(time.monotonic() - start, 3)
    return {
        'step': name,
        'command': ' '.join(cmd),
        'ok': proc.returncode == 0,
        'exit_code': proc.returncode,
        'duration_sec': elapsed,
        'stdout_tail': proc.stdout[-4000:] if proc.stdout else '',
        'stderr_tail': proc.stderr[-4000:] if proc.stderr else '',
    }
  except FileNotFoundError as e:
    return {
        'step': name,
        'command': ' '.join(cmd),
        'ok': False,
        'exit_code': 127,
        'duration_sec': round(time.monotonic() - start, 3),
        'stdout_tail': '',
        'stderr_tail': str(e),
    }
  except subprocess.TimeoutExpired as e:
    return {
        'step': name,
        'command': ' '.join(cmd),
        'ok': False,
        'exit_code': 124,
        'duration_sec': round(time.monotonic() - start, 3),
        'stdout_tail': (e.stdout or '')[-2000:],
        'stderr_tail': 'Command timed out after 300s',
    }


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def cmd_suite(args) -> tuple[dict, bool]:
  cwd = pathlib.Path(args.project_dir).resolve()
  pkg = cwd / 'package.json'
  if not pkg.exists():
    return (
        {
            'ok': False,
            'error': f'package.json not found in {cwd}. Complete Task 0.2 scaffold first.',
            'steps': [],
        },
        False,
    )

  steps_to_run = [
      ('typecheck', ['npm', 'run', 'typecheck']),
      ('unit_tests', ['npm', 'run', 'test']),
      ('build', ['npm', 'run', 'build']),
  ]
  if args.e2e == 'true':
    steps_to_run.append(('e2e_tests', ['npm', 'run', 'test:e2e']))

  results = []
  all_ok = True
  for name, cmd in steps_to_run:
    res = run_step(name, cmd, cwd)
    results.append(res)
    if not res['ok']:
      all_ok = False
      break

  return ({'ok': all_ok, 'steps': results}, all_ok)


def cmd_single(args) -> tuple[dict, bool]:
  cwd = pathlib.Path(args.project_dir).resolve()
  test_file = args.test_file
  if test_file.endswith('.spec.ts'):
    cmd = ['npx', 'playwright', 'test', test_file]
  else:
    cmd = ['npx', 'vitest', 'run', test_file]
  res = run_step('single_test', cmd, cwd)
  return ({'ok': res['ok'], 'result': res}, res['ok'])


def main():
  parser = argparse.ArgumentParser(description='Strum verification suite CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_suite = subparsers.add_parser('suite', help='Run verification suite')
  p_suite.add_argument(
      '--e2e',
      choices=['true', 'false'],
      required=True,
      help='Whether to include Playwright e2e tests',
  )
  p_suite.add_argument(
      '--project-dir',
      default='.',
      help='Project root directory',
  )
  p_suite.add_argument(
      '--output',
      required=True,
      help='Output JSON file path',
  )

  p_single = subparsers.add_parser('single', help='Run a single test file')
  p_single.add_argument(
      '--test-file',
      required=True,
      help='Path to unit (.test.ts) or e2e (.spec.ts) file',
  )
  p_single.add_argument(
      '--project-dir',
      default='.',
      help='Project root directory',
  )
  p_single.add_argument(
      '--output',
      required=True,
      help='Output JSON file path',
  )

  args = parser.parse_args()
  if args.command == 'suite':
    data, ok = cmd_suite(args)
  elif args.command == 'single':
    data, ok = cmd_single(args)
  else:
    print(f'Unknown command: {args.command}', file=sys.stderr)
    sys.exit(1)

  write_output(data, args.output)
  if not ok:
    sys.exit(1)


if __name__ == '__main__':
  main()
