# Phase 2c: 외부 연동

> 책임: Sentry REST API 연동 + 최종 검증
> 선행 조건: Phase 2b 완료 (Logs + Timeline 동작)
> 산출물: 전체 5페이지 동작 + 전수 검증 통과

## Stage 7: /sentry (Sentry 이벤트 뷰어)

### 스펙 참조

→ `specs/sentry-viewer.md`
→ `architecture/ipc-contract.md` — `sentry:*` 채널

### API 베이스 URL 결정 (S3)

```
DSN: https://key@o123.ingest.us.sentry.io/456
→ 호스트 추출: o123.ingest.us.sentry.io
→ ingest. 제거: o123.us.sentry.io
→ o{digits}. 제거: us.sentry.io
→ API: https://us.sentry.io
```

구현 위치: `src/main/ipc-handlers.ts` — `parseSentryApiBase(dsn: string): string`

### IPC 핸들러

→ 엔드포인트 URL 상세는 `specs/sentry-viewer.md` 참조 (SSOT)

| 채널                  | 동작 요약                       | 에러 응답                    |
| --------------------- | ------------------------------- | ---------------------------- |
| `sentry:get-issues`   | 미해결 이슈 목록 조회           | `SentryIssue[]` 또는 빈 배열 |
| `sentry:get-events`   | 이슈별 이벤트 조회              | `SentryEvent[]` 또는 빈 배열 |
| `sentry:update-issue` | 이슈 상태 변경 (Resolve/Ignore) | `{ ok, error? }`             |

인증 및 헤더 상세 → `specs/sentry-viewer.md` 엔드포인트 테이블 참조

### 에러 핸들링

| 상황        | HTTP 코드 | UI 표시                                         | EC 참조 |
| ----------- | --------- | ----------------------------------------------- | ------- |
| 토큰 미설정 | -         | "Settings에서 Auth Token을 설정해주세요" + 링크 | -       |
| 인증 실패   | 401       | "토큰이 만료되었거나 잘못되었습니다"            | -       |
| 리소스 없음 | 404       | "Org/Project를 찾을 수 없습니다. Settings 확인" | EC-17   |
| Rate limit  | 429       | "잠시 후 재시도" + Retry-After 헤더 활용        | -       |
| 네트워크    | -         | 캐시 표시 + "오프라인 — 마지막 동기화: HH:MM"   | EC-20   |
| 스키마 변경 | 200       | 필수 필드 누락 이슈 스킵 + 경고 로그            | EC-19   |

### 오프라인 캐시 (EC-20)

```
sentry:get-issues 성공 → electron-store에 캐시 저장
    { timestamp, data: SentryIssue[] }
네트워크 실패 → 캐시에서 로드 → "오프라인" 배너 표시
```

### 보류 항목

- 에러 추이 바 차트: **구현 안 함** (D2 — events-stats API 필요, 이슈 목록 API로는 날짜별 집계 불가)
- 페이지네이션: `per_page=100`으로 충분하지 않으면 Link 헤더 + "더 보기" 버튼 (EC-16)

### 새 파일

| 파일                                      | 역할               |
| ----------------------------------------- | ------------------ |
| `src/renderer/src/pages/SentryViewer.tsx` | Sentry 뷰어 페이지 |
| `src/renderer/src/hooks/useSentry.ts`     | Sentry IPC 래퍼 훅 |

### 검증

```bash
npm run dev
# → /settings에서 Auth Token + Org + Project 입력
# → /sentry 페이지 열기
# → 이슈 목록 표시 확인
# → 이슈 클릭 → 이벤트 상세 (스택 트레이스, 태그) 확인
# → Resolve 클릭 → 이슈 목록에서 사라짐 확인
# → 토큰 미설정 시 → 안내 메시지 + /settings 링크 확인
# → 네트워크 끊기 → 캐시 표시 + "오프라인" 배너 확인
npx tsc --noEmit && npx eslint src/ && npx vitest run
```

---

## Stage 8: 최종 검증

### Iron Law 검증 체크리스트

모든 주장에 실행 증거 필수. "should pass" 금지.

#### 빌드 검증

```bash
npx tsc --noEmit              # → 출력: 0 에러 확인
npx eslint src/               # → 출력: 0 에러 확인
npx vitest run                # → 출력: X/X pass, 0 fail 확인
npx electron-vite build       # → 출력: exit 0 확인
```

#### 기능 검증 (수동)

| 페이지     | 테스트                          | 예상 결과                         |
| ---------- | ------------------------------- | --------------------------------- |
| /dashboard | 앱 실행 직후                    | 4-Layer 카드 + 헬스 수치 표시     |
| /dashboard | Type Check 클릭                 | 스피너 → 결과 갱신                |
| /dashboard | Type Check + Lint Fix 동시 클릭 | 두 번째 거부됨                    |
| /logs      | console.error('test')           | 로그 스트림에 즉시 표시           |
| /logs      | error 필터만 ON                 | error만 표시                      |
| /logs      | `[invalid` 검색                 | "Invalid regex" 경고, 크래시 없음 |
| /timeline  | 훅 실행                         | 새 이벤트 실시간 추가             |
| /timeline  | hook-log.jsonl 삭제             | "아직 이벤트 없음"                |
| /sentry    | Auth Token 설정 후              | 이슈 목록 표시                    |
| /sentry    | 토큰 미설정                     | 안내 메시지 + /settings 링크      |
| /settings  | 토큰 저장 → 앱 재시작           | 값 유지                           |
| /settings  | 다크 모드 토글                  | 즉시 반영                         |

#### 엣지케이스 검증

| EC    | 테스트                         | 예상 결과                          |
| ----- | ------------------------------ | ---------------------------------- |
| EC-5  | 퀵 액션 연타                   | 동시 실행 차단                     |
| EC-6  | (시뮬) 60초 초과               | 타임아웃 메시지                    |
| EC-11 | node_modules 삭제 후 헬스 체크 | "Not available" 표시 (크래시 없음) |
| EC-14 | 잘못된 regex 검색              | 문자열 폴백                        |
| EC-22 | 타임라인 시간                  | 로컬 시간 표시                     |
| A1    | ErrorBoundary 강제 트리거      | 정적 fallback UI (Sentry 미의존)   |
| S1    | 프로덕션 빌드 → 앱 실행        | 라우팅 정상 동작                   |

---

## Phase 2c 완료 기준

- [ ] /sentry: 이슈 목록 조회 + 이벤트 상세 + 상태 변경
- [ ] /sentry: 에러 핸들링 5가지 시나리오 전부 동작
- [ ] /sentry: 오프라인 캐시 동작
- [ ] 빌드 검증 4개 명령 전부 통과
- [ ] 기능 검증 12개 시나리오 전부 통과
- [ ] 엣지케이스 7개 시나리오 전부 통과
- [ ] `electron-vite build` 성공
