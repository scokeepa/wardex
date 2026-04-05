# Phase 2a: 기반 + 핵심

> 책임: 프로젝트 기반 설정 + 공통 컴포넌트 + Settings + Dashboard
> 선행 조건: Phase 1 완료 (4-Layer 자동화 구현됨)
> 산출물: 4페이지 렌더링 + 퀵 액션 동작

## Stage 1: 기반 설정

### 의존성 설치

```bash
npm install tailwindcss @tailwindcss/vite react-router-dom electron-log electron-store@8 chokidar
```

| 패키지                              | 용도          | 비고                               |
| ----------------------------------- | ------------- | ---------------------------------- |
| `tailwindcss` + `@tailwindcss/vite` | UI 스타일링   | v4 (S6 확정)                       |
| `react-router-dom`                  | 페이지 라우팅 | HashRouter 사용 (S1)               |
| `electron-log`                      | 로그 수집     | `initialize({preload:false})` (S5) |
| `electron-store@8`                  | 설정 저장     | v8=CJS 호환 (S9)                   |
| `chokidar`                          | 파일 watch    | hook-log.jsonl 감시 (A2)           |

### 수정 파일

| 파일                         | 변경                                               |
| ---------------------------- | -------------------------------------------------- |
| `electron.vite.config.ts`    | renderer에 `@tailwindcss/vite` 플러그인 추가       |
| `src/renderer/src/index.css` | `@import "tailwindcss"` 추가 (새 파일)             |
| `src/renderer/src/main.tsx`  | `HashRouter` 래핑 (S1: BrowserRouter 사용 금지)    |
| `src/renderer/src/App.tsx`   | Sidebar 레이아웃 + `<Routes>` 정의                 |
| `src/shared/types.ts`        | 전체 타입 정의 → ipc-contract.md 참조 (SSOT)       |
| `src/preload/index.ts`       | `contextBridge.exposeInMainWorld('wardex', {...})` |
| `src/main/index.ts`          | IPC 핸들러 등록 + electron-log + chokidar          |

### 새 파일

| 파일                                      | 역할                        |
| ----------------------------------------- | --------------------------- |
| `src/main/ipc-handlers.ts`                | IPC 핸들러 모듈 분리        |
| `src/renderer/src/index.css`              | Tailwind 엔트리             |
| `src/renderer/src/hooks/useIpc.ts`        | IPC 호출 래퍼 훅            |
| `src/renderer/src/context/AppContext.tsx` | 전역 상태 (settings, theme) |

### 설계 제약

- `execSync` 사용 금지 — 모든 외부 명령은 `child_process.exec` async (S2)
- `./node_modules/.bin/` 직접 경로 — npx 콜드 스타트 회피 (EC-4, B1)
- IPC 리스너는 반드시 cleanup 함수 반환 (EC-7)
- chokidar로 hook-log.jsonl 감시 — HTTP 서버 없음 (A2)
- Sentry `beforeSend`에서 대시보드 UI 에러 스킵 (A1)
- Wardex 전용 — 범용화 고려 없음 (A3)

### 검증

```bash
npm run dev                    # Electron 앱 실행
# → HashRouter 동작 확인 (/#/dashboard 등)
# → Sidebar 네비게이션 확인
# → 각 페이지 빈 상태 렌더링 확인
npx tsc --noEmit               # 타입 에러 0
npx eslint src/                # lint 에러 0
```

---

## Stage 2: 공통 컴포넌트

> D1 수정: 다른 페이지보다 먼저 구현

### 파일

| 컴포넌트     | 파일                        | 사용처                |
| ------------ | --------------------------- | --------------------- |
| `Sidebar`    | `components/Sidebar.tsx`    | App.tsx (모든 페이지) |
| `StatusCard` | `components/StatusCard.tsx` | Dashboard             |
| `Badge`      | `components/Badge.tsx`      | Dashboard, Sentry     |
| `LogEntry`   | `components/LogEntry.tsx`   | LogViewer             |

### 검증

```bash
npx vitest run                 # 컴포넌트 단위 테스트 통과
```

---

## Stage 3: /settings

> D1 수정: Sentry Viewer(Stage 7)가 Auth Token에 의존하므로 먼저 구현

### 스펙 참조

→ `specs/settings.md`

### 핵심 동작

1. `settings:get` → electron-store + `.env` 읽기 → `AppSettings` 반환
2. `settings:set` → electron-store에 저장 → `{ ok, error? }` 반환
3. Auth Token 저장 전 Sentry API 유효성 체크 (EC-27)
4. `safeStorage.encryptString()` 으로 토큰 암호화 (EC-25)

### 검증

```bash
npm run dev
# → /settings 페이지에서 토큰 입력 → 저장 → 앱 재시작 → 값 유지 확인
```

---

## Stage 4: /dashboard

### 스펙 참조

→ `specs/dashboard.md`

### 핵심 동작

1. `health:check` → 4개 명령 `Promise.all` 병렬 (S2)
   - `./node_modules/.bin/tsc --noEmit`
   - `./node_modules/.bin/eslint src/ --format json`
   - `./node_modules/.bin/vitest run --reporter=json --outputFile=/tmp/wardex-test.json` (S7)
   - `git status --porcelain` + `git branch --show-current`
2. 스켈레톤 UI → 점진적 채움 (EC-10)
3. 퀵 액션: 동시 실행 잠금 (EC-5) + 60초 타임아웃 (EC-6)
4. 각 명령 실패 시 해당 항목만 "Not available" (EC-11)

### 검증

```bash
npm run dev
# → 4-Layer 카드 상태 표시 확인
# → 시스템 헬스 수치 표시 확인
# → Type Check 버튼 클릭 → 실행 → 결과 갱신 확인
# → 동시 클릭 차단 확인
npx tsc --noEmit && npx eslint src/ && npx vitest run
```

---

## Phase 2a 완료 기준

- [ ] `npm run dev` → 4페이지(dashboard, logs빈, timeline빈, settings) 렌더링
- [ ] HashRouter 네비게이션 동작
- [ ] Settings: 토큰 저장/로드/암호화
- [ ] Dashboard: 4-Layer 카드 + 헬스 + 퀵 액션 전체 동작
- [ ] `tsc --noEmit` 0 에러, `eslint src/` 0 에러, `vitest run` 전체 통과
