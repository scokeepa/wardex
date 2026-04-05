import { createHash } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, relative } from 'path'
import type {
  HookEvent,
  ErrorPattern,
  HotFile,
  PatternSuggestion,
  PatternAnalysis,
} from '../shared/types'
import { parseHookLogLines } from './utils'

const RULE_SUGGESTIONS: Record<string, string> = {
  '@typescript-eslint/no-unused-vars': '사용하지 않는 변수나 import를 작성하지 마세요.',
  'react-hooks/exhaustive-deps':
    'useEffect/useCallback의 의존성 배열에 모든 참조 변수를 포함하세요.',
  'react-hooks/rules-of-hooks': 'Hook은 반드시 컴포넌트 최상위에서만 호출하세요.',
  '@typescript-eslint/no-explicit-any': 'any 타입 사용을 피하고 구체적 타입을 지정하세요.',
  'react-refresh/only-export-components':
    '파일에서 컴포넌트만 export하세요. 상수나 함수는 별도 파일로 분리하세요.',
  '@typescript-eslint/no-floating-promises': 'Promise는 반드시 await하거나 void로 명시하세요.',
}

function hashId(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12)
}

function normalizeFilePath(filePath: string, projectDir: string): string {
  if (filePath.startsWith(projectDir)) {
    return relative(projectDir, filePath)
  }
  // Strip common prefixes for legacy paths
  const match = filePath.match(/src\/.*$/)
  return match ? match[0] : filePath
}

function extractRuleIds(message: string): string[] {
  // New format: "eslint exit=1 @typescript-eslint/no-unused-vars,react-hooks/exhaustive-deps"
  const parts = message.replace(/^eslint exit=\d+\s*/, '')
  if (!parts) return []
  return parts
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
}

function classifyErrorType(event: HookEvent): string {
  if (event.event === 'PreToolUse' && event.result === 'block') return 'block'
  if (event.message.startsWith('eslint')) return 'eslint'
  if (event.result === 'failure') return 'failure'
  return 'unknown'
}

export function analyzePatterns(
  events: HookEvent[],
  projectDir: string,
  options: { days?: number } = {},
): PatternAnalysis {
  const windowDays = options.days ?? 7
  const now = Date.now()
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const cutoff = new Date(now - windowMs).toISOString()

  const filtered = events.filter((e) => e.timestamp >= cutoff)
  const errorEvents = filtered.filter((e) => e.result === 'error' || e.result === 'block')

  // Group by file + errorType
  const groups = new Map<string, HookEvent[]>()
  for (const e of errorEvents) {
    const file = normalizeFilePath(e.file, projectDir)
    const errorType = classifyErrorType(e)
    const key = `${file}::${errorType}`
    const group = groups.get(key) ?? []
    group.push(e)
    groups.set(key, group)
  }

  // Build patterns
  const patterns: ErrorPattern[] = []
  for (const [key, group] of groups) {
    const [file, errorType] = key.split('::')
    if (!file || !errorType) continue

    const ruleIds = [...new Set(group.flatMap((e) => extractRuleIds(e.message)))]
    const messages = [...new Set(group.map((e) => e.message))].slice(0, 5)
    const timestamps = group.map((e) => new Date(e.timestamp).getTime())
    const recentCount = timestamps.filter((t) => t > now - 24 * 60 * 60 * 1000).length
    const olderCount = timestamps.filter((t) => t <= now - 24 * 60 * 60 * 1000).length
    const avgDaily = olderCount / Math.max(windowDays - 1, 1)

    let trend: ErrorPattern['trend'] = 'stable'
    if (recentCount > avgDaily * 1.5) trend = 'increasing'
    else if (recentCount < avgDaily * 0.5 && olderCount > 0) trend = 'decreasing'

    patterns.push({
      id: hashId(key),
      file,
      errorType,
      count: group.length,
      firstSeen: group[0]?.timestamp ?? '',
      lastSeen: group[group.length - 1]?.timestamp ?? '',
      messages,
      ruleIds,
      trend,
    })
  }

  patterns.sort((a, b) => b.count - a.count)

  // Hot files
  const fileStats = new Map<
    string,
    { errorCount: number; blockCount: number; totalEvents: number; lastError: string }
  >()
  for (const e of filtered) {
    const file = normalizeFilePath(e.file, projectDir)
    const stat = fileStats.get(file) ?? {
      errorCount: 0,
      blockCount: 0,
      totalEvents: 0,
      lastError: '',
    }
    stat.totalEvents++
    if (e.result === 'error') {
      stat.errorCount++
      stat.lastError = e.timestamp
    }
    if (e.result === 'block') {
      stat.blockCount++
      stat.lastError = e.timestamp
    }
    fileStats.set(file, stat)
  }

  const hotFiles: HotFile[] = [...fileStats.entries()]
    .filter(([, s]) => s.errorCount + s.blockCount >= 3)
    .map(([file, s]) => ({ file, ...s }))
    .sort((a, b) => b.errorCount + b.blockCount - (a.errorCount + a.blockCount))
    .slice(0, 10)

  // Generate suggestions for patterns with count >= 3
  const suggestions: PatternSuggestion[] = []
  for (const pattern of patterns) {
    if (pattern.count < 3) continue

    let title: string
    let description: string
    let rule: string

    if (pattern.ruleIds.length > 0) {
      const topRule = pattern.ruleIds[0] ?? 'unknown'
      title = `${pattern.file}: ${topRule} 반복 위반 (${String(pattern.count)}회)`
      description =
        RULE_SUGGESTIONS[topRule] ??
        `${topRule} 규칙이 ${pattern.file}에서 반복적으로 위반되고 있습니다.`
      rule = `- ${pattern.file} 수정 시 ${topRule} 규칙 준수. ${description}`
    } else {
      title = `${pattern.file}: ${pattern.errorType} 반복 발생 (${String(pattern.count)}회)`
      description = `${pattern.file}에서 ${pattern.errorType} 에러가 ${String(pattern.count)}회 반복됨.`
      rule = `- ${pattern.file} 수정 후 반드시 lint 검증 실행.`
    }

    suggestions.push({
      id: hashId(`suggestion-${pattern.id}`),
      patternId: pattern.id,
      type: 'claude-md-rule',
      title,
      description,
      rule,
      applied: false,
    })
  }

  return {
    patterns,
    hotFiles,
    suggestions,
    analyzedEventCount: filtered.length,
    timeWindow: { from: cutoff, to: new Date(now).toISOString() },
  }
}

export async function loadAndAnalyze(
  hookLogPath: string,
  projectDir: string,
  options: { days?: number } = {},
): Promise<PatternAnalysis> {
  try {
    const content = await readFile(hookLogPath, 'utf-8')
    const events = parseHookLogLines(content)
    return analyzePatterns(events, projectDir, options)
  } catch {
    return {
      patterns: [],
      hotFiles: [],
      suggestions: [],
      analyzedEventCount: 0,
      timeWindow: { from: new Date().toISOString(), to: new Date().toISOString() },
    }
  }
}

export async function applySuggestionToClaudeMd(
  projectDir: string,
  rule: string,
): Promise<{ ok: boolean; error?: string }> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md')
  const header = '## Wardex Auto-Rules'
  const timestamp = `<!-- Updated by Wardex on ${new Date().toISOString()} -->`

  try {
    let content = ''
    if (existsSync(claudeMdPath)) {
      content = await readFile(claudeMdPath, 'utf-8')
    }

    if (content.includes(header)) {
      // Append rule under existing section
      const idx = content.indexOf(header)
      const afterHeader = idx + header.length
      const insertion = `\n${timestamp}\n${rule}`
      content = content.slice(0, afterHeader) + insertion + content.slice(afterHeader)
    } else {
      // Create new section at end
      content = content.trimEnd() + `\n\n${header}\n${timestamp}\n${rule}\n`
    }

    await writeFile(claudeMdPath, content, 'utf-8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to write CLAUDE.md' }
  }
}
