# /sentry — Sentry 이벤트 뷰어 스펙

> 책임: Sentry REST API로 이슈/이벤트 조회, 상태 변경
> 파일: `src/renderer/src/pages/SentryViewer.tsx`

## 화면 구성

```
┌──────────────────────────────────────────────────┐
│  (에러 추이 차트 — Phase 2c 보류, D2)               │
├──────────────┬───────────────────────────────────┤
│  이슈 목록    │  이벤트 상세                        │
│  ────────── │  ──────────                        │
│  > TypeError │  스택 트레이스:                     │
│    3회 발생   │    at App.tsx:15                   │
│              │    at render()                     │
│  > RefError  │                                    │
│    1회 발생   │  태그: browser=Chrome, os=macOS    │
│              │                                    │
│  [Resolve]   │  [이전 이벤트] [다음 이벤트]          │
│  [Ignore]    │                                    │
└──────────────┴───────────────────────────────────┘
```

## Sentry REST API

> 인증: `Authorization: Bearer <auth_token>` (설정에서 입력 → /settings)
> 호출: Main process에서 실행 (CORS 우회)

### API 베이스 URL 결정 (S3)

DSN에서 API 호스트를 추출해야 함:

```
DSN: https://key@o123.ingest.us.sentry.io/456
                          ^^
API: https://us.sentry.io  (ingest 제거, org prefix 제거)

DSN: https://key@o123.ingest.de.sentry.io/456
API: https://de.sentry.io

DSN: https://key@sentry.io/456  (레거시)
API: https://sentry.io
```

로직: DSN에서 호스트 추출 → `ingest.` 제거 → `o{digits}.` 제거 → API 베이스 URL

### 엔드포인트

| 용도           | 메서드 | URL                                                                 | IPC 채널              | 헤더                                          |
| -------------- | ------ | ------------------------------------------------------------------- | --------------------- | --------------------------------------------- |
| 이슈 목록      | GET    | `{base}/api/0/projects/{org}/{project}/issues/?query=is:unresolved` | `sentry:get-issues`   | Auth                                          |
| 이슈 이벤트    | GET    | `{base}/api/0/organizations/{org}/issues/{id}/events/`              | `sentry:get-events`   | Auth                                          |
| 이슈 상태 변경 | PUT    | `{base}/api/0/organizations/{org}/issues/{id}/`                     | `sentry:update-issue` | Auth + `Content-Type: application/json` (S12) |

### 응답 매핑

```
Sentry API Issue → SentryIssue {
  id:        issue.id
  title:     issue.title
  count:     issue.count
  firstSeen: issue.firstSeen
  lastSeen:  issue.lastSeen
  status:    issue.status
  level:     issue.level
}
```

## 기능

| 기능        | 상세                                                                                                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 이슈 목록   | 미해결 이슈 목록, 발생 횟수/시간 표시                                                                                                                                                                                                                                |
| 이벤트 상세 | 이슈 클릭 → 최근 이벤트의 스택 트레이스, 태그, 컨텍스트                                                                                                                                                                                                              |
| 에러 추이   | ~~최근 7일 에러 발생 수 바 차트~~ → **Phase 2c에서 구현 보류** (D2: events-stats API 필요, 이슈 목록 API만으로는 날짜별 집계 불가. `GET /api/0/organizations/{org}/issues/{id}/events/`의 timestamp를 클라이언트에서 그룹핑하는 방식으로 대체 가능하나, 정확도 낮음) |
| 상태 변경   | Resolve / Ignore 버튼                                                                                                                                                                                                                                                |
| 빈 상태     | Auth Token 미설정 시 → /settings로 안내                                                                                                                                                                                                                              |

## 에러 핸들링

- 토큰 미설정: "Sentry Auth Token을 설정해주세요" + 설정 링크
- API 에러 (401): "토큰이 만료되었거나 잘못되었습니다"
- API 에러 (429): "Rate limit 초과, 잠시 후 재시도"
- 네트워크 에러: "Sentry 서버에 연결할 수 없습니다"

## 컴포넌트 의존성

- `Badge` — 이슈 레벨 뱃지
- ~~`BarChart` — 에러 추이 차트~~ (D2: Phase 2c 보류)

## 엣지케이스 & 대응

### EC-16: Sentry API 페이지네이션

- **문제**: 기본 응답이 25건. 이슈가 25개+ 면 나머지 누락
- **대응**:
  - `Link` 헤더에서 `rel="next"` URL 파싱
  - "더 보기" 버튼으로 추가 로드 (무한 스크롤 아님 — 명시적 사용자 액션)
  - 초기에는 최대 100건 (`?cursor=&per_page=100`)

### EC-17: Sentry org/project 오타 (404)

- **문제**: 존재하지 않는 slug 입력 시 404 반환
- **대응**: 에러 핸들링에 404 추가: "Organization 또는 Project를 찾을 수 없습니다. Settings에서 slug를 확인해주세요."

### EC-18: Sentry 무료 플랜 이벤트 쿼터

- **문제**: 쿼터 소진 시 API는 200 반환하지만 새 이벤트 미수집
- **대응**: 이슈 목록이 비어있고 DSN이 설정된 경우 "이벤트가 없거나 Sentry 쿼터가 소진되었을 수 있습니다" 안내

### EC-19: Sentry API 응답 스키마 변경

- **문제**: Sentry API v0은 "public endpoints are generally stable, but beta endpoints may change"
- **대응**: 응답 매핑에 optional chaining 사용, 필수 필드 누락 시 해당 이슈 스킵 + 경고 로그

### EC-20: 오프라인 상태

- **문제**: 네트워크 없을 때 모든 API 호출 실패
- **대응**: 마지막 성공 응답을 캐시(electron-store). 오프라인 감지 시 캐시 표시 + "오프라인 — 마지막 동기화: HH:MM" 배너

## IPC 참조

→ `architecture/ipc-contract.md` — `sentry:get-issues`, `sentry:get-events`, `sentry:update-issue`
