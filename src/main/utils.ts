import { exec } from 'child_process'
import type { HookEvent } from '../shared/types'

export function execAsync(
  cmd: string,
  cwd: string,
  timeoutMs = 60_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err?.killed) {
        reject(new Error(`Timed out after ${String(timeoutMs / 1000)}s`))
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

export function parseHookLogLines(content: string): HookEvent[] {
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HookEvent
      } catch {
        return null
      }
    })
    .filter((e): e is HookEvent => e !== null)
}
