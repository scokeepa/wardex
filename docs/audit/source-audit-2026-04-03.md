# Claude Code 소스 코드 감사 결과

> 날짜: 2026-04-03
> 분석 대상: `/Users/csm/claude-code/source/src/`
> 목적: Wardex 훅 설정의 허점과 개선점 도출

## 분석한 핵심 파일

| 파일                             | 역할                                              |
| -------------------------------- | ------------------------------------------------- |
| `utils/hooks.ts`                 | 훅 실행 엔진 (spawn, exit code 처리, JSON 파싱)   |
| `types/hooks.ts`                 | 훅 결과 타입, HookResult, AggregatedHookResult    |
| `schemas/hooks.ts`               | 훅 설정 Zod 스키마 (command, prompt, agent, http) |
| `entrypoints/sdk/coreSchemas.ts` | 전체 훅 이벤트 목록, 입력 스키마                  |
| `query.ts`                       | Stop 훅 실행 흐름, stopHookActive 상태 관리       |

## 발견된 허점 (3건, 모두 수정 완료)

### #1 Stop 훅 무한루프 — 치명적

**근거**: `coreSchemas.ts:517`

```typescript
stop_hook_active: z.boolean()
```

`query.ts:1300`에서 Stop 훅이 blocking 결과를 반환하면 `stopHookActive: true`로 설정하고 재실행한다. 우리 agent 훅이 이를 체크하지 않으면 실패→재실행→실패… 무한루프.

**수정**: prompt에 `$ARGUMENTS`로 입력 JSON 전달, `stop_hook_active=true`이면 즉시 `{ok: true}` 반환.

### #2 PostToolUse에서 매번 전체 tsc — 성능 병목

**근거**: `utils/hooks.ts:3336-3338`

```typescript
// For successful hooks (exit code 0), use stdout; for failed hooks, use stderr
const output = result.status === 0 ? result.stdout || '' : result.stderr || ''
```

PostToolUse의 stdout은 additionalContext로 Claude에 주입됨 (`utils/hooks.ts:643-644`). 매번 전체 tsc 실행은 프로젝트 성장 시 10초+ 지연.

**수정**: error-check.sh에서 tsc 제거. eslint만 실행. tsc는 Stop agent에서만 전체 실행.

### #3 모든 Bash 명령에 danger-guard 실행 — 불필요한 오버헤드

**근거**: `schemas/hooks.ts:17-27`

```typescript
const IfConditionSchema = lazySchema(() =>
  z
    .string()
    .optional()
    .describe('Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)").'),
)
```

`if` 필드가 있으면 Claude Code가 패턴 매칭 후 불일치 시 **스크립트 실행 자체를 스킵**한다.

**수정**: `"if": "Bash(rm *)"`, `"if": "Bash(git push *)"` 2개로 분리.

## 발견된 개선점 (7건)

### 적용 완료 (3건)

| #   | 개선                              | 근거                     | 상태 |
| --- | --------------------------------- | ------------------------ | ---- |
| 4   | `statusMessage` — 스피너 메시지   | `schemas/hooks.ts:48-50` | ✅   |
| 5   | `async: true` — prettier 비블로킹 | `schemas/hooks.ts:56-59` | ✅   |
| 6   | `PostToolUseFailure` 이벤트 기록  | `coreSchemas.ts:358`     | ✅   |

### 미적용 — Phase 2에서 적용 예정 (4건)

| #   | 개선                                         | 근거                      | 적용 시점       |
| --- | -------------------------------------------- | ------------------------- | --------------- |
| 7   | `http` 훅으로 대시보드 실시간 연동           | `schemas/hooks.ts:97-126` | Phase 2 Stage 1 |
| 8   | `asyncRewake` 장시간 테스트                  | `schemas/hooks.ts:60-64`  | Phase 2 Stage 2 |
| 9   | `ConfigChange`/`InstructionsLoaded` 타임라인 | `coreSchemas.ts:377,380`  | Phase 2 Stage 5 |
| 10  | `once: true` 초기 검증                       | `schemas/hooks.ts:52-54`  | 추후            |

## 추가 발견 (활용 가능 필드)

| 필드                   | 위치                         | 설명                                              |
| ---------------------- | ---------------------------- | ------------------------------------------------- |
| `shell`                | `schemas/hooks.ts:37-42`     | 훅 실행 쉘 지정 (bash/powershell)                 |
| `updatedInput`         | `types/hooks.ts:618-619`     | PreToolUse에서 도구 입력 수정 가능                |
| `updatedMCPToolOutput` | `types/hooks.ts:646-649`     | PostToolUse에서 MCP 도구 출력 수정 가능           |
| `additionalContext`    | `types/hooks.ts:622,625,628` | Pre/PostToolUse에서 Claude 컨텍스트에 텍스트 주입 |
