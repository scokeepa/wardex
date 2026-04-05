# 4-Layer 아키텍처

> SSOT: 에러 자동화 시스템의 전체 구조와 데이터 흐름

## 레이어 구조

```
개발자 코드 작성
    │
    ├─→ [L1] Claude Code 훅 (실시간, 개발 중)
    │     PostToolUse(Edit|Write) → eslint --fix
    │     PostToolUse(Edit|Write) → prettier --write (async)
    │     PreToolUse(Edit|Write)  → protect-files.sh
    │     PreToolUse(Bash)        → danger-guard.sh (if: rm/git push만)
    │     PostToolUseFailure      → log-event.sh
    │     Stop                    → agent: tsc + vitest
    │     SessionStart(compact)   → 규칙 재주입
    │
    ├─→ [L2] Git 훅 (커밋/푸시 시점)
    │     pre-commit  → lint-staged (eslint + prettier)
    │     pre-push    → tsc --noEmit + vitest run
    │
    ├─→ [L3] CI/CD (PR/머지 시점)
    │     PR: lint → typecheck → test → build
    │     main: npm audit + Sentry 소스맵
    │
    └─→ [L4] Sentry (런타임)
          Main: @sentry/electron/main
          Renderer: @sentry/electron/renderer + @sentry/react
          ErrorBoundary + Session Replay
```

## 설계 원칙

- **점진적 엄격도**: L1(즉시 피드백) → L4(사후 추적)
- **비중복**: 각 레이어는 다른 레이어가 놓치는 에러를 잡음
  - L1: 코드 작성 즉시 lint 에러
  - L2: 커밋 전 전체 프로젝트 검증
  - L3: 다른 환경(CI)에서 재현성 확인
  - L4: 사용자 환경에서만 발생하는 런타임 에러
- **비블로킹 우선**: prettier는 async, tsc는 Stop에서만 전체 실행
- **순환 의존 방지 (A1)**: 대시보드 자체의 에러가 L4(Sentry)를 다시 호출하는 순환을 차단
  - Sentry `init()`에 `beforeSend`: 대시보드 UI 컴포넌트 에러는 Sentry 전송 스킵 (무한 재귀 방지)
  - ErrorBoundary fallback UI는 Sentry/IPC에 일절 의존하지 않는 정적 HTML
  - `initSentry()` 함수 자체가 throw하면 앱은 Sentry 없이 정상 동작 (이미 `if (!dsn) return` 처리됨)
- **스코프 (A3)**: 이 대시보드는 **Wardex 프로젝트 전용**. 범용 모니터링 도구가 아님. 경로, 명령, 설정 모두 Wardex에 하드코딩.

## 파일 맵

```
wardex/
├── .claude/
│   ├── settings.json          ← L1 설정 (SSOT: hooks-config.md)
│   └── hooks/
│       ├── error-check.sh     ← L1 PostToolUse
│       ├── protect-files.sh   ← L1 PreToolUse
│       ├── danger-guard.sh    ← L1 PreToolUse
│       ├── log-event.sh       ← L1 PostToolUseFailure
│       └── hook-log.jsonl     ← L1 이벤트 로그
├── .husky/
│   ├── pre-commit             ← L2
│   └── pre-push               ← L2
├── .github/workflows/
│   └── ci.yml                 ← L3
├── src/
│   ├── main/index.ts          ← L4 (Sentry main init)
│   └── renderer/src/
│       ├── lib/sentry.ts      ← L4 (Sentry renderer init)
│       └── components/
│           └── ErrorBoundary.tsx ← L4
└── .env                       ← L4 (SENTRY_DSN)
```

## 기술 스택

| 역할      | 도구                                   | 버전          |
| --------- | -------------------------------------- | ------------- |
| 런타임    | Electron + electron-vite               | latest        |
| UI        | React + TypeScript                     | 19.x + strict |
| 빌드      | Vite                                   | 8.x           |
| Lint      | ESLint flat config + typescript-eslint | 8+            |
| 포맷      | Prettier                               | latest        |
| 테스트    | Vitest + testing-library               | latest        |
| Git 훅    | husky + lint-staged                    | v9            |
| CI/CD     | GitHub Actions                         | -             |
| 에러 추적 | Sentry (@sentry/electron)              | latest        |
