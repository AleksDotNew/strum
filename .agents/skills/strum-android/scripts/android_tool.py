#!/usr/bin/env python3
"""Strum Android toolchain & Capacitor helper CLI."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys


def run_cmd(cmd: list[str], cwd: pathlib.Path | None = None, timeout: int = 180):
  try:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return {
        'ok': proc.returncode == 0,
        'exit_code': proc.returncode,
        'stdout': proc.stdout.strip(),
        'stderr': proc.stderr.strip(),
    }
  except FileNotFoundError as e:
    return {'ok': False, 'exit_code': 127, 'stdout': '', 'stderr': str(e)}
  except subprocess.TimeoutExpired:
    return {'ok': False, 'exit_code': 124, 'stdout': '', 'stderr': 'Timed out'}


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def cmd_doctor() -> dict:
  java_res = run_cmd(['java', '-version'])
  java_out = java_res['stderr'] or java_res['stdout']
  jdk21 = bool(re.search(r'version\s+"21\.', java_out))

  android_cli = shutil.which('android')
  adb_bin = shutil.which('adb')
  android_home = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or ''
  default_mac_sdk = pathlib.Path.home() / 'Library' / 'Android' / 'sdk'

  devices = []
  if adb_bin:
    adb_res = run_cmd([adb_bin, 'devices'])
    if adb_res['ok']:
      for line in adb_res['stdout'].splitlines()[1:]:
        if line.strip():
          devices.append(line.strip())

  return {
      'ready': jdk21 and bool(android_cli or adb_bin) and (bool(android_home) or default_mac_sdk.exists()),
      'jdk21_installed': jdk21,
      'java_version_output': java_out,
      'android_cli_path': android_cli,
      'adb_path': adb_bin,
      'android_home_env': android_home,
      'default_sdk_exists': default_mac_sdk.exists(),
      'connected_devices': devices,
      'remediation': [] if jdk21 else [
          'Install JDK 21: brew install --cask temurin@21',
          'Install Android CLI & SDK 36 per Task 0.1 in implementation_plan.md',
      ],
  }


def cmd_sync_build(project_dir: pathlib.Path, variant: str) -> tuple[dict, bool]:
  steps = []
  for name, cmd in [
      ('web_build', ['npm', 'run', 'build']),
      ('cap_sync', ['npx', 'cap', 'sync', 'android']),
  ]:
    res = run_cmd(cmd, cwd=project_dir, timeout=300)
    steps.append({'step': name, **res})
    if not res['ok']:
      return ({'ok': False, 'steps': steps}, False)

  android_dir = project_dir / 'android'
  gradlew = android_dir / 'gradlew'
  if not gradlew.exists():
    return (
        {
            'ok': False,
            'error': 'android/gradlew not found. Run `npx cap add android` first.',
            'steps': steps,
        },
        False,
    )

  task = 'assembleDebug' if variant == 'debug' else 'assembleRelease'
  g_res = run_cmd(['./gradlew', task], cwd=android_dir, timeout=600)
  steps.append({'step': f'gradle_{task}', **g_res})
  return ({'ok': g_res['ok'], 'steps': steps}, g_res['ok'])


def cmd_logcat(lines: int) -> tuple[dict, bool]:
  adb_bin = shutil.which('adb')
  if not adb_bin:
    return ({'ok': False, 'error': 'adb not found on PATH'}, False)

  res = run_cmd([adb_bin, 'logcat', '-d', '-t', str(lines)])
  if not res['ok']:
    return ({'ok': False, 'error': res['stderr'] or res['stdout']}, False)

  pattern = re.compile(r'(Capacitor|chromium|WebViewConsole|AndroidRuntime|dev\.strum\.app)', re.I)
  matched = [ln for ln in res['stdout'].splitlines() if pattern.search(ln)]
  return (
      {
          'ok': True,
          'total_lines_scanned': len(res['stdout'].splitlines()),
          'matched_count': len(matched),
          'entries': matched[-lines:],
      },
      True,
  )


def main():
  parser = argparse.ArgumentParser(description='Strum Android helper CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_doc = subparsers.add_parser('doctor', help='Check Android toolchain status')
  p_doc.add_argument('--output', required=True, help='Output JSON file path')

  p_build = subparsers.add_parser('sync-build', help='Build web, cap sync, and assemble APK')
  p_build.add_argument('--variant', choices=['debug', 'release'], required=True)
  p_build.add_argument('--project-dir', default='.')
  p_build.add_argument('--output', required=True, help='Output JSON file path')

  p_log = subparsers.add_parser('logcat', help='Collect filtered WebView/Capacitor logcat entries')
  p_log.add_argument('--lines', type=int, required=True, help='Max logcat lines to inspect')
  p_log.add_argument('--output', required=True, help='Output JSON file path')

  args = parser.parse_args()
  if args.command == 'doctor':
    data = cmd_doctor()
    write_output(data, args.output)
    return
  if args.command == 'sync-build':
    data, ok = cmd_sync_build(pathlib.Path(args.project_dir).resolve(), args.variant)
  elif args.command == 'logcat':
    data, ok = cmd_logcat(args.lines)
  else:
    sys.exit(1)

  write_output(data, args.output)
  if not ok:
    sys.exit(1)


if __name__ == '__main__':
  main()
