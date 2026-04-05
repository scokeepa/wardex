# /timeline — 훅 이벤트 타임라인 스펙

> 책임: Claude Code/Git 훅 실행 이력 시각화
> 파일: `src/renderer/src/pages/Timeline.tsx`

## 화면 구성

```
┌──────────────────────────────────────────────────┐
│  타임라인 필터                                     │
│  [전체] [PreToolUse] [PostToolUse] [Stop] [Git]   │
├──────────────────────────────────────────────────┤
│  ● 23:05:12  PostToolUse  App.tsx  ✅ pass        │
│  │           eslint exit=0                        │
│  ● 23:04:58  PreToolUse   .env    🔴 block       │
│  │           protected pattern: .env              │
│  ● 23:04:30  PostToolUseFailure  Bash  ⚠️ failure│
│  │           tool failure                         │
│  ● 23:03:15  Stop         —       ✅ pass        │
│  │           tsc + vitest passed                  │
│  ...                                              │
└──────────────────────────────────────────────────┘
```

## 데이터 소스

### 1차: hook-log.jsonl (파일 기반)

```
.claude/hooks/hook-log.jsonl
```

각 훅 스크립트가 실행 결과를 JSONL로 append.
스키마 → `architecture/hooks-config.md` 참조.

> **S8**: 파싱 시 빈 줄 필터 필수: `.split('\n').filter(Boolean).map(line => { try { return JSON.parse(line) } catch { return null } }).filter(Boolean)`

### 실시간: chokidar 파일 watch (A2 반영)

main process에서 `chokidar.watch('hook-log.jsonl')` → 변경 감지 → 새 줄 파싱 → IPC push.
~~HTTP 훅 서버는 과잉 설계로 Phase 2에서 제거.~~

## IPC 흐름

```
[초기 로드]
  renderer --invoke--> 'hooks:get-events' --> main
  main: hook-log.jsonl 읽기 --> HookEvent[] 반환

[실시간 업데이트]
  chokidar 감지 --> main: 새 줄 파싱 --> IPC 'hook:event' --> renderer
```

## 필터

| 필터        | 옵션                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------- |
| 이벤트 타입 | 전체, PreToolUse, PostToolUse, PostToolUseFailure, Stop, ConfigChange, InstructionsLoaded |
| 결과        | 전체, pass, block, error, failure                                                         |

## 색상 코드

| 결과    | 색상   | 아이콘 |
| ------- | ------ | ------ |
| pass    | 녹색   | ✅     |
| block   | 빨간색 | 🔴     |
| error   | 노란색 | ⚠️     |
| failure | 주황색 | ⚠️     |

## 미적용 개선 (Phase 2)

- **ConfigChange 이벤트**: 설정 파일 변경 감지 (감사 결과 #9)
- **InstructionsLoaded 이벤트**: CLAUDE.md 로드 감지 (감사 결과 #9)

## 엣지케이스 & 대응

### EC-21: hook-log.jsonl 파싱 에러

- **문제**: 동시 쓰기(EC-2)로 JSON 라인이 깨질 수 있음
- **대응**: 라인별 `JSON.parse` try-catch. 실패한 라인은 스킵 + 카운터 표시 ("3 corrupted entries skipped")

### EC-22: 타임스탬프 시간대 혼동

- **문제**: 훅은 `date -u`로 UTC 기록, 사용자는 로컬 시간 기대
- **대응**: 표시 시 로컬 시간으로 변환 (`new Date(utc).toLocaleTimeString()`). 호버 시 UTC 원본 표시.

### EC-23: hook-log.jsonl 파일 부재

- **문제**: 첫 실행 시 또는 삭제 후 파일이 없음
- **대응**: `hooks:get-events`에서 파일 부재 시 빈 배열 반환. UI에 "아직 훅 이벤트가 없습니다" 빈 상태 표시.

### EC-24: 이벤트가 수천 개 누적

- **문제**: 장기 사용 시 타임라인 렌더링 성능 저하
- **대응**:
  - 기본 최근 200개만 로드 (`limit` 파라미터)
  - "더 보기" 버튼으로 추가 로드
  - 날짜 필터 추가 (오늘/최근 7일/전체)

## IPC 참조

→ `architecture/ipc-contract.md` — `hooks:get-events`, `hook:event`
