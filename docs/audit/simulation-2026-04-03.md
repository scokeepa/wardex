# 시뮬레이션 & 비판적 검증 결과

> 날짜: 2026-04-03
> 대상: Phase 2 구현 플랜 전체
> 방법: 1차 드라이런(기술 시뮬) + 2차 비판적 검증(설계 결함)

## 1차 시뮬레이션 — 기술적 문제 (13건)

### 치명적 (4건)

| ID  | Stage | 문제                                                      | 수정                         | 반영 문서             |
| --- | ----- | --------------------------------------------------------- | ---------------------------- | --------------------- |
| S1  | 1     | `BrowserRouter`는 Electron prod(`file://`)에서 동작 안 함 | `HashRouter` 사용            | ipc-contract.md       |
| S2  | 4     | `execSync`로 헬스 체크 → main process 블로킹              | `exec` async + `Promise.all` | dashboard.md          |
| S3  | 7     | Sentry API 베이스 URL 결정 로직 없음                      | DSN에서 호스트 추출 로직     | sentry-viewer.md      |
| S4  | 3     | `electron-store` 의존성 누락                              | 설치 목록에 추가             | settings.md, phase-2a |

### 높음 (5건)

| ID  | Stage | 문제                                                   | 수정                           | 반영 문서                 |
| --- | ----- | ------------------------------------------------------ | ------------------------------ | ------------------------- |
| S5  | 5     | electron-log preload 자동 주입이 커스텀 preload와 충돌 | `initialize({preload:false})`  | ipc-contract.md, phase-2b |
| S6  | 1     | Tailwind v3 vs v4 미명시                               | v4 (`@tailwindcss/vite`) 확정  | phase-2a                  |
| S7  | 4     | vitest JSON reporter가 stdout이 아닌 파일 출력         | `--outputFile` 지정 후 읽기    | dashboard.md              |
| S8  | 6     | JSONL 빈 줄 미처리 → `JSON.parse("")` throw            | `.filter(Boolean)` + try-catch | timeline.md, phase-2b     |
| S9  | 3     | electron-store ESM/CJS 호환 문제                       | v8(CJS 호환) 사용              | settings.md, phase-2a     |

### 중간 (4건)

| ID  | Stage | 문제                                               | 수정                              | 반영 문서                 |
| --- | ----- | -------------------------------------------------- | --------------------------------- | ------------------------- |
| S10 | 5     | 다중 BrowserWindow에 log broadcast 누락            | `getAllWindows().forEach`         | ipc-contract.md, phase-2b |
| S11 | 6     | `fs.watch` macOS 비신뢰                            | chokidar 사용                     | timeline.md, phase-2b     |
| S12 | 7     | Sentry PUT에 `Content-Type: application/json` 누락 | 헤더 추가                         | sentry-viewer.md          |
| S13 | 1     | ~~HTTP 서버 시작 실패~~                            | A2에서 HTTP 서버 자체 제거로 해소 | ipc-contract.md           |

## 2차 비판적 검증 — 설계 결함 (14건)

### 근본적 결함 (3건)

| ID  | 문제                        | 대응                                 | 상태                            |
| --- | --------------------------- | ------------------------------------ | ------------------------------- |
| A1  | 대시보드 ↔ Sentry 순환 의존 | `beforeSend` 필터 + fallback 정적 UI | ✅ 4-layer-overview.md          |
| A2  | HTTP 훅 서버 과잉 설계      | Phase 2에서 제거, chokidar로 단순화  | ✅ ipc-contract.md, timeline.md |
| A3  | 대시보드 스코프 미정의      | Wardex 전용으로 확정                 | ✅ 4-layer-overview.md          |

### 논리적 모순 (4건)

| ID  | 문제                                      | 대응                        | 상태               |
| --- | ----------------------------------------- | --------------------------- | ------------------ |
| B1  | 헬스=직접경로, 퀵액션=npx 불일치          | `./node_modules/.bin/` 통일 | ✅ dashboard.md    |
| B2  | ActionResult에 error 필드 없음            | `error?: string` 추가       | ✅ ipc-contract.md |
| B3  | EC-16 번호 충돌 (log-viewer vs sentry)    | log-viewer를 EC-29로 재번호 | ✅ log-viewer.md   |
| B4  | settings:set 응답에 에러 메시지 전달 불가 | `{ ok, error? }` 추가       | ✅ ipc-contract.md |

### SSOT/SRP 위반 (3건)

| ID  | 문제                                   | 대응                                      | 상태 |
| --- | -------------------------------------- | ----------------------------------------- | ---- |
| C1  | LogEntry 타입이 2곳에 중복 정의        | log-viewer.md에서 제거, 참조로 변경       | ✅   |
| C2  | hooks-config.md가 settings.json 복제   | "요약이며 settings.json이 원본" 경고 추가 | ✅   |
| C3  | README.md 책임 과잉 (인덱스+시뮬+검증) | 시뮬/검증을 이 문서로 분리                | ✅   |

### 비현실적 가정 (3건)

| ID  | 문제                                       | 대응                                       | 상태                |
| --- | ------------------------------------------ | ------------------------------------------ | ------------------- |
| D1  | Settings(Stage 6)이 Sentry(Stage 4)보다 뒤 | Settings=Stage 3, 공통=Stage 2로 순서 변경 | ✅                  |
| D2  | 에러 추이 차트 API 부재                    | Phase 2c에서 보류                          | ✅ sentry-viewer.md |
| D3  | 훅 stdout/stderr 수집 불가                 | hook-log.jsonl 기반으로 대체               | ✅ log-viewer.md    |

### 범위 과잉 (1건)

| ID  | 문제                        | 대응                 | 상태              |
| --- | --------------------------- | -------------------- | ----------------- |
| E1  | 5페이지+25파일을 한 Phase에 | Phase 2a/2b/2c 3분할 | ✅ pipeline/\*.md |

## 엣지케이스 (29건)

각 스펙 문서에 `## 엣지케이스 & 대응` 섹션으로 상세 기술됨.

| 범주                     | 건수 | 문서             |
| ------------------------ | ---- | ---------------- |
| 훅 인프라 (EC-1~4)       | 4    | hooks-config.md  |
| IPC/서버 (EC-5~9)        | 5    | ipc-contract.md  |
| 대시보드 (EC-10~12)      | 3    | dashboard.md     |
| 로그 뷰어 (EC-13~15, 29) | 4    | log-viewer.md    |
| Sentry (EC-16~20)        | 5    | sentry-viewer.md |
| 타임라인 (EC-21~24)      | 4    | timeline.md      |
| 설정 (EC-25~28)          | 4    | settings.md      |
