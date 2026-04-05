# /dashboard — 메인 대시보드 스펙

> 책임: Layer 상태 표시 + 시스템 헬스 + 퀵 액션
> 파일: `src/renderer/src/pages/Dashboard.tsx`

## 화면 구성

```
┌─────────────────────────────────────────────────┐
│  4-Layer 상태 카드 (2x2 그리드)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │L1 Claude │ │L2 Git    │ │L3 CI/CD  │ │L4    ││
│  │Code Hooks│ │Hooks     │ │          │ │Sentry││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
├─────────────────────────────────────────────────┤
│  시스템 헬스                                      │
│  TypeScript: 0 errors  ESLint: 0 err / 2 warn   │
│  Tests: 2/2 passed     Git: main (clean)         │
├─────────────────────────────────────────────────┤
│  퀵 액션                                         │
│  [Type Check] [Lint Fix] [Run Tests] [Format]    │
└─────────────────────────────────────────────────┘
```

## 4-Layer 상태 카드

| Layer          | IPC 채널       | 데이터 소스                     | 표시                      |
| -------------- | -------------- | ------------------------------- | ------------------------- |
| L1 Claude Code | `health:check` | `.claude/settings.json` 파싱    | 활성 훅 수, 상태 뱃지     |
| L2 Git Hooks   | `health:check` | `.husky/` 존재 확인             | pre-commit/pre-push 상태  |
| L3 CI/CD       | `health:check` | `.github/workflows/ci.yml` 존재 | configured/not configured |
| L4 Sentry      | `health:check` | Sentry API ping                 | 연결 상태, 미해결 이슈 수 |

상태 뱃지: `active`(녹색) / `inactive`(회색) / `error`(빨간색)

## 시스템 헬스

| 항목       | main process 실행 명령                                                              | 응답 필드                                  | 비고                          |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------- |
| TypeScript | `./node_modules/.bin/tsc --noEmit 2>&1`                                             | `health.typescript.errors`                 | grep으로 "error TS" 카운트    |
| ESLint     | `./node_modules/.bin/eslint src/ --format json`                                     | `health.eslint.errors`, `.warnings`        | JSON stdout 파싱              |
| Tests      | `./node_modules/.bin/vitest run --reporter=json --outputFile=/tmp/wardex-test.json` | `health.tests.passed`, `.failed`, `.total` | **파일 출력 후 읽기** (S7)    |
| Git        | `git status --porcelain`, `git branch --show-current`                               | `health.git.branch`, `.clean`              | git 미초기화 시 graceful fail |

> **S2**: 모든 명령은 `child_process.exec` (async)로 실행. `execSync` 사용 금지.
> **S7**: vitest JSON reporter는 stdout이 아닌 파일로 출력됨. `--outputFile` 지정 후 파일 읽기.
> npx 콜드 스타트 방지를 위해 `./node_modules/.bin/` 직접 경로 사용 (EC-4).

## 퀵 액션

| 버튼       | IPC 채널     | action 값   | main process 실행                           |
| ---------- | ------------ | ----------- | ------------------------------------------- |
| Type Check | `action:run` | `typecheck` | `./node_modules/.bin/tsc --noEmit`          |
| Lint Fix   | `action:run` | `lint-fix`  | `./node_modules/.bin/eslint --fix src/`     |
| Run Tests  | `action:run` | `test`      | `./node_modules/.bin/vitest run`            |
| Format All | `action:run` | `format`    | `./node_modules/.bin/prettier --write src/` |

> (B1 수정) 헬스 체크와 동일하게 `./node_modules/.bin/` 직접 경로 사용.

실행 중 버튼 비활성화 + 스피너. 완료 시 `health:update`로 헬스 갱신.

## 컴포넌트 의존성

- `StatusCard` — 레이어 상태 카드
- `Badge` — 상태 뱃지 (active/inactive/error)

## 엣지케이스 & 대응

### EC-10: health:check 초기 로딩 느림

- **문제**: tsc+eslint+vitest+git 순차 실행 시 10초+
- **대응**:
  - 각 헬스 항목을 **병렬 실행** (`Promise.all`)
  - 먼저 완료된 항목부터 렌더링 (스켈레톤 UI → 점진적 채움)
  - `checked: false` 상태에서 "Checking..." 표시
  - 캐시: 마지막 결과를 저장, 30초 내 재요청 시 캐시 반환 + 백그라운드 갱신

### EC-11: git 미초기화 / node_modules 미설치

- **문제**: .git 없으면 git status 실패, node_modules 없으면 npx 실패
- **대응**: 각 명령을 try-catch로 래핑. 실패 시 해당 항목만 `{ errors: -1, checked: false }` 반환. UI에서 "Not available" 뱃지 표시. 전체 헬스가 하나의 실패로 중단되지 않음.

### EC-12: 퀵 액션 출력이 너무 긴 경우

- **문제**: tsc 에러가 수백 줄일 때 ActionResult.output이 거대
- **대응**: output을 최대 5000자로 truncate. `"...(truncated, 523 more lines)"` 표시.

## IPC 참조

→ `architecture/ipc-contract.md` — `health:check`, `action:run`, `health:update`
