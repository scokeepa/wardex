# /logs — 에러 로그 뷰어 스펙

> 책임: 실시간 로그 스트림 표시 + 필터링 + 검색
> 파일: `src/renderer/src/pages/LogViewer.tsx`

## 화면 구성

```
┌──────────────────────────────────────────────────┐
│  필터 바                                          │
│  [error] [warn] [info] [debug]  [main] [renderer]│
│  [hook]  🔍 검색...            [⏬ 자동스크롤]     │
├──────────────────────────────────────────────────┤
│  로그 스트림                                      │
│  23:01:04 ERROR [main]  Uncaught TypeError...    │
│  23:01:05 WARN  [hook]  ESLint: 2 warnings       │
│  23:01:06 INFO  [renderer] Component mounted     │
│  ...                                              │
│                                          ▼ (tail) │
└──────────────────────────────────────────────────┘
```

## 데이터 수집

**electron-log** 기반:

1. Main process: `electron-log` 초기화, console 메서드 인터셉트
2. Renderer: electron-log가 IPC로 main에 전달
3. ~~Hook output: 훅 스크립트의 stdout/stderr 캡처~~ → **(D3 수정)** Claude Code가 stdout/stderr를 소비하므로 직접 캡처 불가. 대신 hook-log.jsonl에 기록된 이벤트를 `source: 'hook'`으로 로그 뷰어에 주입

**IPC 흐름:**

```
electron-log(main) ──→ IPC 'log:push' ──→ renderer LogViewer
```

## 필터 기능

| 필터 타입 | 옵션                     | 기본값       |
| --------- | ------------------------ | ------------ |
| 레벨      | error, warn, info, debug | error + warn |
| 소스      | main, renderer, hook     | 전체         |
| 검색      | 텍스트 (정규식 지원)     | 빈 값        |

## 로그 항목 구조

→ `architecture/ipc-contract.md`의 `LogEntry` 타입 참조 (SSOT, C1 수정)

## 동작 규칙

- **Ring buffer**: 최대 1000개 (설정에서 변경 가능 → /settings)
- **자동 스크롤**: 기본 ON, 사용자가 위로 스크롤하면 자동 OFF
- **색상 코딩**: error(빨강), warn(노랑), info(파랑), debug(회색)
- **스택 트레이스**: 클릭 시 접기/펼치기

## 컴포넌트 의존성

- `LogEntry` — 로그 항목 렌더러

## 엣지케이스 & 대응

### EC-13: 로그 폭주

- **문제**: 빌드 에러 시 수백 줄이 한 번에 push → 렌더링 프레임 드롭
- **대응**:
  - `requestAnimationFrame` 기반 배치 렌더링 (16ms마다 최대 50개)
  - 가상 스크롤 (`useVirtualScroll`) — 화면에 보이는 항목만 DOM 렌더링
  - 초당 100+ 이벤트 시 자동 throttle + "X events skipped" 표시

### EC-14: 정규식 검색 에러

- **문제**: 잘못된 regex 입력 (예: `[unclosed`) 시 `new RegExp()` throw
- **대응**: try-catch로 래핑. 실패 시 일반 문자열 검색으로 폴백 + 검색 바에 "Invalid regex" 경고 표시.

### EC-15: 앱 재시작 시 로그 소멸

- **문제**: ring buffer가 메모리 전용, 이전 세션 로그 조회 불가
- **대응**:
  - electron-log의 파일 전송 활용 — `~/Library/Logs/wardex/` 에 자동 저장
  - 앱 시작 시 최근 로그 파일에서 마지막 N줄 로드
  - UI에 "이전 세션 로그 로드" 버튼 (선택적)

### EC-29: 로그 메시지에 ANSI 이스케이프 코드 (B3: 번호 충돌 수정)

- **문제**: tsc/eslint 출력에 색상 코드(`\x1b[31m`)가 포함될 수 있음
- **대응**: 렌더링 전 ANSI 코드 스트립 (`message.replace(/\x1b\[[0-9;]*m/g, '')`)

## IPC 참조

→ `architecture/ipc-contract.md` — `log:push`
