# /settings — 설정 관리 스펙

> 책임: 앱 설정 CRUD (Sentry 인증, UI 옵션, 훅 상태 요약)
> 파일: `src/renderer/src/pages/Settings.tsx`

## 화면 구성

```
┌──────────────────────────────────────────────────┐
│  Sentry 연동                                      │
│  DSN: https://...ingest.sentry.io/... (읽기전용)  │
│  Auth Token: [___________________________] [저장]  │
│  Organization: [_________]                        │
│  Project: [_________]                             │
├──────────────────────────────────────────────────┤
│  UI 설정                                          │
│  다크 모드: [토글]                                 │
│  로그 보관 개수: [1000] 개                         │
├──────────────────────────────────────────────────┤
│  훅 상태 요약                                     │
│  PostToolUse(Edit|Write): eslint ✅ / prettier ✅ │
│  PreToolUse(Edit|Write): protect-files ✅         │
│  PreToolUse(Bash): danger-guard ✅                │
│  PostToolUseFailure: log-event ✅                 │
│  Stop: agent verification ✅                      │
│  SessionStart(compact): rule injection ✅         │
└──────────────────────────────────────────────────┘
```

## 설정 항목

| 항목              | 타입    | 저장 위치      | 편집 가능 |
| ----------------- | ------- | -------------- | --------- |
| Sentry DSN        | string  | `.env`         | 읽기 전용 |
| Sentry Auth Token | string  | electron-store | ✅        |
| Sentry Org        | string  | electron-store | ✅        |
| Sentry Project    | string  | electron-store | ✅        |
| 다크 모드         | boolean | electron-store | ✅        |
| 로그 보관 개수    | number  | electron-store | ✅        |

## 훅 상태 요약

Main process에서 `.claude/settings.json`을 읽어서 등록된 훅 목록과 각 스크립트 파일 존재 여부를 확인.

| 확인 항목     | 방법                                     |
| ------------- | ---------------------------------------- |
| 훅 등록 여부  | settings.json 파싱                       |
| 스크립트 존재 | `fs.existsSync()`                        |
| 실행 권한     | `fs.accessSync(path, fs.constants.X_OK)` |

## IPC 흐름

```
[로드]
  renderer --invoke--> 'settings:get' --> main
  main: electron-store + .env 읽기 --> AppSettings 반환

[저장]
  renderer --invoke--> 'settings:set' { sentryAuthToken: "..." }
  main: electron-store에 저장 --> { ok: true }
```

## 저장소

- `electron-store` v10+ (ESM 지원) — Sentry 토큰, UI 설정 (암호화 가능)
  - **S9**: electron-vite main은 CJS 번들. `electron-store` v10+는 ESM 전용일 수 있음 → `conf` 패키지로 대체 검토, 또는 `electron-store@8` (CJS 호환) 사용
  - **S4**: `npm install electron-store` (또는 `conf`) 의존성 추가 필수
- `.env` — DSN (읽기 전용, 앱에서 수정 불가). `.env` 편집 시 앱 재시작 필요 안내 표시.

## 엣지케이스 & 대응

### EC-25: Auth Token 평문 저장

- **문제**: electron-store 기본값은 JSON 평문 → 토큰 노출 위험
- **대응**: `electron-store`의 `encryptionKey` 옵션 사용. 키는 `safeStorage.encryptString()`으로 보호. macOS Keychain / Windows DPAPI 활용.

### EC-26: 설정 스키마 마이그레이션

- **문제**: 앱 업데이트로 설정 필드가 추가/변경 시 이전 설정 호환
- **대응**:
  - `electron-store`의 `migrations` 옵션 사용
  - 버전 필드 추가: `{ version: 1, ... }`
  - 누락 필드는 기본값으로 채움 (`Object.assign(defaults, stored)`)

### EC-27: Sentry Auth Token 유효성 검증

- **문제**: 저장 시 토큰이 유효한지 확인 없이 저장
- **대응**: 저장 전 `GET /api/0/` 호출로 인증 확인. 실패 시 "유효하지 않은 토큰입니다" 경고 + 저장은 허용 (오프라인일 수 있으므로).

### EC-28: 로그 보관 개수 0 또는 음수 입력

- **문제**: 사용자가 0, -1, 또는 비숫자 입력
- **대응**: 최소 100, 최대 10000 범위 제한. 범위 밖 입력 시 가장 가까운 유효값으로 클램프.

## IPC 참조

→ `architecture/ipc-contract.md` — `settings:get`, `settings:set`
